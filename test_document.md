# Forge Phase 2 Test Document

This is a test document for the Knowledge Vault integration in Forge Phase 2.

## Key Features

- **Persistent conversation memory** using ChromaDB
- **Unified AI context** from both conversations and documents
- **Semantic search** across all knowledge sources
- **File upload and management** capabilities

## Technical Details

The system uses sentence transformers with the `paraphrase-MiniLM-L6-v2` model for embedding generation. ChromaDB provides the vector database capabilities for both conversation history and document storage.

The hybrid approach allows AI responses to reference both past conversations and relevant documents from the Knowledge Vault.