from pydantic import BaseModel
from typing import List

class ReviewRequest(BaseModel):
    file_path: str
    diff_content: str
    pr_number: int
    repo: str
    custom_instructions: str = ""  

class ReviewComment(BaseModel):
    file_path: str
    line: int
    severity: str  # info, warning, error
    comment: str

class ReviewResponse(BaseModel):
    comments: List[ReviewComment]
    is_lgtm: bool