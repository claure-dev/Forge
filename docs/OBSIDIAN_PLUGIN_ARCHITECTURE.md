# Forge Obsidian Plugin Architecture

## Overview
Transform Forge from standalone app to Obsidian plugin while preserving all RAG capabilities and enhancing with native Obsidian integration.

## Architecture Options

### Option A: Self-Contained Plugin (Recommended)
```
┌─────────────────────────────────────────┐
│ Forge Obsidian Plugin                   │
│ ┌─────────────────────────────────────┐ │
│ │ Plugin UI (TypeScript)              │ │
│ │ ┌─────────────┐ ┌─────────────────┐ │ │
│ │ │ Chat View   │ │ Command Palette │ │ │
│ │ │ (Primary)   │ │ & Context Menu  │ │ │
│ │ └─────────────┘ └─────────────────┘ │ │
│ │ ┌─────────────┐ ┌─────────────────┐ │ │
│ │ │ Daily Note  │ │ Project Mode    │ │ │
│ │ │ Context     │ │ Selector        │ │ │
│ │ └─────────────┘ └─────────────────┘ │ │
│ └─────────────────────────────────────┘ │
│                   │                     │
│ ┌─────────────────▼─────────────────────┐ │
│ │ Server Manager (spawns subprocess)   │ │
│ └─────────────────┬─────────────────────┘ │
└───────────────────┼───────────────────────┘
                    │ Child Process
                    ▼
┌─────────────────────────────────────────┐
│ Embedded Forge Server (Python)         │
│ ┌─────────────────┐ ┌─────────────────┐ │
│ │ RAG Service     │ │ Multi-Pass      │ │
│ │ (nomic-embed)   │ │ Reasoning       │ │
│ └─────────────────┘ └─────────────────┘ │
│ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Hybrid Search   │ │ ChromaDB        │ │
│ │ Engine          │ │ Vector Store    │ │
│ └─────────────────┘ └─────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Obsidian Vault + Ollama                │
│ (Files, Backlinks, Graph)              │
└─────────────────────────────────────────┘
```

**Advantages:**
- ✅ **Zero setup required** - Plugin handles everything
- ✅ **Reuse 100% of existing RAG engine** - Embedded as subprocess
- ✅ **Single installation** - No separate server to manage
- ✅ **Auto start/stop** - Plugin lifecycle manages server
- ✅ **Plugin store compatible** - Self-contained distribution
- ✅ **Offline operation** - No external dependencies

## Core Plugin Components

### 1. Primary Chat Interface
```typescript
// Main chat view - replaces current web UI
export class ForgeChatView extends ItemView {
  private chatContainer: HTMLElement;
  private inputField: HTMLTextAreaElement;
  private modeSelector: HTMLSelectElement; // NEW: Project/Research/Troubleshoot modes
  
  async sendMessage(message: string, mode: ChatMode) {
    // Send to Forge server
    const response = await this.forgeClient.chat(message, mode);
    this.displayResponse(response);
  }
}
```

### 2. Daily Note Context Provider
```typescript
export class DailyNoteContext {
  async getRecentContext(days: number = 3): Promise<string> {
    const dailyNotes = await this.getDailyNotes(days);
    
    // Extract project mentions, decisions, progress
    return dailyNotes.map(note => ({
      date: note.date,
      activeProjects: this.extractProjects(note.content),
      decisions: this.extractDecisions(note.content),
      nextActions: this.extractNextActions(note.content)
    }));
  }
  
  private extractProjects(content: string): string[] {
    // Find [[Project Name]] references
    return content.match(/\[\[(.*?Project.*?)\]\]/g) || [];
  }
}
```

### 3. Contextual Commands
```typescript
export class ForgeCommands {
  registerCommands() {
    // Chat with current note context
    this.plugin.addCommand({
      id: 'forge-chat-current-note',
      name: 'Chat about current note',
      callback: () => this.chatWithCurrentNote()
    });
    
    // Project analysis
    this.plugin.addCommand({
      id: 'forge-analyze-project',
      name: 'Analyze project (gaps, next steps)',
      callback: () => this.analyzeCurrentProject()
    });
    
    // Context menu integration
    this.plugin.registerEvent(
      this.app.workspace.on('editor-menu', this.addContextMenu)
    );
  }
  
  private async chatWithCurrentNote() {
    const activeFile = this.app.workspace.getActiveFile();
    const content = await this.app.vault.read(activeFile);
    
    // Send to Forge with note context
    await this.forgeClient.chatWithContext(content, activeFile.path);
  }
}
```

### 4. Live Indexing & Sync
```typescript
export class VaultSync {
  constructor(private forgeClient: ForgeClient) {
    this.registerVaultEvents();
  }
  
  registerVaultEvents() {
    // Auto-reindex when files change
    this.plugin.registerEvent(
      this.app.vault.on('modify', async (file) => {
        if (file.extension === 'md') {
          await this.forgeClient.updateDocument(file.path, 
            await this.app.vault.read(file));
        }
      })
    );
    
    // Auto-reindex on create/delete
    this.plugin.registerEvent(
      this.app.vault.on('create', this.handleFileCreate)
    );
  }
}
```

