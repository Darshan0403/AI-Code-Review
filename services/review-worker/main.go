package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Darshan0403/ai-code-review/services/review-worker/db"
	localgh "github.com/Darshan0403/ai-code-review/services/review-worker/github"
	"github.com/Darshan0403/ai-code-review/services/review-worker/worker"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	if err := godotenv.Load("../../.env"); err != nil {
		slog.Warn("No .env file found. Falling back to system environment variables.")
	}

	githubToken := os.Getenv("GITHUB_PAT")
	if githubToken == "" {
		slog.Error("GITHUB_PAT is not set! Please add it to your .env file. Exiting.")
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Connect to Redis
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	defer rdb.Close()

	// Connect to PostgreSQL
	slog.Info("Connecting to PostgreSQL...")
	dbConn, err := db.NewDB(ctx, "postgres://postgres:password@localhost:5432/codereview")
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer dbConn.Conn.Close(ctx) // Close cleanly on shutdown

	// Initialize GitHub Client
	slog.Info("Initializing GitHub client...")
	ghClient := localgh.NewClient(ctx, githubToken)

	// Start the worker (passing our new dbConn!)
	worker.Start(ctx, rdb, ghClient, dbConn)

	slog.Info("Main thread shutting down. Giving workers 5 seconds to finish...")
	time.Sleep(5 * time.Second)
	slog.Info("Goodbye!")
}
