# Forge Templates

*Consistent note templates for the Forge vault*

## Template Overview

| Template | Purpose | Used For |
|----------|---------|----------|
| `Daily Log.md` | Daily capture and AI synthesis | `/log` command entries |
| `Project.md` | Project documentation | Active work and goals |
| `Hardware.md` | Infrastructure hardware | Physical devices |
| `Service.md` | Running software/services | VMs, containers, services |
| `Research.md` | Investigation documentation | Technology research |
| `Glossary.md` | Concept definitions | Terms and concepts |
| `Decision.md` | Individual decisions | Atomic decision tracking |
| `Lesson.md` | Individual lessons | Atomic lesson tracking |
| `Memory Decisions.md` | Monolithic decisions file | Growing decisions log |
| `Memory Lessons.md` | Monolithic lessons file | Growing lessons log |

## Templater Setup

1. **Install Templater Plugin** in Obsidian
2. **Point Templater** to `Templates/` folder
3. **Configure hotkeys** for quick template insertion
4. **Set Periodic Notes** to use `Daily Log.md` template

## Template Variables

Templates use Templater syntax:
- `<% tp.date.now("YYYY-MM-DD") %>` - Current date
- `<% tp.date.now("HH:mm") %>` - Current time  
- `<% tp.file.title %>` - Current filename as title

## Usage Patterns

### Daily Workflow
- **Morning**: Use Daily Log template for new day
- **Throughout day**: `/log` entries go in Timeline
- **Evening**: AI synthesis in Synthesized Summary

### Project Creation
- Use Project template for new initiatives
- Start with `status: planned`
- Move to `active` when work begins
- Complete with `status: done`

### Memory Management
Choose between:
- **Atomic**: Use Decision/Lesson templates for individual files
- **Monolithic**: Use Memory Decisions/Lessons templates for growing files

## Frontmatter Standards

All templates include consistent frontmatter:
- `type` - Content type (log, project, hardware, etc.)
- `status` - Current state (planned, active, done, etc.)  
- `created` - Creation date
- Additional fields as needed (ip, mac, host, etc.)

## Related Section Format

All templates end with Related section:
```markdown
## Related
Projects: [[Project Name]]
Inventory: [[Hardware/Service]]
Glossary: [[Concept]]
Research: [[Research Topic]]
```

Use wiki-links to connect related content across the vault.