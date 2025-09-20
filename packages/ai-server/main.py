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

        # Only react to actual file changes (not just opening files to read)
        if event.event_type not in ['created', 'modified', 'moved', 'deleted']:
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
    model: str = "deepseek-r1:8b"
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
        'temporal': ['when', 'last', 'recent', 'today', 'yesterday', 'week', 'ago', 'since', 'what did i do', 'what happened', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', '2024', '2025'],
        'structural': ['vault', 'files', 'structure', 'what do i have', 'how many', 'overview', 'inventory', 'hardware', 'all my', 'list all', 'what are all'],
        'project': ['project', 'working on', 'progress', 'status', 'developing', 'active project'],
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

def get_temporal_context(query: str, strategy: dict) -> tuple[list, bool]:
    """Get context focused on temporal/recent activities"""
    context_parts = []

    try:
        import os
        import glob
        import re
        from datetime import datetime, timedelta

        daily_path = os.path.join(vault_path, "Logs/Daily") if vault_path else None
        if not daily_path or not os.path.exists(daily_path):
            return context_parts, False

        # Check if query mentions a week
        week_match = re.search(r'week\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{1,2})', query.lower())

        # Check if query mentions a specific date
        date_match = re.search(r'(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{1,2})|(\d{4}-\d{2}-\d{2})', query.lower())
        logger.info(f"🗓️ Date detection for '{query}': week_match={week_match is not None}, date_match={date_match is not None}")

        if week_match:
            # Weekly query - find the week containing the specified date
            month_names = {'january': '01', 'february': '02', 'march': '03', 'april': '04', 'may': '05', 'june': '06',
                          'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12'}

            month = month_names.get(week_match.group(1).lower())
            day = week_match.group(2).zfill(2) if week_match.group(2) else None
            logger.info(f"🗓️ Parsed week query: month={month}, day={day}")

            if month and day:
                from datetime import datetime, timedelta
                import calendar

                target_date_str = f"2025-{month}-{day}"
                target_date = datetime.strptime(target_date_str, "%Y-%m-%d")

                # Calculate ISO week number
                year, week_num, weekday = target_date.isocalendar()
                week_id = f"{year}-W{week_num:02d}"
                logger.info(f"🗓️ Target date {target_date_str} is in {week_id}")

                # Find the Monday of this week
                monday = target_date - timedelta(days=target_date.weekday())
                week_dates = [monday + timedelta(days=i) for i in range(7)]

                context_parts.append(f"=== ACTIVITIES DURING WEEK OF {target_date_str} ({week_id}) ===")
                context_parts.append(f"NOTE: The user is asking about activities during the week containing {target_date_str}.")
                context_parts.append(f"Week dates: {monday.strftime('%Y-%m-%d')} to {(monday + timedelta(days=6)).strftime('%Y-%m-%d')}")
                context_parts.append("")

                # Try to find and include the weekly note
                weekly_path = os.path.join(vault_path, "Logs/Weekly") if vault_path else None
                if weekly_path and os.path.exists(weekly_path):
                    weekly_file = os.path.join(weekly_path, f"{week_id}.md")
                    logger.info(f"🗓️ Looking for weekly file: {weekly_file}, exists={os.path.exists(weekly_file)}")

                    if os.path.exists(weekly_file):
                        try:
                            with open(weekly_file, 'r', encoding='utf-8') as f:
                                weekly_content = f.read()
                            context_parts.append(f"📊 Weekly summary ({week_id}):")
                            context_parts.append(weekly_content[:1200])  # Reduced weekly content for efficiency
                            context_parts.append("")
                            logger.info(f"🗓️ Added weekly note {week_id}, length={len(weekly_content)}")
                        except Exception as e:
                            logger.warning(f"Could not read weekly file {weekly_file}: {e}")

                # Include all daily notes from this week
                daily_content_found = False
                for date_obj in week_dates:
                    daily_file = os.path.join(daily_path, f"{date_obj.strftime('%Y-%m-%d')}.md")
                    if os.path.exists(daily_file):
                        try:
                            with open(daily_file, 'r', encoding='utf-8') as f:
                                daily_content = f.read()
                            context_parts.append(f"📅 Daily note from {date_obj.strftime('%Y-%m-%d')}:")
                            context_parts.append(daily_content[:800])  # Reduced content per day for efficiency
                            context_parts.append("")
                            daily_content_found = True
                            logger.info(f"🗓️ Added daily note {date_obj.strftime('%Y-%m-%d')}, length={len(daily_content)}")
                        except Exception as e:
                            logger.warning(f"Could not read daily file {daily_file}: {e}")

                if daily_content_found or os.path.exists(weekly_file):
                    logger.info(f"🗓️ Returning weekly content for {week_id}")
                    return context_parts, True  # True = found specific week content

        elif date_match:
            # Specific date query - try to find that exact date
            month_names = {'january': '01', 'february': '02', 'march': '03', 'april': '04', 'may': '05', 'june': '06',
                          'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12'}

            if date_match.group(1):  # Month name format
                month = month_names.get(date_match.group(1).lower())
                day = date_match.group(2).zfill(2) if date_match.group(2) else None
                logger.info(f"🗓️ Parsed date: month={month}, day={day}")
                if month and day:
                    target_date = f"2025-{month}-{day}"
                    target_file = os.path.join(daily_path, f"{target_date}.md")
                    logger.info(f"🗓️ Looking for file: {target_file}, exists={os.path.exists(target_file)}")

                    if os.path.exists(target_file):
                        context_parts.append(f"=== ACTIVITIES ON {target_date} (PAST DATE) ===")
                        context_parts.append("NOTE: The user is asking about activities that happened on this specific past date.")
                        context_parts.append("")
                        try:
                            with open(target_file, 'r', encoding='utf-8') as f:
                                content = f.read()
                            context_parts.append(f"📅 Daily note from {target_date}:")
                            context_parts.append(content[:2000])  # More content for specific dates
                            context_parts.append("")
                            logger.info(f"🗓️ Returning specific date content for {target_date}, length={len(content)}")
                            return context_parts, True  # True = found specific date content
                        except Exception as e:
                            logger.warning(f"Could not read {target_file}: {e}")

        # Fall back to recent daily notes
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

    return context_parts, False  # False = general recent notes, not specific date

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
        temporal_context, has_specific_date = get_temporal_context(new_message, strategy)
        if temporal_context:
            context_parts.extend(temporal_context)
            context_parts.append("")

        # Only search documents if we don't have specific date content
        if not has_specific_date and rag_instance and vault_path:
            try:
                from rag_service import search_documents
                relevant_docs = search_documents(new_message, limit=2)  # Fewer docs for temporal
                if relevant_docs:
                    context_parts.append("=== RELATED VAULT DOCUMENT CHUNKS ===")
                    context_parts.append("NOTE: These are CHUNKS of documents found via semantic search, not complete files.")
                    context_parts.append("")
                    for doc in relevant_docs:
                        similarity_score = f" (relevance: {doc['similarity']:.2f})" if doc.get('similarity') else ""
                        context_parts.append(f"📄 **CHUNK from {doc['filename']}**{similarity_score}:")

                        # Add frontmatter metadata context
                        metadata = doc.get('metadata', {})
                        if metadata:
                            frontmatter_fields = ['type', 'status', 'tags', 'created']
                            relevant_metadata = {k: v for k, v in metadata.items() if k in frontmatter_fields}
                            if relevant_metadata:
                                context_parts.append(f"Metadata: {relevant_metadata}")
                                context_parts.append("")

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
                # Determine search limit based on query type
                search_limit = 4  # Default
                if strategy['primary'] == 'structural':
                    search_limit = 12  # More comprehensive for inventory/overview queries
                elif strategy['primary'] == 'project':
                    search_limit = 8   # More for project queries

                relevant_docs = search_documents(new_message, limit=search_limit)

                # For inventory/structural queries, enhance search but avoid overwhelming context
                if strategy['primary'] == 'structural' and any(term in new_message.lower() for term in ['hardware', 'inventory', 'all my', 'what do i have']):
                    # Add one additional targeted search to supplement main results
                    if 'hardware' in new_message.lower():
                        additional_docs = search_documents("hardware specs", limit=6)
                    elif 'service' in new_message.lower():
                        additional_docs = search_documents("services running", limit=6)
                    elif 'project' in new_message.lower():
                        additional_docs = search_documents("project status", limit=6)
                    else:
                        additional_docs = []

                    # Only add non-duplicate docs from additional search
                    if additional_docs and relevant_docs:
                        seen_files = {doc['filename'] for doc in relevant_docs}
                        for doc in additional_docs:
                            if doc['filename'] not in seen_files and len(relevant_docs) < 10:
                                relevant_docs.append(doc)

                if relevant_docs:
                    context_parts.append("=== VAULT DOCUMENT CHUNKS ===")
                    context_parts.append("NOTE: These are CHUNKS of documents found via semantic search, not complete files.")
                    context_parts.append("")
                    for doc in relevant_docs:
                        similarity_score = f" (relevance: {doc['similarity']:.2f})" if doc.get('similarity') else ""
                        context_parts.append(f"📄 **CHUNK from {doc['filename']}**{similarity_score}:")

                        # Add frontmatter metadata context
                        metadata = doc.get('metadata', {})
                        if metadata:
                            frontmatter_fields = ['type', 'status', 'tags', 'created', 'project_status', 'operational_status']
                            relevant_metadata = {k: v for k, v in metadata.items() if k in frontmatter_fields}
                            if relevant_metadata:
                                context_parts.append(f"Metadata: {relevant_metadata}")
                                context_parts.append("")

                        content_limit = 1000 if doc.get('similarity', 0) > 0.7 else 600
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
                    context_parts.append("=== RELEVANT VAULT DOCUMENT CHUNKS ===")
                    context_parts.append("NOTE: These are CHUNKS of documents found via semantic search, not complete files.")
                    context_parts.append("")
                    for doc in relevant_docs:
                        similarity_score = f" (relevance: {doc['similarity']:.2f})" if doc.get('similarity') else ""
                        context_parts.append(f"📄 **CHUNK from {doc['filename']}**{similarity_score}:")

                        # Add frontmatter metadata context
                        metadata = doc.get('metadata', {})
                        if metadata:
                            frontmatter_fields = ['type', 'status', 'tags', 'created', 'project_status', 'operational_status']
                            relevant_metadata = {k: v for k, v in metadata.items() if k in frontmatter_fields}
                            if relevant_metadata:
                                context_parts.append(f"Metadata: {relevant_metadata}")
                                context_parts.append("")

                        content_limit = 1000 if doc.get('similarity', 0) > 0.7 else 600
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
    # Enhanced guidance for reasoning models
    context_parts.append("=== REASONING & ACCURACY GUIDELINES ===")
    context_parts.append("Think step-by-step and be thorough in your analysis.")
    context_parts.append("")
    context_parts.append("TASK INTERPRETATION:")
    context_parts.append("- [ ] = OPEN/PENDING task (needs to be done)")
    context_parts.append("- [x] = COMPLETED task (already finished)")
    context_parts.append("")
    context_parts.append("DOCUMENT CHUNK LIMITATIONS:")
    context_parts.append("• You receive CHUNKS of documents via semantic search, NOT complete documents")
    context_parts.append("• NEVER claim to have 'the entire document' - you only see relevant chunks")
    context_parts.append("• If tasks/info aren't in provided chunks, say 'No tasks found in available content'")
    context_parts.append("• Each 📄 section above is a separate chunk from the document")
    context_parts.append("")
    context_parts.append("TASK DETECTION RULES:")
    context_parts.append("• Tasks are ONLY markdown checkboxes: `- [ ]` (open) and `- [x]` (completed)")
    context_parts.append("• NEVER infer tasks from goals, decisions, or descriptions")
    context_parts.append("• If no checkbox tasks visible in chunks, report 'No checkbox tasks found'")
    context_parts.append("• Only list tasks that literally use `[ ]` or `[x]` syntax")
    context_parts.append("")
    context_parts.append("FRONTMATTER CONTEXT:")
    context_parts.append("• Documents have YAML frontmatter with metadata: type, status, tags, created")
    context_parts.append("• type: project = may contain task lists for project work")
    context_parts.append("• type: hardware = operational status, not project tasks")
    context_parts.append("• type: service = runtime status, not todo items")
    context_parts.append("• status: active means different things per document type")
    context_parts.append("")
    context_parts.append("NATURAL INTERACTION:")
    context_parts.append("• Interpret user intent thoughtfully - queries may be casual")
    context_parts.append("• Provide clear, direct answers without unnecessary complexity")
    context_parts.append("="*50)
    context_parts.append("")

    # Anti-hallucination instructions
    context_parts.append("=== ACCURACY & ANTI-HALLUCINATION ===")
    context_parts.append("- ONLY use information literally present in the provided chunks above")
    context_parts.append("- NEVER make up tasks, goals, or details not visible in the chunks")
    context_parts.append("- If you don't see checkbox tasks `[ ]`, DO NOT create or infer them")
    context_parts.append("- If information is missing, say 'Not found in available content'")
    context_parts.append("- Always cite sources with [Source: filename.md]")
    context_parts.append("- When uncertain, explicitly state your limitations")
    context_parts.append("")
    context_parts.append("=== CRITICAL: SOURCE ATTRIBUTION ACCURACY ===")
    context_parts.append("- BEFORE referencing any information, identify which specific section contains it")
    context_parts.append("- When citing information, specify the exact source where you found it")
    context_parts.append("- Each 📄 **CHUNK from filename.md** section contains ONLY content from that file")
    context_parts.append("- Content under '=== RECENT PROJECT ACTIVITY ===' is ONLY from the specified daily note")
    context_parts.append("- If information appears in multiple sources, you may cite the most relevant one")
    context_parts.append("- DOUBLE-CHECK your source attribution before making claims about what's in which file")
    context_parts.append("- If unsure about source, say 'Found in provided content' instead of guessing")
    context_parts.append("="*50)
    context_parts.append("")
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

@app.post("/preload-model")
async def preload_model(model_request: dict):
    """Pre-load a model to avoid delays during chat"""
    try:
        model_name = model_request.get("model")
        if not model_name:
            return {"error": "Model name required"}

        logger.info(f"🔄 Pre-loading model: {model_name}")

        # Send a minimal request to load the model
        ollama_response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model_name,
                "prompt": "Hello",
                "stream": False
            },
            timeout=60
        )

        if ollama_response.status_code == 200:
            logger.info(f"✅ Model {model_name} pre-loaded successfully")
            return {"status": "success", "message": f"Model {model_name} loaded"}
        else:
            logger.error(f"❌ Failed to pre-load model {model_name}: {ollama_response.text}")
            return {"error": f"Failed to load model: {ollama_response.text}"}

    except Exception as e:
        logger.error(f"Error pre-loading model: {e}")
        return {"error": str(e)}

@app.post("/chat", response_model=ChatResponse)
async def chat(chat_message: ChatMessage):
    """Handle chat messages and communicate with Ollama"""
    try:
        # Generate session ID if not provided
        session_id = chat_message.session_id or str(uuid.uuid4())

        # Log the model being used
        logger.info(f"🤖 Using model: {chat_message.model} for query: {chat_message.message[:50]}...")

        # Build conversation context
        context_prompt = build_conversation_context(session_id, chat_message.message)
        logger.info(f"🎯 Context prompt (first 500 chars): {context_prompt[:500]}...")

        # Send request to Ollama
        ollama_response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": chat_message.model,
                "prompt": context_prompt,
                "stream": False
            },
            timeout=120
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