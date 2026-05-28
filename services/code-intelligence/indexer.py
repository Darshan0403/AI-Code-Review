import os
import shutil
import subprocess
import uuid
import re
import ast
from services.vector_store import vector_db
from services.embedder import embed_code

# We use a temporary directory for the shallow clones
CLONE_DIR = "/tmp/repo_index"

def parse_python_file(filepath):
    functions = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            source = f.read()
        
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                func_code = ast.get_source_segment(source, node)
                if func_code:
                    functions.append({
                        "name": node.name,
                        "lines": f"{node.lineno}-{node.end_lineno}",
                        "code": func_code
                    })
    except Exception as e:
        print(f" Skipping Python file {filepath}: {e}", flush=True)
    return functions

def parse_go_file(filepath):
    functions = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        source = "".join(lines)
        pattern = re.compile(r'func\s+(\w+)\s*\([^)]*\).*?{', re.DOTALL)
        
        for match in pattern.finditer(source):
            func_name = match.group(1)
            start_line = source.count('\n', 0, match.start()) + 1
            
            brace_count = 0
            in_func = False
            func_code_lines = []
            
            for line_idx, line in enumerate(lines[start_line-1:], start=start_line):
                func_code_lines.append(line)
                if '{' in line:
                    brace_count += line.count('{')
                    in_func = True
                if '}' in line:
                    brace_count -= line.count('}')
                
                if in_func and brace_count == 0:
                    functions.append({
                        "name": func_name,
                        "lines": f"{start_line}-{line_idx}",
                        "code": "".join(func_code_lines)
                    })
                    break
    except Exception as e:
        print(f" Skipping Go file {filepath}: {e}", flush=True)
    return functions

def parse_js_file(filepath):
    """Basic Regex to extract JS/TS standard and arrow functions."""
    functions = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        source = "".join(lines)
        
        # Matches: `function myFunc(` OR `const myFunc = (` OR `const myFunc = async (`
        pattern = re.compile(r'(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>\s*{)', re.DOTALL)
        
        for match in pattern.finditer(source):
            func_name = match.group(1) or match.group(2)
            if not func_name:
                continue
                
            start_line = source.count('\n', 0, match.start()) + 1
            brace_count = 0
            in_func = False
            func_code_lines = []
            
            for i in range(start_line - 1, len(lines)):
                line = lines[i]
                func_code_lines.append(line)
                if '{' in line:
                    brace_count += line.count('{')
                    in_func = True
                if '}' in line:
                    brace_count -= line.count('}')
                    
                if in_func and brace_count == 0:
                    functions.append({
                        "name": func_name,
                        "lines": f"{start_line}-{i + 1}",
                        "code": "".join(func_code_lines)
                    })
                    break
    except Exception as e:
        print(f" Skipping JS/TS file {filepath}: {e}", flush=True)
    return functions

def index_repository(repo_full_name: str):
    print(f"\n Starting Real Indexing Pipeline for {repo_full_name}...", flush=True)
    repo_path = os.path.join(CLONE_DIR, repo_full_name.replace("/", "_"))
    
    if os.path.exists(repo_path):
        shutil.rmtree(repo_path)
        
    clone_url = f"https://github.com/{repo_full_name}.git"
    try:
        print(f" Cloning {clone_url}...", flush=True)
        subprocess.run(["git", "clone", "--depth", "1", clone_url, repo_path], check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        print(f" Failed to clone repository: {e.stderr.decode()}", flush=True)
        return
        
    print(" Parsing AST and extracting functions...", flush=True)
    all_functions = []
    
    for root, dirs, files in os.walk(repo_path):
        if '.git' in root or 'vendor' in root or 'node_modules' in root or 'dist' in root or 'build' in root:
            continue
            
        for file in files:
            filepath = os.path.join(root, file)
            rel_path = os.path.relpath(filepath, repo_path)
            
            extracted = []
            if file.endswith('.py'):
                extracted = parse_python_file(filepath)
            elif file.endswith('.go'):
                extracted = parse_go_file(filepath)
            elif file.endswith(('.js', '.jsx', '.ts', '.tsx')): # <-- NOW SUPPORTS WEB DEVS
                extracted = parse_js_file(filepath)
                
            for func in extracted:
                func["file"] = rel_path
                all_functions.append(func)

    if not all_functions:
        shutil.rmtree(repo_path)
        print(f" No parsable functions found for {repo_full_name}. Destroying clone.", flush=True)
        return

    print(f" Generating CodeBERT Vectors for {len(all_functions)} functions... (This might take a minute)", flush=True)
    
    ids = []
    documents = []
    metadatas = []
    embeddings = []
    
    for func in all_functions:
        ids.append(str(uuid.uuid4()))
        documents.append(func["code"])
        metadatas.append({
            "repo": repo_full_name,
            "file": func["file"],
            "function_name": func["name"],
            "lines": func["lines"]
        })
        embeddings.append(embed_code(func["code"]))
        
    print(" Upserting into ChromaDB...", flush=True)
    try:
        vector_db.collection.delete(where={"repo": repo_full_name})
        vector_db.collection.add(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents)
    except Exception as e:
        print(f" ChromaDB Write Error: {e}", flush=True)

    print(" Destroying temporary clone...", flush=True)
    shutil.rmtree(repo_path)
    
    print(f" Successfully Indexed {len(all_functions)} functions for {repo_full_name}!", flush=True)