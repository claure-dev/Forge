#!/usr/bin/env python3
"""
Bulk import script for Knowledge Vault
Usage: python bulk_import.py /path/to/your/vault
"""

import os
import sys
import requests
import json
from pathlib import Path

FORGE_URL = "http://127.0.0.1:8000"
SUPPORTED_EXTENSIONS = {'.md', '.txt', '.json'}

def upload_file(file_path: Path):
    """Upload a single file to the Knowledge Vault"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Get file metadata
        stat = file_path.stat()
        metadata = {
            "file_size": stat.st_size,
            "last_modified": stat.st_mtime,
            "relative_path": str(file_path.relative_to(vault_root)),
            "imported_via": "bulk_import"
        }
        
        payload = {
            "filename": file_path.name,
            "content": content,
            "metadata": metadata
        }
        
        response = requests.post(f"{FORGE_URL}/upload-document", 
                               json=payload, 
                               timeout=30)
        
        if response.status_code == 200:
            print(f"✅ {file_path.name}")
            return True
        else:
            print(f"❌ {file_path.name}: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ {file_path.name}: {e}")
        return False

def find_supported_files(directory: Path):
    """Find all supported files in directory"""
    files = []
    for file_path in directory.rglob('*'):
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
            files.append(file_path)
    return sorted(files)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python bulk_import.py /path/to/your/vault")
        sys.exit(1)
    
    vault_root = Path(sys.argv[1])
    if not vault_root.exists():
        print(f"Error: Directory {vault_root} does not exist")
        sys.exit(1)
    
    # Check if Forge is running
    try:
        response = requests.get(f"{FORGE_URL}/browse-documents", timeout=5)
        if response.status_code != 200:
            print("Error: Forge server not responding correctly")
            sys.exit(1)
    except requests.exceptions.RequestException:
        print("Error: Cannot connect to Forge server. Is it running on http://127.0.0.1:8000?")
        sys.exit(1)
    
    # Find all supported files
    files = find_supported_files(vault_root)
    
    if not files:
        print(f"No supported files (.md, .txt, .json) found in {vault_root}")
        sys.exit(0)
    
    print(f"Found {len(files)} supported files in {vault_root}")
    print(f"Supported extensions: {', '.join(SUPPORTED_EXTENSIONS)}")
    print()
    
    # Upload files
    success_count = 0
    for file_path in files:
        if upload_file(file_path):
            success_count += 1
    
    print(f"\n📊 Import complete: {success_count}/{len(files)} files uploaded successfully")