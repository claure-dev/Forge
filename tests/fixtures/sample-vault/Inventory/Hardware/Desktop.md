---
type: hardware
role: primary-workstation
status: active
created: 2025-08-18
ip: 192.168.8.223
mac: f0:2f:74:19:0c:ed
location: office-upstairs
---

# Desktop

## Specs
- CPU: High-performance processor for development
- RAM: Sufficient for AI model hosting and development
- Storage: Fast SSD storage
- OS: Linux (development environment)
- GPU: RTX 3080 (10GB VRAM) for AI acceleration

## Role
Primary workstation for daily development and work tasks. Local AI platform with RTX 3080 acceleration for model hosting and inference.

## Network Configuration
- **IP Address**: 192.168.8.223 (DHCP reserved)
- **MAC Address**: f0:2f:74:19:0c:ed
- **Connection**: Ethernet for maximum performance
- **Location**: Office upstairs

## AI Configuration (Ollama)
- **Service**: Auto-runs on port 11434
- **GPU**: RTX 3080 with 10GB VRAM acceleration
- **Models**: Multiple local models installed
- **API**: REST API at http://localhost:11434
- **Performance**: 40-60 tokens/sec for 7B models

### Recommended Models (RTX 3080)
| Model | VRAM Usage | Speed | Use Case |
|-------|------------|-------|----------|
| `mistral:7b` | 2GB | 60 tokens/sec | General purpose |
| `llama3.1:8b` | 4.1GB | 40 tokens/sec | Reasoning |
| `deepseek-coder:6.7b` | 6.4GB | 40 tokens/sec | Coding |
| `codellama:7b` | 3.8GB | 50 tokens/sec | Programming |

### Common Ollama Commands
```bash
# Service status
ollama ps

# Chat with model
ollama run mistral:7b

# List models
ollama list

# API call
curl http://localhost:11434/api/generate -d '{"model": "mistral:7b", "prompt": "Hello"}'
```

## Runs
- Ollama AI service with RTX 3080 acceleration
- [[Forge Web App]] development and testing
- Development environments (Python, FastAPI, etc.)
- Primary workstation applications

## Related
Projects: [[Forge Web App]], [[Local AI Integration]]
Research: [[Local-AI-Models-Ollama-Research]]