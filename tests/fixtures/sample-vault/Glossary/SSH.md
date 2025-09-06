# SSH

*Secure Shell - encrypted remote access protocol*

## Definition
SSH (Secure Shell) provides secure remote access to Linux/Unix systems over encrypted connections. Essential tool for infrastructure management.

## Key Features
- **Encryption**: All traffic encrypted between client and server
- **Authentication**: Password or key-based authentication
- **Tunneling**: Can tunnel other protocols securely
- **File Transfer**: SCP/SFTP for secure file operations

## Key-Based Authentication
SSH keys provide passwordless authentication. Public key stored on server, private key on client. Much more secure than passwords.

## Infrastructure Usage
SSH key infrastructure established for:
- **Proxmox Host**: Management of hypervisor
- **VMs**: Access to Omada Controller and other services
- **Mobile Access**: Framework laptop can manage infrastructure remotely

## Best Practice
Use SSH keys instead of passwords for infrastructure access. Enables secure, frictionless remote administration.

**Related**: Linux Administration, Framework Laptop, Proxmox