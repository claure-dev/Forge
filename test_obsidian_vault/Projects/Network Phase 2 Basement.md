---
type: project
status: active
created: 2025-08-20
tags: [network, infrastructure, basement]
---

# Network Phase 2 Basement

## Goal
Relocate core network infrastructure to basement server room location, establishing professional infrastructure organization with room for expansion while completing ethernet backhaul for all access points.

## Steps
- [x] Plan basement server area physical layout and power requirements
- [x] Research optimal cable routing path from basement to upstairs AP location
- [x] Relocate [[Router]] and [[Mini PC]] to basement hub location
- [x] Verify all services operational after infrastructure move
- [x] Convert kitchen AP to ethernet backhaul using [[MoCA Adapters]]
- [ ] Run ethernet cable from basement to upstairs AP location
- [ ] Convert upstairs AP from wireless mesh to ethernet backhaul
- [ ] Organize basement server area with proper cable management
- [ ] Implement basic [[VLAN]] segmentation after physical infrastructure complete

## Decisions
- 2025-08-29 — Chose [[MoCA]] over powerline for kitchen AP backhaul. Powerline adapters too unstable - MoCA adapters using existing coax provided reliable solution achieving 3x speed improvement.
- 2025-08-26 — Selected basement cable split point for centralized infrastructure hub location.

## Related
Glossary: [[MoCA]], [[VLAN]]
Inventory: [[Hardware/Router]], [[Hardware/Mini PC]], [[Hardware/Access Points]], [[Hardware/MoCA Adapters]]
Projects: [[Network Foundation]]