---
type: emergency-procedure
priority: critical
category: incident-response
last-reviewed: 2025-08-25
sla: immediate
owner: personal
---

# Emergency Procedures - NOC Runbooks

*Step-by-step procedures for critical network incidents - < 5 minute resolution*

## Incident Classification

- **P1 (Critical)**: Total network outage - < 5 minutes
- **P2 (High)**: Service degradation - < 30 minutes  
- **P3 (Medium)**: Single device issues - < 4 hours

---

## P1: Total Network Outage

**Symptoms**: No internet, no local network access

### 1. Physical Layer Check (2 minutes)
```bash
□ Check router power LED (should be solid)
□ Check Ethernet cable to modem (should be connected)
□ Check modem status lights (should show internet)
□ Power cycle: modem (30s) → router (30s) → wait 2 minutes
```

### 2. Router Status Check (1 minute)
```bash
□ Access router: http://192.168.8.1
□ Check WAN status (should show connected)
□ Check DHCP clients (should show devices)
□ If unreachable: Factory reset router (hold reset 10s)
```

### 3. Escalation Path
```bash
□ Document start time and symptoms
□ If no resolution in 5 minutes: Contact ISP
□ Use mobile hotspot for emergency access
```

---

## P2: WiFi Network Down

**Symptoms**: Wired works, WiFi doesn't

### 1. Omada Controller Check (2 minutes)
```bash
□ Access: https://192.168.8.130:8043
□ Check AP status (should be "Connected")
□ Check SSID broadcast status
□ If unreachable: Proceed to step 2
```

### 2. VM/Container Recovery (3 minutes)
```bash
# SSH to VM
ssh adam@192.168.8.130

# Check container status
docker ps

# If omada-controller not running
docker start omada-controller

# Check logs for errors
docker logs omada-controller
```

### 3. Proxmox VM Recovery (5 minutes)
```bash
# Access Proxmox
https://192.168.8.200:8006

# Check VM status
□ VM 100 should be "running"
□ If stopped: Start VM
□ If unresponsive: Restart VM
□ Wait 3 minutes for services to start
```

---

## P2: Single Access Point Down

**Symptoms**: One AP not working, others fine

### 1. Access Point Identification (1 minute)
```bash
□ Kitchen AP: 192.168.8.212 (always ethernet)
□ Upstairs AP: 192.168.8.112 (wireless mesh)
□ Basement AP: 192.168.8.237 (powerline + ethernet)
```

### 2. Power/Connection Check (2 minutes)
```bash
□ Check AP power LED (should be solid)
□ Check ethernet connection
□ For wireless mesh: Check mesh connection in Omada
□ For powerline: Check powerline adapter LEDs
```

### 3. Factory Reset (5 minutes)
```bash
□ Hold reset button 10 seconds while powered
□ Wait for LED to flash (2-3 minutes)
□ Re-adopt in Omada Controller
□ Wait for configuration download (2 minutes)
```

---

## P3: Internet Slow/Intermittent

**Symptoms**: Connected but poor performance

### 1. Speed Test Baseline (2 minutes)
```bash
# From Desktop PC
speedtest-cli

# Expected: >100 Mbps down, >10 Mbps up
# If <50 Mbps: Proceed to diagnostics
```

### 2. Connection Quality Check (3 minutes)
```bash
# Test core network
ping 192.168.8.1         # Router (should be <5ms)
ping 192.168.8.130       # Omada VM (should be <10ms)
ping 8.8.8.8             # Internet (should be <50ms)

# Check for packet loss
ping -c 20 8.8.8.8       # Should be 0% loss
```

### 3. VPN/DNS Check (2 minutes)
```bash
□ Check Proton VPN status in router
□ Try alternative DNS: 1.1.1.1, 8.8.8.8
□ Test without VPN if persistent issues
```

---

## P3: Device Can't Connect to WiFi

**Symptoms**: Specific device connection issues

### 1. Device-Side Check (2 minutes)
```bash
□ Forget and re-add WiFi network
□ Check device date/time accuracy
□ Try different SSID (2.4GHz vs 5GHz)
□ Test with mobile hotspot to isolate
```

### 2. Network-Side Check (3 minutes)
```bash
□ Check MAC address filtering in Omada
□ Check DHCP pool availability
□ Check AP client limits
□ Review Omada logs for connection attempts
```

---

## Emergency Contacts & Resources

### ISP Support
- **Xfinity**: 1-800-XFINITY (1-800-934-6489)
- **Account**: [Account details in **Proton Pass**]

### Hardware Support
- **GL.iNet**: support@gl-inet.com
- **TP-Link**: support@tp-link.com

### Documentation
- **Full Network Reference**: [[Network-Map]]
- **Hardware Details**: See 03-Systems/Infrastructure/Network/Assets/
- **Service Configuration**: See 03-Systems/Services/Core-Services/

---

## Incident Logging Template

```
Incident: [Brief description]
Start Time: [YYYY-MM-DD HH:MM]
Severity: P1/P2/P3
Symptoms: [What was observed]
Resolution: [Steps taken]
End Time: [YYYY-MM-DD HH:MM]
Follow-up: [Prevention measures]
```

*Log all P1/P2 incidents in daily notes via `/log` command for pattern analysis*