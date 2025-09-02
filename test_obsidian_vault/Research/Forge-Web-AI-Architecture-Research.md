---
type: research
created: 2025-08-30
tags: [research, ai, web-development, knowledge-management]
research-status: active
research-domain: [ai-orchestration, web-architecture, local-deployment]
---

# Forge Web AI Architecture Research

*Comprehensive technical analysis for building a web-based AI-powered personal knowledge management system to replace Claude Code functionality with local Ollama models*

## Research Scope

**Core Question**: What is the optimal technical architecture for a web-based Knowledge-OS AI interface that provides file browsing, semantic search, and AI chat capabilities using local Ollama models?

**Key Requirements Analysis**:
- Three-panel interface: file browser (left) + chat (center) + file preview (right)
- Semantic search across entire knowledge vault using local embeddings
- AI file reference and opening capabilities
- Integration with existing Knowledge-OS structure and workflows
- Incremental development path suitable for Claude Code assistance
- Efficient deployment on local network (Beelink Mini PC + Desktop PC for GPU/Ollama)

## Key Findings

### 1. Backend Framework Analysis: FastAPI vs Flask

**FastAPI (Recommended)**:
- **Advantages**: 
  - Built-in async support ideal for AI model calls and file operations
  - Automatic OpenAPI documentation for API development
  - Type hints and Pydantic validation reduce bugs
  - WebSocket support for real-time chat interface
  - Static file serving built-in
  - Better performance for I/O heavy operations (file watching, embedding updates)

- **Architecture Pattern**:
  ```python
  # Main application structure
  app = FastAPI()
  app.mount("/static", StaticFiles(directory="static"), name="static")
  
  # WebSocket for chat
  @app.websocket("/ws/chat")
  async def websocket_chat(websocket: WebSocket):
      # Handle real-time AI conversations
  
  # REST API for file operations
  @app.get("/api/files")
  async def list_files():
      # File system operations
  
  # Serve main application
  @app.get("/")
  async def serve_app():
      return FileResponse("static/index.html")
  ```

**Flask Alternative**:
- Simpler learning curve but requires additional libraries (Flask-SocketIO, async extensions)
- Less optimal for AI model integration patterns
- More manual configuration for WebSocket and static file handling

**Recommendation**: FastAPI for better async support, built-in features, and scalability

### 2. Frontend Architecture: Progressive Enhancement Approach

**Recommended: Vanilla JS with Progressive Enhancement**
- **Phase 1**: Pure HTML/CSS/JS with Web Components for modularity
- **Phase 2**: Add lightweight framework (Alpine.js or Lit) if needed
- **Phase 3**: Consider React/Vue only if complexity demands it

**Architecture Benefits**:
- Immediate development start without build tools
- Easy debugging and modification by Claude Code
- Minimal dependencies and faster loading
- Can upgrade incrementally based on actual needs

**Core Components**:
```javascript
// File Browser Component
class FileBrowser extends HTMLElement {
    // Tree view with Knowledge-OS folder structure
    // Click handlers for file selection
    // Folder expansion/collapse
}

// Chat Interface Component  
class ChatInterface extends HTMLElement {
    // WebSocket connection to FastAPI backend
    // Message history display
    // File reference handling
}

// File Preview Component
class FilePreview extends HTMLElement {
    // Markdown rendering for .md files
    // Code highlighting for source files
    // PDF/image preview capabilities
}
```

### 3. Local AI Integration with Ollama

**HTTP API Pattern (Recommended)**:
```python
import httpx

class OllamaClient:
    def __init__(self, base_url="http://desktop-pc:11434"):
        self.base_url = base_url
        self.client = httpx.AsyncClient()
    
    async def chat(self, model: str, messages: list):
        response = await self.client.post(
            f"{self.base_url}/api/chat",
            json={
                "model": model,
                "messages": messages,
                "stream": True
            }
        )
        # Handle streaming response
    
    async def embed(self, model: str, text: str):
        response = await self.client.post(
            f"{self.base_url}/api/embeddings",
            json={"model": model, "prompt": text}
        )
        return response.json()["embedding"]
```

