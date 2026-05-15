package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/Darshan0403/ai-code-review/services/webhook-handler/handler"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	r := chi.NewRouter()
	r.Use(middleware.Logger)

	r.Get("/health", handler.HealthHandler)

	r.Post("/echo", handler.EchoHandler)
	r.Post("/enqueue", handler.EnqueueHandler)
	r.Post("/webhook/github", handler.WebhookHandler)

	slog.Info("Starting server", "port", 8080)
	http.ListenAndServe(":8080", r)
}
