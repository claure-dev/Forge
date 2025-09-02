# Decisions

*Key decisions made during Forge development and infrastructure building*

## 2025-08-19 - Forge Philosophy Foundation
**Decision**: Build AI orchestration system focused on personal-first development, atomic projects, and local infrastructure control.

**Reasoning**: Traditional project management too heavyweight. AI assistance paradigm creates dependency - orchestration paradigm builds capability. Cloud convenience comes at cost of surveillance capitalism and vendor lock-in.

**Key Points**:
- Atomic projects = contained, digestible, actionable (1-2 weeks max)
- AI orchestration vs assistance = building capability vs creating dependency  
- Local-first = opting out of surveillance capitalism for family
- Structured capture = bridge from chaotic thoughts to organized action
- Success = turning scattered thoughts into action through AI augmentation

*Related: Original philosophy in old Why-Im-Doing-This.md*

---

## 2025-08-28 - Forge Naming and Personal Focus
**Decision**: Rebrand from Knowledge-OS to Forge. Commit to personal-first development over community features.

**Reasoning**: Knowledge-OS felt over-engineered and academic. Forge metaphor better captures the active creation aspect. Building for personal workflow eliminates complex edge cases and accelerates development.

**Impact**: Simplified architecture, faster iteration, focus on proven workflow patterns.

---

## 2025-08-29 - Web GUI Over CLI
**Decision**: Choose web GUI architecture for Forge over CLI approach.

**Reasoning**: Personal daily usage benefits from visual interface, model selection, better QOL features despite more complex deployment. CLI adds friction to daily workflow.

**Technical Approach**: FastAPI + vanilla JavaScript, File System Access API for vault interaction.

---

## 2025-08-29 - MoCA Over Powerline
**Decision**: Deploy MoCA adapters for network backhaul instead of powerline adapters.

**Reasoning**: Powerline connection too unstable for production use. MoCA over existing coax provides reliable ethernet backhaul.

**Result**: 3x speed improvement on desktop, stable network performance.

---

## 2025-08-31 - Radical Folder Structure Simplification
**Decision**: Move from complex nested structure (27 directories) to flat structure (7 directories).

**Reasoning**: Current structure over-engineered with too much meta-documentation. Focus on doing work rather than organizing work. Flat structure reduces cognitive overhead and maintenance burden.

**Target**: Projects, Glossary, Inventory (Hardware/Services), Memory, Research, Logs.