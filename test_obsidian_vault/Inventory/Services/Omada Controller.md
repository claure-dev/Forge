---
type: service
host: [[Mini PC]]
status: active
created: 2025-08-18
ip: 192.168.8.130
vm-id: 100
---

# Omada Controller

## Purpose
Centralized management for all TP-Link access points providing unified WiFi network management, device monitoring, and VLAN configuration capabilities.

## Stack
Ubuntu 22.04 VM (VM 100) running TP-Link Omada Controller in Docker container. Auto-start configured with 4GB RAM allocation.

## Access Information
- **Web Interface**: https://192.168.8.130:8043
- **VM IP**: 192.168.8.130
- **SSH Access**: ssh adam@192.168.8.130
- **VM ID**: 100 (Proxmox)
- **RAM Allocated**: 4GB

## Service Management
```bash
# SSH to VM
ssh adam@192.168.8.130

# Check container status
docker ps

# Container management
docker start omada-controller
docker stop omada-controller
docker restart omada-controller

# Check logs
docker logs omada-controller

# Auto-start configured for VM and container
```

## Current Management
- **Access Points**: 3x [[Access Points]] (all adopted)
  - Kitchen AP: 192.168.8.212 ✅
  - Upstairs AP: 192.168.8.112 ✅ 
  - Basement AP: 192.168.8.237 ✅
- **WiFi Networks**: Unified SSID management
- **Client Monitoring**: Device tracking and statistics
- **VLAN Ready**: Prepared for network segmentation

## Emergency Procedures
```bash
# If Omada Controller unreachable
ssh adam@192.168.8.130
docker ps  # Check if container running
docker start omada-controller  # Start if stopped

# If VM unreachable, access Proxmox
https://192.168.8.200:8006
# Check VM 100 status, restart if needed
```

## Dependencies
- [[Mini PC]] ([[Proxmox]] host)
- [[Access Points]] (3x TP-Link EAP245 units)
- Network connectivity for AP management
- Docker service in VM

## Related
Projects: [[Network Foundation]], [[Network Phase 2 Basement]]