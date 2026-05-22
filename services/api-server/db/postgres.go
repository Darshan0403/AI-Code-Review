package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

// Connect establishes a connection pool to PostgreSQL
func Connect(ctx context.Context, connStr string) (*DB, error) {
	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}

	// Test the connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	return &DB{Pool: pool}, nil
}

// --- Data Models ---
type Review struct {
	ID            string    `json:"id"`
	RepoFullName  string    `json:"repo_full_name"`
	PRNumber      int       `json:"pr_number"`
	CreatedAt     time.Time `json:"created_at"`
	TotalComments int       `json:"total_comments"`
	ErrorCount    int       `json:"error_count"`
	WarningCount  int       `json:"warning_count"`
}

type Comment struct {
	ID          string    `json:"id"`
	ReviewID    string    `json:"review_id"`
	FilePath    string    `json:"file_path"`
	LineNumber  int       `json:"line_number"`
	Severity    string    `json:"severity"`
	CommentText string    `json:"comment_text"`
	CreatedAt   time.Time `json:"created_at"`
}

type DashboardStats struct {
	TotalRepos           int     `json:"total_repos"`
	TotalReviews         int     `json:"total_reviews"`
	TotalComments        int     `json:"total_comments"`
	AvgCommentsPerReview float64 `json:"avg_comments_per_review"`
	ErrorCount           int     `json:"error_count"`
	WarningCount         int     `json:"warning_count"`
	InfoCount            int     `json:"info_count"`
}

// --- Fetch Methods ---

// GetReviews fetches a paginated list of PR reviews
func (db *DB) GetReviews(ctx context.Context, limit, offset int) ([]Review, error) {
	// We use LEFT JOINs to count the comments per severity for each review dynamically
	query := `
        SELECT 
            pr.id, pr.repo_full_name, pr.pr_number, pr.created_at,
            COUNT(c.id) AS total_comments,
            SUM(CASE WHEN c.severity = 'error' THEN 1 ELSE 0 END) AS error_count,
            SUM(CASE WHEN c.severity = 'warning' THEN 1 ELSE 0 END) AS warning_count
        FROM pull_request_reviews pr
        LEFT JOIN review_comments c ON CAST(c.review_id AS VARCHAR) = CAST(pr.id AS VARCHAR)
        GROUP BY pr.id, pr.repo_full_name, pr.pr_number, pr.created_at
        ORDER BY pr.created_at DESC 
        LIMIT $1 OFFSET $2
    `

	rows, err := db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []Review
	for rows.Next() {
		var r Review
		if err := rows.Scan(
			&r.ID, &r.RepoFullName, &r.PRNumber, &r.CreatedAt,
			&r.TotalComments, &r.ErrorCount, &r.WarningCount, // <-- NEW
		); err != nil {
			return nil, err
		}
		reviews = append(reviews, r)
	}
	return reviews, nil
}

// GetReviewWithComments fetches a single review and all of its AI comments
func (db *DB) GetReviewWithComments(ctx context.Context, reviewID string) (*Review, []Comment, error) {
	// 1. Get the Review
	var r Review
	reviewQuery := `SELECT id, repo_full_name, pr_number,  created_at FROM pull_request_reviews WHERE id = $1`
	err := db.Pool.QueryRow(ctx, reviewQuery, reviewID).Scan(&r.ID, &r.RepoFullName, &r.PRNumber, &r.CreatedAt)
	if err != nil {
		return nil, nil, err
	}

	// 2. Get the Comments
	commentsQuery := `SELECT id, review_id, file_path, line_number, severity, comment_text, created_at FROM review_comments WHERE review_id = $1 ORDER BY created_at ASC`
	rows, err := db.Pool.Query(ctx, commentsQuery, reviewID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var c Comment
		if err := rows.Scan(&c.ID, &c.ReviewID, &c.FilePath, &c.LineNumber, &c.Severity, &c.CommentText, &c.CreatedAt); err != nil {
			return nil, nil, err
		}
		comments = append(comments, c)
	}

	return &r, comments, nil
}
func (db *DB) GetDashboardStats(ctx context.Context) (*DashboardStats, error) {
	var stats DashboardStats

	// We bundle all 6 counts into a single SQL execution for maximum performance.
	// We retain your CAST(... AS INT) logic to prevent Postgres bigint scanning panics.
	query := `
		SELECT 
			CAST((SELECT COUNT(*) FROM pull_request_reviews) AS INT),
			CAST((SELECT COUNT(*) FROM review_comments) AS INT),
			CAST((SELECT COUNT(DISTINCT repo_full_name) FROM pull_request_reviews) AS INT),
			CAST((SELECT COUNT(*) FROM review_comments WHERE severity = 'error') AS INT),
			CAST((SELECT COUNT(*) FROM review_comments WHERE severity = 'warning') AS INT),
			CAST((SELECT COUNT(*) FROM review_comments WHERE severity = 'info') AS INT)
	`

	err := db.Pool.QueryRow(ctx, query).Scan(
		&stats.TotalReviews,
		&stats.TotalComments,
		&stats.TotalRepos,
		&stats.ErrorCount, // Make sure these 3 fields exist in your struct!
		&stats.WarningCount,
		&stats.InfoCount,
	)

	if err != nil {
		return nil, err
	}

	// Calculate Average safely in Go to prevent SQL division-by-zero crashes
	if stats.TotalReviews > 0 {
		stats.AvgCommentsPerReview = float64(stats.TotalComments) / float64(stats.TotalReviews)
	}

	return &stats, nil
}

