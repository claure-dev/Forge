---
type: service
host: [[Mini PC]]
status: active
created: 2025-08-18
ip: 192.168.8.200
---

# Proxmox

## Purpose
Hypervisor platform providing virtualized infrastructure services. Enables multiple VMs on single hardware with web management interface and CLI access.

## Stack
Proxmox VE 8.2 bare metal hypervisor with web interface, SSH access, and automated VM startup capabilities.

## Access Information
- **Web Interface**: https://192.168.8.200:8006
- **SSH Access**: ssh root@192.168.8.200
- **Hostname**: proxmox01
- **Storage**: 500GB NVMe SSD
- **Network**: Bridge (vmbr0) for VM connectivity

## Current VMs
- **VM 100**: [[Omada Controller]] (Ubuntu 22.04 + Docker)
  - RAM: 4GB allocated
  - IP: 192.168.8.130
  - Status: Auto-start enabled
- **Available Resources**: ~12GB RAM available
- **Planned**: Jellyfin media server VM

## Management Commands
```bash
# Access Proxmox host
ssh root@192.168.8.200

# List VMs and containers
pct list  # Containers
qm list   # VMs

# VM management
qm start 100    # Start VM
qm stop 100     # Stop VM  
qm status 100   # Check VM status

# Resource monitoring
pvesh get /nodes/proxmox01/status
```

## Emergency Procedures
```bash
# If web UI unreachable
ssh root@192.168.8.200

# Check VM status
qm list

# Emergency VM restart
qm stop 100 && qm start 100

# Check system resources
df -h  # Disk usage
free -h  # Memory usage
```

## Dependencies
- [[Mini PC]] (bare metal host at 192.168.8.200)
- Network connectivity for management interface
- Power and cooling for 24/7 operation

## Related
Projects: [[Network Foundation]], [[Media Server]]