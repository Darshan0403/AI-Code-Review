package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Darshan0403/ai-code-review/services/api-server/db"
	"github.com/go-chi/chi/v5"
)

type RepoHandler struct {
	DB *db.DB
}

type CreateRepoRequest struct {
	GitHubFullName string `json:"github_full_name"`
	WebhookSecret  string `json:"webhook_secret"`
}

// ListRepos handles GET /api/v1/repos
func (h *RepoHandler) ListRepos(w http.ResponseWriter, r *http.Request) {
	repos, err := h.DB.ListRepos(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch repositories", http.StatusInternalServerError)
		return
	}

	if repos == nil {
		repos = []db.RepoSummary{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(repos)
}

// AddRepo handles POST /api/v1/repos
func (h *RepoHandler) AddRepo(w http.ResponseWriter, r *http.Request) {
	var req CreateRepoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.GitHubFullName == "" {
		http.Error(w, "github_full_name is required", http.StatusBadRequest)
		return
	}

	id, err := h.DB.AddRepo(r.Context(), req.GitHubFullName, req.WebhookSecret)
	if err != nil {
		http.Error(w, "Failed to create repository", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Repository registered successfully",
		"id":      id,
	})
}

// GetRepoStats handles GET /api/v1/repos/{id}/stats
func (h *RepoHandler) GetRepoStats(w http.ResponseWriter, r *http.Request) {
	// 1. Grab the ID from the URL (e.g., /repos/123/stats)
	repoID := chi.URLParam(r, "id")

	// 2. Fetch the data
	stats, err := h.DB.GetRepoStats(r.Context(), repoID)
	if err != nil {
		http.Error(w, "Repository not found or database error", http.StatusNotFound)
		return
	}

	// 3. Serve the JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// TogglePause handles PUT /api/v1/repos/{id}/toggle-pause
func (h *RepoHandler) TogglePause(w http.ResponseWriter, r *http.Request) {
	repoID := chi.URLParam(r, "id")

	newState, err := h.DB.ToggleRepoPause(r.Context(), repoID)
	if err != nil {
		http.Error(w, "Failed to toggle repository status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"is_paused": newState})
}
