package handler

import (
	"ai-code-review/models" // Import your models
	"ai-code-review/queue"  // Import your redis client
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
)

func EchoHandler(w http.ResponseWriter, r *http.Request) {
	var m models.Message // Use the models package
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, "Bad JSON", 400)
		return
	}
	json.NewEncoder(w).Encode(m)
}

func EnqueueHandler(w http.ResponseWriter, r *http.Request) {
	var m models.Message
	json.NewDecoder(r.Body).Decode(&m)

	// Use queue.Rdb (Capital R!)
	queue.Rdb.LPush(r.Context(), "task-queue", m.Msg)
	w.Write([]byte("Enqueued!"))
}

func validateSignature(payload []byte, signature string, secret string) bool {
	// 1. Initialize the hash using the secret
	mac := hmac.New(sha256.New, []byte(secret))

	// 2. Write the raw body (payload) into the hash
	mac.Write(payload)

	// 3. Compute the hash and format it to match GitHub's "sha256=XXXX" format
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	// 4. Constant-time comparison
	return hmac.Equal([]byte(expected), []byte(signature))
}

func WebhookHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Grab the signature from GitHub's header
	signature := r.Header.Get("X-Hub-Signature-256")
	if signature == "" {
		http.Error(w, "Missing signature", http.StatusUnauthorized)
		return
	}

	// 2. Read the raw body (necessary for HMAC)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Processing error", http.StatusInternalServerError)
		return
	}

	// 3. Get your secret (use a placeholder for testing)
	secret := "my_test_secret"

	// 4. Validate!
	if !validateSignature(body, signature, secret) {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// If we get here, it's valid!
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Signature Validated!"))

	// 5. Parse the JSON using the bytes we already read
	var payload models.WebhookPayload
	err = json.Unmarshal(body, &payload)
	if err != nil {
		slog.Error("Failed to parse JSON payload", "error", err)
		http.Error(w, "Bad JSON", http.StatusBadRequest)
		return
	}

	// 6. Filter for actions we care about
	if payload.Action != "opened" && payload.Action != "synchronize" {
		slog.Info("Ignoring PR event", "action", payload.Action)
		w.WriteHeader(http.StatusOK) // Return 200 so GitHub knows we received it, we just don't care.
		w.Write([]byte("Ignored action: " + payload.Action))
		return
	}

	// 7. Log the valid event!
	slog.Info("Processing PR",
		"repo", payload.Repository.FullName,
		"pr_number", payload.PullRequest.Number,
		"action", payload.Action,
		"head_sha", payload.PullRequest.Head.SHA,
	)

	// (Next step will be sending this to Redis...)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("PR Accepted for processing!"))

	// 8. Package the relevant data into a clean job struct
	job := models.ReviewJob{
		Repo:    payload.Repository.FullName,
		PRNum:   payload.PullRequest.Number,
		DiffURL: payload.PullRequest.DiffURL,
		HeadSHA: payload.PullRequest.Head.SHA,
		BaseSHA: payload.PullRequest.Base.SHA,
	}

	// 9. Send it to Redis! (r.Context() passes the HTTP request's context)
	if err := queue.Enqueue(r.Context(), job); err != nil {
		slog.Error("Failed to enqueue job", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	slog.Info("Job enqueued successfully!", "pr_number", job.PRNum)

	// 10. Finally, respond to GitHub
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("PR Accepted and Enqueued!"))
}
