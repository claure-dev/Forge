---
type: hardware
role: network-extension
status: active
created: 2025-08-29
---

# MoCA Adapters

## Specs
- CPU: Embedded MoCA processor per unit
- RAM: Built-in per unit  
- Storage: Flash per unit
- OS: MoCA firmware

## Role
Ethernet over coax networking solution enabling ethernet backhaul for Kitchen AP using existing coax TV wiring infrastructure.

## Network Configuration
- **Standard**: MoCA 2.5
- **Speed**: Up to 2.5 Gbps over coax
- **Quantity**: 2 units (basement + kitchen)
- **Deployment Date**: 2025-08-29

## Installation Details
- **Basement Unit**: Connected to [[Router]] ethernet port
- **Kitchen Unit**: Connected to Kitchen [[Access Points|AP]]
- **Coax Run**: Utilizing existing cable TV infrastructure
- **Performance**: 3x speed improvement on [[Desktop]] after deployment

## Success Metrics
- **Reliability**: Stable connection (unlike failed powerline adapters)
- **Speed**: Eliminated wireless mesh bottleneck for kitchen AP
- **Infrastructure**: Repurposed existing coax without new cable runs

## Troubleshooting
```bash
# Check MoCA link status (usually via web interface)
# Units typically have diagnostic LEDs:
# - Power LED: Solid = powered
# - MoCA LED: Solid = linked
# - Ethernet LED: Solid = device connected
```

## Runs
- MoCA 2.5 networking protocol
- Ethernet bridge over coax
- Network extension for [[Access Points]]

## Related
Projects: [[Network Phase 2 Basement]]
Glossary: [[MoCA]]