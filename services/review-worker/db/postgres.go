package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type DB struct {
	Conn *pgx.Conn
}

// NewDB connects to the Postgres container
func NewDB(ctx context.Context, connStr string) (*DB, error) {
	conn, err := pgx.Connect(ctx, connStr)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}
	return &DB{Conn: conn}, nil
}

// SaveReview logs the PR into the pull_request_reviews table
func (db *DB) SaveReview(ctx context.Context, repo string, prNum int, headSha string) (string, error) {
	var reviewID string

	// We use RETURNING id so we know the UUID of the row we just created
	query := `
		INSERT INTO pull_request_reviews (repo_full_name, pr_number, head_sha, status)
		VALUES ($1, $2, $3, 'COMPLETED')
		RETURNING id
	`
	err := db.Conn.QueryRow(ctx, query, repo, prNum, headSha).Scan(&reviewID)
	if err != nil {
		return "", err
	}

	return reviewID, nil
}
