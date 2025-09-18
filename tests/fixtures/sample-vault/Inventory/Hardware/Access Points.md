# Access Points

## Specs

- CPU: Embedded processor per unit
- RAM: Built-in per unit
- Storage: Flash memory per unit
- OS: TP-Link EAP firmware

## Role

Enterprise-grade WiFi coverage throughout house with centralized management via Omada Controller. Provides professional wireless infrastructure. Test.


## Individual Access Points

### Kitchen AP

- **IP**: 192.168.8.212
- **MAC**: 24:2f:d0:b7:a6:6e
- **Location**: Kitchen ceiling
- **Connection**: Ethernet via [[MoCA Adapters]] ✅
- **Power**: PoE from router

### Upstairs AP  

- **IP**: 192.168.8.112
- **MAC**: 24:2f:d0:b7:96:c2
- **Location**: Upstairs hallway ceiling
- **Connection**: Wireless mesh ⚠️ (pending ethernet run)
- **Power**: Power adapter + PoE injector

### Basement AP

- **IP**: 192.168.8.237
- **MAC**: 24:2f:d0:b7:9b:4a
- **Location**: Basement ceiling
- **Connection**: Direct ethernet to router ✅
- **Power**: PoE from router

## Specifications (Per Unit)

- **Model**: TP-Link EAP245
- **Standard**: 802.11ac Wave 2 (WiFi 5)
- **Speed**: AC1750 (1300 Mbps 5GHz + 450 Mbps 2.4GHz)
- **Features**: 3x3 MU-MIMO, PoE+ powered
- **Management**: Centralized via [[Omada Controller]]

## Management Access

- **Controller**: https://192.168.8.130:8043
- **Network**: 192.168.8.0/24 DHCP from [[Router]]
- **VLAN Support**: Ready for segmentation (Admin, Main, Guest)
- **Coverage**: Full house professional WiFi

## Emergency Procedures

### Access Point Issues

```bash
# Check AP status in Omada Controller
https://192.168.8.130:8043

# Factory reset (hold reset 10s while powered)
# Re-adopt in Omada Controller after reset
```

## Runs

- WiFi 5 wireless coverage
- Centralized management via [[Omada Controller]]
- VLAN-ready network segmentation
- Professional enterprise features

## Related

Projects: [[Network Foundation]], [[Network Phase 2 Basement]]