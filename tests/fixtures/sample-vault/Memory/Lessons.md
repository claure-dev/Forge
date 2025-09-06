# Lessons Learned

*Patterns and insights extracted from project execution and infrastructure work*

## 2025-08-26 - Infrastructure Testing Before Commitment
**Lesson**: Always test connectivity solutions thoroughly before production deployment.

**Experience**: Basement hub migration successful because systematic testing of PoE switch, cable routing, and service continuity before full commitment.

**Pattern**: Plan → Test → Validate → Deploy sequence prevents major rollbacks.

---

## 2025-08-27 - Powerline Networking Limitations
**Lesson**: Powerline adapters inadequate for reliable network infrastructure despite marketing claims.

**Experience**: Connection too unstable for access point backhaul. Frequent drops and inconsistent speeds made production use impossible.

**Alternative**: MoCA adapters over existing coax infrastructure provided stable solution.

---

## 2025-08-29 - MoCA Success Pattern
**Lesson**: Existing home infrastructure (coax) can be repurposed effectively for network needs.

**Result**: 3x speed improvement on desktop after kitchen AP converted from mesh to ethernet via MoCA.

**Insight**: Survey existing home wiring before assuming new cable runs needed.

---

## 2025-08-25 - System Complexity vs. Utility
**Lesson**: Over-engineering systems creates maintenance overhead that competes with actual work.

**Experience**: Knowledge-OS "didn't feel right" despite successful project completion - complexity was cognitive tax.

**Resolution**: Radical simplification focuses energy on doing rather than organizing.

---

## 2025-08-26 - SSH Key Infrastructure Value
**Lesson**: Passwordless SSH access dramatically improves infrastructure management workflow.

**Implementation**: SSH keys from both desktop and Framework laptop to Proxmox host and VMs.

**Impact**: Mobile infrastructure management becomes frictionless, enabling true anywhere-administration.

---

## 2025-08-30 - Personal-First Development Acceleration  
**Lesson**: Building for personal workflow rather than abstract community needs eliminates feature complexity and accelerates progress.

**Experience**: Forge web app prototype completed rapidly once focused on actual daily usage patterns.

**Principle**: Solve your own problem first - community features can emerge later if needed.

---

## 2025-08-31 - Work-Life Balance for Sustained Productivity
**Lesson**: Physical activity and recreation provide cognitive reset that enables sustained technical work.

**Pattern**: Disc golf Sunday after intensive technical week maintains long-term productivity rhythm.

**Insight**: Technical skill progression parallels physical skill development - both require practice and recovery.