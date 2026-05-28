from fastapi import APIRouter
from pydantic import BaseModel
from services.embedder import embed_code
from services.vector_store import vector_db

router = APIRouter()

class SearchRequest(BaseModel):
    code: str
    repo_name: str
    top_k: int = 3

@router.post("/search-similar")
async def search_similar(req: SearchRequest):
    print(f" Searching for code similar to snippet in {req.repo_name}...")
    
    # 1. Convert the incoming PR code into a vector
    query_vector = embed_code(req.code)
    
    # 2. Query ChromaDB for the closest matches in THIS specific repo
    try:
        results = vector_db.collection.query(
            query_embeddings=[query_vector],
            n_results=req.top_k,
            where={"repo_name": req.repo_name}
        )
    except Exception as e:
        print(f"ChromaDB Query Error: {e}")
        return {"matches": []}

    matches = []
    
    # 3. Format the results nicely
    if results and results.get("documents") and len(results["documents"][0]) > 0:
        for i in range(len(results["documents"][0])):
            matches.append({
                "function_name": results["metadatas"][0][i]["function_name"],
                "file_path": results["metadatas"][0][i]["file_path"],
                "code_snippet": results["documents"][0][i],
                # Chroma uses distance (lower is better) for cosine by default in hnsw
                "distance": results["distances"][0][i] 
            })
            
    print(f" Found {len(matches)} similar functions.")
    return {"matches": matches}