### 5. Forge Server Client
```typescript
export class ForgeClient {
  constructor(private serverUrl: string = 'http://localhost:8000') {}
  
  async chat(message: string, mode: ChatMode = 'default'): Promise<ChatResponse> {
    // Add daily note context
    const context = await this.dailyNoteContext.getRecentContext();
    
    return fetch(`${this.serverUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        mode,
        obsidian_context: {
          daily_notes: context,
          current_file: this.getCurrentFileContext(),
          backlinks: this.getRelevantBacklinks(message)
        }
      })
    });
  }
  
  async updateDocument(path: string, content: string) {
    // Trigger re-indexing on Forge server
    return fetch(`${this.serverUrl}/update-document`, {
      method: 'POST',
      body: JSON.stringify({ path, content })
    });
  }
}
```

## Enhanced Server Features (Minimal Changes)

### Updated Chat Endpoint
```python
class ObsidianChatMessage(BaseModel):
    message: str
    mode: str = "default"  # project, research, troubleshoot
    session_id: str | None = None
    obsidian_context: Optional[Dict] = None  # NEW

def build_conversation_context(session_id: str, message: str, mode: str, obs_context: Dict):
    # Use daily notes instead of session memory
    if obs_context and obs_context.get('daily_notes'):
        context_parts.append("=== RECENT WORK (from daily notes) ===")
        for note in obs_context['daily_notes']:
            context_parts.append(f"**{note['date']}**:")
            context_parts.append(f"Active projects: {', '.join(note['activeProjects'])}")
            if note['decisions']:
                context_parts.append(f"Decisions: {note['decisions']}")
    
    # Mode-specific prompting
    if mode == "project":
        context_parts.append("PROJECT PLANNING MODE:")
        context_parts.append("- Break down intents into atomic, actionable projects")
        context_parts.append("- Focus on dependencies, scope, and next steps")
    elif mode == "troubleshoot":
        context_parts.append("TROUBLESHOOTING MODE:")
        context_parts.append("- Use systematic debugging approach")
        context_parts.append("- Reference similar issues from vault")
    # ... existing logic
```

## Plugin UI Design

### Chat Interface Layout
```
┌─────────────────────────────────────────┐
│ 🔥 Forge - AI Project Partner          │
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │ Mode: ▼     │ │ Context: Daily Notes│ │
│ │ Project     │ │ [✓] Current: On     │ │
│ └─────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────┤
│ 💬 Chat History                         │
│ ┌─────────────────────────────────────┐ │
│ │ Human: What should I work on next? │ │
│ │                                     │ │
│ │ 🤖 Based on your daily notes:      │ │
│ │ ## From Your Vault:                 │ │
│ │ - Network monitoring setup [Source: │ │
│ │   2025-09-02.md]                    │ │
│ │ ## Next Steps:                      │ │
│ │ - Configure Grafana dashboards     │ │
│ │ - Set up Prometheus alerts         │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 📝 [Type your message...]              │
│ [Send] [🎯 Analyze Current Note]        │
└─────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Basic Plugin + Server Communication
- [ ] Create Obsidian plugin scaffold
- [ ] Basic chat interface
- [ ] Connect to existing Forge server
- [ ] Test RAG quality in plugin context

### Phase 2: Obsidian Integration
- [ ] Daily note context reading
- [ ] Live vault synchronization
- [ ] Contextual commands and menus
- [ ] Mode selector implementation

### Phase 3: Advanced Features
- [ ] Backlink-aware analysis
- [ ] Graph-based reasoning
- [ ] Project templates and automation
- [ ] Advanced UI polish

## Technical Considerations

### Plugin Distribution
- Obsidian Community Plugin store (requires approval)
- Direct installation for beta testing
- BRAT plugin for development releases

### Self-Contained Plugin Implementation
- **Embedded server** bundled with plugin
- **Auto-start on plugin load** via Node.js child_process
- **Auto-stop on plugin unload** with graceful shutdown
- **Zero user configuration** - works out of the box
- **Plugin distribution** includes entire Python server

### Embedded Server Manager
```typescript
export class ForgeServerManager {
  private serverProcess: ChildProcess;
  private serverUrl = 'http://localhost:8000';
  
  async startEmbeddedServer() {
    const serverPath = path.join(this.plugin.app.vault.adapter.basePath,
      '.obsidian/plugins/forge/server');
    
    this.serverProcess = spawn('python3', [
      path.join(serverPath, 'main.py'),
      '--vault', this.app.vault.adapter.basePath,
      '--port', '8000'
    ]);
    
    await this.waitForServerReady();
  }
  
  async stopEmbeddedServer() {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
    }
  }
}
```

### Plugin Bundle Structure
```
forge-obsidian-plugin/
├── main.js                 # Compiled plugin
├── manifest.json           # Plugin metadata
├── server/                 # Embedded Forge server
│   ├── main.py            # Your existing server
│   ├── rag_service.py     # Your existing RAG
│   ├── requirements.txt   # Python dependencies
│   └── chroma_db/         # Vector database
└── styles.css             # Plugin UI styles
```

### Performance
- Lazy loading of chat history
- Efficient vault scanning for context
- Debounced re-indexing on file changes
- Background processing for large vaults

## Competitive Positioning

**Current plugins:** "Chat with your notes"
**Forge plugin:** "AI project partner that knows your work"

### Key Differentiators:
- 🎯 **Project-first approach** vs. general Q&A
- 🧠 **Multi-pass strategic reasoning** vs. basic retrieval
- 📅 **Daily note context integration** vs. simple chat history
- 🔍 **Superior hybrid search** vs. basic semantic search
- 🛠️ **Mode-based specialized prompting** vs. one-size-fits-all
- 📈 **Learning-by-building focus** vs. passive knowledge retrieval

This positions Forge as the premium option for technical builders and project-oriented knowledge workers using Obsidian.