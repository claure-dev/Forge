# Forge Desktop - Current State

## Application Status
- **Status**: Functional Electron app with working markdown editor AND AI assistant
- **Last Updated**: September 8, 2025
- **Current Focus**: Refining AI assistant intelligence and user experience

## How to Run
```bash
# Single command - Start all services (NEW!)
npm run dev
```
This now starts:
- Renderer dev server (React + Vite on port 5174/5175)
- Electron main process
- AI server (FastAPI on port 8000)

**Old method** (still works if needed):
```bash
# Terminal 1 - Start renderer dev server
npm run dev:renderer
# Terminal 2 - Start Electron app 
npm run dev:electron
# Terminal 3 - Start AI server
npm run ai-server
```

## Current Editor Implementation
- **Active Editor**: `ObsidianEditor` (React + ReactMarkdown)
- **File Location**: `packages/desktop/src/renderer/components/ObsidianEditor.tsx`
- **Features Working**:
  - Beautiful markdown rendering with proper styling
  - YAML frontmatter parsing and display (collapsible)
  - Wiki link support (`[[link]]` syntax)
  - Interactive checkboxes in markdown
  - Tables, code blocks, headers, lists
  - Copy-to-clipboard for IP/MAC addresses
  - Basic scrolling in both view and edit modes
  
## Editor Modes
1. **View Mode** (Default):
   - Beautiful rendered markdown with proper styling
   - Frontmatter displayed as collapsible panels
   - Wiki links are clickable
   - Styled headers, tables, code blocks
   
2. **Edit Mode** (Manual editing when needed):
   - Full-document textarea with raw markdown
   - Triggered by "Edit" button
   - "Done" button or Ctrl+Enter/Escape to exit
   - Scrolling works (user confirmed)

## File Structure
```
packages/desktop/src/renderer/components/
├── Editor.tsx                      # Main editor container
├── ObsidianEditor.tsx             # Current active editor (React + ReactMarkdown)
├── CodeMirrorObsidianEditor.tsx   # Alternative CodeMirror implementation
├── TrueObsidianEditor.tsx         # Attempted CodeMirror with decorations
├── TrueObsidianStyleEditor.tsx    # Another CodeMirror attempt
├── SimpleMonacoEditor.tsx         # Monaco-based editor
├── ObsidianLiveEditor.tsx         # Block-based editing attempt
└── ReadOnlyObsidianViewer.tsx     # Read-only viewer component
```

## What We Tried and Why
1. **ObsidianStyleEditor** - Section-based editing (rejected: too clunky)
2. **MilkdownEditor** - Failed to render properly
3. **SimpleMonacoEditor** - VSCode-style (rejected: "trash formatting")
4. **Multiple CodeMirror attempts** - Broke scrolling and UI repeatedly
5. **Current ObsidianEditor** - Best compromise: beautiful UI, functional editing

## Key Technical Details
- **Vite dev server**: Runs on port 5174 (not 5173)
- **Main process port configuration**: Updated to connect to 5174
- **File operations**: Working through Electron IPC handlers
- **Styling**: Tailwind CSS with custom orange/dark theme
- **Markdown parsing**: ReactMarkdown + remark-gfm + remark-wiki-link

## Issues Resolved
- ✅ Electron startup (white screen) - Fixed port configuration
- ✅ Scrolling in view mode - Working properly
- ✅ Scrolling in edit mode - User confirmed working
- ✅ Beautiful markdown rendering - ObsidianEditor provides this
- ✅ Frontmatter display - Collapsible panels with status indicators

## AI Assistant Integration (COMPLETED!)

### Current Status
- ✅ **Working AI chat interface** in the Electron app
- ✅ **AI server integration** - FastAPI + Ollama (Llama 3.1:8b)
- ✅ **RAG functionality** - LangChain + ChromaDB for vault document search
- ✅ **Natural intelligence** - AI gets rich context and decides what's relevant

### AI Capabilities
- **Time awareness** - Knows current date/time for logging and daily notes
- **Daily note access** - Can read and reference most recent daily note
- **Vault knowledge** - Searches relevant documents from your vault
- **Conversational** - Natural responses, not rigid query classification

### Recent AI Improvements (Sept 8, 2025)
- **Fixed over-engineering** - Removed 75+ lines of rigid query classification rules
- **Natural context approach** - Provides rich context, trusts AI judgment
- **Simplified instructions** - "Be conversational and helpful. Use your judgment."
- **Better responses** - AI naturally handles time queries, math, daily notes, and vault searches

### AI Architecture
```
User Query → AI Server (FastAPI) → Context Builder → Ollama LLM → Response
                    ↓
            Current time + Daily note + Relevant docs
```

### Files Changed for AI
- `packages/ai-server/main.py` - `build_conversation_context()` completely rewritten (lines 166-256)
- `package.json` - Added AI server to `npm run dev`

## Architecture Ready for AI
```typescript
// AI will work like this:
const currentContent = editor.value;  // Read current markdown
const updatedContent = await aiModifyContent(currentContent, userRequest);
editor.onChange(updatedContent);     // Update renders automatically
```

## Current Pain Points (For Future)
- Edit mode is full-document (not per-line like true Obsidian)
- No live preview decorations (raw markdown in edit mode)
- CodeMirror implementations kept breaking UI/scrolling

## Next Steps (For Later This Week)

### Testing & Refinement
1. **Test various query types** in the Electron app to see how AI responds
2. **Monitor server logs** to verify document search behavior (use `BashOutput` tool)
3. **Fine-tune context amount** - currently shows 600 chars of daily note, 3 documents
4. **Adjust instructions** if AI needs more guidance on specific behaviors

### Potential Tweaks
- Daily note preview length (currently 600 chars in `main.py:198`)
- Number of relevant documents (currently 3 in `main.py:206`)
- Instructions wording for better AI behavior (`main.py:242-249`)
- Add more file system operations if needed

### Technical Debt
- Multiple background processes running - may want to clean up before next session
- Current working server is `a43626` (can check with `BashOutput`)
- Vault is configured at `/home/adam/Projects/Vault`

## AI Context Format (Current)
```
=== CURRENT CONTEXT ===
Current time: Sunday September 8, 2025 at 04:28 PM EDT
Vault path: /home/adam/Projects/Vault

=== MOST RECENT DAILY NOTE ===
File: 2025-09-07.md (Total daily notes: X)
Content preview: [600 chars of actual daily note content]

=== RELEVANT KNOWLEDGE FROM YOUR VAULT ===
[Up to 3 most relevant documents if found]

=== INSTRUCTIONS ===
You are an intelligent assistant with access to:
- Current time and date
- User's most recent daily note (if available)  
- Relevant documents from their vault (if available)

Be conversational and helpful. Use your judgment about what information is most relevant.
```

## Current Issues & Considerations
1. **Performance** - AI always searches documents (limit: 3) - may be overkill for simple queries
2. **Context Size** - Rich context may be too verbose for simple interactions  
3. **Process Management** - Many background dev processes running
4. **Error Handling** - Need better handling when vault not configured

## Recommendation
- **Current state**: AI assistant is working well with natural intelligence approach
- **For future development**: Focus on user experience refinements rather than over-engineering
- **Next phase**: Consider AI-assisted document editing integration with the markdown editor