**Model Selection Strategy**:
- **Chat Model**: llama3.1:8b or codellama:7b for code understanding
- **Embedding Model**: nomic-embed-text or all-minilm for semantic search
- **Network Configuration**: Desktop PC runs Ollama with GPU, Beelink accesses via LAN

### 4. RAG Implementation with Local Vector Database

**Recommended: ChromaDB for Simplicity**

**Architecture**:
```python
import chromadb
from chromadb.config import Settings

class KnowledgeVault:
    def __init__(self):
        self.client = chromadb.PersistentClient(
            path="./chroma_db",
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection("knowledge_os")
    
    async def add_documents(self, documents: list, metadatas: list):
        # Batch embedding with Ollama
        embeddings = []
        for doc in documents:
            embedding = await ollama_client.embed("nomic-embed-text", doc)
            embeddings.append(embedding)
        
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
            ids=[f"doc_{i}" for i in range(len(documents))]
        )
    
    def search(self, query_embedding: list, n_results: int = 5):
        return self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"]
        )
```

**Alternative Considerations**:
- **FAISS**: Better performance for large datasets (>100k documents)
- **Qdrant**: More features but increased complexity
- **ChromaDB**: Best balance of simplicity and functionality for Knowledge-OS scale

### 5. File System Watching and Incremental Updates

**Watchdog-Based Implementation**:
```python
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import asyncio
from pathlib import Path

class KnowledgeWatcher(FileSystemEventHandler):
    def __init__(self, knowledge_vault: KnowledgeVault):
        self.vault = knowledge_vault
        self.queue = asyncio.Queue()
    
    def on_modified(self, event):
        if event.is_directory or not event.src_path.endswith('.md'):
            return
        asyncio.create_task(self.process_file_change(event.src_path))
    
    async def process_file_change(self, file_path: str):
        # Read file content
        content = Path(file_path).read_text()
        
        # Extract metadata (frontmatter parsing)
        metadata = self.extract_metadata(content)
        
        # Update or add to vector database
        await self.vault.update_document(file_path, content, metadata)
```

**Incremental Update Strategy**:
- Hash-based change detection to avoid unnecessary re-embedding
- Batch processing for multiple simultaneous changes
- Background processing to avoid UI blocking

### 6. Network Deployment Architecture

**Recommended Deployment Pattern**:

