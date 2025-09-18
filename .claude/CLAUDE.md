# Forge Project Context for Claude

## Project Overview
**Forge** is a localhost-first AI knowledge management system combining an Electron desktop app with a Python-based AI server for RAG-enhanced document interaction.

## Key Architecture
- **Monorepo**: packages/desktop (Electron), packages/ai-server (Python FastAPI), packages/shared
- **Tech Stack**: Electron + React + Vite frontend, FastAPI + LangChain + ChromaDB + Ollama backend
- **Purpose**: Markdown-focused knowledge vault with semantic search and AI chat capabilities

## Current State (Sept 2025)
- ✅ **Functional Electron app** with working markdown editor (ObsidianEditor.tsx)
- ✅ **AI assistant integration** - chat interface connects to local AI server
- ✅ **RAG functionality** - semantic search across user's markdown vault using ChromaDB
- ✅ **Single-command startup** - `npm run dev` starts all services concurrently

## How to Run
```bash
npm run dev  # Starts renderer (port 5174), Electron main, and AI server (port 8000)
```

## Key Files & Locations
- **Main editor**: `packages/desktop/src/renderer/components/ObsidianEditor.tsx`
- **AI server**: `packages/ai-server/main.py` (FastAPI + RAG context building)
- **Project status**: `CURRENT_STATE.md` (detailed session-to-session notes)
- **Vault path**: `/home/adam/Projects/Vault` (user's knowledge base)

## Recent Improvements
- **Natural AI approach**: Removed rigid query classification, AI gets rich context and uses judgment
- **Simplified context**: Current time + daily note preview + 3 most relevant vault documents
- **Performance**: Sub-second responses for 78+ markdown files, 412 text chunks indexed

## Architecture Pattern
```
User Query → Electron IPC → AI Server → Context Builder → Ollama LLM → Response
                                    ↓
                            Time + Daily Note + Relevant Docs
```

## Common Commands
- **Development**: `npm run dev` (all services), `npm run dev:renderer`, `npm run ai-server`
- **Build**: `npm run build`, `npm run dist`
- **Lint**: `npm run lint`

## Technical Notes
- **Embedding Model**: nomic-embed-text (768D, superior semantic understanding)
- **LLM**: Llama 3.1:8b via Ollama
- **Vector DB**: ChromaDB with persistent storage in `./chroma_db/`
- **Editor**: React + ReactMarkdown with YAML frontmatter, wiki links, copy-to-clipboard features

## Known Issues & Considerations
- Edit mode is full-document textarea (not per-line like true Obsidian)
- Multiple CodeMirror attempts broke UI/scrolling - current ObsidianEditor is best compromise
- AI always searches documents (may be overkill for simple queries)
- Multiple background processes during development

## Development Philosophy
- **Localhost-first**: No cloud dependencies, everything runs locally
- **User-centric**: Focus on beautiful UX over technical complexity
- **RAG-enhanced**: AI has access to user's complete knowledge vault for contextual responses