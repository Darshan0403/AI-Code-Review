from fastapi import FastAPI
from routers import review 
from services.llm import call_llm

app = FastAPI(title="Code Intelligence Service")

app.include_router(review.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok", "service": "code-intelligence"}

# --- TEMPORARY TEST ROUTE ---
@app.get("/test-ai")
async def test_ai():
    print("Asking Groq a question...")
    answer = await call_llm("Explain what a Webhook is in exactly one sentence.")
    return {"ai_says": answer}