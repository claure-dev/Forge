---
type: research
created: 2025-08-18
tags: [research]
research-status: completed
research-domain: [network, infrastructure, hardware]
---

# Network Infrastructure Research

*Comprehensive analysis of GL.iNet Flint 2 and TP-Link EAP245 network infrastructure setup*

## Research Scope

Investigation of GL.iNet Flint 2 router and TP-Link EAP245 access point integration, power requirements, mesh capabilities, management options, and monitoring solutions for professional home network deployment with mini PC integration.

## Key Findings

### GL.iNet Flint 2 Router Analysis

**Power and Connectivity Specifications:**
- **Ethernet Ports**: 2 x 2.5G Multi-Gig + 4 x 1G Ethernet ports
- **Power Consumption**: Up to 30W (can be powered via 30W USB-PD charger)
- **Critical Limitation**: **No built-in PoE+ (Power over Ethernet Plus) capability**
- **Hardware**: 1GB RAM + 8GB eMMC storage
- **Performance**: Wi-Fi 6, supports heavy-duty data transmission and mass device connectivity

**Management Interface Options:**
- **Dual UI System**: Simplified GL.iNet GUI for basic configuration
- **Advanced Access**: Full LuCI (OpenWrt web interface) access for professional management
- **Firmware**: GL.iNet op24 firmware blending recent OpenWrt with MediaTek drivers
- **Extensibility**: Access to 5,000+ OpenWrt plugins through user-friendly admin panel
- **Advanced Features**: Supports BanIP, VLANs, Docker, Multi-WAN, Failover, Load balancing

### TP-Link EAP245 Access Point Analysis

**Power Requirements and Compatibility:**
- **Power Consumption**: 12.3W (some sources indicate v1 needs up to 12.7W)
- **PoE Standards Supported**: 
  - IEEE 802.3af (Standard PoE) - maximum 15.4W delivered, ~12.5W usable
  - IEEE 802.3at (PoE+) - maximum 30.0W delivered
  - 48V Passive PoE support
- **Recommendation**: PoE+ (802.3at) recommended for optimal performance and reliability

**Mesh Capabilities Without Omada Controller:**
- **Limitation**: Traditional standalone configuration **disables mesh functionality by default**
- **Solution**: Omada mobile app (version 4.6.9+) enables **controller-free mesh setup**
- **Requirements**: EAP245 V3 compatible, devices must be at factory defaults
- **Process**: Use Omada app to configure unified mesh network without dedicated controller hardware
- **EasyMesh Incompatibility**: TP-Link Omada EAPs cannot mesh with Deco or Archer router lines

### Omada Controller Software Analysis

**What is Omada Controller:**
- Free on-premises SDN (Software Defined Networking) controller
- Centralized management for TP-Link EAPs, JetStream switches, and Omada routers
- Hybrid cloud technology enables remote network control with local security
- Professional-grade management platform with web-based interface

**System Requirements:**
- **Hardware**: Intel Core i3-8100/i5-6500/i7-4700+ (2+ cores, 4+ threads)
- **Memory**: 16GB RAM minimum for managing up to 1500 EAPs
- **Operating Systems**: Windows 7/8/10/11/Server or 64-bit Linux (Ubuntu, CentOS, Fedora, Debian)
- **Dependencies (Linux)**: Java 8+, MongoDB 3.0.15-7.x, OpenJDK, JSVC

**Management Scale:**
- Up to 1500 EAPs with adequate hardware resources
- Actual scale depends on host hardware specifications

### Network Monitoring Dashboard Options

**GL.iNet Flint 2 Built-in Monitoring:**
- Native GL.iNet dashboard with network statistics
- Full OpenWrt/LuCI access for advanced monitoring and configuration
- SNMP support through OpenWrt for integration with external monitoring tools

**Third-Party Monitoring Solutions:**
- **Zabbix**: Open-source, excellent for home lab environments
- **PRTG**: Commercial solution with comprehensive network monitoring
- **SNMP Integration**: Both routers and access points support SNMP monitoring
- **Mini PC Deployment**: Sufficient hardware for running monitoring solutions

**Omada Controller Monitoring:**
- Real-time monitoring of all managed EAP devices
- Centralized statistics, performance metrics, and alerts
- Cloud access capability for remote monitoring

### Mini PC Integration Strategy

**Infrastructure Role Options:**
- **Monitoring Server**: Host Zabbix/PRTG for network monitoring and alerting
- **Omada Controller Host**: Run TP-Link Omada controller software
- **Network Services**: DHCP, DNS, VPN services complementing router
- **Home Lab Platform**: Proxmox/virtualization for multiple network services

**Hardware Considerations:**
- **Recommended Specs**: 16GB+ RAM, SSD storage for monitoring solutions
- **Examples**: Lenovo ThinkCentre M910Q-class mini PCs suitable for network monitoring
- **Network Connection**: Wired connection to router for optimal monitoring performance

