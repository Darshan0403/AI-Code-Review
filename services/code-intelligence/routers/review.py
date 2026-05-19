from fastapi import APIRouter, HTTPException
from models.schema import ReviewRequest, ReviewResponse
from services.llm import call_llm
from services.parser import build_review_prompt, parse_review_response, detect_language

router = APIRouter()

@router.post("/review", response_model=ReviewResponse)
async def review_code(request: ReviewRequest):
    print(f"Received review request for {request.repo} PR #{request.pr_number} - File: {request.file_path}")
    
    # 1. Figure out what language we are reviewing
    language = detect_language(request.file_path)
    
    # 2. Build the strict prompt
    prompt = build_review_prompt(request.file_path, request.diff_content, language)
    
    try:
        # 3. Send it to Groq!
        raw_response = await call_llm(prompt)
        
        # 4. Parse the unstructured text into clean JSON
        comments = parse_review_response(raw_response, request.file_path)
        
        # 5. Package it up and send it back to Go
        return ReviewResponse(
            comments=comments,
            is_lgtm=len(comments) == 0
        )
    except Exception as e:
        print(f"Error during review: {e}")
        raise HTTPException(status_code=500, detail="Failed to process code review")