package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Darshan0403/ai-code-review/services/api-server/db"
	"github.com/Darshan0403/ai-code-review/services/api-server/handlers"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	// 1. Setup JSON Logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// 2. Connect to PostgreSQL
	slog.Info("Connecting to PostgreSQL...")
	dbURL := "postgres://postgres:password@localhost:5432/codereview"
	database, err := db.Connect(ctx, dbURL)
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer database.Pool.Close()
	slog.Info("Connected to database successfully!")

	// 3. Setup Chi Router
	r := chi.NewRouter()

	// Attach standard middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	}))

	// 4. Define Routes
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "ok", "service": "api-server"}`))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"message": "pong"}`))
		})

		reviewHandler := &handlers.ReviewHandler{DB: database}
		r.Get("/reviews", reviewHandler.ListReviews)
		r.Get("/reviews/{id}", reviewHandler.GetReviewDetail)

		analyticsHandler := &handlers.AnalyticsHandler{DB: database}
		r.Get("/analytics/dashboard", analyticsHandler.GetDashboard)

		repoHandler := &handlers.RepoHandler{DB: database}
		r.Get("/repos", repoHandler.ListRepos)
		r.Post("/repos", repoHandler.AddRepo)
		r.Get("/repos/{id}/stats", repoHandler.GetRepoStats)
	})

	// 5. Start Server with Graceful Shutdown
	port := ":8083"
	server := &http.Server{Addr: port, Handler: r}

	go func() {
		slog.Info("API Server starting", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server error", "error", err)
		}
	}()

	<-ctx.Done()
	slog.Info("Shutting down API server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	server.Shutdown(shutdownCtx)
	slog.Info("API server stopped cleanly.")
}
