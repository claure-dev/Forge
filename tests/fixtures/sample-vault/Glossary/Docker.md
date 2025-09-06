# Docker

*Containerization platform for application deployment*

## Definition
Docker packages applications and their dependencies into lightweight, portable containers. Enables consistent deployment across different environments.

## Key Benefits
- **Isolation**: Applications run in separate containers
- **Portability**: Same container runs anywhere Docker is installed
- **Resource Efficiency**: More efficient than full VMs
- **Easy Deployment**: Simple container management commands

## Current Usage
- **Omada Controller**: Runs in Docker container within Proxmox VM
- **Service Management**: Docker containers for various infrastructure services
- **Development**: Consistent environments for Forge development

## Container vs VM
Containers share the host OS kernel but provide application isolation. VMs include full operating system. Docker containers are lighter weight.

## Infrastructure Role
Docker provides the service layer between Proxmox VMs and applications, enabling easy service deployment and management.

**Related**: Omada Controller, Proxmox, service deployment