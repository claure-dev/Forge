---
type: emergency-reference
priority: critical
category: network
last-reviewed: 2025-08-25
sla: immediate
owner: personal
---

# Critical IP Addresses - Emergency Access

*Essential network addresses for troubleshooting and emergency access*

## Network Infrastructure

### Core Network (192.168.8.0/24)
| Device | IP Address | Role | Access Method |
|--------|------------|------|---------------|
| **GL.iNet Flint 2** | 192.168.8.1 | Gateway Router | http://192.168.8.1 |
| **Beelink Mini PC** | 192.168.8.200 | Proxmox Host | https://192.168.8.200:8006 |
| **Omada Controller** | 192.168.8.130 | WiFi Management | https://192.168.8.130:8043 |
| **Desktop PC** | 192.168.8.223 | Primary Workstation | Direct access |

### WiFi Access Points
| Device | IP Address | Location | Connection |
|--------|------------|----------|------------|
| **TP-Link EAP245** | 192.168.8.212 | Kitchen | Ethernet |
| **TP-Link EAP245** | 192.168.8.112 | Upstairs | Wireless Mesh |
| **TP-Link EAP245** | 192.168.8.237 | Basement | Ethernet |

### Mobile Devices (DHCP Range: 192.168.8.100-199)
| Device | MAC Address | Typical IP |
|--------|-------------|------------|
| Framework Laptop | DC:56:7B:68:B1:0F | 192.168.8.115 |
| Pixel 8a | [To be added] | 192.168.8.xxx |
| Pixel 7 Pro | [To be added] | 192.168.8.xxx |

## Service Ports

### Critical Services
| Service | Port | Protocol | Access URL |
|---------|------|----------|------------|
| Router Admin | 80 | HTTP | http://192.168.8.1 |
| Proxmox Web UI | 8006 | HTTPS | https://192.168.8.200:8006 |
| Omada Controller | 8043 | HTTPS | https://192.168.8.130:8043 |
| SSH (Proxmox) | 22 | SSH | ssh root@192.168.8.200 |
| SSH (Omada VM) | 22 | SSH | ssh adam@192.168.8.130 |

### Future Services (Planned)
| Service | Port | Host | Status |
|---------|------|------|--------|
| Jellyfin | 8096 | Beelink Mini PC 2 | Planned |
| Local AI | TBD | Desktop PC | Planned |
| Monitoring | TBD | TBD | Planned |

## External Connections

### ISP Configuration
- **Provider**: Xfinity/Comcast
- **Connection**: Cable Modem
- **Speed**: ~100 Mbps down / 10 Mbps up
- **Modem Model**: [Check physical device]

### VPN Configuration
- **Provider**: Proton VPN
- **Location**: Router-level (all traffic)
- **Protocol**: WireGuard preferred
- **DNS**: Proton DNS with NetShield

### DNS Servers
| Primary | Secondary | Provider |
|---------|-----------|----------|
| Proton DNS | Proton DNS | Proton (via VPN) |
| 1.1.1.1 | 1.0.0.1 | Cloudflare (backup) |
| 8.8.8.8 | 8.8.4.4 | Google (backup) |

## DHCP Reservations

### Static Assignments (Router Configuration)
```
192.168.8.130 - Omada Controller VM (MAC: bc:24:11:98:ca:28)
192.168.8.223 - Desktop PC (MAC: f0:2f:74:19:0c:ed)
192.168.8.115 - Framework Laptop (MAC: DC:56:7B:68:B1:0F)
192.168.8.200 - Proxmox Host (MAC: 78:55:36:00:b2:81)
192.168.8.212 - Kitchen AP (MAC: 24:2f:d0:b7:a6:6e)
192.168.8.112 - Upstairs AP (MAC: 24:2f:d0:b7:96:c2) 
192.168.8.237 - Basement AP (MAC: 24:2f:d0:b7:9b:4a)
```

## Network Segments (Future VLAN Setup)

### Planned VLAN Configuration
| VLAN ID | Subnet | Purpose |
|---------|---------|---------|
| 1 | 192.168.8.0/24 | Default/Admin |
| 10 | 192.168.10.0/24 | Main Devices |
| 20 | 192.168.20.0/24 | Guest Network |
| 30 | 192.168.30.0/24 | IoT Devices |

## Emergency Procedures

### Connection Testing Order
```bash
1. ping 192.168.8.1         # Router (local network)
2. ping 192.168.8.130       # Services (VM connectivity)  
3. ping 8.8.8.8             # Internet (external connectivity)
4. nslookup google.com      # DNS resolution
```

### Network Discovery Commands
```bash
# Scan local network for active devices
nmap -sn 192.168.8.0/24

# Show current routing table
ip route show

# Check DHCP leases (on router)
# Access via router web interface

# Show ARP table (cached IP/MAC associations)
arp -a
```

## Documentation Links

- **Emergency Procedures**: [[Emergency-Procedures]]
- **Network Map**: [[Network-Map]]
- **Service Status**: [[Service-Status]]
- **Hardware Details**: See 03-Systems/Infrastructure/Network/Assets/

*Update MAC addresses and dynamic IPs during next maintenance window*