# 🔥 Forge - Localhost-First AI Knowledge Management System

A personal knowledge management system that combines an Electron desktop app with a local AI assistant for RAG-enhanced document interaction. Think "Obsidian meets local AI" - but, with an AI-native approach instead of using plugins - designed for technical users who want complete control over their knowledge vault and AI interactions.

## 🎯 Project Purpose

Forge bridges the gap between traditional note-taking and AI-powered knowledge management by:

- **Maintaining complete local control** - no cloud dependencies, no data leaves your machine
- **Understanding your knowledge patterns** - AI trained on YOUR specific documents and workflow
- **Providing intelligent assistance** - semantic search, task tracking, and contextual responses
- **Supporting technical workflows** - YAML frontmatter, markdown checkboxes, wiki-style linking

## ⚠️ Current Status & Caveats

**This is a personal project currently optimized for a specific knowledge vault structure.** Key considerations:

### 🏗️ **Vault-Specific Implementation**
- **Designed for one specific vault structure** with particular YAML frontmatter schemas
- **Hardcoded assumptions** about document types (`project`, `hardware`, `service`, `research`, etc.)
- **File path expectations** like `/Logs/Daily/` and `/Projects/` directory structure
- **To use with your vault**: Expect to modify frontmatter schemas and search logic

### 📋 **Task Management Assumptions**
- Expects markdown checkbox syntax: `- [ ]` (open) and `- [x]` (completed)
- Assumes date completion tracking: `- [x] Task ✅ 2025-08-26`
- Built around daily logging and project tracking patterns

### 🧠 **AI Behavior**
- Prompts and context building optimized for technical infrastructure documentation
- Type-aware search scoring (projects vs hardware vs services)
- Anti-hallucination measures tuned for specific content patterns

## ✅ What's Working

- **📱 Electron Desktop App** - Full markdown editor with live preview
- **🤖 Local AI Chat** - DeepSeek-R1:8b with reasoning visible
- **🔍 Semantic Search** - ChromaDB with nomic-embed-text embeddings
- **📊 YAML Frontmatter** - Full metadata parsing and search integration
- **🎯 Type-Aware Search** - Intelligent scoring based on document types
- **🚫 Anti-Hallucination** - Source attribution and chunk awareness
- **⚡ Single Command Startup** - `npm run dev` starts everything

## 🚀 Quick Start

### Prerequisites

1. **Ollama** with models:
   ```bash
   ollama pull nomic-embed-text    # Embeddings
   ollama pull deepseek-r1:8b      # Reasoning model
   ```

2. **Node.js 18+** and **Python 3.8+**

### Installation

```bash
git clone https://github.com/[username]/forge
cd forge
npm install
npm run dev  # Starts all services
```

### Configuration

1. **Configure your vault**: On first run, the app will prompt you to select your markdown vault directory via a file picker

2. **Adapt frontmatter schema** (if needed): Modify `packages/ai-server/rag_service.py` to match your document metadata patterns

## 🏗️ Architecture

```
User → Electron App → FastAPI Server → ChromaDB + Ollama
                  ↓
            Markdown Editor + AI Chat
```

**Key Components:**
- **Desktop App**: `packages/desktop/` - Electron + React + Vite
- **AI Server**: `packages/ai-server/` - FastAPI + LangChain + ChromaDB
- **Shared**: `packages/shared/` - Common utilities

## 🔒 Security & Privacy

- **Localhost-only operation** - no external network calls
- **Local AI processing** - everything runs via Ollama
- **No authentication** - designed for single-user desktop use
- **File system access** limited to configured vault directory

## 📖 Documentation

- **Current State**: [CURRENT_STATE.md](CURRENT_STATE.md) - Session-to-session development notes
- **Technical Details**: [docs/](docs/) - Additional documentation and implementation details

## 🛠️ Development

```bash
# Individual services
npm run dev:renderer    # Frontend only
npm run ai-server      # Backend only
npm run build          # Production build
npm run lint           # Code quality
```

## 🤝 Contributing

This is a personal project shared for educational purposes. If you're interested in adapting it:

1. **Fork and modify** for your specific vault structure
2. **Expect significant customization** required for different knowledge patterns
3. **Consider it a reference implementation** rather than a plug-and-play solution

## 📋 Known Limitations

- **Single vault support** - designed for one knowledge base
- **Specific frontmatter schema** - requires adaptation for different metadata patterns
- **English-centric** - prompts and logic assume English content
- **Technical user focus** - assumes familiarity with markdown, YAML, and technical documentation

## 🔮 Future Vision

The goal is to eventually generalize this into a more flexible system that can adapt to different vault structures and knowledge patterns while maintaining the core localhost-first philosophy.

---

**Built with:** Electron, React, FastAPI, LangChain, ChromaDB, Ollama