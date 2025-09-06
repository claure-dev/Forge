# Phase 2: Knowledge Vault Integration (Hybrid Approach)

## Current Status ✅
- **Semantic embedding system** working with `paraphrase-MiniLM-L6-v2`
- **Session-based conversation memory** active
- **UI/UX improvements** complete (dropdown, focus, loading indicators)
- **Ready for hybrid persistence + knowledge vault integration**

## Phase 2 Goals 🎯
**Hybrid Approach**: Persistent conversation memory + Knowledge Vault file system integration

### Core Objectives
- Transform from session-based to **persistent conversation memory**
- Add **File System Access API** for Knowledge-OS markdown files
- Create **unified AI context** from both conversations AND documents
- Build **file browser interface** for vault navigation
- Implement **bidirectional file operations** (read/write markdown)

## Implementation Steps

### Step 1: ChromaDB Foundation
```bash
pip install chromadb
```

**Create dual-collection architecture:**
```python
# Collection 1: Persistent conversations (upgrade current system)
conversations_collection = chroma_client.create_collection("conversations")

# Collection 2: Knowledge Vault documents (new)
documents_collection = chroma_client.create_collection("knowledge_vault")
```

### Step 2: Persistent Conversation Memory
- **Replace** `conversations: Dict` with ChromaDB collection
- **Maintain** current semantic context system
- **Add** cross-session conversation search
- **Test** conversation persistence across server restarts

### Step 3: File System Access Integration
- **Implement** File System Access API for selecting markdown files
- **Add** file metadata display (path, modified date, size)
- **Create** document embedding and storage pipeline
- **Build** file browser interface in frontend

### Step 4: Unified AI Context System
- **Modify** context retrieval to search BOTH:
  - Relevant past conversations (existing system)
  - Relevant documents from Knowledge Vault (new)
- **Implement** combined context ranking and selection
- **Add** context source indicators (conversation vs document)

### Step 5: Interactive File Operations
- **Add** markdown rendering for file content display
- **Implement** file editing capabilities
- **Create** new file creation interface
- **Build** basic file organization features

## Implementation Checklist

### Backend (`main.py`)
- [ ] Install and configure ChromaDB client
- [ ] Create `conversations_collection` with existing conversation data
- [ ] Create `documents_collection` for Knowledge Vault files
- [ ] Update `get_relevant_context()` for unified search
- [ ] Add `/upload-document` endpoint for file ingestion
- [ ] Add `/browse-files` endpoint for file system navigation
- [ ] Add `/read-file` and `/write-file` endpoints

### Frontend (`index.html`)
- [ ] Add File System Access API integration
- [ ] Create file browser/selector interface
- [ ] Add file upload and display components
- [ ] Implement markdown rendering for documents
- [ ] Add file metadata display
- [ ] Create file editing interface

### New Dependencies
```txt
chromadb>=0.4.0
python-multipart  # Already have
```

## Expected Benefits

### Immediate (Step 2)
- ✅ **Persistent conversations** - Chat history survives restarts
- ✅ **Cross-session memory** - AI remembers everything from past sessions
- ✅ **Better context** - Draw from entire conversation history

### Knowledge Vault Integration (Steps 3-5)
- ✅ **File-aware AI** - Responses use your Knowledge Vault content
- ✅ **Unified search** - Find relevant info from conversations AND documents
- ✅ **Interactive editing** - Read, write, and organize knowledge files
- ✅ **Context-rich responses** - AI draws from both chat history and documents

## Architecture Benefits
- **Same embedding model** for conversations AND documents
- **Unified semantic search** across all knowledge sources  
- **Scalable foundation** for Phase 3 wiki-linking and graph visualization
- **Local-first** - All data stays on your machine

## Files to Modify
- `main.py` - Add ChromaDB backend + file system endpoints
- `index.html` - Add file browser and upload UI
- `requirements.txt` - Add chromadb dependency
- `PHASE2.md` - This plan document
- `README.md` - Update with Phase 2 features

## Current Architecture Preserved
- ✅ Same semantic embedding system (`paraphrase-MiniLM-L6-v2`)
- ✅ Same UI/UX improvements and chat interface
- ✅ Same FastAPI structure and endpoints
- ✅ Same context building and ranking logic
- ✅ Graceful fallbacks for embedding failures

**Phase 2 transforms Forge from a smart chat system into a complete Knowledge Management platform!** 🚀

## Success Criteria
- [ ] Conversations persist across browser refreshes and server restarts
- [ ] AI can reference previous conversations from any session
- [ ] File System Access API working for selecting Knowledge Vault files
- [ ] AI responses incorporate content from both conversations and documents
- [ ] File browser allows navigation and selection of markdown files
- [ ] Basic file editing and creation functionality working

**Ready for hybrid Knowledge Vault integration tomorrow!**