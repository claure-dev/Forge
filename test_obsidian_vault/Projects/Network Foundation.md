---
type: project
status: done
created: 2025-08-18
tags: [network, foundation, infrastructure]
---

# Network Foundation

## Goal
Replace Google Nest mesh with professional networking infrastructure to establish foundation for knowledge infrastructure and privacy-first local services.

## Steps
- [x] Deploy and configure [[Router]] (GL-iNet Flint 2)
- [x] Setup [[Mini PC]] running [[Proxmox]] hypervisor
- [x] Deploy [[Omada Controller]] VM for centralized AP management
- [x] Install three [[Access Points]] providing full coverage
- [x] Configure [[Proton Services]] VPN for network-wide privacy protection
- [x] Remove Google Nest mesh completely
- [x] Minimize network downtime during transition

## Decisions
- 2025-08-18 — Selected GL-iNet Flint 2 over consumer routers for professional features and VPN capabilities
- 2025-08-18 — Chose Proxmox hypervisor on Mini PC for service virtualization and future expansion

## Related
Glossary: [[DNS]]
Inventory: [[Hardware/Router]], [[Hardware/Mini PC]], [[Hardware/Access Points]], [[Services/Omada Controller]], [[Services/Proxmox]], [[Services/Proton Services]]
Projects: [[Network Phase 2 Basement]]