## Infrastructure Integration Analysis

### Power Infrastructure Requirements

**Critical Gap Identified:**
- GL.iNet Flint 2 has **no PoE+ ports** for powering EAP245 access points
- **Required Solution**: Separate PoE+ switch or PoE+ injectors needed

**PoE+ Switch Integration:**
- Position between Flint 2 router and EAP245 access points
- Must support 802.3at (PoE+) standard for reliable EAP245 operation
- Enable SNMP for monitoring integration

### Network Topology Recommendations

**Suggested Architecture:**
1. **Core Router**: GL.iNet Flint 2 (DHCP, routing, VPN, firewall)
2. **PoE+ Switch**: 8-port managed switch with PoE+ for access points
3. **Access Points**: Multiple EAP245 units in mesh configuration
4. **Mini PC**: Network monitoring and/or Omada controller hosting
5. **Management**: Omada app or controller software for AP management

### Management Strategy Options

**Option 1: Controller-Free (Recommended for Start)**
- Use Omada mobile app for mesh configuration
- GL.iNet interface for router management
- Standalone monitoring via built-in dashboards
- **Pros**: Simpler setup, no additional hardware requirements
- **Cons**: Limited advanced AP management features

**Option 2: Full Controller Deployment**
- Mini PC hosting Omada controller software
- Centralized management of all network equipment
- Advanced monitoring via Zabbix/PRTG integration
- **Pros**: Professional-grade management, comprehensive monitoring
- **Cons**: Additional complexity, hardware requirements

## Potential Atomic Projects

Based on this research, several 1-2 week implementation projects emerge:

### Foundation Level Projects

**Network Hardware Deployment Project**
- Install and configure GL.iNet Flint 2 router with basic settings
- Deploy PoE+ switch for access point power infrastructure
- Physical installation and basic connectivity testing
- **Prerequisites**: Hardware procurement, basic network knowledge
- **Success Criteria**: Stable wired network with PoE+ capability

**EAP245 Mesh Network Project**  
- Configure EAP245 access points using Omada mobile app
- Establish mesh network without controller requirement
- Optimize placement and test coverage/performance
- **Prerequisites**: PoE+ power infrastructure, EAP245 hardware
- **Success Criteria**: Seamless wireless coverage with mesh roaming

### Integration Level Projects

**Network Monitoring Implementation Project**
- Deploy mini PC with Zabbix for network monitoring
- Configure SNMP monitoring for router and access points
- Set up alerting and dashboard for network health
- **Prerequisites**: Mini PC hardware, basic Linux knowledge
- **Success Criteria**: Automated monitoring with alerts and historical data

**Omada Controller Deployment Project**
- Install and configure Omada controller on mini PC
- Migrate from app-based to controller-based AP management
- Implement advanced features like voucher system and fast roaming
- **Prerequisites**: Mini PC, established AP mesh network
- **Success Criteria**: Centralized professional AP management

### Orchestration Level Projects

**Infrastructure as Code Project**
- Implement configuration management for network equipment
- Automate backup and restore procedures for all devices
- Create documentation and runbook for maintenance procedures
- **Prerequisites**: Stable network infrastructure, scripting knowledge
- **Success Criteria**: Reproducible network configuration and disaster recovery

## Cost/Benefit Analysis

**Infrastructure Investment:**
- **Required**: PoE+ switch or injectors (additional cost not in original plan)
- **Mini PC Role**: High value for monitoring and controller hosting
- **Complexity Trade-off**: Controller-free setup reduces initial complexity

**Strategic Value:**
- Professional-grade network infrastructure supporting future projects
- SNMP monitoring enables infrastructure visibility and troubleshooting
- Mesh Wi-Fi provides reliable coverage for IoT and mobile device projects
- Foundation for advanced networking projects (VLANs, network segmentation)

## Integration Strategy

**Phase 1: Basic Infrastructure**
- Deploy Flint 2 router with PoE+ switch infrastructure
- Configure EAP245 mesh network using mobile app approach
- Establish baseline network monitoring via built-in dashboards

**Phase 2: Enhanced Management**
- Deploy mini PC for dedicated network monitoring
- Consider Omada controller deployment based on management needs
- Implement comprehensive SNMP monitoring and alerting

**Phase 3: Advanced Orchestration**
- Infrastructure automation and configuration management
- Advanced network segmentation and security policies
- Integration with home automation and IoT device management

## Related Research

This research connects to existing infrastructure knowledge:
- [[Hardware-Inventory]] - Physical equipment tracking and allocation
- [[Linux-Administration-Skills-Development]] - Skills development for network service management
- [[Network-Security-Concepts]] - Security implications of network architecture decisions

**Cross-Dependencies:**
- Power infrastructure planning affects all network equipment deployment
- Mini PC capabilities enable multiple network service projects
- Professional network infrastructure supports advanced home automation projects