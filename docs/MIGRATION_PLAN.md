# Forge Desktop Migration Plan

## From Obsidian Plugin to Standalone Desktop App

### Phase 1: Repository Restructure
- [x] Analyze current structure
- [ ] Create new package structure  
- [ ] Move existing RAG server to packages/ai-server/
- [ ] Archive plugin code
- [ ] Update documentation

### Phase 2: Electron Setup
- [ ] Initialize Electron app in packages/desktop/
- [ ] Set up React + TypeScript
- [ ] Configure build system (Vite + Electron Builder)
- [ ] Basic file browser UI

### Phase 3: Integration
- [ ] Connect Electron frontend to existing RAG server
- [ ] Implement wiki-link parsing
- [ ] File system operations
- [ ] Basic editor (Monaco)

### Phase 4: Core Features
- [ ] AI chat sidebar
- [ ] Vault import from Obsidian
- [ ] Search functionality
- [ ] Settings/preferences

### Architecture Decision: Monorepo
**Why keep in same repo:**
- ✅ Preserve git history and context
- ✅ Shared development documentation
- ✅ RAG server is already battle-tested here
- ✅ Evolution story shows product development journey

**New structure allows:**
- ✅ Clean separation of concerns
- ✅ Independent versioning of components
- ✅ Easy CI/CD for different packages
- ✅ Future expansion (mobile app, web version, etc.)

### What We Keep vs Archive

#### KEEP (High Value):
- `rag_service.py` - Core RAG implementation
- `main.py` - Working FastAPI server  
- `requirements.txt` - Proven dependencies
- `chroma_db/` - Existing vector database
- Documentation files - Development context
- Git history - Product evolution story

#### ARCHIVE (For Reference):
- `plugin/` → `archive/obsidian-plugin/`
- `index.html` → `archive/standalone-web/`
- `test_obsidian_vault/` → `tests/fixtures/`

#### REMOVE:
- `__pycache__/`
- `start.sh` (replaced by npm scripts)
- Temporary files

### Technology Stack

**Frontend:**
- Electron (main + renderer processes)
- React + TypeScript
- Monaco Editor (VS Code editor component)
- Tailwind CSS

**Backend:**  
- Existing Python FastAPI server (no changes needed!)
- ChromaDB + LangChain RAG
- Ollama integration

**Build/Deploy:**
- Electron Builder for packaging
- GitHub Actions for CI/CD
- Auto-updater for releases

### Next Steps
1. Restructure repository
2. Set up basic Electron app
3. Connect to existing RAG server
4. Build MVP features