---
type: reference
created: 2025-01-27
tags: [reference, ollama, local-ai, quick-reference]
hardware: RTX-3080
---

# Ollama Usage Reference

*Quick reference for Ollama local AI model usage on RTX 3080 system*

## System Status

**Installation**: ✅ Installed via `curl -fsSL https://ollama.com/install.sh | sh`  
**Service**: Auto-runs in background on port 11434  
**Hardware**: RTX 3080 (10GB VRAM) with GPU acceleration

## Core Commands

### Service Management
```bash
# Check if service is running (should show "address already in use" if running)
ollama serve

# Check service status
systemctl status ollama

# See what's using the port
sudo lsof -i :11434
```

### Model Management
```bash
# Download a model
ollama pull mistral:7b

# List installed models
ollama list

# Remove a model
ollama rm model-name
```

### Using Models
```bash
# Start chatting with a model (downloads if not available)
ollama run mistral:7b

# In chat interface:
>>> Your question here
>>> /bye          # Exit chat
>>> /help         # Show chat commands
```

### System Monitoring
```bash
# See what models are currently loaded in memory
ollama ps

# Check running processes
ps aux | grep ollama
```

## Recommended Models for RTX 3080

### General Purpose
- **`mistral:7b`** (2GB) - Fast, excellent quality, good starting point
- **`llama3.1:8b`** (4.1GB) - Meta's latest, excellent reasoning
- **`gemma2:9b`** (5.4GB) - Google's model, good performance

### Coding Assistance
- **`deepseek-coder:6.7b`** (6.4GB) - Best specialized coding model
- **`codellama:7b`** (3.8GB) - Meta's coding model, multi-language
- **`codegemma:7b`** (5GB) - Google's coding-focused model

### Lightweight/Testing
- **`tinyllama:1.1b`** (1.4GB) - Ultra-fast for testing
- **`phi3:3.8b`** (2.2GB) - Microsoft's efficient model

## Performance Expectations (RTX 3080)

| Model Size | VRAM Usage | Speed | Use Case |
|------------|------------|-------|----------|
| 1-3B | 2-4GB | 60-100 tokens/sec | Testing, simple tasks |
| 7B | 4-6GB | 40-60 tokens/sec | General use, coding |
| 13B | 8-10GB | 20-30 tokens/sec | Complex reasoning |
| 30B+ | 10GB+ (uses RAM) | 8-15 tokens/sec | Advanced tasks |

## API Usage

### REST API
```bash
# Chat completion
curl http://localhost:11434/api/generate \
  -d '{
    "model": "mistral:7b",
    "prompt": "Why is the sky blue?",
    "stream": false
  }'

# List models via API
curl http://localhost:11434/api/tags
```

### Python Integration
```python
import requests

response = requests.post('http://localhost:11434/api/generate',
    json={
        'model': 'mistral:7b',
        'prompt': 'Write a Python function to calculate fibonacci',
        'stream': False
    })

print(response.json()['response'])
```

## Common Use Cases

### Quick Questions
```bash
ollama run mistral:7b "Explain recursion in programming"
```

### Code Generation
```bash
ollama run deepseek-coder:6.7b "Write a bash script to backup home directory"
```

### Interactive Coding Session
```bash
ollama run codellama:7b
>>> I need help debugging this Python code: [paste code]
>>> Can you optimize this function?
>>> /bye
```

## Troubleshooting

### Service Issues
```bash
# If service won't start
sudo systemctl restart ollama

# Check logs
journalctl -u ollama -f

# Manual start (if needed)
ollama serve
```

### Model Issues
```bash
# Re-download corrupted model
ollama rm mistral:7b
ollama pull mistral:7b

# Clear model cache
rm -rf ~/.ollama/models/manifests
rm -rf ~/.ollama/models/blobs
```

### Performance Issues
```bash
# Check GPU usage
nvidia-smi

# Reduce model size if running out of VRAM
ollama pull mistral:7b-q4_0  # 4-bit quantized version
```

## Storage Locations

- **Models**: `~/.ollama/models/`
- **Config**: `~/.ollama/`
- **Logs**: `journalctl -u ollama`

## Integration Ideas

### Knowledge-OS Integration
- Use with `/research` command for local AI research
- Code review and debugging assistance
- Natural language processing for daily notes
- Local alternative to cloud AI services

### Development Workflow
```bash
# Code review
ollama run deepseek-coder:6.7b "Review this function for bugs: [code]"

# Documentation
ollama run mistral:7b "Write documentation for this API: [code]"

# Explanation
ollama run codellama:7b "Explain what this regex does: ^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
```

## Next Steps

1. **Start Simple**: Try `ollama run mistral:7b` for general chat
2. **Test Coding**: Try `ollama run deepseek-coder:6.7b` for programming help  
3. **Compare Models**: Test different models for your specific use cases
4. **Monitor Performance**: Use `nvidia-smi` and `ollama ps` to optimize
5. **Integrate**: Consider API integration with existing workflows

## Related Research

- [[Local-AI-Models-Ollama-Research]] - Complete technical analysis and hardware requirements
- [[Local-LLM-Integration-Research]] - Integration strategies for Knowledge-OS workflow
- [[Local-AI-Infrastructure-Research]] - Infrastructure planning and model selection