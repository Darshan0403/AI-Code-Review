package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	// 1. We import the parser so Go knows what it is!
	"github.com/Darshan0403/ai-code-review/services/review-worker/parser"

	// 2. We nickname our local github folder 'localgh' to avoid confusion
	localgh "github.com/Darshan0403/ai-code-review/services/review-worker/github"
	"github.com/Darshan0403/ai-code-review/services/review-worker/models"

	// 3. The official Google GitHub library for the Struct types
	"github.com/google/go-github/v62/github"
	"github.com/redis/go-redis/v9"

	"github.com/Darshan0403/ai-code-review/services/review-worker/db"
)

const QueueName = "review_jobs"

// Start is the infinite loop that processes jobs
func Start(ctx context.Context, rdb *redis.Client, ghClient *localgh.Client, dbConn *db.DB) {
	slog.Info("Worker started. Listening for jobs...")

	for {
		// 1. Check if we've been told to shut down
		select {
		case <-ctx.Done():
			slog.Info("Worker shutting down safely...")
			return
		default:
			// 2. Wait for a job (BRPOP blocks for 2 seconds, then loops)
			// We use a timeout instead of 0 (infinite) so the loop can regularly
			// check if ctx.Done() has been called.
			result, err := rdb.BRPop(ctx, 2*time.Second, QueueName).Result()

			if err == redis.Nil {
				// No jobs in queue, just loop again
				continue
			} else if err != nil {
				// Only log if it's an actual error, not a context cancellation
				if ctx.Err() == nil {
					slog.Error("Redis error", "error", err)
				}
				continue
			}

			// 3. We got a job! Unpack it.
			var job models.ReviewJob
			if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
				slog.Error("Failed to parse job JSON", "error", err)
				continue
			}

			slog.Info("Picked up new job!", "repo", job.Repo, "pr", job.PRNum)

			parts := strings.Split(job.Repo, "/")
			if len(parts) != 2 {
				slog.Error("Invalid repo format inside job", "repo", job.Repo)
				continue // Skip this broken job
			}

			owner := parts[0]    // "Darshan0403"
			repoName := parts[1] // "ai-code-review-test-repo"

			slog.Info("Fetching diff for PR", "repo", job.Repo, "pr", job.PRNum)

			// FETCH THE DIFF
			diff, err := ghClient.FetchPRDiff(ctx, owner, repoName, job.PRNum)
			if err != nil {
				slog.Error("Failed to fetch diff", "error", err)
				continue
			}

			slog.Info("Successfully fetched diff!", "bytes", len(diff))

			// 1. PARSE THE DIFF
			parsedFiles, err := parser.ParseRawDiff(diff)
			if err != nil {
				slog.Error("Failed to parse diff", "error", err)
				continue
			}

			// 2. PREPARE THE COMMENTS
			var comments []*github.DraftReviewComment

			for _, file := range parsedFiles {
				if len(file.AddedLines) > 0 {
					// Grab the very first added line in this file
					firstLine := file.AddedLines[0]

					slog.Info("Preparing comment", "file", file.FileName, "line", firstLine.Number)

					// Create our dummy comment!
					commentBody := fmt.Sprintf("🤖 **Beep Boop!** I am your new AI reviewer. I see you added `%s` on line %d. My brain is not connected yet, but I am watching you.", strings.TrimSpace(firstLine.Content), firstLine.Number)

					comments = append(comments, localgh.NewComment(file.FileName, firstLine.Number, commentBody))

					// Break after one comment so we don't spam the PR if there are many files
					break
				}
			}

			// 3. POST TO GITHUB!
			if len(comments) > 0 {
				slog.Info("Posting review to GitHub...")
				err = ghClient.PostReviewComments(ctx, owner, repoName, job.PRNum, comments)
				if err != nil {
					slog.Error("Failed to post review", "error", err)
					continue
				}
				slog.Info("Review posted successfully! Go check GitHub! ")
			} else {
				slog.Info("No new lines to comment on.")
			}

			slog.Info("Saving review to database...")
			// We don't have the exact git commit SHA yet, so we pass a placeholder "unknown_sha"
			dbID, err := dbConn.SaveReview(ctx, job.Repo, job.PRNum, "unknown_sha")
			if err != nil {
				slog.Error("Failed to save to database", "error", err)
			} else {
				slog.Info("Successfully saved to Postgres!", "db_id", dbID)
			}

			// Finished!
			slog.Info("Finished processing job!", "pr", job.PRNum)
		}
	}
}
