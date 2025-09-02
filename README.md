# 🔥 Forge - Localhost-First AI Knowledge Management System

A RAG-enhanced AI assistant that provides semantic search and intelligent chat responses using your personal knowledge vault, powered by LangChain, ChromaDB, and Ollama.

## ✅ Current Status: Phase 2 Complete

**Phase 1: Enhanced Chat System** ✅ COMPLETE  
**Phase 2: RAG Knowledge Vault Integration** ✅ COMPLETE

### Phase 2 Features Implemented:
- **🧠 RAG-Enhanced Chat**: AI responses that reference your specific documents
- **🔍 Semantic Search**: Find relevant information across your entire knowledge base using LangChain
- **📁 Knowledge Vault Integration**: Index and search markdown files from your vault
- **🏠 Localhost-First**: Everything runs locally - no cloud dependencies
- **⚡ ChromaDB Vector Storage**: Persistent semantic indexing with cosine similarity
- **📊 Document Relevance Scoring**: Shows similarity scores for search results
- **🔄 Live Index Management**: Configure vault, rebuild index via API

## Quick Start

### Prerequisites

1. **Ollama** installed and running with required models:
   ```bash
   # Install embedding model (384-dimensional, optimized for RAG)
   ollama pull all-minilm:l6-v2
   
   # Install chat model
   ollama pull llama3.1:8b
   
   # Verify Ollama is running
   ollama list
   curl http://localhost:11434/api/tags
   ```

2. **Python 3.8+** with required packages:
   ```bash
   pip install fastapi uvicorn langchain langchain-chroma langchain-ollama langchain-community
   ```

### Installation & Startup

```bash
# Start the server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# OR use Python directly
python3 main.py
```

### Access Points
- **Web Interface**: http://127.0.0.1:8000
- **API Documentation**: http://127.0.0.1:8000/docs  

## Configuration

### Setting Up Your Knowledge Vault

1. **Prepare Your Documents**: Place markdown files in a directory
   ```
   your_vault/
   ├── Notes/
   │   ├── research.md
   │   └── ideas.md
   ├── Projects/
   │   └── project_notes.md
   └── Reference/
       └── documentation.md
   ```

2. **Configure Vault Path** via web interface or API:
   ```bash
   curl -X POST "http://127.0.0.1:8000/configure-vault" \
        -H "Content-Type: application/json" \
        -d '{"vault_directory": "/path/to/your/vault"}'
   ```

3. **Build Search Index**:
   ```bash
   curl -X POST "http://127.0.0.1:8000/rebuild-index"
   ```

## Usage

### RAG-Enhanced Chat

The AI now has access to your entire knowledge vault and will:
- **Reference specific documents** in responses (e.g., "According to your research.md...")
- **Prioritize vault knowledge** over general AI knowledge
- **Maintain conversation context** while incorporating document insights

**Example Interaction:**
```
Human: "How do I restart my Omada Controller?"
AI: "According to your Omada Controller.md, you can restart the Docker container with: `docker restart omada-controller`"
```

### Search & Browse

- **Semantic Search**: Find documents by meaning, not just keywords
- **Similarity Scores**: 0.7+ indicates high relevance
- **Document Preview**: See content snippets in search results
- **Full Document Access**: Browse entire document library

## API Endpoints

### Chat (RAG-Enhanced)
```bash
curl -X POST "http://127.0.0.1:8000/chat" \
     -H "Content-Type: application/json" \
     -d '{
       "message": "What are my project ideas?",
       "model": "llama3.1:8b"
     }'
```

### Semantic Search
```bash
curl -X POST "http://127.0.0.1:8000/search-documents" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "machine learning",
       "limit": 5
     }'
```

### Vault Management
```bash
# Check vault status
curl "http://127.0.0.1:8000/vault-status"

# Browse all documents
curl "http://127.0.0.1:8000/browse-documents"

# Rebuild search index
curl -X POST "http://127.0.0.1:8000/rebuild-index"
```

## Technical Architecture

### RAG (Retrieval-Augmented Generation) Flow

1. **Document Indexing**: 
   - Markdown files split into 1000-character chunks (200 overlap)
   - Converted to 384-dimensional embeddings via Ollama
   - Stored in ChromaDB with cosine distance metric

2. **Query Processing**: 
   - User questions converted to embeddings
   - Semantic search finds top 5 relevant document chunks
   - Similarity scores calculated (higher = more relevant)

3. **Context Enhancement**: 
   - Relevant documents injected into AI prompt
   - Combined with conversation history (last 3 exchanges)
   - AI instructed to prioritize vault knowledge

