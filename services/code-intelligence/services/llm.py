import os
import httpx
from fastapi import HTTPException

# We will use Groq's OpenAI-compatible endpoint
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

async def call_llm(prompt: str) -> str:
    # 1. Grab the API key from the environment
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set!")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # 2. Build the payload
    payload = {
        "model": "llama-3.3-70b-versatile", # Groq's top-tier open weights model
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2, # Keep it low so the AI is analytical, not overly creative
        "max_tokens": 2048,
    }

    # 3. Make the async HTTP call to Groq
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                GROQ_URL,
                headers=headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status() # Check for HTTP errors like 401 Unauthorized
            
            # Extract the raw text from the AI's response
            data = response.json()
            return data["choices"][0]["message"]["content"]
            
        except httpx.HTTPError as e:
            print(f"Error calling Groq API: {e}")
            raise HTTPException(status_code=500, detail="Failed to communicate with LLM")