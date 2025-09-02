---
type: project
status: active
created: 2025-08-28
tags: [ai, web, localhost, orchestration]
---

# Forge Web App

## Goal
Build localhost-first AI web application to replace Claude Code dependency, establishing complete infrastructure independence through personal knowledge management system.

## Steps
### Phase 1: Minimal Viable Prototype ✅
- [x] FastAPI development environment setup on [[Desktop]]
- [x] Single HTML chat interface with styling
- [x] Direct Ollama API integration (localhost:11434)
- [x] Basic chat functionality with AI responses
- [x] End-to-end localhost testing complete

### Phase 2: Knowledge Vault Integration (Current)
- [ ] File System Access API for selecting markdown files
- [ ] Basic markdown rendering for content display
- [ ] File metadata display (path, date, size)
- [ ] Context-aware AI responses using file content
- [ ] Simple file browser for vault navigation

### Phase 3: Interactive Knowledge Processing
- [ ] Bidirectional file operations (create/edit)
- [ ] Wiki-style linking between files
- [ ] Basic search across knowledge vault
- [ ] Knowledge graph visualization
- [ ] File organization and tagging

### Phase 4: Enhanced AI Orchestration
- [ ] Multiple AI model selection
- [ ] Specialized knowledge management prompts
- [ ] Automated organization suggestions
- [ ] Export capabilities

## Decisions
- 2025-08-29 — Chose web GUI over CLI for better daily usage experience with model selection and QOL features
- 2025-08-28 — Selected FastAPI + vanilla JavaScript for fastest development iteration for personal tool
- 2025-08-30 — Committed to personal-first focus - building for actual workflow eliminates complex community features

## Related
Inventory: [[Hardware/Desktop]]
Projects: [[Local AI Integration]]
Research: [[Forge-Web-AI-Architecture-Research]], [[Localhost-First-AI-Knowledge-Management-Research]]