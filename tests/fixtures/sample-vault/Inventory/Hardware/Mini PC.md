---
type: hardware
role: infrastructure-server
status: active
created: 2025-08-18
ip: 192.168.8.200
mac: 78:55:36:00:b2:81
location: basement-server-area
---

# Mini PC

## Specs
- CPU: AMD Ryzen 5825U
- RAM: 16GB DDR4
- Storage: 500GB NVMe SSD + expansion capability
- OS: Proxmox VE 8.2

## Role
Primary infrastructure server providing virtualized services for network management and future media hosting. 24/7 operation with low power consumption.

## Network Configuration
- **IP Address**: 192.168.8.200 (DHCP reserved)
- **MAC Address**: 78:55:36:00:b2:81
- **Hostname**: proxmox01
- **Web Interface**: https://192.168.8.200:8006
- **SSH Access**: ssh root@192.168.8.200
- **Location**: Basement server area (relocated 2025-08-26)

## Current VMs
- **VM 100**: [[Omada Controller]] (Ubuntu 22.04 + Docker)
  - RAM: 4GB allocated
  - IP: 192.168.8.130
  - SSH: ssh adam@192.168.8.130
- **Available Resources**: ~12GB RAM, storage expansion ready
- **Planned**: Jellyfin media server VM

## Management Access
- **Proxmox Web UI**: https://192.168.8.200:8006
- **SSH to Host**: ssh root@192.168.8.200
- **VM SSH**: ssh adam@192.168.8.130 (Omada Controller)
- **Auto-start**: VMs configured for automatic startup

## Runs
- [[Proxmox]] hypervisor (bare metal)
- [[Omada Controller]] VM (Docker container)
- Network bridge (vmbr0) for VM connectivity

## Related
Projects: [[Network Foundation]], [[Network Phase 2 Basement]], [[Media Server]]