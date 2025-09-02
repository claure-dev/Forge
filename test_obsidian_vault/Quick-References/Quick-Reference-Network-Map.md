---
type: emergency-reference
priority: critical
category: network
last-reviewed: 2025-08-25
sla: immediate
owner: personal
---

# Network Map - Emergency Reference

*< 30 second reference for network topology and critical access during outages*

## Network Topology

```
Internet (Xfinity)
    ↓
192.168.8.1 - GL.iNet Flint 2 Router (Gateway + Proton VPN)
    ↓
192.168.8.0/24 Network
    ├── 192.168.8.130 - Omada Controller VM (Proxmox)
    ├── 192.168.8.223 - Desktop PC (Primary Workstation)
    ├── 192.168.8.115 - Framework Laptop (Mobile Infrastructure Management)
    ├── 192.168.8.200 - Beelink Mini PC (Proxmox Host)
    ├── 192.168.8.212 - Kitchen TP-Link EAP245 (Ethernet)
    ├── 192.168.8.112 - Upstairs TP-Link EAP245 (Wireless Mesh)
    └── 192.168.8.237 - Basement TP-Link EAP245 (Ethernet)
```

## Critical Access Points

### Primary Management
- **Router**: http://192.168.8.1 (admin/**[See Proton Pass]**)
- **Proxmox**: https://192.168.8.200:8006 (root/**[See Proton Pass]**)
- **Omada Controller**: https://192.168.8.130:8043 (admin/**[See Proton Pass]**)

### Emergency SSH Access
```bash
# Proxmox Host (if web UI fails)
ssh root@192.168.8.200

# Omada Controller VM
ssh adam@192.168.8.130
```

## Service Dependencies

**Total Network Failure**: Check GL.iNet Flint 2 Router (192.168.8.1)
**WiFi Issues**: Omada Controller VM (192.168.8.130) → Proxmox Host (192.168.8.200)
**VM Services**: Proxmox Host (192.168.8.200) → Router (192.168.8.1)

## Power Sources

- **Router**: Kitchen counter power
- **Proxmox Host**: Kitchen counter power (same circuit as router)
- **Kitchen AP**: PoE from router (built-in PoE)
- **Upstairs AP**: Powerline adapter + PoE injector
- **Basement AP**: Powerline adapter + PoE injector

## Physical Locations

- **Router + Proxmox**: Kitchen counter
- **Kitchen AP**: Kitchen ceiling
- **Upstairs AP**: Upstairs hallway ceiling
- **Basement AP**: Basement ceiling
- **Desktop PC**: Office upstairs

## Current Status: ✅ OPERATIONAL
*Last verified: 2025-08-25*