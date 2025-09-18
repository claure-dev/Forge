from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import requests
import uuid
from typing import Dict, List, Optional
from datetime import datetime
import logging
import os
import json
from pathlib import Path
import threading
import time

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Forge Local AI", description="Localhost-first AI knowledge management system")

# Global variables for simple conversation memory
conversations: Dict[str, List[Dict]] = {}
vault_path = None

# Persistent vault configuration file
VAULT_CONFIG_FILE = ".vault_config.json"

def load_vault_config():
    """Load vault configuration from persistent file"""
    global vault_path
    try:
        if os.path.exists(VAULT_CONFIG_FILE):
            with open(VAULT_CONFIG_FILE, 'r') as f:
                config = json.load(f)
                vault_path_str = config.get('vault_path')
                if vault_path_str and os.path.exists(vault_path_str):
                    vault_path = Path(vault_path_str)
                    logger.info(f"📁 Loaded persistent vault config: {vault_path}")
                    return True
    except Exception as e:
        logger.warning(f"Could not load vault config: {e}")
    return False

def save_vault_config():
    """Save vault configuration to persistent file"""
    try:
        config = {
            'vault_path': str(vault_path) if vault_path else None,
            'configured_at': datetime.now().isoformat()
        }
        with open(VAULT_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        logger.info(f"💾 Saved vault config to {VAULT_CONFIG_FILE}")
    except Exception as e:
        logger.error(f"Could not save vault config: {e}")

# Load vault config on startup
load_vault_config()

# File system watcher for automatic vault updates
class VaultWatcher(FileSystemEventHandler):
    """Watches vault directory for file changes and updates search index automatically"""

    def __init__(self):
        super().__init__()
        self.update_queue = set()
        self.last_update_time = time.time()
        self.update_delay = 2.0  # Wait 2 seconds after last change before updating
        self.update_thread = None
        self.lock = threading.Lock()

    def on_any_event(self, event):
        """Handle any file system event"""
        # Only process markdown files
        if not event.src_path.endswith('.md'):
            return

        # Skip temporary files and hidden files
        filename = os.path.basename(event.src_path)
        if filename.startswith('.') or filename.startswith('~') or filename.endswith('.tmp'):
            return

        logger.info(f"📁 Vault file event: {event.event_type} - {event.src_path}")

        with self.lock:
            self.update_queue.add(event.src_path)
            self.last_update_time = time.time()

            # Start update thread if not already running
            if self.update_thread is None or not self.update_thread.is_alive():
                self.update_thread = threading.Thread(target=self._delayed_update)
                self.update_thread.daemon = True
                self.update_thread.start()

    def _delayed_update(self):
        """Wait for a quiet period, then update the index"""
        while True:
            with self.lock:
                time_since_last_change = time.time() - self.last_update_time

                if time_since_last_change >= self.update_delay:
                    if self.update_queue:
                        files_changed = len(self.update_queue)
                        self.update_queue.clear()
                        break
                    else:
                        # No changes pending, exit thread
                        return

            # Wait a bit before checking again
            time.sleep(0.5)

        # Perform the actual update
        self._update_search_index(files_changed)

    def _update_search_index(self, files_changed: int):
        """Update the search index incrementally"""
        try:
            if not vault_path:
                logger.warning("⚠️ Cannot update index: vault not configured")
                return

            logger.info(f"🔄 Auto-updating search index ({files_changed} files changed)...")

            from rag_service import get_rag_instance
            rag = get_rag_instance()
            num_chunks = rag.update_directory_incremental(str(vault_path))

            logger.info(f"✅ Search index auto-updated with {num_chunks} chunks")

        except Exception as e:
            logger.error(f"❌ Failed to auto-update search index: {e}")

# Global vault watcher instance
vault_watcher = None
vault_observer = None

def start_vault_watching():
    """Start watching the vault directory for changes"""
    global vault_watcher, vault_observer

    if not vault_path:
        logger.info("📁 Vault not configured, skipping file watching")
        return

    try:
        # Stop existing watcher if running
        stop_vault_watching()

        vault_watcher = VaultWatcher()
        vault_observer = Observer()
        vault_observer.schedule(vault_watcher, str(vault_path), recursive=True)
        vault_observer.start()

        logger.info(f"👁️ Started watching vault directory: {vault_path}")

    except Exception as e:
        logger.error(f"❌ Failed to start vault watching: {e}")

def stop_vault_watching():
    """Stop watching the vault directory"""
    global vault_observer

    if vault_observer and vault_observer.is_alive():
        vault_observer.stop()
        vault_observer.join(timeout=1.0)
        logger.info("🛑 Stopped vault watching")

# Initialize RAG service on startup
try:
    from rag_service import get_rag_instance
    rag_instance = get_rag_instance()
    logger.info("🚀 LangChain RAG service initialized")
except Exception as e:
    logger.error(f"Failed to initialize RAG service: {e}")
    rag_instance = None

# Start vault watching if vault is configured
if vault_path:
    start_vault_watching()

class ChatMessage(BaseModel):
    message: str
    model: str = "llama3.1:8b"
    session_id: str | None = None

class ChatResponse(BaseModel):
    response: str
    model: str
    session_id: str

class DocumentUpload(BaseModel):
    filename: str
    content: str
    metadata: Optional[Dict] = None

class SearchRequest(BaseModel):
    query: str
    limit: int = 10

class VaultRequest(BaseModel):
    vault_directory: str

def perform_document_analysis(relevant_docs: List[Dict], query: str) -> str:
    """First pass: Analyze documents for patterns, relationships, and gaps"""
    if not relevant_docs:
        return ""
        
    analysis_parts = []
    analysis_parts.append("=== DOCUMENT ANALYSIS CONTEXT ===")
    
    # Extract document types and relationships
    doc_types = {}
    projects = []
    hardware = []
    services = []
    
    for doc in relevant_docs:
        filename = doc.get('filename', '')
        full_content = doc.get('full_content', '')
        
        # Classify document types
        if 'type: project' in full_content or '/Projects/' in doc.get('source_path', ''):
            projects.append(filename)
            doc_types[filename] = 'project'
        elif 'type: hardware' in full_content or '/Hardware/' in doc.get('source_path', ''):
            hardware.append(filename)
            doc_types[filename] = 'hardware'
        elif '/Services/' in doc.get('source_path', ''):
            services.append(filename)
            doc_types[filename] = 'service'
        else:
            doc_types[filename] = 'other'
    
    # Document relationship analysis
    if len(doc_types) > 1:
        analysis_parts.append(f"📊 Cross-referenced: {len(hardware)} hardware, {len(projects)} projects, {len(services)} services")
        
        # Look for missing connections
        if projects and hardware:
            analysis_parts.append("🔗 Infrastructure relationship detected - can analyze deployment patterns")
        if hardware and not services:
            analysis_parts.append("⚠️ Hardware documented but related services may need documentation")
    
    # Gap analysis for common infrastructure patterns
    query_lower = query.lower()
    if any(term in query_lower for term in ['gap', 'missing', 'need', 'should have']):
        analysis_parts.append("🔍 Gap analysis requested - will examine common infrastructure patterns")
    
    analysis_parts.append("")
    return "\n".join(analysis_parts)

def get_daily_note_info(query_type: str) -> dict:
    """Get information about daily notes from file system"""
    try:
        import os
        import glob
        from datetime import datetime, timedelta
        
        daily_path = os.path.join(vault_path, "Logs/Daily") if vault_path else None
        if not daily_path or not os.path.exists(daily_path):
            return {"error": "Daily notes directory not found"}
            
        # Get all daily note files sorted by date
        pattern = os.path.join(daily_path, "*.md")
        files = sorted(glob.glob(pattern), reverse=True)  # Most recent first
        
        if not files:
            return {"error": "No daily notes found"}
            
        # Get the most recent file
        most_recent = files[0]
        filename = os.path.basename(most_recent)
        
        # Read the content
        with open(most_recent, 'r', encoding='utf-8') as f:
            content = f.read()
            
        return {
            "filename": filename,
            "path": most_recent,
            "content": content,
            "count": len(files)
        }
        
    except Exception as e:
        logger.error(f"Error getting daily note info: {e}")
        return {"error": str(e)}

# Global cache for vault metadata
vault_metadata_cache = {"data": None, "last_updated": None}

def get_context_strategy(query: str) -> dict:
    """Determine context strategy based on query patterns"""
    query_lower = query.lower()

    patterns = {
        'temporal': ['when', 'last', 'recent', 'today', 'yesterday', 'week', 'ago', 'since'],
        'structural': ['vault', 'files', 'structure', 'what do i have', 'how many', 'overview'],
        'project': ['project', 'working on', 'progress', 'status', 'developing'],
        'specific': ['how to', 'what is', 'explain', 'define', 'meaning']
    }

    scores = {}
    for category, keywords in patterns.items():
        scores[category] = sum(1 for keyword in keywords if keyword in query_lower)

    # Determine primary strategy
    primary = max(scores, key=scores.get) if max(scores.values()) > 0 else 'specific'

    return {
        'primary': primary,
        'scores': scores,
        'is_mixed': sum(1 for score in scores.values() if score > 0) > 1
    }

def get_vault_metadata() -> dict:
    """Get or update cached vault metadata"""
    from datetime import datetime, timedelta
    import os
    import glob

    # Check if cache is fresh (update every 5 minutes)
    now = datetime.now()
    if (vault_metadata_cache["last_updated"] and
        now - vault_metadata_cache["last_updated"] < timedelta(minutes=5)):
        return vault_metadata_cache["data"]

    # Use global vault_path or fallback to default
    current_vault_path = vault_path or os.getenv("FORGE_VAULT_PATH", "./example-vault")

    if not current_vault_path or not os.path.exists(current_vault_path):
        return {"error": "Vault not configured"}

    try:
        metadata = {}

        # Count files by directory
        for root, dirs, files in os.walk(current_vault_path):
            if files:
                relative_path = os.path.relpath(root, current_vault_path)
                md_files = [f for f in files if f.endswith('.md')]
                if md_files:
                    metadata[relative_path] = len(md_files)

        # Get recent files (last 7 days)
        recent_files = []
        week_ago = now - timedelta(days=7)
        for root, dirs, files in os.walk(current_vault_path):
            for file in files:
                if file.endswith('.md'):
                    file_path = os.path.join(root, file)
                    try:
                        mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                        if mtime > week_ago:
                            rel_path = os.path.relpath(file_path, current_vault_path)
                            recent_files.append({'file': rel_path, 'modified': mtime})
                    except:
                        continue

        recent_files.sort(key=lambda x: x['modified'], reverse=True)

        vault_metadata_cache["data"] = {
            'directory_counts': metadata,
            'total_files': sum(metadata.values()),
            'recent_files': recent_files[:10],  # Top 10 recent files
            'last_updated': now
        }
        vault_metadata_cache["last_updated"] = now

        return vault_metadata_cache["data"]

    except Exception as e:
        logger.error(f"Error getting vault metadata: {e}")
        return {"error": str(e)}

def get_temporal_context(query: str, strategy: dict) -> list:
    """Get context focused on temporal/recent activities"""
    context_parts = []

    try:
        import os
        import glob
        from datetime import datetime, timedelta

        # Get multiple recent daily notes for temporal queries
        daily_path = os.path.join(vault_path, "Logs/Daily") if vault_path else None
        if daily_path and os.path.exists(daily_path):
            pattern = os.path.join(daily_path, "*.md")
            files = sorted(glob.glob(pattern), reverse=True)[:7]  # Last 7 days

            if files:
                context_parts.append("=== RECENT DAILY ACTIVITY ===")
                for i, file_path in enumerate(files[:3]):  # Show top 3
                    filename = os.path.basename(file_path)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()

                        # Extract key info from daily note
                        preview_length = 400 if i == 0 else 200  # More detail for most recent
                        preview = content[:preview_length]
                        if len(content) > preview_length:
                            preview += "..."

                        context_parts.append(f"📅 {filename}:")
                        context_parts.append(preview)
                        context_parts.append("")
                    except Exception as e:
                        logger.warning(f"Could not read {filename}: {e}")
                        continue

        # Include weekly notes if available
        weekly_path = os.path.join(vault_path, "Logs/Weekly") if vault_path else None
        if weekly_path and os.path.exists(weekly_path):
            pattern = os.path.join(weekly_path, "*.md")
            files = sorted(glob.glob(pattern), reverse=True)[:2]  # Last 2 weeks

            if files:
                context_parts.append("=== RECENT WEEKLY SUMMARIES ===")
                for file_path in files:
                    filename = os.path.basename(file_path)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()

                        # Extract highlights and decisions from weekly notes
                        lines = content.split('\n')
                        relevant_lines = []
                        for line in lines:
                            if any(keyword in line.lower() for keyword in ['highlight', 'decision', 'project', 'progress']):
                                relevant_lines.append(line)

                        if relevant_lines:
                            context_parts.append(f"📊 {filename}:")
                            context_parts.extend(relevant_lines[:5])  # Top 5 relevant lines
                            context_parts.append("")
                    except Exception as e:
                        logger.warning(f"Could not read {filename}: {e}")
                        continue

    except Exception as e:
        logger.error(f"Error getting temporal context: {e}")

    return context_parts

def build_conversation_context(session_id: str, new_message: str) -> str:
    """Build smart conversation context based on query type and patterns"""
    if session_id not in conversations:
        conversations[session_id] = []

    # Determine context strategy based on query patterns
    strategy = get_context_strategy(new_message)
    logger.info(f"Query strategy: {strategy['primary']} (scores: {strategy['scores']})")

    # Get recent conversation history (adaptive based on strategy)
    history_limit = 2 if strategy['primary'] == 'structural' else 3
    recent_messages = conversations[session_id][-history_limit:] if conversations[session_id] else []

    # Build context string
    context_parts = []

    # Always provide current time context
    from datetime import datetime
    import pytz

    # Get current time in EDT
    eastern = pytz.timezone('America/New_York')
    now = datetime.now(eastern)
    current_time = now.strftime("%A %B %d, %Y at %I:%M %p %Z")

    context_parts.append("=== CURRENT CONTEXT ===")
    context_parts.append(f"Current time: {current_time}")
    context_parts.append(f"Vault path: {vault_path if vault_path else 'Not configured'}")
    context_parts.append("")

    # Strategy-based context selection
    if strategy['primary'] == 'temporal':
        # Temporal queries get extensive daily/weekly note context
        temporal_context = get_temporal_context(new_message, strategy)
        if temporal_context:
            context_parts.extend(temporal_context)
            context_parts.append("")

        # Still search documents but with recency bias
        if rag_instance and vault_path:
            try:
                from rag_service import search_documents
                relevant_docs = search_documents(new_message, limit=2)  # Fewer docs for temporal
                if relevant_docs:
                    context_parts.append("=== RELATED VAULT DOCUMENTS ===")
                    for doc in relevant_docs:
                        similarity_score = f" (relevance: {doc['similarity']:.2f})" if doc.get('similarity') else ""
                        context_parts.append(f"📄 **{doc['filename']}**{similarity_score}:")
                        content = doc.get('full_content', doc.get('content', ''))[:300]
                        if len(doc.get('full_content', doc.get('content', ''))) > 300:
                            content += "..."
                        context_parts.append(content)
                        context_parts.append("")
            except Exception as e:
                logger.error(f"Error retrieving relevant documents: {e}")

    elif strategy['primary'] == 'structural':
        # Structural queries get vault metadata and overview
        metadata = get_vault_metadata()
        if not metadata.get('error'):
            context_parts.append("=== VAULT STRUCTURE OVERVIEW ===")
            context_parts.append(f"Total files: {metadata['total_files']}")
            context_parts.append("Files by directory:")
            for directory, count in metadata['directory_counts'].items():
                context_parts.append(f"  {directory}: {count} files")

            if metadata.get('recent_files'):
                context_parts.append("")
                context_parts.append("Recently modified files:")
                for item in metadata['recent_files'][:5]:
                    modified_str = item['modified'].strftime("%Y-%m-%d")
                    context_parts.append(f"  {item['file']} ({modified_str})")
            context_parts.append("")

        # Include current daily note for context
        if vault_path:
            daily_info = get_daily_note_info('daily_note')
            if "error" not in daily_info:
                context_parts.append("=== TODAY'S ACTIVITY ===")
                context_parts.append(f"Current daily note: {daily_info['filename']}")
                preview = daily_info['content'][:400]
                if len(daily_info['content']) > 400:
                    preview += "..."
                context_parts.append(preview)
                context_parts.append("")

    elif strategy['primary'] == 'project':
        # Project queries get daily notes + project-focused search
        if vault_path:
            daily_info = get_daily_note_info('daily_note')
            if "error" not in daily_info:
                context_parts.append("=== RECENT PROJECT ACTIVITY ===")
                context_parts.append(f"From {daily_info['filename']}:")
                # Extract project-related content from daily note
                lines = daily_info['content'].split('\n')
                project_lines = [line for line in lines if any(keyword in line.lower()
                                for keyword in ['project', 'working', 'progress', 'develop', 'build', 'implement'])]

                if project_lines:
                    context_parts.extend(project_lines[:8])  # Top 8 project-related lines
                else:
                    # Fallback to general content preview
                    preview = daily_info['content'][:400]
                    if len(daily_info['content']) > 400:
                        preview += "..."
                    context_parts.append(preview)
                context_parts.append("")

        # Enhanced search for project-related documents
        if rag_instance and vault_path:
            try:
                from rag_service import search_documents
                relevant_docs = search_documents(new_message, limit=4)  # More docs for projects
                if relevant_docs:
                    context_parts.append("=== PROJECT-RELATED VAULT DOCUMENTS ===")
                    for doc in relevant_docs:
                        similarity_score = f" (relevance: {doc['similarity']:.2f})" if doc.get('similarity') else ""
                        context_parts.append(f"📄 **{doc['filename']}**{similarity_score}:")
                        content_limit = 500 if doc.get('similarity', 0) > 0.7 else 300
                        content = doc.get('full_content', doc.get('content', ''))[:content_limit]
                        if len(doc.get('full_content', doc.get('content', ''))) > content_limit:
                            content += "..."
                        context_parts.append(content)
                        context_parts.append("")
            except Exception as e:
                logger.error(f"Error retrieving relevant documents: {e}")

    else:
        # Default/specific queries use original approach with slight enhancements
        if vault_path:
            daily_info = get_daily_note_info('daily_note')
            if "error" not in daily_info:
                context_parts.append("=== TODAY'S CONTEXT ===")
                context_parts.append(f"Current daily note: {daily_info['filename']}")
                preview = daily_info['content'][:300]  # Shorter for specific queries
                if len(daily_info['content']) > 300:
                    preview += "..."
                context_parts.append(preview)
                context_parts.append("")

        # Standard document search
        if rag_instance and vault_path:
            try:
                from rag_service import search_documents
                relevant_docs = search_documents(new_message, limit=3)
                if relevant_docs:
                    context_parts.append("=== RELEVANT VAULT DOCUMENTS ===")
                    for doc in relevant_docs:
                        similarity_score = f" (relevance: {doc['similarity']:.2f})" if doc.get('similarity') else ""
                        context_parts.append(f"📄 **{doc['filename']}**{similarity_score}:")
                        content_limit = 500 if doc.get('similarity', 0) > 0.7 else 300
                        content = doc.get('full_content', doc.get('content', ''))[:content_limit]
                        if len(doc.get('full_content', doc.get('content', ''))) > content_limit:
                            content += "..."
                        context_parts.append(content)
                        context_parts.append("")
            except Exception as e:
                logger.error(f"Error retrieving relevant documents: {e}")

    # Add recent conversation history (if not too much context already)
    current_context_length = len('\n'.join(context_parts))
    if recent_messages and current_context_length < 3000:  # Context budget management
        context_parts.append("=== RECENT CONVERSATION ===")
        for msg in recent_messages:
            context_parts.append(f"Human: {msg['human']}")
            context_parts.append(f"Assistant: {msg['assistant'][:200]}...")  # Truncate assistant responses
            context_parts.append("")
        context_parts.append("=" * 30)
        context_parts.append("")

    # Dynamic instructions based on query strategy
    context_parts.append("=== INSTRUCTIONS ===")
    context_parts.append("You are an intelligent assistant with access to the user's knowledge vault.")

    if strategy['primary'] == 'temporal':
        context_parts.append("FOCUS: The user is asking about timing, recent activities, or when something happened.")
        context_parts.append("- Pay special attention to dates and timeline information")
        context_parts.append("- Reference daily and weekly notes for recent activities")
        context_parts.append("- Use temporal context to provide accurate timing information")
    elif strategy['primary'] == 'structural':
        context_parts.append("FOCUS: The user wants to understand their vault structure or get an overview.")
        context_parts.append("- IMPORTANT: Use the VAULT STRUCTURE OVERVIEW section above for accurate file counts")
        context_parts.append("- The vault metadata provides current, real-time information")
        context_parts.append("- Ignore any outdated migration or planning documents for structural queries")
        context_parts.append("- Be specific about numbers and directory organization from the metadata")
    elif strategy['primary'] == 'project':
        context_parts.append("FOCUS: The user is asking about project work, progress, or development activities.")
        context_parts.append("- Synthesize information from daily notes and project documents")
        context_parts.append("- Focus on work progress, development activities, and project status")
        context_parts.append("- Connect information across different time periods if relevant")
    else:
        context_parts.append("FOCUS: Provide specific, accurate information to answer the user's question.")
        context_parts.append("- Use vault documents to provide factual, cited information")
        context_parts.append("- Be conversational but precise")

    context_parts.append("")
    context_parts.append("Always cite specific sources with [Source: filename.md] when referencing vault documents.")
    context_parts.append("Be helpful and conversational while staying grounded in the provided information.")
    context_parts.append("")

    # Add the new message
    context_parts.append(f"Human: {new_message}")
    context_parts.append("Assistant: ")

    return "\n".join(context_parts)

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main chat interface"""
    with open("index.html", "r") as f:
        return HTMLResponse(content=f.read())

@app.post("/chat", response_model=ChatResponse)
async def chat(chat_message: ChatMessage):
    """Handle chat messages and communicate with Ollama"""
    try:
        # Generate session ID if not provided
        session_id = chat_message.session_id or str(uuid.uuid4())
        
        # Build conversation context
        context_prompt = build_conversation_context(session_id, chat_message.message)
        
        # Send request to Ollama
        ollama_response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": chat_message.model,
                "prompt": context_prompt,
                "stream": False
            },
            timeout=60
        )
        
        if ollama_response.status_code != 200:
            raise HTTPException(
                status_code=500, 
                detail=f"Ollama API error: {ollama_response.status_code}"
            )
        
        result = ollama_response.json()
        ai_response = result.get("response", "No response from model")
        
        # Store conversation in simple memory
        if session_id not in conversations:
            conversations[session_id] = []
        
        conversations[session_id].append({
            "human": chat_message.message,
            "assistant": ai_response,
            "timestamp": datetime.now().isoformat()
        })
        
        return ChatResponse(
            response=ai_response,
            model=chat_message.model,
            session_id=session_id
        )
        
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503, 
            detail="Cannot connect to Ollama. Make sure Ollama is running on localhost:11434"
        )
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504, 
            detail="Request to Ollama timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "AI server is running"}

@app.get("/models")
async def list_models():
    """List available Ollama models"""
    try:
        response = requests.get("http://localhost:11434/api/tags")
        if response.status_code == 200:
            return response.json()
        else:
            return {"models": []}
    except:
        return {"models": []}

@app.get("/browse-documents")
async def browse_documents(limit: int = 50, offset: int = 0):
    """Browse documents using LangChain RAG implementation"""
    from rag_service import get_all_documents
    
    try:
        documents = get_all_documents()
        return {"documents": documents, "total": len(documents)}
        
    except Exception as e:
        logger.error(f"Failed to browse documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to browse documents: {str(e)}")

@app.post("/search-documents")
async def search_documents(request: SearchRequest):
    """Search documents using LangChain RAG implementation"""
    from rag_service import search_documents as rag_search
    
    try:
        documents = rag_search(request.query, request.limit)
        return {"documents": documents, "total": len(documents)}
        
    except Exception as e:
        logger.error(f"Failed to search documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search documents: {str(e)}")

@app.post("/configure-vault")
async def configure_vault(request: VaultRequest):
    """Configure vault directory"""
    global vault_path
    try:
        vault_path_obj = Path(request.vault_directory).resolve()
        if not vault_path_obj.exists():
            raise HTTPException(status_code=400, detail=f"Vault directory does not exist: {request.vault_directory}")
        
        vault_path = vault_path_obj
        logger.info(f"📁 Vault configured: {vault_path}")

        # Save configuration persistently
        save_vault_config()

        # Start watching the vault for changes
        start_vault_watching()

        return {"message": f"Vault configured: {request.vault_directory} - You may need to rebuild the search index", "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error configuring vault: {str(e)}")

@app.get("/vault-status")
async def get_vault_status():
    """Get current vault configuration status"""
    return {
        "vault_path": str(vault_path) if vault_path else None,
        "configured": vault_path is not None
    }

@app.post("/rebuild-index")
async def rebuild_search_index():
    """Rebuild the search index using LangChain RAG"""
    from rag_service import rebuild_index
    
    if not vault_path:
        raise HTTPException(status_code=400, detail="No vault directory configured")
    
    try:
        num_chunks = rebuild_index(str(vault_path))
        return {"message": f"Search index rebuilt successfully with {num_chunks} chunks", "status": "success"}
    except Exception as e:
        logger.error(f"Failed to rebuild index: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to rebuild index: {str(e)}")

@app.post("/update-index")
async def update_search_index():
    """Update search index incrementally - remove deleted files and add new ones"""
    if not vault_path:
        raise HTTPException(status_code=400, detail="No vault directory configured")

    try:
        from rag_service import get_rag_instance
        rag = get_rag_instance()
        num_chunks = rag.update_directory_incremental(str(vault_path))
        return {"message": f"Search index updated successfully with {num_chunks} chunks", "status": "success"}
    except Exception as e:
        logger.error(f"Failed to update index: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update index: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on server shutdown"""
    stop_vault_watching()
    logger.info("🛑 Server shutdown complete")

if __name__ == "__main__":
    import uvicorn
    try:
        uvicorn.run(app, host="127.0.0.1", port=8000)
    finally:
        stop_vault_watching()