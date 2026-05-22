import asyncio
from fastapi import APIRouter, HTTPException
from models.schema import ReviewRequest, ReviewResponse
from services.llm import call_llm
from services.parser import build_review_prompt, parse_review_response, detect_language

router = APIRouter()

@router.post("/review", response_model=ReviewResponse)
async def review_code(request: ReviewRequest):
    print(f"Received review request for {request.repo} PR #{request.pr_number} - File: {request.file_path}")
    
    # --- NEW: Safety Check for Massive Individual Files ---
    if len(request.diff_content.splitlines()) > 600:
        print(f"Skipping {request.file_path}: Diff too large (>600 lines).")
        return ReviewResponse(comments=[], is_lgtm=True)
    # ------------------------------------------------------

    language = detect_language(request.file_path)
    
    prompt = build_review_prompt(
        request.file_path, 
        request.diff_content, 
        language,
        request.custom_instructions
    )
    
    try:
        # --- NEW: The 25-Second Timeout Shield ---
        try:
            raw_response = await asyncio.wait_for(call_llm(prompt), timeout=25.0)
        except asyncio.TimeoutError:
            print(f"LLM Timeout on {request.file_path}. Skipping file.")
            return ReviewResponse(comments=[], is_lgtm=True)
        # -----------------------------------------
        
        comments = parse_review_response(raw_response, request.file_path)
        
        return ReviewResponse(
            comments=comments,
            is_lgtm=len(comments) == 0
        )
    except Exception as e:
        print(f"Error during review: {e}")
        raise HTTPException(status_code=500, detail="Failed to process code review")