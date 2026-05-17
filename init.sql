-- init.sql
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_full_name VARCHAR(255) UNIQUE NOT NULL,
    webhook_secret VARCHAR(255) NOT NULL,
    indexed_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}'
);

CREATE TABLE pull_request_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_full_name VARCHAR(255) NOT NULL,
    pr_number INT NOT NULL,
    pr_title VARCHAR(500),
    head_sha VARCHAR(40),
    status VARCHAR(50) DEFAULT 'PENDING',
    total_comments INT DEFAULT 0,
    processing_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE review_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID REFERENCES pull_request_reviews(id),
    file_path VARCHAR(500) NOT NULL,
    line_number INT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    comment_text TEXT NOT NULL,
    github_comment_id BIGINT,
    feedback_status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);