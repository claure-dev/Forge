---
type: hardware
role: mobile-admin
status: active
created: 2025-08-18
ip: 192.168.8.115
mac: DC:56:7B:68:B1:0F
location: mobile
---

# Framework Laptop

## Specs
- CPU: Intel processor suitable for portable work
- RAM: Sufficient for development and system administration
- Storage: Fast SSD with Linux OS
- OS: Linux

## Role
Mobile infrastructure management workstation enabling system administration from anywhere. Secondary development environment with full SSH access to all infrastructure.

## Network Configuration
- **IP Address**: 192.168.8.115 (DHCP reserved)
- **MAC Address**: DC:56:7B:68:B1:0F
- **Connection**: WiFi via [[Access Points]]
- **VPN**: [[Proton Services]] client for remote access

## SSH Infrastructure
- **Keys Configured**: Passwordless access to all infrastructure
  - ssh root@192.168.8.200 ([[Mini PC]]/[[Proxmox]])
  - ssh adam@192.168.8.130 ([[Omada Controller]] VM)
- **Mobile Admin**: Full infrastructure management from anywhere
- **Emergency Access**: Can manage network during outages

## File Synchronization
- **[[Syncthing]]**: Vault sync with [[Desktop]]
- **Sync Folders**: Forge vault, development directories
- **Conflict Resolution**: Automatic handling
- **Offline Work**: Full vault access when disconnected

## Common Administration Commands
```bash
# Check infrastructure status
ssh root@192.168.8.200 "pct list"  # List Proxmox containers
ssh adam@192.168.8.130 "docker ps"  # Check Omada services

# Network diagnostics
ping 192.168.8.1   # Router connectivity
ping 8.8.8.8       # Internet connectivity
nmap -sn 192.168.8.0/24  # Network scan
```

## Runs
- [[SSH]] key management for infrastructure access
- [[Syncthing]] file synchronization with [[Desktop]]
- Linux system administration tools
- Development environments (secondary)
- [[Proton Services]] VPN client

## Related
Projects: [[Linux Administration]]