4. **Response Generation**: 
   - AI responds using both vault knowledge and conversation context
   - References specific documents when relevant

### Technology Stack

- **Backend**: FastAPI (Python 3.8+)
- **Vector Database**: ChromaDB with persistent storage
- **Embeddings**: Ollama all-minilm:l6-v2 (384D, optimized for semantic search)
- **Text Processing**: LangChain RecursiveCharacterTextSplitter
- **LLM**: Ollama llama3.1:8b (configurable)
- **Storage**: Persistent ChromaDB in `./chroma_db/`

### File Structure
```
Forge/
├── main.py              # FastAPI server with RAG integration
├── rag_service.py       # LangChain RAG implementation
├── index.html           # Web interface with search functionality
├── chroma_db/          # Vector database (auto-created)
├── test_obsidian_vault/ # Example vault directory
└── README.md           # This documentation
```

## Performance & Scaling

### Current Capabilities
- **Small Vault** (1-50 files): Near-instant responses
- **Medium Vault** (50-500 files): 1-3 second responses  
- **Large Vault** (500+ files): Consider optimization

### Tested Configuration
- ✅ **78 markdown files** indexed successfully
- ✅ **412 text chunks** with semantic embeddings
- ✅ **Realistic similarity scores** (0.6-0.8 range)
- ✅ **Sub-second search responses** on modern hardware

### Optimization Settings
- **Chunk Size**: 1000 characters (balance of context vs precision)
- **Chunk Overlap**: 200 characters (maintains context across splits)
- **Search Results**: Top 5 documents per chat query
- **Distance Metric**: Cosine (best for semantic similarity)

## Troubleshooting

### Common Issues

**"Ollama Connection Error"**
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve

# Verify required models
ollama list | grep -E "(all-minilm|llama3.1)"
```

**"No Search Results" or "Poor Relevance"**
```bash
# Check vault configuration
curl "http://127.0.0.1:8000/vault-status"

# Rebuild index
curl -X POST "http://127.0.0.1:8000/rebuild-index"

# Test search directly
python3 -c "from rag_service import search_documents; print(search_documents('test query', 3))"
```

**"AI Not Using Vault Knowledge"**
- Ensure similarity scores > 0.6 for relevant results
- Try more specific queries that match your document content
- Check that vault path contains markdown files

### Debug Commands

```bash
# Verify RAG service
python3 -c "from rag_service import get_rag_instance; rag = get_rag_instance(); print('RAG initialized successfully')"

# Check document count
python3 -c "from rag_service import get_all_documents; print(f'Indexed documents: {len(get_all_documents())}')"

# Test embeddings
python3 -c "from rag_service import ForgeRAG; rag=ForgeRAG(); print(f'Embedding dimensions: {len(rag.embeddings.embed_query(\"test\"))}')"
```

## Development & Customization

### Key Configuration Points

**Embedding Model** (`rag_service.py`):
```python
# Change embedding model (requires rebuild)
model_name: str = "all-minilm:l6-v2"  # 384D, fast, good quality
```

**Chunk Settings** (`rag_service.py`):
```python
# Adjust text chunking
chunk_size=1000,      # Characters per chunk
chunk_overlap=200,    # Overlap between chunks
```

**Search Behavior** (`main.py`):
```python
# Documents sent to AI per query
relevant_docs = search_documents(new_message, limit=5)
```

### Adding Features

1. **New API Endpoints**: Extend `main.py`
2. **RAG Functionality**: Modify `rag_service.py`  
3. **UI Components**: Update `index.html`

## Security & Privacy

- **Localhost Only**: Server binds to 127.0.0.1 (no external access)
- **No Authentication**: Designed for single-user local use
- **Local Processing**: All AI and embeddings run via Ollama locally
- **No Cloud Calls**: Complete independence from external services
- **File Access**: Limited to configured vault directory

## Next Phase: Advanced Features

### Phase 3 Roadmap
- **🔄 Live File Watching**: Auto-sync when vault files change
- **📊 Advanced Analytics**: Document relationship mapping
- **🔗 Cross-References**: Wiki-style linking between documents
- **🎯 Smart Suggestions**: AI-powered document recommendations
- **📁 Multi-Vault Support**: Organize knowledge across multiple vaults

---

**Current Status**: Fully functional RAG-enhanced AI assistant with semantic search across personal knowledge vault. Ready for daily use as an AI-powered knowledge companion.

**Last Updated**: Phase 2 completion with LangChain RAG integration