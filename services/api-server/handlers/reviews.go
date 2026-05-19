package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/Darshan0403/ai-code-review/services/api-server/db"
	"github.com/go-chi/chi/v5"
)

type ReviewHandler struct {
	DB *db.DB
}

// ListReviews handles GET /api/v1/reviews
func (h *ReviewHandler) ListReviews(w http.ResponseWriter, r *http.Request) {
	// Simple pagination parsing (defaults to page 1, 20 per page)
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	perPage := 20
	offset := (page - 1) * perPage

	reviews, err := h.DB.GetReviews(r.Context(), perPage, offset)
	if err != nil {
		slog.Error("Database error in GetReviews", "error", err)
		http.Error(w, "Failed to fetch reviews", http.StatusInternalServerError)
		return
	}

	// If no reviews yet, return an empty array instead of null
	if reviews == nil {
		reviews = []db.Review{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reviews)
}

// GetReviewDetail handles GET /api/v1/reviews/{id}
func (h *ReviewHandler) GetReviewDetail(w http.ResponseWriter, r *http.Request) {
	reviewID := chi.URLParam(r, "id")

	review, comments, err := h.DB.GetReviewWithComments(r.Context(), reviewID)
	if err != nil {
		slog.Error("Database error in GetReviewWithComments", "review_id", reviewID, "error", err)
		http.Error(w, "Review not found", http.StatusNotFound)
		return
	}

	if comments == nil {
		comments = []db.Comment{}
	}

	// Package it all into one nice JSON object for the frontend
	response := map[string]interface{}{
		"review":   review,
		"comments": comments,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