**Beelink Mini PC (Web Application Server)**:
- Runs FastAPI application
- Serves web interface on LAN (e.g., http://192.168.1.100:8000)
- Maintains ChromaDB vector database
- Handles file system watching and updates

**Desktop PC (AI Processing Server)**:  
- Runs Ollama with GPU acceleration
- Provides embedding and chat models via HTTP API
- Accessible to Beelink via LAN (e.g., http://192.168.1.101:11434)

**Configuration Example**:
```python
# config.py
OLLAMA_BASE_URL = "http://192.168.1.101:11434"  # Desktop PC
KNOWLEDGE_PATH = "/home/adam/Projects/Knowledge-OS"
WEB_HOST = "0.0.0.0"  # Allow LAN access
WEB_PORT = 8000
VECTOR_DB_PATH = "./chroma_db"
```

### 7. File Preview and Editing in Browser

**Preview Implementation**:
```javascript
class FilePreview extends HTMLElement {
    async renderFile(filePath, fileType) {
        switch(fileType) {
            case 'markdown':
                const content = await this.fetchFile(filePath);
                this.innerHTML = await this.renderMarkdown(content);
                break;
            case 'image':
                this.innerHTML = `<img src="/api/files/${filePath}" />`;
                break;
            case 'pdf':
                this.innerHTML = `<embed src="/api/files/${filePath}" type="application/pdf" />`;
                break;
            default:
                const rawContent = await this.fetchFile(filePath);
                this.innerHTML = `<pre><code>${this.escapeHtml(rawContent)}</code></pre>`;
        }
    }
}
```

**Editing Capabilities**:
- **Phase 1**: Read-only preview with syntax highlighting
- **Phase 2**: Simple text editor with save functionality
- **Phase 3**: Rich markdown editor if needed

**Libraries**:
- **Markdown rendering**: marked.js or markdown-it
- **Syntax highlighting**: Prism.js or highlight.js
- **Code editing**: CodeMirror 6 (lightweight) or Monaco Editor (full-featured)

### 8. Authentication Patterns

**Development Phase**: No authentication (local network only)

**Production Considerations**:
```python
# Simple session-based auth for LAN deployment
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Simple token validation for local network
    if credentials.credentials != EXPECTED_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return credentials.credentials
```

**Recommendations**:
- **Local development**: No auth required
- **LAN deployment**: Simple token-based auth
- **External access**: VPN + token authentication

## Potential Atomic Projects

### Phase 1: Foundation (1-2 weeks)
**Project: Basic Web Interface Setup**
- FastAPI application with static file serving
- Three-panel HTML/CSS layout
- File system API endpoints
- Basic file preview (text/markdown)
- Success Criteria: Can browse Knowledge-OS files in web interface

### Phase 2: AI Integration (1-2 weeks)  
**Project: Ollama Chat Integration**
- WebSocket chat interface
- Ollama HTTP client integration
- Basic conversation handling
- File reference system
- Success Criteria: Can chat with local AI models about files

### Phase 3: Semantic Search (1-2 weeks)
**Project: RAG Implementation**
- ChromaDB integration
- Document embedding pipeline
- Search interface and results display
- File system watching for updates
- Success Criteria: Can semantically search entire knowledge vault

### Phase 4: Enhanced UX (1-2 weeks)
**Project: Advanced File Operations**
- Rich file preview (images, PDFs, code highlighting)
- File editing capabilities
- Improved chat interface with context awareness
- Performance optimizations
- Success Criteria: Full-featured knowledge management interface

## Prerequisites

**Infrastructure Dependencies**:
- Beelink Mini PC with sufficient storage for vector database
- Desktop PC with GPU for Ollama models
- Local network connectivity between machines
- Python 3.10+ on both machines

**Software Dependencies**:
- Ollama installed and configured on Desktop PC
- Required models downloaded (llama3.1:8b, nomic-embed-text)
- FastAPI, ChromaDB, watchdog Python packages
- Modern web browser with JavaScript enabled

## Integration Strategy

**Knowledge-OS Compatibility**:
- Respects existing folder structure and file organization
- Preserves all existing workflows (daily notes, projects, MOCs)
- Enhances rather than replaces current Obsidian-based editing
- Maintains all wiki-linking and metadata standards

**Incremental Migration Path**:
1. **Parallel deployment**: Web interface alongside existing Claude Code workflow
2. **Selective usage**: Use web interface for search and file browsing, maintain editing in Obsidian
3. **Gradual transition**: Move AI interaction to web interface as features mature
4. **Full replacement**: Eventually replace Claude Code dependency with local web solution

## Cost/Benefit Analysis

**Development Costs**:
- **Time investment**: 4-8 weeks for full implementation across 4 atomic projects
- **Learning curve**: FastAPI, ChromaDB, Ollama integration patterns
- **Infrastructure setup**: Ollama configuration, model downloads, network setup

**Strategic Benefits**:
- **Independence**: Eliminates Claude Code dependency for AI assistance
- **Privacy**: All AI processing remains local, no external API calls
- **Performance**: Local models provide faster response times for many tasks
- **Customization**: Full control over AI behavior and knowledge integration
- **Accessibility**: Web interface usable from any device on local network
- **Scalability**: Foundation for advanced knowledge management features

**Technical Benefits**:
- **Always available**: No internet dependency for AI assistance
- **Contextual search**: Semantic search across entire knowledge vault
- **File integration**: AI can directly reference and work with specific files
- **Multi-device access**: Use from phone, tablet, or any computer on network

## Related Research

**Technology Integration**:
- Links to existing [[Network-Foundation-Project]] for deployment infrastructure
- Connects to [[AI-Orchestration-Strategy]] for local AI capabilities
- Builds on [[Local-First-Computing]] philosophy established in Knowledge-OS

**Alternative Approaches**:
- [[Obsidian-Plugin-Development]] - Browser-based plugin vs standalone web app
- [[Desktop-AI-Integration]] - Electron app vs web-based approach
- [[Cloud-Hybrid-Deployment]] - Mix of local and cloud AI capabilities

**Technical References**:
- FastAPI documentation and async patterns
- ChromaDB best practices for knowledge management
- Ollama API integration examples
- Web Components architecture for maintainable frontend code