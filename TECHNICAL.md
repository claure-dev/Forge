# Forge Technical Implementation Guide

## RAG Architecture Deep Dive

### Embedding Pipeline

**Document Processing Flow:**
```
Markdown Files → DirectoryLoader → RecursiveCharacterTextSplitter → OllamaEmbeddings → ChromaDB
```

**Key Parameters:**
- **Chunk Size**: 1000 characters (optimal for LLM context windows)
- **Chunk Overlap**: 200 characters (maintains semantic continuity)
- **Embedding Model**: `all-minilm:l6-v2` (384 dimensions, fast, good quality)
- **Distance Metric**: Cosine distance (range 0-2, lower = more similar)

### Search & Retrieval

**Query Processing:**
1. User query → Ollama embedding (384D vector)
2. ChromaDB cosine similarity search → Top-K document chunks
3. Distance → Similarity conversion: `max(0.0, 1.0 - (distance / 2.0))`
4. Filter by relevance threshold (typically > 0.6)

**Context Assembly:**
```python
# main.py - build_conversation_context()
relevant_docs = search_documents(query, limit=5)  # Top 5 chunks
context = vault_knowledge + conversation_history + instructions
```

### ChromaDB Configuration

**Collection Settings:**
```python
# rag_service.py
collection_metadata={"hnsw:space": "cosine"}  # Explicit cosine distance
```

**Storage:**
- **Persistent Directory**: `./chroma_db/`
- **Auto-creation**: Creates collections on first run
- **Index Type**: HNSW (Hierarchical Navigable Small World)
- **Normalization**: Enabled by default

## Code Architecture

### Core Components

**`main.py` - FastAPI Server:**
- Chat endpoint with RAG integration
- Document search and browsing APIs
- Vault management (configure, rebuild index)
- Session-based conversation memory

**`rag_service.py` - LangChain RAG:**
- `ForgeRAG` class encapsulates all RAG functionality
- Document loading with `DirectoryLoader`
- Text splitting with `RecursiveCharacterTextSplitter`
- Vector storage with `langchain_chroma.Chroma`
- Search with similarity scoring

**`index.html` - Web Interface:**
- Chat interface with document integration
- Search functionality with relevance display
- Document browsing and management
- Real-time status indicators

### Key Classes & Methods

**ForgeRAG Class:**
```python
class ForgeRAG:
    def __init__(self, persist_directory="./chroma_db", model_name="all-minilm:l6-v2")
    def load_and_index_directory(self, directory_path: str) -> int
    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]
    def get_all_documents(self) -> List[Dict[str, Any]]
```

**Global Functions:**
```python
def get_rag_instance() -> ForgeRAG
def rebuild_index(directory_path: str) -> int
def search_documents(query: str, limit: int = 5) -> List[Dict[str, Any]]
```

## Integration Points

### Chat Enhancement

**Context Injection Pattern:**
```python
def build_conversation_context(session_id: str, new_message: str) -> str:
    # 1. RAG search for relevant documents
    relevant_docs = search_documents(new_message, limit=5)
    
    # 2. Assemble context with priorities:
    # - Vault knowledge (primary)
    # - Conversation history (secondary) 
    # - Instructions (guidance)
    
    # 3. Return structured prompt for LLM
```

**Document Reference Format:**
```
=== RELEVANT KNOWLEDGE FROM YOUR VAULT ===
📄 **filename.md** (relevance: 0.82):
[document content chunk...]

📄 **other_file.md** (relevance: 0.75):
[document content chunk...]
==================================================

=== RECENT CONVERSATION ===
Human: Previous question
Assistant: Previous response
==============================

INSTRUCTIONS:
- Use vault knowledge to inform responses
- Reference specific documents when relevant
- Prioritize vault knowledge over general knowledge