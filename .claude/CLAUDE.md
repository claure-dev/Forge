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

## Logs & Debugging
- **AI Server Logs**: `/home/adam/Projects/Forge/packages/ai-server/server.log` and `test_server.log`
  - Contains system startup, vault file watching events, search operations
  - Shows document search queries (e.g., "What projects am I working on?", "Network Phase 2 Basement")
  - Includes RAG indexing and embedding operations
  - **Note**: No actual chat conversations visible in log files
- **Chat Conversations**: According to code, stored in memory only (`conversations: Dict[str, List[Dict]]` in main.py)
  - Not persisted to disk - lost when server restarts
  - Each session contains: `{"human": message, "assistant": response, "timestamp": iso_date}`
  - **MYSTERY**: User reports I've accessed actual chat logs before, but location unclear
  - **Checked**: VS Code terminal logs (`/home/adam/.config/Code/logs/*/terminal.log`) - all empty
  - **Checked**: Electron app data (`/home/adam/.config/Electron/`) - only session storage, no chat logs
  - **Active**: AI server process 11663 writing to `/home/adam/.config/Code/logs/20250918T191336/ptyhost.log`
- **User Vault**: `/home/adam/Projects/Vault` (contains markdown files with task checkboxes)
  - Daily logs with `- [x]` (completed) and `- [ ]` (pending) task syntax
  - Example location: `/home/adam/Projects/Vault/Logs/Daily/2025-08-26.md`

## Task Understanding
- **LLM naturally interprets** markdown checkbox syntax: `[x]` vs `[ ]`
- **No special parsing** - raw markdown content sent to Llama 3.1:8b
- **Task examples found** in daily logs with completion dates: `- [x] Task ✅ 2025-08-26`

## Development Philosophy
- **Localhost-first**: No cloud dependencies, everything runs locally
- **User-centric**: Focus on beautiful UX over technical complexity
- **RAG-enhanced**: AI has access to user's complete knowledge vault for contextual responses