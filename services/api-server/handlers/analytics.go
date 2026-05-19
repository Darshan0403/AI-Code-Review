package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Darshan0403/ai-code-review/services/api-server/db"
)

type AnalyticsHandler struct {
	DB *db.DB
}

// GetDashboard handles GET /api/v1/analytics/dashboard
func (h *AnalyticsHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	// 1. Get the aggregate stats
	stats, err := h.DB.GetDashboardStats(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch stats", http.StatusInternalServerError)
		return
	}

	// 2. Get the 5 most recent reviews for the activity feed
	recentReviews, err := h.DB.GetReviews(r.Context(), 5, 0)
	if err != nil {
		http.Error(w, "Failed to fetch recent reviews", http.StatusInternalServerError)
		return
	}

	if recentReviews == nil {
		recentReviews = []db.Review{}
	}

	// 3. Package it all together
	response := map[string]interface{}{
		"stats":          stats,
		"recent_reviews": recentReviews,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
