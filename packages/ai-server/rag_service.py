"""
Clean RAG implementation using LangChain best practices
"""

import os
from pathlib import Path
from typing import List, Dict, Any
import logging
import yaml
import re

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain.schema import Document

logger = logging.getLogger(__name__)

class YAMLFrontmatterLoader(TextLoader):
    """Custom loader that parses YAML frontmatter from markdown files"""

    def __init__(self, file_path, encoding=None, autodetect_encoding=False):
        """Initialize with proper parent constructor call"""
        super().__init__(file_path, encoding, autodetect_encoding)

    def load(self) -> List[Document]:
        """Load markdown file and parse YAML frontmatter"""
        logger.info(f"🔍 YAMLFrontmatterLoader processing: {self.file_path}")
        with open(self.file_path, encoding=self.encoding) as f:
            content = f.read()

        # Parse YAML frontmatter
        frontmatter_data = {}
        content_without_frontmatter = content

        # Check for YAML frontmatter (--- at start)
        frontmatter_pattern = r'^---\s*\n(.*?)\n---\s*\n'
        match = re.match(frontmatter_pattern, content, re.DOTALL)

        if match:
            try:
                yaml_content = match.group(1)
                frontmatter_data = yaml.safe_load(yaml_content) or {}
                # Remove frontmatter from content
                content_without_frontmatter = content[match.end():]
                logger.debug(f"Parsed frontmatter from {self.file_path}: {frontmatter_data}")
            except yaml.YAMLError as e:
                logger.warning(f"Failed to parse YAML frontmatter in {self.file_path}: {e}")
                # Keep original content if YAML parsing fails
                frontmatter_data = {}

        # Create document with enhanced metadata
        metadata = {
            'source': self.file_path,
        }

        # Convert complex metadata types to strings for ChromaDB compatibility
        for key, value in frontmatter_data.items():
            if isinstance(value, (list, dict)):
                metadata[key] = str(value)
            elif hasattr(value, 'isoformat'):  # datetime objects
                metadata[key] = value.isoformat()
            else:
                metadata[key] = value

        result_doc = Document(page_content=content_without_frontmatter, metadata=metadata)
        logger.info(f"✅ YAMLFrontmatterLoader result - Metadata: {list(metadata.keys())}, Content preview: {content_without_frontmatter[:50]}")

        return [result_doc]

