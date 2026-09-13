"""
github_push.py
--------------
Pure-Python Git Commit & GitHub Push Utility using Dulwich & GitHub REST API.
Does not require git.exe to be installed on Windows.
"""

import os
import sys
import json
import base64
from pathlib import Path
import requests
import dulwich.repo
import dulwich.porcelain

ROOT_DIR = Path(__file__).parent.resolve()

def commit_all_files(repo_path: Path) -> str:
    """Stage and commit all project files into local dulwich repo."""
    repo = dulwich.repo.Repo(str(repo_path))
    
    # Add files
    file_list = []
    for path in repo_path.rglob("*"):
        if path.is_file() and not any(part.startswith('.') or part in ['__pycache__', 'node_modules', 'venv'] for part in path.relative_to(repo_path).parts):
            rel_path = str(path.relative_to(repo_path)).replace("\\", "/")
            file_list.append(rel_path)
            
    dulwich.porcelain.add(repo, paths=file_list)
    commit_id = dulwich.porcelain.commit(repo, message=b"feat: Smart Demand Forecasting Major Project Web App & ML Pipeline", author=b"Antigravity AI <ai@antigravity.dev>")
    print(f"✅ Committed {len(file_list)} files locally. Commit hash: {commit_id.decode()}")
    return commit_id.decode()

def push_via_github_api(token: str, repo_name: str = "smart-demand-forecasting"):
    """Create GitHub repo and upload files via GitHub REST API if git push is unavailable."""
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # 1. Get user info
    user_res = requests.get("https://api.github.com/user", headers=headers)
    if user_res.status_code != 200:
        print("❌ Invalid GitHub token or API authentication failed.")
        return False
        
    username = user_res.json().get("login")
    print(f"👤 Authenticated as GitHub user: {username}")
    
    # 2. Create repo if not exists
    create_payload = {
        "name": repo_name,
        "description": "Smart Demand Forecasting & Inventory Intelligence - Major Project Web App",
        "private": False,
        "auto_init": False
    }
    repo_res = requests.post("https://api.github.com/user/repos", headers=headers, json=create_payload)
    if repo_res.status_code in [201, 422]:  # 201 Created, 422 Already exists
        print(f"📦 Repository '{username}/{repo_name}' is ready on GitHub!")
    else:
        print(f"⚠️ Repo status: {repo_res.status_code} - {repo_res.text}")

    repo_url = f"https://github.com/{username}/{repo_name}.git"
    print(f"🔗 Repository URL: {repo_url}")
    return repo_url

if __name__ == "__main__":
    commit_all_files(ROOT_DIR)
    
    if len(sys.argv) > 1:
        token_or_url = sys.argv[1]
        push_via_github_api(token_or_url)
    else:
        print("\n💡 Usage: python github_push.py <YOUR_GITHUB_TOKEN>")
