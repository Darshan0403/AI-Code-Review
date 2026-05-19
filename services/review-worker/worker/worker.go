package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Darshan0403/ai-code-review/services/review-worker/db"
	localgh "github.com/Darshan0403/ai-code-review/services/review-worker/github"
	"github.com/Darshan0403/ai-code-review/services/review-worker/models"
	"github.com/Darshan0403/ai-code-review/services/review-worker/parser"
	"github.com/google/go-github/v62/github"
	"github.com/redis/go-redis/v9"
)

const QueueName = "review_jobs"

// --- NEW: Python API Structs ---
type AIReviewRequest struct {
	FilePath    string `json:"file_path"`
	DiffContent string `json:"diff_content"`
	PRNumber    int    `json:"pr_number"`
	Repo        string `json:"repo"`
}

type AIReviewComment struct {
	FilePath string `json:"file_path"`
	Line     int    `json:"line"`
	Severity string `json:"severity"`
	Comment  string `json:"comment"`
}

type AIReviewResponse struct {
	Comments []AIReviewComment `json:"comments"`
	IsLGTM   bool              `json:"is_lgtm"`
}

// getAIReview calls your Python FastAPI service
func getAIReview(req AIReviewRequest) (*AIReviewResponse, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	// Call the Python service!
	resp, err := http.Post("http://localhost:8082/api/review", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("python API returned status: %d", resp.StatusCode)
	}

	var result AIReviewResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// -------------------------------

func Start(ctx context.Context, rdb *redis.Client, ghClient *localgh.Client, dbConn *db.DB) {
	slog.Info("Worker started. Listening for jobs...")

	for {
		select {
		case <-ctx.Done():
			slog.Info("Worker shutting down safely...")
			return
		default:
			result, err := rdb.BRPop(ctx, 2*time.Second, QueueName).Result()

			if err == redis.Nil {
				continue
			} else if err != nil {
				if ctx.Err() == nil {
					slog.Error("Redis error", "error", err)
				}
				continue
			}

			var job models.ReviewJob
			if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
				slog.Error("Failed to parse job JSON", "error", err)
				continue
			}

			slog.Info("Picked up new job!", "repo", job.Repo, "pr", job.PRNum)

			parts := strings.Split(job.Repo, "/")
			if len(parts) != 2 {
				slog.Error("Invalid repo format inside job", "repo", job.Repo)
				continue
			}
			owner := parts[0]
			repoName := parts[1]

			slog.Info("Fetching diff for PR", "owner", owner, "repoName", repoName, "pr", job.PRNum)

			diff, err := ghClient.FetchPRDiff(ctx, owner, repoName, job.PRNum)
			if err != nil {
				slog.Error("Failed to fetch diff", "error", err)
				continue
			}

			parsedFiles, err := parser.ParseRawDiff(diff)
			if err != nil {
				slog.Error("Failed to parse diff", "error", err)
				continue
			}

			var allGitHubComments []*github.DraftReviewComment
			var allAIComments []AIReviewComment

			// Loop through every file changed in the PR
			// Loop through every file changed in the PR
			for _, file := range parsedFiles {
				if len(file.AddedLines) == 0 {
					continue // Skip files with no new lines
				}

				// --- NEW: Create a map of valid lines for our Safety Net ---
				validLines := make(map[int]bool)

				// Reconstruct a simplified diff to send to Python, WITH line numbers!
				var diffBuilder strings.Builder
				for _, line := range file.AddedLines {
					validLines[line.Number] = true // Mark this line as valid!
					diffBuilder.WriteString(fmt.Sprintf("%d: + %s\n", line.Number, line.Content))
				}

				slog.Info("Asking AI to review file...", "file", file.FileName)

				// Make the API call to Python
				aiResponse, err := getAIReview(AIReviewRequest{
					FilePath:    file.FileName,
					DiffContent: diffBuilder.String(),
					PRNumber:    job.PRNum,
					Repo:        job.Repo,
				})

				if err != nil {
					slog.Error("Failed to get AI review", "error", err)
					continue // Skip to next file if AI fails
				}

				if aiResponse.IsLGTM {
					slog.Info("AI says LGTM!", "file", file.FileName)
					continue
				}

				// Convert Python API comments to GitHub API comments
				for _, aiComment := range aiResponse.Comments {

					// --- NEW: THE SAFETY NET ---
					// If the AI gave us a line number that GitHub will reject,
					// we snap it to the first valid line in the file.
					if !validLines[aiComment.Line] {
						slog.Warn("AI hallucinated an invalid line number. Snapping to fallback.",
							"bad_line", aiComment.Line,
							"snapped_line", file.AddedLines[0].Number)

						aiComment.Line = file.AddedLines[0].Number
					}
					// ---------------------------

					// Add a cool emoji based on severity
					emoji := "💡"
					if aiComment.Severity == "error" {
						emoji = "🚨"
					} else if aiComment.Severity == "warning" {
						emoji = "⚠️"
					}

					formattedBody := fmt.Sprintf("%s **[%s]** %s", emoji, strings.ToUpper(aiComment.Severity), aiComment.Comment)
					allGitHubComments = append(allGitHubComments, localgh.NewComment(aiComment.FilePath, aiComment.Line, formattedBody))
					allAIComments = append(allAIComments, aiComment)
				}
			}

			// POST TO GITHUB!
			if len(allGitHubComments) > 0 {
				slog.Info("Posting AI review to GitHub...")
				err = ghClient.PostReviewComments(ctx, owner, repoName, job.PRNum, allGitHubComments)
				if err != nil {
					slog.Error("Failed to post review", "error", err)
					continue
				}
				slog.Info("Review posted successfully! Go check GitHub! 🎉")

				// SAVE TO DATABASE
				dbID, err := dbConn.SaveReview(ctx, job.Repo, job.PRNum, "unknown_sha")
				if err != nil {
					slog.Error("Failed to save review to database", "error", err)
				} else {
					slog.Info("Successfully saved review to Postgres!", "db_id", dbID)

					// --- NEW: Save every individual comment to the DB ---
					for _, comment := range allAIComments {
						err := dbConn.SaveComment(ctx, dbID, comment.FilePath, comment.Line, comment.Severity, comment.Comment)
						if err != nil {
							slog.Error("Failed to save comment to DB", "error", err)
						}
					}
					slog.Info("Successfully saved all comments to Postgres!")
					// ----------------------------------------------------
				}

			} else {
				slog.Info("AI had no comments (LGTM!). Nothing posted to GitHub.")
			}

			slog.Info("Finished processing job!", "pr", job.PRNum)
		}
	}
}