class ForgeRAG:
    def __init__(self, persist_directory: str = "./chroma_db", model_name: str = "nomic-embed-text"):
        self.persist_directory = persist_directory
        self.model_name = model_name
        self.embeddings = OllamaEmbeddings(model=model_name)
        # Use markdown-aware text splitter that keeps sections together
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=[
                "\n## ",     # H2 headers - major sections
                "\n### ",    # H3 headers - subsections
                "\n\n",      # Double newlines - paragraph breaks
                "\n",        # Single newlines
                " ",         # Spaces
                ""           # Characters
            ],
            keep_separator=True,  # Keep section headers with content
        )
        self.vectorstore = None
        self._initialize_vectorstore()

    def _smart_chunk_document(self, document: Document) -> List[Document]:
        """Smart chunking that keeps task lists and project sections together"""
        source_path = document.metadata.get('source', '')
        content = document.page_content

        # For project documents, use special handling
        if '/Projects/' in source_path and content:
            chunks = []

            # Split by major sections (## headers)
            sections = content.split('\n## ')

            for i, section in enumerate(sections):
                if i > 0:  # Add back the header marker for non-first sections
                    section = '## ' + section

                # If section is small enough, keep it as one chunk
                if len(section) <= 1200:
                    chunk_doc = Document(
                        page_content=section,
                        metadata={**document.metadata, 'section': section.split('\n')[0][:50]}
                    )
                    chunks.append(chunk_doc)
                else:
                    # For large sections, use regular splitting but try to keep task lists together
                    subsection_chunks = self._split_preserving_tasks(section, document.metadata)
                    chunks.extend(subsection_chunks)

            return chunks if chunks else [document]

        # For non-project documents, use regular chunking
        return self.text_splitter.split_documents([document])

    def _split_preserving_tasks(self, content: str, metadata: dict) -> List[Document]:
        """Split content while trying to preserve task lists"""
        lines = content.split('\n')
        chunks = []
        current_chunk = []
        current_length = 0

        i = 0
        while i < len(lines):
            line = lines[i]
            line_length = len(line) + 1  # +1 for newline

            # If we're at a task list, try to keep it together
            if line.strip().startswith('- ['):
                # Find end of task list
                task_block = [line]
                task_length = line_length
                j = i + 1

                while j < len(lines) and (lines[j].strip().startswith('- [') or lines[j].strip() == ''):
                    task_block.append(lines[j])
                    task_length += len(lines[j]) + 1
                    j += 1

                # If task block fits in current chunk, add it
                if current_length + task_length <= 1000:
                    current_chunk.extend(task_block)
                    current_length += task_length
                    i = j
                    continue
                # If current chunk has content, finish it and start new one with tasks
                elif current_chunk:
                    chunks.append(Document(
                        page_content='\n'.join(current_chunk),
                        metadata=metadata
                    ))
                    current_chunk = task_block
                    current_length = task_length
                    i = j
                    continue

            # Regular line handling
            if current_length + line_length > 1000 and current_chunk:
                # Finish current chunk
                chunks.append(Document(
                    page_content='\n'.join(current_chunk),
                    metadata=metadata
                ))
                current_chunk = [line]
                current_length = line_length
            else:
                current_chunk.append(line)
                current_length += line_length

            i += 1

        # Add final chunk
        if current_chunk:
            chunks.append(Document(
                page_content='\n'.join(current_chunk),
                metadata=metadata
            ))

        return chunks if chunks else [Document(page_content=content, metadata=metadata)]

    def _initialize_vectorstore(self):
        """Initialize or load existing Chroma vectorstore"""
        try:
            # Try to load existing vectorstore
            self.vectorstore = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings,
                collection_metadata={"hnsw:space": "cosine"}  # Use cosine distance
            )
            logger.info(f"✅ Loaded existing vectorstore from {self.persist_directory}")
        except Exception as e:
            # Create new vectorstore if loading fails
            logger.info(f"Creating new vectorstore: {e}")
            self.vectorstore = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings,
                collection_metadata={"hnsw:space": "cosine"}  # Use cosine distance
            )
    
    def load_and_index_directory(self, directory_path: str, incremental: bool = False) -> int:
        """Load all markdown files from directory and index them"""
        try:
            if not incremental:
                # Full rebuild: Clear existing documents first
                try:
                    if hasattr(self.vectorstore._collection, 'count') and self.vectorstore._collection.count() > 0:
                        # Get all document IDs first
                        all_docs = self.vectorstore._collection.get()
                        if all_docs and all_docs.get('ids'):
                            self.vectorstore._collection.delete(ids=all_docs['ids'])
                            logger.info(f"🗑️ Cleared {len(all_docs['ids'])} existing documents")
                except Exception as e:
                    logger.warning(f"Could not clear existing documents: {e}")
                    # Create new vectorstore if clearing fails
                    self.vectorstore = Chroma(
                        persist_directory=self.persist_directory,
                        embedding_function=self.embeddings
                    )
            else:
                # Incremental update: Remove deleted files AND existing chunks from files being reprocessed
                self._clean_deleted_files(directory_path)

            # Load documents with YAML frontmatter parsing (direct approach due to DirectoryLoader issues)
            documents = []
            import glob as glob_module

            # Find all markdown files
            md_files = glob_module.glob(os.path.join(directory_path, "**/*.md"), recursive=True)
            logger.info(f"Found {len(md_files)} markdown files to process")

            for file_path in md_files:
                try:
                    loader = YAMLFrontmatterLoader(file_path, encoding="utf-8")
                    file_docs = loader.load()
                    documents.extend(file_docs)
                except Exception as e:
                    logger.warning(f"Failed to load {file_path}: {e}")

            if not documents:
                logger.warning(f"No markdown files found in {directory_path}")
                return 0

            # For incremental updates, remove existing chunks from these specific files to prevent duplicates
            if incremental:
                self._remove_existing_file_chunks(documents)

            # Split documents into chunks using smart chunking
            text_chunks = []
            for doc in documents:
                chunks = self._smart_chunk_document(doc)
                text_chunks.extend(chunks)

            # Enhance chunks with filename keywords for better searchability
            enhanced_chunks = []
            for chunk in text_chunks:
                # Extract filename without extension
                filename = Path(chunk.metadata.get('source', '')).stem
                # Add filename terms to the beginning of content for better matching
                enhanced_content = f"[{filename}] {chunk.page_content}"
                chunk.page_content = enhanced_content
                enhanced_chunks.append(chunk)

            # Add documents to vectorstore
            self.vectorstore.add_documents(enhanced_chunks)
            
            logger.info(f"✅ Indexed {len(text_chunks)} chunks from {len(documents)} documents")
            return len(text_chunks)
            
        except Exception as e:
            logger.error(f"Error indexing directory {directory_path}: {e}")
            return 0

    def _clean_deleted_files(self, directory_path: str):
        """Remove documents from vectorstore that no longer exist on filesystem"""
        try:
            # Get all documents from vectorstore
            all_docs = self.vectorstore._collection.get()
            if not all_docs or not all_docs.get('metadatas'):
                return

            # Get list of current files in directory
            current_files = set()
            for root, dirs, files in os.walk(directory_path):
                for file in files:
                    if file.endswith('.md'):
                        current_files.add(os.path.join(root, file))

            # Find documents to delete (those whose source files no longer exist)
            ids_to_delete = []
            deleted_count = 0

            for i, metadata in enumerate(all_docs['metadatas']):
                source_path = metadata.get('source')
                if source_path and not os.path.exists(source_path):
                    ids_to_delete.append(all_docs['ids'][i])
                    deleted_count += 1
                    logger.info(f"🗑️ Marking deleted file for removal: {source_path}")

            # Delete the orphaned documents
            if ids_to_delete:
                self.vectorstore._collection.delete(ids=ids_to_delete)
                logger.info(f"✅ Removed {deleted_count} documents for deleted files")
            else:
                logger.info("✅ No deleted files found")

        except Exception as e:
            logger.error(f"Error cleaning deleted files: {e}")

    def _remove_existing_file_chunks(self, documents: List[Document]):
        """Remove existing chunks from vectorstore for files that are being reprocessed"""
        try:
            # Get all existing documents from vectorstore
            all_docs = self.vectorstore._collection.get()
            if not all_docs or not all_docs.get('metadatas'):
                return

            # Build set of source paths being reprocessed
            reprocessing_paths = {doc.metadata.get('source') for doc in documents}

            # Find chunks to delete (those from files being reprocessed)
            ids_to_delete = []
            removed_count = 0

            for i, metadata in enumerate(all_docs['metadatas']):
                source_path = metadata.get('source')
                if source_path in reprocessing_paths:
                    ids_to_delete.append(all_docs['ids'][i])
                    removed_count += 1

            # Delete the existing chunks
            if ids_to_delete:
                self.vectorstore._collection.delete(ids=ids_to_delete)
                logger.info(f"🔄 Removed {removed_count} existing chunks for {len(reprocessing_paths)} files being reprocessed")

        except Exception as e:
            logger.error(f"Error removing existing file chunks: {e}")

    def _detect_folder_type(self, source_path: str, content_lower: str) -> str:
        """Intelligently detect the purpose/type of a folder based on path and content patterns"""
        path_lower = source_path.lower()

        # Check for common folder naming patterns
        if any(pattern in path_lower for pattern in ['/project', '/task', '/goal']):
            return 'projects'

        # Detect temporal/log patterns - both by path and filename patterns
        if any(pattern in path_lower for pattern in ['/log', '/daily', '/weekly', '/journal', '/diary']):
            return 'logs'

        # Date pattern in filename suggests temporal content
        filename = Path(source_path).stem
        if self._is_date_filename(filename):
            return 'logs'

        # Check for inventory/reference patterns
        if any(pattern in path_lower for pattern in ['/inventory', '/hardware', '/device', '/equipment']):
            return 'inventory'

        if any(pattern in path_lower for pattern in ['/service', '/tool', '/software']):
            return 'services'

        # Content-based detection for project files
        if any(indicator in content_lower for indicator in ['type: project', 'status: active', 'status: completed', '## goal', '## steps']):
            return 'projects'

        # Content-based detection for temporal files
        if any(indicator in content_lower for indicator in ['## today', '## daily', '## weekly', 'date:', 'day:', 'week:']):
            return 'logs'

        return 'general'

    def _is_date_filename(self, filename: str) -> bool:
        """Check if filename follows common date patterns"""
        import re

        # Common date patterns: YYYY-MM-DD, YYYY-WNN, YYYY_MM_DD, etc.
        date_patterns = [
            r'^\d{4}-\d{2}-\d{2}$',     # 2025-09-17
            r'^\d{4}-W\d{2}$',          # 2025-W37
            r'^\d{4}_\d{2}_\d{2}$',     # 2025_09_17
            r'^\d{8}$',                 # 20250917
            r'^\d{4}-\d{1,2}-\d{1,2}$', # 2025-9-17 (flexible)
        ]

        return any(re.match(pattern, filename) for pattern in date_patterns)

    def _extract_date_from_filename(self, filename: str):
        """Extract datetime from various filename patterns"""
        import re
        from datetime import datetime

        # Try different date formats
        patterns = [
            (r'^(\d{4})-(\d{2})-(\d{2})$', '%Y-%m-%d'),       # 2025-09-17
            (r'^(\d{4})-W(\d{2})$', None),                    # 2025-W37 (special handling)
            (r'^(\d{4})_(\d{2})_(\d{2})$', '%Y_%m_%d'),       # 2025_09_17
            (r'^(\d{8})$', '%Y%m%d'),                         # 20250917
            (r'^(\d{4})-(\d{1,2})-(\d{1,2})$', '%Y-%m-%d'),   # 2025-9-17
        ]

        for pattern, date_format in patterns:
            match = re.match(pattern, filename)
            if match:
                if pattern.startswith(r'^\d{4}-W'):  # Weekly format
                    year, week = match.groups()
                    # Convert week format to a date (Monday of that week)
                    return datetime.strptime(f'{year}-W{week.zfill(2)}-1', '%Y-W%W-%w')
                elif date_format:
                    try:
                        return datetime.strptime(filename, date_format)
                    except ValueError:
                        continue

        return None

    def update_directory_incremental(self, directory_path: str) -> int:
        """Update index incrementally - only add new/changed files, remove deleted ones"""
        return self.load_and_index_directory(directory_path, incremental=True)
    
    def _hybrid_search(self, query: str, k: int, boost_inventory: bool) -> List[Dict[str, Any]]:
        """Enhanced hybrid search with recency bias and path relevance"""
        try:
            from datetime import datetime, timedelta
            import os

            # Get more results for hybrid processing - cast wider net for poor embeddings
            semantic_results = self.vectorstore.similarity_search_with_score(query, k=k*10)

            documents = []
            query_terms = set(term.lower().strip() for term in query.split() if len(term.strip()) > 2)
            query_lower = query.lower()

            # Detect query patterns for enhanced scoring
            is_temporal_query = any(word in query_lower for word in ['when', 'last', 'recent', 'today', 'yesterday', 'week'])
            is_project_query = any(word in query_lower for word in ['project', 'working', 'progress', 'developing'])

            # Detect frontmatter-based queries
            is_status_query = any(word in query_lower for word in ['active', 'completed', 'planned', 'blocked', 'status'])
            is_type_query = any(word in query_lower for word in ['type:', 'project', 'service', 'hardware', 'research'])
            is_tag_query = any(word in query_lower for word in ['tag:', 'tagged', 'ai', 'web', 'network', 'localhost'])

            # Detect task-specific queries
            is_task_query = any(word in query_lower for word in ['task', 'tasks', 'todo', 'open', 'pending', 'checkbox', '[ ]', '[x]'])
            has_checkbox_patterns = any(pattern in query_lower for pattern in ['[ ]', '[x]', 'checkbox', 'checklist'])

            for doc, score in semantic_results:
                # Convert cosine distance to similarity
                semantic_similarity = max(0.0, 1.0 - (score / 2.0))

                # Calculate keyword matching score
                source_path = doc.metadata.get('source', 'unknown')
                filename = Path(source_path).stem.lower()
                content_lower = doc.page_content.lower()

                # Keyword matching bonuses
                keyword_score = 0.0

                # Exact filename match (highest priority)
                if any(term in filename for term in query_terms):
                    keyword_score += 0.5

                # Content keyword matches
                for term in query_terms:
                    if term in content_lower:
                        keyword_score += 0.1

                # Path relevance scoring
                path_score = 0.0

                # Smart folder detection and scoring
                folder_type = self._detect_folder_type(source_path, content_lower)

                if is_project_query:
                    if folder_type == 'projects':
                        path_score += 0.3
                    elif folder_type == 'logs' or any(proj_word in content_lower for proj_word in ['project', 'development', 'implementation']):
                        path_score += 0.15

                if is_temporal_query:
                    if folder_type == 'logs':
                        path_score += 0.4  # Strong boost for temporal queries on logs

                # Inventory/Hardware relevance (existing logic enhanced)
                if boost_inventory and folder_type in ['inventory', 'hardware', 'services']:
                    path_score += 0.2

                # Type-aware frontmatter metadata scoring
                frontmatter_score = 0.0
                metadata = doc.metadata
                doc_type = metadata.get('type', '').lower()

                # Type-based queries (e.g., "project", "service", "hardware")
                if is_type_query and 'type' in metadata:
                    type_value = metadata['type'].lower()
                    for term in query_terms:
                        if term in type_value:
                            frontmatter_score += 0.3  # Good boost for type matches

                # Tag-based queries (e.g., "ai projects", "network tools")
                if is_tag_query and 'tags' in metadata:
                    tags_value = metadata['tags'].lower()  # Already converted to string
                    for term in query_terms:
                        if term in tags_value:
                            frontmatter_score += 0.2  # Moderate boost for tag matches

                # Type-aware status scoring - prevents hardware/project confusion
                if is_status_query and 'status' in metadata:
                    status_value = metadata['status'].lower()

                    # Project-specific status queries
                    if doc_type == 'project':
                        if any(term in ['active', 'working', 'progress', 'developing'] for term in query_terms):
                            if status_value in ['active']:
                                frontmatter_score += 0.5  # Strong boost for active projects
                        elif any(term in ['completed', 'done', 'finished'] for term in query_terms):
                            if status_value in ['done', 'completed']:
                                frontmatter_score += 0.5
                        elif any(term in ['planned', 'upcoming', 'todo'] for term in query_terms):
                            if status_value in ['planned']:
                                frontmatter_score += 0.4

                    # Hardware-specific status queries
                    elif doc_type == 'hardware':
                        if any(term in ['running', 'operational', 'working'] for term in query_terms):
                            if status_value in ['active']:
                                frontmatter_score += 0.4  # Hardware operational status
                        # Don't boost hardware for "active projects" queries

                    # Service-specific status queries
                    elif doc_type == 'service':
                        if any(term in ['running', 'operational', 'up'] for term in query_terms):
                            if status_value in ['active']:
                                frontmatter_score += 0.4  # Service running status

                    # Research-specific status queries
                    elif doc_type == 'research':
                        if 'research-status' in metadata:
                            research_status = metadata['research-status'].lower()
                            if any(term in ['active', 'ongoing'] for term in query_terms):
                                if research_status in ['active']:
                                    frontmatter_score += 0.4
                            elif any(term in ['completed', 'done'] for term in query_terms):
                                if research_status in ['completed']:
                                    frontmatter_score += 0.4

                # Context-aware project prioritization
                if is_project_query:
                    if doc_type == 'project':
                        frontmatter_score += 0.3  # Strong boost for actual projects
                        # Additional boost for active projects in project contexts
                        if metadata.get('status') == 'active':
                            frontmatter_score += 0.2
                    elif doc_type in ['research', 'log'] and any(proj_word in content_lower for proj_word in ['project', 'development', 'implementation']):
                        frontmatter_score += 0.1  # Mild boost for project-related content

                # Hardware-specific query context
                hardware_query = any(word in query_lower for word in ['hardware', 'device', 'computer', 'server', 'workstation'])
                if hardware_query and doc_type == 'hardware':
                    frontmatter_score += 0.3

                # Service-specific query context
                service_query = any(word in query_lower for word in ['service', 'server', 'application', 'running'])
                if service_query and doc_type == 'service':
                    frontmatter_score += 0.3

                # Task-specific content scoring
                if is_task_query:
                    # Check if chunk contains actual checkbox tasks
                    checkbox_count = content_lower.count('- [ ]') + content_lower.count('- [x]')
                    if checkbox_count > 0:
                        frontmatter_score += 0.5 + (checkbox_count * 0.1)  # Base boost + per-task bonus
                        logger.debug(f"Task boost: {checkbox_count} checkboxes found in {source_path}")

                    # Boost project documents for task queries
                    if doc_type == 'project':
                        frontmatter_score += 0.2  # Projects more likely to have tasks

                # Recency bias scoring
                recency_score = 0.0
                try:
                    if os.path.exists(source_path):
                        file_mtime = datetime.fromtimestamp(os.path.getmtime(source_path))
                        now = datetime.now()

                        # Strong recency bias for temporal queries
                        if is_temporal_query:
                            days_old = (now - file_mtime).days
                            if days_old <= 7:
                                recency_score += 0.3 * (1 - days_old / 7)  # Linear decay over 7 days
                            elif days_old <= 30:
                                recency_score += 0.1 * (1 - (days_old - 7) / 23)  # Slower decay for 30 days
                        else:
                            # Enhanced recency bias for all queries to favor recent content
                            days_old = (now - file_mtime).days
                            if days_old <= 7:
                                recency_score += 0.2 * (1 - days_old / 7)  # Strong boost for very recent
                            elif days_old <= 30:
                                recency_score += 0.1 * (1 - (days_old - 7) / 23)  # Moderate for recent
                            elif days_old <= 90:
                                recency_score += 0.05 * (1 - (days_old - 30) / 60)  # Light for older

                        # Special handling for date-based files (daily notes, etc.)
                        if folder_type == 'logs' and self._is_date_filename(Path(source_path).stem):
                            try:
                                file_date = self._extract_date_from_filename(Path(source_path).stem)
                                if file_date:
                                    days_old = (now - file_date).days

                                    if is_temporal_query:
                                        if days_old <= 3:
                                            recency_score += 0.5  # Very strong boost for very recent daily notes
                                        elif days_old <= 7:
                                            recency_score += 0.3
                                        elif days_old <= 14:
                                            recency_score += 0.15
                            except:
                                pass  # Fall back to file modification time

                except Exception as e:
                    logger.debug(f"Could not get file mtime for {source_path}: {e}")

                # Combine all scores (legacy terms will naturally fade via recency weighting)
                final_similarity = semantic_similarity + keyword_score + path_score + recency_score + frontmatter_score

                # Enhanced source attribution
                filename_display = Path(source_path).name

                doc_info = {
                    "content": doc.page_content[:300] + "..." if len(doc.page_content) > 300 else doc.page_content,
                    "filename": filename_display,
                    "source_path": source_path,
                    "similarity": final_similarity,
                    "semantic_score": semantic_similarity,
                    "keyword_score": keyword_score,
                    "path_score": path_score,
                    "recency_score": recency_score,
                    "frontmatter_score": frontmatter_score,
                    "metadata": doc.metadata,
                    "full_content": doc.page_content,
                    "citation": f"[Source: {filename_display}]"
                }

                documents.append(doc_info)

            # Sort by final similarity score
            documents.sort(key=lambda x: x['similarity'], reverse=True)

            # Enhanced category-based boosting
            if boost_inventory:
                inventory_docs = [d for d in documents if '/Inventory/' in d['source_path'] or '/Hardware/' in d['source_path']]
                other_docs = [d for d in documents if not ('/Inventory/' in d['source_path'] or '/Hardware/' in d['source_path'])]

                # Prioritize inventory docs
                final_docs = inventory_docs[:k//2] + other_docs[:k-len(inventory_docs[:k//2])]
                documents = final_docs[:k]
            elif is_temporal_query:
                # For temporal queries, prioritize daily/weekly notes
                temporal_docs = [d for d in documents if '/Logs/' in d['source_path']]
                other_docs = [d for d in documents if '/Logs/' not in d['source_path']]

                # Mix temporal and other docs
                final_docs = temporal_docs[:k//2] + other_docs[:k-len(temporal_docs[:k//2])]
                documents = final_docs[:k]
            elif is_project_query:
                # For project queries, prioritize project files and daily notes
                project_docs = [d for d in documents if '/Projects/' in d['source_path'] or '/Logs/' in d['source_path']]
                other_docs = [d for d in documents if '/Projects/' not in d['source_path'] and '/Logs/' not in d['source_path']]

                # Mix project and other docs
                final_docs = project_docs[:int(k*0.7)] + other_docs[:k-len(project_docs[:int(k*0.7)])]
                documents = final_docs[:k]
            else:
                documents = documents[:k]

            logger.info(f"Enhanced hybrid search '{query}' (temporal={is_temporal_query}, project={is_project_query}) returned {len(documents)} results")
            return documents

        except Exception as e:
            logger.error(f"Enhanced hybrid search error for query '{query}': {e}")
            return []
    
    def search(self, query: str, k: int = 5, boost_inventory: bool = True, hybrid: bool = True) -> List[Dict[str, Any]]:
        """Search for similar documents with enhanced source attribution"""
        try:
            if not self.vectorstore:
                return []
                
            # Hybrid search: combine semantic search with keyword matching
            if hybrid:
                return self._hybrid_search(query, k, boost_inventory)
            
            # Use LangChain's similarity_search_with_score for proper similarity handling
            # Search for more results initially to allow for inventory boosting
            search_k = k * 3 if boost_inventory else k
            results = self.vectorstore.similarity_search_with_score(query, k=search_k)
            
            documents = []
            inventory_docs = []
            other_docs = []
            
            for doc, score in results:
                # Convert cosine distance (0-2) to similarity (0-1), where lower distance = higher similarity
                similarity = max(0.0, 1.0 - (score / 2.0))  # Normalize distance to similarity
                
                # Enhanced source attribution
                source_path = doc.metadata.get('source', 'unknown')
                filename = Path(source_path).name
                
                doc_info = {
                    "content": doc.page_content[:300] + "..." if len(doc.page_content) > 300 else doc.page_content,
                    "filename": filename,
                    "source_path": source_path,
                    "similarity": similarity,
                    "metadata": doc.metadata,
                    "full_content": doc.page_content,
                    "citation": f"[Source: {filename}]"
                }
                
                # Boost inventory/hardware documents
                if boost_inventory and ('/Inventory/' in source_path or '/Hardware/' in source_path):
                    inventory_docs.append(doc_info)
                else:
                    other_docs.append(doc_info)
            
            # Add keyword matching boost for exact filename matches
            keyword_boosted = []
            remaining_docs = []
            
            query_lower = query.lower()
            
            for doc_info in (inventory_docs + other_docs):
                filename_lower = doc_info['filename'].lower()
                # Boost documents where filename contains query terms
                filename_match_score = 0
                query_terms = [term.strip() for term in query_lower.split() if len(term.strip()) > 2]

                # Strong boost for exact project name matches
                for term in query_terms:
                    if term in filename_lower:
                        filename_match_score += 0.4

                # Extra boost for project documents in /Projects/ directory
                if '/Projects/' in source_path and filename_match_score > 0:
                    filename_match_score += 0.3

                if filename_match_score > 0:
                    doc_info['similarity'] += filename_match_score
                    keyword_boosted.append(doc_info)
                else:
                    remaining_docs.append(doc_info)
            
            # Sort all documents by enhanced similarity
            all_docs = keyword_boosted + remaining_docs
            all_docs.sort(key=lambda x: x['similarity'], reverse=True)
            
            # Combine results: prioritize inventory docs, then fill with others
            if boost_inventory:
                documents = inventory_docs[:k//2] + other_docs[:k-len(inventory_docs[:k//2])]
                documents = all_docs[:k]  # Use keyword-boosted results
            else:
                documents = all_docs[:k]
            
            logger.info(f"Search '{query}' returned {len(documents)} results")
            return documents
            
        except Exception as e:
            logger.error(f"Search error for query '{query}': {e}")
            return []
    
    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Get all indexed documents"""
        try:
            if not self.vectorstore:
                return []
            
            # Get all documents by doing a very broad search
            all_docs = self.vectorstore.similarity_search("", k=100)  # Get up to 100 docs
            
            documents = []
            seen_sources = set()
            
            for doc in all_docs:
                source = doc.metadata.get('source', 'unknown')
                # Deduplicate by source file
                if source not in seen_sources:
                    seen_sources.add(source)
                    documents.append({
                        "content": doc.page_content[:300] + "..." if len(doc.page_content) > 300 else doc.page_content,
                        "filename": Path(source).name,
                        "metadata": doc.metadata,
                        "full_content": doc.page_content
                    })
            
            return documents
            
        except Exception as e:
            logger.error(f"Error getting all documents: {e}")
            return []

# Global RAG instance
_rag_instance = None

def get_rag_instance() -> ForgeRAG:
    """Get or create global RAG instance"""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = ForgeRAG(model_name="nomic-embed-text")
    return _rag_instance

def rebuild_index(directory_path: str) -> int:
    """Rebuild the RAG index from directory"""
    rag = get_rag_instance()
    return rag.load_and_index_directory(directory_path)

def search_documents(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search documents using RAG with source attribution"""
    rag = get_rag_instance()
    return rag.search(query, k=limit)

def verify_claim_in_document(filename: str, claim_text: str) -> Dict[str, Any]:
    """Verify if a specific claim exists in a document"""
    try:
        rag = get_rag_instance()
        # Search specifically for the claim
        results = rag.search(f"{claim_text} {filename}", k=10)
        
        # Filter results to only this specific file
        matching_results = [r for r in results if r['filename'].lower() == filename.lower()]
        
        if matching_results:
            best_match = matching_results[0]
            return {
                "found": True,
                "source": filename,
                "excerpt": best_match['content'],
                "confidence": best_match['similarity']
            }
        else:
            return {
                "found": False,
                "source": filename,
                "excerpt": None,
                "confidence": 0.0
            }
    except Exception as e:
        logger.error(f"Error verifying claim in {filename}: {e}")
        return {
            "found": False,
            "source": filename,
            "excerpt": None,
            "confidence": 0.0,
            "error": str(e)
        }

def get_all_documents() -> List[Dict[str, Any]]:
    """Get all documents"""
    rag = get_rag_instance()
    return rag.get_all_documents()