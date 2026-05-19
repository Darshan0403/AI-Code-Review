from models.schema import ReviewComment
import re

def build_review_prompt(file_path: str, diff_content: str, language: str) -> str:
    return f"""You are a strict, senior software engineer performing a code review.

FILE: {file_path}
LANGUAGE: {language}

DIFF FORMAT:
Each line is prefixed with its actual line number in the file, followed by a '+' for added lines.
Example: 
12: + def my_function():
13: +     return True

CODE CHANGES:
{diff_content}

Review this code change and provide specific, actionable feedback.
Focus ONLY on:
1. Bugs or logic errors
2. Security vulnerabilities
3. Performance issues
4. Missing error handling

RULES:
- Only comment on ADDED lines (lines with '+')
- Be specific — reference exact line content
- Do not nitpick formatting or variable names
- CRITICAL: Actively hunt for Go-specific traps: unclosed resources (missing defer file.Close()), Goroutine/channel leaks, unhandled errors, and insecure packages (like crypto/md5).
- If the code has absolutely zero security, logic, or performance flaws, respond with exactly and only: "LGTM"
- IMPORTANT: Use the EXACT line number provided at the start of the line in your response.

Respond in this EXACT format (one block per issue found):
LINE: <line_number>
SEVERITY: <info|warning|error>
COMMENT: <your specific review comment>
---
"""

def detect_language(file_path: str) -> str:
    ext_map = {
        ".py": "Python", ".go": "Go", ".js": "JavaScript",
        ".ts": "TypeScript", ".java": "Java", ".cpp": "C++",
    }
    ext = "." + file_path.rsplit(".", 1)[-1] if "." in file_path else ""
    return ext_map.get(ext, "Unknown")

def parse_review_response(raw: str, file_path: str) -> list[ReviewComment]:
    # If the AI says it Looks Good To Me, return an empty list
    if raw.strip().upper() == "LGTM":
        return []
    
    comments = []
    blocks = raw.split("---")
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        
        line_num = None
        severity = "info"
        comment_text = ""
        
        for line in block.split("\n"):
            line = line.strip()
            if line.startswith("LINE:"):
                try:
                    # Extract numbers only to prevent crashes if AI outputs "LINE: 5 "
                    line_num_str = line.split(":", 1)[1].strip()
                    line_num = int(re.sub(r'\D', '', line_num_str)) 
                except ValueError:
                    continue
            elif line.startswith("SEVERITY:"):
                severity = line.split(":", 1)[1].strip().lower()
            elif line.startswith("COMMENT:"):
                comment_text = line.split(":", 1)[1].strip()
        
        if line_num and comment_text:
            comments.append(ReviewComment(
                file_path=file_path,
                line=line_num,
                severity=severity,
                comment=comment_text,
            ))
            
    return comments