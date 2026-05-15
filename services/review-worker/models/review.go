package models

type ReviewJob struct {
	Repo    string `json:"repo"`
	PRNum   int    `json:"pr_number"`
	DiffURL string `json:"diff_url"`
	HeadSHA string `json:"head_sha"`
	BaseSHA string `json:"base_sha"`
}
