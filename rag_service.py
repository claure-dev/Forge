"""
Clean RAG implementation using LangChain best practices
"""

import os
from pathlib import Path
from typing import List, Dict, Any
import logging

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain.schema import Document

logger = logging.getLogger(__name__)

class ForgeRAG:
    def __init__(self, persist_directory: str = "./chroma_db", model_name: str = "all-minilm:l6-v2"):
        self.persist_directory = persist_directory
        self.model_name = model_name
        self.embeddings = OllamaEmbeddings(model=model_name)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        self.vectorstore = None
        self._initialize_vectorstore()
    
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
    
    def load_and_index_directory(self, directory_path: str) -> int:
        """Load all markdown files from directory and index them"""
        try:
            # Clear existing documents first
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
            
            # Load documents
            loader = DirectoryLoader(
                directory_path,
                glob="**/*.md",
                loader_cls=TextLoader,
                loader_kwargs={"encoding": "utf-8"}
            )
            documents = loader.load()
            
            if not documents:
                logger.warning(f"No markdown files found in {directory_path}")
                return 0
            
            # Split documents into chunks
            text_chunks = self.text_splitter.split_documents(documents)
            
            # Add documents to vectorstore
            self.vectorstore.add_documents(text_chunks)
            
            logger.info(f"✅ Indexed {len(text_chunks)} chunks from {len(documents)} documents")
            return len(text_chunks)
            
        except Exception as e:
            logger.error(f"Error indexing directory {directory_path}: {e}")
            return 0
    
    def search(self, query: str, k: int = 5, boost_inventory: bool = True) -> List[Dict[str, Any]]:
        """Search for similar documents with enhanced source attribution"""
        try:
            if not self.vectorstore:
                return []
            
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
            
            # Combine results: prioritize inventory docs, then fill with others
            if boost_inventory:
                documents = inventory_docs[:k//2] + other_docs[:k-len(inventory_docs[:k//2])]
                documents = documents[:k]  # Ensure we don't exceed requested count
            else:
                documents = [doc_info for doc_info in documents][:k]
            
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
        _rag_instance = ForgeRAG()
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