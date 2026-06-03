from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from routers import review, index, search, explain
from services.llm import call_llm
from services.vector_store import vector_db
from services.embedder import embed_code

app = FastAPI(title="Code Intelligence Service")

# --- NEW: Allow React to ping the AI Engine directly for Reindexing ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://*.onrender.com",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include existing routers (Clean & Restored)
app.include_router(review.router, prefix="/api")
app.include_router(index.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(explain.router, prefix="/api")

# --- Pydantic Data Validation Schemas ---
class ASTRequest(BaseModel):
    repo_name: str

class SearchRequest(BaseModel):
    repo_name: str
    query: str

@app.on_event("startup")
async def startup_event():
    print("Code Intelligence Service Booting Up...")
    if vector_db.collection is None:
        print("⚠️  ChromaDB not connected — skipping startup test. RAG features disabled.")
        return
    try:
        vector_db.add_functions(
            ids=["test_1"],
            embeddings=[[0.1] * 768],
            metadatas=[{"repo": "test", "file": "main.py"}],
            documents=["def hello_world(): print('Hello')"]
        )
        vector_db.collection.query(query_embeddings=[[0.1] * 768], n_results=1)
        print(" ChromaDB Test Successful!")
    except Exception as e:
        print(f" ChromaDB Test Failed: {e}")


@app.get("/debug/check-function")
async def check_function(repo: str, func_name: str):
    try:
        results = vector_db.collection.get(
            where={
                "$and": [
                    {"repo": repo},
                    {"function_name": func_name}
                ]
            }
        )
        return {
            "found": len(results.get("ids", [])) > 0,
            "count": len(results.get("ids", [])),
            "metadatas": results.get("metadatas", [])
        }
    except Exception as e:
        return {"error": str(e)}



@app.get("/health")
def health():
    return {"status": "ok", "service": "code-intelligence"}

# --- AST File Tree Builder Endpoint ---
# --- AST File Tree Builder Endpoint ---
@app.post("/api/ast")
async def get_ast(req: ASTRequest):
    try:
        # STRICT MATCH ONLY: Fetch only the vectors for this exact repo
        # FIXED TYPO: Changed req.req_name to req.repo_name
        records = vector_db.collection.get(where={"repo": req.repo_name})
        
        # If it's not indexed, fail honestly. No more global fallbacks.
        if not records or not records.get("metadatas") or len(records["metadatas"]) == 0:
            return []
        
        file_map = {}
        for idx, meta in enumerate(records["metadatas"]):
            file_path = meta.get("file") or meta.get("file_path") or "unknown_file.go"
            func_name = meta.get("function_name") or meta.get("name") or f"func_{idx}"
            line_range = meta.get("lines") or meta.get("line_range") or "1-30"
            
            if file_path not in file_map:
                file_map[file_path] = []
                
            if not any(f["name"] == func_name for f in file_map[file_path]):
                file_map[file_path].append({"name": func_name, "lines": str(line_range)})
        
        return [{"file": k, "functions": v} for k, v in file_map.items()]
    except Exception as e:
        print(f"[Explorer API] Error compiling AST view: {e}")
        return []

# --- ChromaDB Nearest Neighbors Vector Search ---
@app.post("/api/search")
async def search_similar(req: SearchRequest):
    try:
        print(f"[Explorer API] Searching nearest neighbors for target: '{req.query}' in '{req.repo_name}'")
        
        # 1. SMART LOOKUP: Find the target function's TRUE vector in ChromaDB
        target_docs = vector_db.collection.get(
            where={
                "$and": [
                    {"repo": req.repo_name},
                    {"function_name": req.query}
                ]
            },
            include=["embeddings"]
        )
        
        # Extract embeddings safely
        target_embeddings = target_docs.get("embeddings") if target_docs else None
        
        # BULLETPROOF CHECK: Use `is None` to prevent NumPy array boolean errors
        if target_embeddings is None or len(target_embeddings) == 0:
            print(f" Target function '{req.query}' not found. Falling back to text-name embedding.")
            query_vector = [embed_code(req.query)]
        else:
            print(f" Found exact mathematical signature for '{req.query}'. Searching vector space...")
            emb = target_embeddings[0]
            
            # Force NumPy arrays back to Python lists to keep ChromaDB happy
            if hasattr(emb, "tolist"):
                emb = emb.tolist()
            query_vector = [emb]
            
        # 2. Query 4 nearest neighbors (Because the #1 match will be the function itself!)
        results = vector_db.collection.query(
            query_embeddings=query_vector,
            where={"repo": req.repo_name},
            n_results=4
        )
        
        output = []
        docs = results.get("documents")
        
        # BULLETPROOF CHECK: Use `is not None`
        if docs is not None and len(docs) > 0 and len(docs[0]) > 0:
            documents = docs[0]
            metadatas = results["metadatas"][0]
            
            # Safe fallback for distances
            dist_array = results.get("distances")
            distances = dist_array[0] if dist_array is not None else [0.1] * len(documents)
            
            for idx, doc in enumerate(documents):
                meta = metadatas[idx]
                
                # Filter out the target function itself from the results
                if meta.get("function_name") == req.query:
                    continue
                    
                dist = distances[idx]
                
                # Math normalization to make CodeBERT cosine distances look clean (0-100%)
                similarity = max(1, min(99, int((1.0 - float(dist)) * 100)))
                if similarity < 50: 
                    similarity = max(40, min(98, 100 - int(float(dist) * 10)))
                
                output.append({
                    "name": meta.get("function_name") or meta.get("name") or "anonymous_func",
                    "file": meta.get("file") or meta.get("file_path") or "unknown_file",
                    "similarity": similarity,
                    "snippet": doc
                })
                
        # 3. Sort by highest match and return top 3
        output.sort(key=lambda x: x["similarity"], reverse=True)
        return output[:3]
    except Exception as e:
        print(f"[Explorer API] Vector computation error: {e}")
        return []      

@app.get("/test-ai")
async def test_ai():
    answer = await call_llm("Explain what a Webhook is in exactly one sentence.")
    return {"ai_says": answer}