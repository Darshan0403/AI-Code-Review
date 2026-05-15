package worker

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/YOUR_USERNAME/ai-code-review/services/review-worker/models"
	"github.com/redis/go-redis/v9"
)

const QueueName = "review_jobs"

// Start is the infinite loop that processes jobs
func Start(ctx context.Context, rdb *redis.Client) {
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

			// TODO: Fetch from GitHub and send to AI!
			// Simulate work for now:
			time.Sleep(3 * time.Second)
			slog.Info("Finished processing job!", "pr", job.PRNum)
		}
	}
}
