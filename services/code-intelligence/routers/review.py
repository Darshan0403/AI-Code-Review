from fastapi import APIRouter
from pydantic import BaseModel
from groq import Groq
import os
import json
import httpx  # <-- NEW: Used to talk to the Go API

from services.embedder import embed_code
from services.vector_store import vector_db

router = APIRouter()
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class ReviewRequest(BaseModel):
    repo: str
    pr_number: int
    diff_content: str
    file_path: str = ""
    custom_instructions: str = ""

@router.post("/review")
async def review_pr(req: ReviewRequest):
    print(f" Starting AI Review for {req.repo} PR #{req.pr_number} (File: {req.file_path})")
    
    # ==========================================
    # STEP 1: RETRIEVAL (The Vector RAG Pipeline)
    # ==========================================
    similar_code_context = ""
    try:
        if req.diff_content:
            print(" Querying ChromaDB for codebase context...")
            query_vector = embed_code(req.diff_content[:2000])
            
            results = vector_db.collection.query(
                query_embeddings=[query_vector],
                n_results=3,
                where={"repo_name": req.repo} 
            )
            
            if results and results.get("documents") and len(results["documents"][0]) > 0:
                similar_code_context = "\n\n### EXISTING CODEBASE CONTEXT ###\nHere are similar functions already existing in this codebase. Use these to understand the team's coding style, naming conventions, and structural patterns:\n"
                for i, doc in enumerate(results["documents"][0]):
                    similar_code_context += f"--- Snippet {i+1} ---\n{doc}\n"
                print(f" Injected {len(results['documents'][0])} codebase snippets into the LLM context.")
            else:
                print(" No similar codebase context found in ChromaDB.")
    except Exception as e:
        print(f" ChromaDB Retrieval bypassed: {e}")

    # ==========================================
    # STEP 1.5: FEEDBACK RETRIEVAL (The RLHF Pipeline)
    # ==========================================
    feedback_context = ""
    try:
        api_url = f"http://api-server:8083/api/v1/repos/{req.repo}/feedback-summary"
        print(f" Fetching developer feedback history...")
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(api_url)
            if resp.status_code == 200:
                data = resp.json()
                if data and data.get("total_feedback", 0) > 0:
                    acc_rate = data.get("acceptance_rate", 0)
                    recent_rejected = data.get("recent_rejected", [])
                    recent_accepted = data.get("recent_accepted", [])
                    
                    feedback_context = f"\n\n### HISTORICAL DEVELOPER FEEDBACK ###\n"
                    feedback_context += f"Your past code review suggestions have an acceptance rate of {acc_rate:.1f}%.\n"
                    
                    if recent_rejected:
                        feedback_context += "\nCRITICAL - Developers frequently REJECTED these types of suggestions (DO NOT MAKE SUGGESTIONS LIKE THESE):\n"
                        for comment in recent_rejected:
                            feedback_context += f"- \"{comment}\"\n"
                            
                    if recent_accepted:
                        feedback_context += "\nDevelopers frequently ACCEPTED these types of suggestions (DO MORE OF THIS):\n"
                        for comment in recent_accepted:
                            feedback_context += f"- \"{comment}\"\n"
                            
                    print(f" Injected RLHF context: {len(recent_accepted)} accepted, {len(recent_rejected)} rejected patterns.")
                else:
                    print(" No historical feedback found for this repository yet.")
            else:
                print(f" Feedback API returned status {resp.status_code}")
    except Exception as e:
        print(f" Failed to fetch developer feedback: {e}")

    # ==========================================
    # STEP 2: GENERATION (The LLM Pipeline)
    # ==========================================
    
    # PRODUCT UPGRADE: Aggressive Line Number Prompting
    system_prompt = f"""You are a Senior Security & Code Quality Engineer reviewing a GitHub Pull Request.
You must output YOUR ENTIRE RESPONSE as a valid JSON array of objects.
Do not include markdown blocks like ```json.

### CRITICAL INSTRUCTION ON LINE NUMBERS & FILE PATHS ###
1. The git diff provided to you has been explicitly formatted with absolute line numbers. 
   Every added line of code starts with the line number followed by a colon and a plus sign (e.g., `42: + def secure_password(pwd):`).
   You MUST use the exact integer provided in the prefix as the `line_number` in your JSON. DO NOT guess or calculate line numbers.
2. For the `file_path` field in your JSON, you MUST use the exact file name provided in the user prompt. DO NOT guess the file name.

Format: [{{"file_path": "string", "line_number": int, "severity": "error|warning|info", "category": "security|performance|style|logic|error-handling|general", "comment_text": "string"}}]

{f'### CUSTOM TEAM INSTRUCTIONS ###{req.custom_instructions}' if req.custom_instructions else ''}
{similar_code_context}
{feedback_context}
"""

    # INJECT THE FILE PATH INTO THE USER PROMPT
    user_prompt = f"Please review the following git diff for the file `{req.file_path}` and output ONLY the JSON array of your findings:\n\n{req.diff_content}"

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1, # Lowered temperature slightly to force stricter adherence to instructions
        )
        
        raw_response = completion.choices[0].message.content.strip()
        
        if raw_response.startswith("```json"):
            raw_response = raw_response[7:]
        if raw_response.endswith("```"):
            raw_response = raw_response[:-3]
            
        comments = json.loads(raw_response)
        return {"status": "success", "comments": comments}

    except Exception as e:
        print(f" LLM Error: {e}")
        return {"status": "error", "message": str(e), "comments": []}