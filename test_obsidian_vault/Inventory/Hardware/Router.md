---
type: hardware
role: network-gateway
status: active
created: 2025-08-18
ip: 192.168.8.1
mac: unknown
location: basement-server-area
---

# Router

## Specs
- CPU: MediaTek MT7986A dual-core ARM Cortex-A78
- RAM: 1GB DDR4
- Storage: Built-in flash
- OS: OpenWrt-based GL-iNet firmware

## Role
Main network gateway providing internet access, VPN protection, and firewall services for entire home network. Centralized routing and DHCP services.

## Network Configuration
- **IP Address**: 192.168.8.1 (gateway)
- **LAN Network**: 192.168.8.0/24
- **DHCP Range**: 192.168.8.100-199
- **Web Interface**: http://192.168.8.1
- **Location**: Basement server area (relocated 2025-08-26)
- **WAN**: DHCP from ISP (Xfinity/Comcast)

## VPN Configuration
- **Provider**: [[Proton Services]] VPN
- **Protocol**: WireGuard preferred
- **DNS**: Proton DNS with NetShield
- **Coverage**: Network-wide protection

## Planned VLAN Setup
| VLAN ID | Subnet | Purpose |
|---------|---------|---------|
| 1 | 192.168.8.0/24 | Default/Admin |
| 10 | 192.168.10.0/24 | Main Devices |
| 20 | 192.168.20.0/24 | Guest Network |
| 30 | 192.168.30.0/24 | IoT Devices |

## Runs
- Network routing and gateway services
- DHCP server with static reservations
- [[Proton Services]] VPN client (WireGuard)
- Firewall and traffic management
- WiFi disabled (using dedicated [[Access Points]])

## Related
Projects: [[Network Foundation]], [[Network Phase 2 Basement]]