// --- Repository Models & Methods ---

type RepoSummary struct {
	ID             string     `json:"id"`
	GitHubFullName string     `json:"github_full_name"`
	TotalReviews   int        `json:"total_reviews"`
	LastReviewAt   *time.Time `json:"last_review_at"`
	IsPaused       bool       `json:"is_paused"`
}

// ListRepos fetches all monitored repos with their review stats
func (db *DB) ListRepos(ctx context.Context) ([]RepoSummary, error) {
	query := `
        SELECT r.id, r.github_full_name, r.is_paused, COUNT(pr.id) as total_reviews, MAX(pr.created_at) as last_review_at
        FROM repositories r
        LEFT JOIN pull_request_reviews pr ON r.github_full_name = pr.repo_full_name
        GROUP BY r.id, r.github_full_name, r.is_paused
        ORDER BY r.github_full_name ASC
    `
	rows, err := db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var repos []RepoSummary
	for rows.Next() {
		var r RepoSummary
		if err := rows.Scan(&r.ID, &r.GitHubFullName, &r.IsPaused, &r.TotalReviews, &r.LastReviewAt); err != nil {
			return nil, err
		}
		repos = append(repos, r)
	}
	return repos, nil
}

// AddRepo registers a new repository into the system
func (db *DB) AddRepo(ctx context.Context, fullName, secret string) (string, error) {
	var id string
	query := `
        INSERT INTO repositories (github_full_name, webhook_secret) 
        VALUES ($1, $2) 
        RETURNING id
    `
	err := db.Pool.QueryRow(ctx, query, fullName, secret).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

func (db *DB) ToggleRepoPause(ctx context.Context, repoID string) (bool, error) {
	var newState bool
	query := `UPDATE repositories SET is_paused = NOT is_paused WHERE id = $1 RETURNING is_paused`
	err := db.Pool.QueryRow(ctx, query, repoID).Scan(&newState)
	return newState, err
}

type RepoDetailStats struct {
	ID             string     `json:"id"`
	GitHubFullName string     `json:"github_full_name"`
	TotalReviews   int        `json:"total_reviews"`
	TotalComments  int        `json:"total_comments"`
	LastReviewAt   *time.Time `json:"last_review_at"`
}

// GetRepoStats fetches deep metrics for a single repository
func (db *DB) GetRepoStats(ctx context.Context, repoID string) (*RepoDetailStats, error) {
	query := `
		SELECT 
			r.id, 
			r.github_full_name, 
			COUNT(DISTINCT pr.id) as total_reviews, 
			COUNT(c.id) as total_comments, 
			MAX(pr.created_at) as last_review_at
		FROM repositories r
		LEFT JOIN pull_request_reviews pr ON r.github_full_name = pr.repo_full_name
		LEFT JOIN review_comments c ON pr.id = CAST(c.review_id AS UUID)
		WHERE r.id = $1
		GROUP BY r.id, r.github_full_name
	`

	var stats RepoDetailStats
	err := db.Pool.QueryRow(ctx, query, repoID).Scan(
		&stats.ID,
		&stats.GitHubFullName,
		&stats.TotalReviews,
		&stats.TotalComments,
		&stats.LastReviewAt,
	)

	if err != nil {
		return nil, err
	}

	return &stats, nil
}
