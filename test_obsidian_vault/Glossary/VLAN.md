# VLAN

*Virtual Local Area Network - logical network segmentation*

## Definition
VLAN (Virtual Local Area Network) allows creating separate logical networks on the same physical infrastructure. Devices on different VLANs cannot communicate directly without routing rules.

## Common Uses
- **Network Segmentation**: Separate admin, main, and guest traffic
- **Security**: Isolate untrusted devices (IoT, guest devices)  
- **Traffic Management**: Prioritize different types of network traffic
- **Compliance**: Meet security requirements through isolation

## Implementation
VLANs are configured on managed switches and routers. Each VLAN gets its own subnet (e.g., Admin 192.168.10.x, Main 192.168.20.x, Guest 192.168.30.x).

## Planned Usage
Network Phase 2 will implement basic VLAN segmentation:
- **Admin VLAN**: Network infrastructure and management
- **Main VLAN**: Trusted family devices  
- **Guest VLAN**: Visitors and work devices

**Related**: Network Phase 2 Basement, Access Points