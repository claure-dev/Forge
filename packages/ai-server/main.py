from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import requests
import uuid
from typing import Dict, List, Optional
from datetime import datetime
import logging
import os
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Forge Local AI", description="Localhost-first AI knowledge management system")

# Global variables for simple conversation memory
conversations: Dict[str, List[Dict]] = {}
vault_path = None

# Initialize RAG service on startup
try:
    from rag_service import get_rag_instance
    rag_instance = get_rag_instance()
    logger.info("🚀 LangChain RAG service initialized")
except Exception as e:
    logger.error(f"Failed to initialize RAG service: {e}")
    rag_instance = None

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

def build_conversation_context(session_id: str, new_message: str) -> str:
    """Build conversation context with multi-pass RAG-enhanced knowledge retrieval"""
    if session_id not in conversations:
        conversations[session_id] = []
    
    # Get recent conversation history (last 3 messages to save context space)
    recent_messages = conversations[session_id][-3:] if conversations[session_id] else []
    
    # Get relevant documents from knowledge vault using RAG
    relevant_docs = []
    if rag_instance:
        try:
            from rag_service import search_documents
            # Search for relevant documents (limit to top 5 for better coverage)
            relevant_docs = search_documents(new_message, limit=5)
        except Exception as e:
            logger.error(f"Error retrieving relevant documents: {e}")
    
    # Build context string with multi-pass analysis
    context_parts = []
    
    # First pass: Document analysis for patterns and relationships
    analysis_context = perform_document_analysis(relevant_docs, new_message)
    if analysis_context:
        context_parts.append(analysis_context)
    
    # Add relevant knowledge vault documents 
    if relevant_docs:
        context_parts.append("=== RELEVANT KNOWLEDGE FROM YOUR VAULT ===")
        for doc in relevant_docs:
            similarity_score = f" (relevance: {doc['similarity']:.2f})" if doc.get('similarity') else ""
            context_parts.append(f"📄 **{doc['filename']}**{similarity_score}:")
            # Use more content for high-relevance docs
            content_limit = 600 if doc.get('similarity', 0) > 0.7 else 300
            content = doc.get('full_content', doc.get('content', ''))[:content_limit]
            if len(content) == content_limit:
                content += "..."
            context_parts.append(content)
            context_parts.append("")  # Empty line between documents
        context_parts.append("=" * 50)
        context_parts.append("")
    
    # Add recent conversation history
    if recent_messages:
        context_parts.append("=== RECENT CONVERSATION ===")
        for msg in recent_messages:
            context_parts.append(f"Human: {msg['human']}")
            context_parts.append(f"Assistant: {msg['assistant']}")
            context_parts.append("")
        context_parts.append("=" * 30)
        context_parts.append("")
    
    # Intelligent response guidelines
    context_parts.append("RESPONSE GUIDELINES:")
    context_parts.append("- Answer naturally and conversationally")
    context_parts.append("- Use your general knowledge freely for universal facts and concepts")
    context_parts.append("- Reference vault documents when they contain relevant information about the user's specific setup")
    context_parts.append("- For claims about the user's hardware, projects, or documented systems: cite sources [Source: filename.md]")
    context_parts.append("- If asked about user-specific info not in vault: say 'I don't see that documented in your vault'")
    context_parts.append("")
    context_parts.append("WHEN TO USE STRUCTURED ANALYSIS:")
    context_parts.append("- For complex questions about infrastructure, projects, or technical decisions")
    context_parts.append("- When meaningful patterns exist across multiple vault documents")
    context_parts.append("- When strategic recommendations would be valuable")
    context_parts.append("")
    context_parts.append("STRUCTURED FORMAT (use only when appropriate):")
    context_parts.append("## From Your Vault:")
    context_parts.append("- [Relevant documented facts with sources]")
    context_parts.append("## Analysis & Recommendations:")  
    context_parts.append("- [Strategic insights and actionable next steps]")
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
        
        return {"message": f"Vault configured: {request.vault_directory}", "status": "success"}
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)