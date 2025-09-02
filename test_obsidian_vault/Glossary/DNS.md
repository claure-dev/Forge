# DNS

*Domain Name System - translates domain names to IP addresses*

## Definition
DNS (Domain Name System) translates human-readable domain names (google.com) into IP addresses (192.168.1.1) that computers use for network communication.

## How It Works
1. **Query**: Device asks DNS server for IP of domain
2. **Lookup**: DNS server finds IP address  
3. **Response**: IP address returned to device
4. **Connection**: Device connects to IP address

## Privacy Implications
DNS queries reveal all websites visited. Many ISP DNS servers log and sell this data. Privacy-focused DNS servers don't track users.

## Current Setup
- **Router DNS**: Proton VPN DNS servers for privacy
- **Local Caching**: Router caches responses for performance
- **Privacy**: DNS queries encrypted through VPN tunnel

## Future Enhancement
Local DNS server (Pi-hole or similar) could provide additional filtering and caching while maintaining privacy through upstream Proton DNS.

**Related**: Proton Services, Network Foundation, privacy infrastructure