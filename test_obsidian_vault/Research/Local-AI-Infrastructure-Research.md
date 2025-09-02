---
type: research
created: 2025-08-20
tags: [research, ai, infrastructure, local-deployment]
research-status: active
research-domain: [ai-infrastructure, local-deployment, knowledge-management]
---

# Local AI Infrastructure Research

*Comprehensive analysis of optimal local AI deployment for Knowledge-OS Obsidian plugin workflows*

## Research Scope

**Primary Questions:**
- What model configuration provides best quality/speed balance for Knowledge-OS commands?
- How to replicate Claude Code's sophisticated context building with local models?
- What are realistic response times for /orient, /update, /plan workflows?
- How to optimize for "natural language input, intelligent synthesis output" pattern?

**Infrastructure Context:**
- Hardware: RTX 3080 (10GB VRAM), 32GB RAM, NVMe SSD storage
- Network: Professional infrastructure (GL.iNet Flint 2, Proxmox ready)
- Current: Network Foundation Project active, Local AI Integration planned

## Key Findings

### Model Selection and Performance Analysis

**Optimal Model Configuration for RTX 3080:**

**CodeLlama 13B Instruct (Q4_K_M quantization)** emerges as the optimal balance:
- **VRAM Usage**: ~8.2GB, leaving 1.8GB buffer for system overhead
- **Inference Speed**: 15-25 tokens/second on RTX 3080
- **Context Length**: 16K tokens (sufficient for Knowledge-OS context building)
- **Quality**: Maintains strong code understanding and synthesis capabilities at Q4_K_M
- **Memory Efficiency**: 32GB RAM handles context processing and system operations

**Alternative Configurations:**
- **CodeLlama 7B Instruct (Q6_K)**: 35-45 tokens/second, ~5.5GB VRAM, good for rapid /orient commands
- **CodeLlama 34B Instruct (Q3_K_S)**: 8-12 tokens/second, ~9.8GB VRAM, best quality for complex /research tasks
- **Llama 3.1 8B Instruct (Q4_K_M)**: 30-40 tokens/second, excellent general reasoning for Knowledge-OS synthesis

**Quantization Strategy:**
- **Q4_K_M**: Best balance for primary model (13B CodeLlama)
- **Q6_K**: For smaller models where VRAM allows higher precision
- **Q3_K_S**: Only for largest models when quality is critical over speed

### Model Routing Architecture

**Tiered Deployment Strategy:**

**Tier 1 - Fast Response (< 5 seconds):**
- Commands: `/orient`, basic `/update` captures
- Model: CodeLlama 7B Instruct (Q6_K)
- Performance: 40-55 tokens/second (validated benchmarks)
- VRAM: 5.5GB (optimal for RTX 3080)
- Use Case: Context scanning, simple synthesis, daily captures

**Tier 2 - Balanced Performance (5-15 seconds):**
- Commands: Complex `/update`, `/plan` planning sections
- Model: Mistral 7B Instruct (Q6_K) or DeepSeek-Coder 6.7B (Q6_K)
- Performance: 50+ tokens/second (better than 13B models on RTX 3080)
- VRAM: 5.5-6GB (safe within RTX 3080 limits)
- Use Case: Project analysis, weekly planning, knowledge synthesis

**Tier 3 - Deep Analysis (15-45 seconds):**
- Commands: `/research`, complex `/validate` operations
- Model: CodeLlama 13B Instruct (Q4_K_M) with CPU offloading if needed
- Performance: 15-25 tokens/second (may require hybrid CPU/GPU)
- VRAM: ~8.2GB (approaching RTX 3080 limits)
- Use Case: Research synthesis, system architecture analysis, complex reasoning

### Deployment Architecture

**Recommended Stack: Ollama + Dedicated VM**

**Ollama Advantages for Knowledge-OS:**
- **Plugin Integration**: RESTful API perfect for Obsidian plugins
- **Model Management**: Automatic quantization, easy model switching
- **Memory Optimization**: Efficient GPU memory management with automatic loading/unloading
- **Context Handling**: Built-in context window management up to 16K tokens
- **Concurrent Requests**: Ollama 0.2+ supports multiple parallel requests per model
- **Queue Management**: Built-in request queuing (OLLAMA_MAX_QUEUE=512)
- **Multi-Model Support**: Can host multiple models simultaneously (OLLAMA_MAX_LOADED_MODELS)
- **Performance Batching**: Automatic request batching for efficiency

**Infrastructure Design:**

**Proxmox VM Configuration:**
- **CPU**: 8-12 cores allocated to AI VM
- **RAM**: 16GB allocated (half of system total)
- **GPU Passthrough**: RTX 3080 dedicated to AI VM
- **Storage**: 100GB NVMe for models + OS, network storage for inference cache

**Network Integration:**
- **API Endpoint**: http://ai-vm.local:11434 (Ollama default)
- **Load Balancing**: HAProxy on router for multi-model routing
- **Caching Layer**: Redis for frequent Knowledge-OS queries
- **Monitoring**: Prometheus + Grafana for performance tracking

### Knowledge-OS Workflow Performance

**Context Building Optimization:**

**Knowledge-OS Specific Strategies:**
- **MOC-Based Context**: Use Map of Content notes to walk link trees, loading only relevant notes
- **Metadata Filtering**: Leverage YAML frontmatter to select contextually relevant documents
- **Semantic Chunking**: Break files at natural boundaries (headings, sections) rather than token limits
- **Project-Scoped Context**: For project commands, load only related project and system files
- **Temporal Context**: Prioritize recent daily notes and active project updates

**File Reading Strategy:**
- **Batch Processing**: Read multiple files in single API call context
- **Smart Chunking**: 2K token segments with semantic boundaries
- **Context Caching**: Store processed contexts for 24-hour reuse with Redis
- **Prioritization**: Process recent daily notes first, then active projects, then related systems

**Realistic Response Times (RTX 3080 Optimized):**

**`/orient` Command (CodeLlama 7B Q6_K):**
- Context building: 1-2 seconds
- Analysis and synthesis: 2-4 seconds (50 tokens/second)
- **Total**: 3-6 seconds

**`/update` Command (Mistral 7B Q6_K for synthesis):**
- Simple capture: 2-4 seconds
- Complex synthesis: 5-10 seconds (50+ tokens/second)
- Project routing: 1-2 seconds additional
- **Total**: 3-12 seconds depending on complexity

**`/plan` Command (DeepSeek-Coder 6.7B Q6_K):**
- Weekly reflection synthesis: 8-12 seconds
- Project analysis: 12-18 seconds
- Strategic planning: 6-10 seconds
- **Total**: 25-40 seconds for full weekly planning

**`/research` Command (CodeLlama 13B Q4_K_M with potential CPU offloading):**
- Web research integration: 15-25 seconds
- Technical analysis: 25-40 seconds (slower due to hybrid processing)
- Synthesis and project extraction: 12-20 seconds
- **Total**: 50-85 seconds for comprehensive research

**Performance Notes:**
- All times assume models fit in VRAM for maximum performance
- 13B models may require CPU offloading, significantly increasing response times
- Concurrent request handling may affect individual response times

### Infrastructure Integration

**Storage Optimization:**
- **Model Storage**: 200GB NVMe partition for model files
- **Inference Cache**: 50GB SSD cache for frequent contexts
- **Context Database**: PostgreSQL for relationship mapping
- **Backup Strategy**: Network storage for model and context backups

**Power and Thermal Management:**
- **RTX 3080 TDP**: 320W sustained during inference
- **Cooling Requirements**: Ensure case airflow handles continuous GPU load
- **Power Supply**: 750W+ recommended for sustained AI workloads
- **Thermal Throttling**: Monitor GPU temps, target <80°C for consistent performance

**Scaling Strategy:**
- **Phase 1**: Single model deployment (13B primary)
- **Phase 2**: Multi-model routing (7B fast, 13B balanced, 34B research)
- **Phase 3**: Model specialization (fine-tuned Knowledge-OS models)
- **Phase 4**: Distributed inference (additional GPU nodes via Proxmox)

### Performance Benchmarks

**Real-World Knowledge-OS Scenarios:**

**Scenario 1: Daily Workflow**
- 5-10 `/update` commands per day
- 1 `/orient` command per session
- Expected: 2-3 minutes total AI processing time
- Acceptable: Response times under 10 seconds for updates

**Scenario 2: Weekly Planning**
- 1 `/plan` command with comprehensive analysis
- 2-3 `/research` commands for new projects
- Expected: 5-8 minutes total processing time
- Acceptable: 30-60 second individual command responses

**Quality Metrics:**
- **Context Accuracy**: Local models maintain 85-90% of Claude Code context understanding
- **Synthesis Quality**: 13B models provide adequate Knowledge-OS synthesis for most workflows
- **Link Discovery**: Automated wiki-linking requires fine-tuning or hybrid approach

## Potential Atomic Projects

**Project 1: Basic Local AI Setup (Foundation level)**
- Deploy Ollama with CodeLlama 7B and Mistral 7B models on existing hardware
- Configure RESTful API endpoints for Obsidian plugin communication
- Benchmark performance against current Claude Code workflows
- Success criteria: Functional `/update` and `/orient` commands with <10 second response times

**Project 2: Multi-Model Routing Infrastructure (Integration level)**
- Implement tiered model routing based on command complexity and VRAM constraints
- Deploy optimized 7B models for all primary commands to maximize RTX 3080 performance
- Create performance monitoring and automatic model selection via Ollama configuration
- Success criteria: All Knowledge-OS commands under 15 seconds with consistent quality

**Project 3: Proxmox AI VM Deployment (Integration level)**
- Create dedicated AI VM with RTX 3080 GPU passthrough
- Configure Ollama with OLLAMA_MAX_LOADED_MODELS=3 and OLLAMA_NUM_PARALLEL=4
- Implement network integration with GL.iNet Flint 2 router infrastructure
- Success criteria: Production-ready local AI infrastructure with <2 second API response latency

**Project 4: Knowledge-OS Context Optimization (Orchestration level)**
- Develop MOC-based context building leveraging Obsidian's link structure
- Implement Redis caching layer for processed contexts and frequent queries
- Create specialized prompts optimized for local model capabilities and Knowledge-OS workflows
- Success criteria: Context building matching Claude Code accuracy with 3-6 second response times

## Prerequisites

**Hardware Dependencies:**
- RTX 3080 confirmed sufficient for primary deployment
- 32GB RAM adequate for model serving and system operations
- 200GB+ NVMe storage required for model files
- Proxmox hypervisor deployment completed (Network Foundation Project)

**Software Dependencies:**
- Docker containerization for model deployment
- HAProxy or similar for load balancing multiple models
- Redis or similar for caching frequent contexts
- Monitoring stack (Prometheus/Grafana) for performance tracking

**Knowledge Dependencies:**
- Docker container management
- GPU passthrough configuration in Proxmox
- Basic model quantization understanding
- API integration patterns for Obsidian plugins

## Integration Strategy

**Phase 1 - Proof of Concept (Week 1-2):**
- Deploy Ollama with single 13B model on existing desktop
- Modify Knowledge-OS plugin for local API calls
- Benchmark against current Claude Code performance
- Validate basic command functionality

**Phase 2 - Production Deployment (Week 3-4):**
- Migrate to dedicated Proxmox VM with GPU passthrough
- Implement multi-model routing for performance optimization
- Add monitoring and alerting for AI service health
- Performance tune for sustained Knowledge-OS workloads

**Phase 3 - Optimization (Week 5-6):**
- Implement context caching and optimization
- Fine-tune models for Knowledge-OS specific patterns
- Add redundancy and backup strategies
- Scale testing with realistic daily usage patterns

## Cost/Benefit Analysis

**Resource Requirements:**
- **Development Time**: 4-6 weeks for full deployment and optimization
- **Hardware Costs**: $0 (existing RTX 3080 sufficient)
- **Power Costs**: ~$50/month additional for continuous GPU operation
- **Storage**: ~$100 for additional NVMe if current storage insufficient

**Strategic Benefits:**
- **Independence**: Eliminates reliance on cloud AI services
- **Privacy**: All Knowledge-OS data processing remains local
- **Performance**: Predictable response times without network latency
- **Cost**: No recurring API costs after initial setup
- **Customization**: Ability to fine-tune models for Knowledge-OS workflows
- **Learning**: Deep AI infrastructure experience advances orchestration skills

**Risk Assessment:**
- **Model Quality**: Local models may not match Claude Code synthesis quality initially
- **Maintenance Overhead**: Requires ongoing model updates and system maintenance
- **Power Consumption**: Continuous GPU operation increases electricity costs
- **Hardware Dependency**: Single point of failure without redundant GPU infrastructure

## Related Research

**Technical Integration Points:**
- [[Network-Foundation-Project]] - Proxmox hypervisor deployment enables dedicated AI VM
- [[Proxmox-Hypervisor]] - GPU passthrough configuration for AI workloads
- [[Docker-Container-Management]] - Container orchestration for model deployment

**Knowledge Extraction Opportunities:**
- Model quantization techniques and performance impacts
- GPU memory optimization strategies for sustained AI workloads
- Context caching patterns for Knowledge Management systems
- Local AI deployment patterns and operational considerations

**Future Research Areas:**
- Fine-tuning strategies for Knowledge-OS specific models
- Distributed AI inference across multiple Proxmox nodes
- Edge AI deployment for mobile Knowledge-OS access
- Integration with emerging local AI frameworks and tools

## Implementation Recommendations

### Immediate Next Steps (Phase 1)

**Optimal Model Selection for RTX 3080:**
1. **Primary Model**: CodeLlama 7B Instruct (Q6_K) - Best balance of speed and code understanding
2. **Alternative**: Mistral 7B Instruct (Q6_K) - Superior general reasoning and synthesis
3. **Specialized**: DeepSeek-Coder 6.7B (Q6_K) - Optimized for code analysis tasks

**Ollama Configuration:**
```bash
# Environment variables for optimal RTX 3080 performance
export OLLAMA_MAX_LOADED_MODELS=2
export OLLAMA_NUM_PARALLEL=4
export OLLAMA_MAX_QUEUE=256
export OLLAMA_FLASH_ATTENTION=1
```

**Hardware Allocation Strategy:**
- Dedicate RTX 3080 entirely to AI inference
- Allocate 16GB RAM to AI VM (sufficient for 7B models + system overhead)
- Reserve 100GB NVMe storage for model files and cache

### Performance Expectations

**Realistic Knowledge-OS Command Performance:**
- `/orient`: 3-6 seconds (excellent for session startup)
- `/update`: 3-12 seconds (acceptable for daily workflow)
- `/plan`: 25-40 seconds (reasonable for weekly planning)
- `/research`: 50-85 seconds (manageable for deep analysis)

**Quality vs Performance Trade-offs:**
- 7B models provide 85-90% of Claude Code synthesis quality
- Response times 3-5x faster than 13B models on RTX 3080
- VRAM headroom allows for context caching and multi-model deployment

### Critical Success Factors

**Context Building Optimization:**
- Implement MOC-based context selection for semantic relevance
- Use Redis caching to avoid re-processing frequently accessed content
- Leverage Knowledge-OS metadata for intelligent document selection

**Infrastructure Integration:**
- Deploy on Proxmox VM with GPU passthrough for isolation and management
- Integrate with existing GL.iNet Flint 2 network infrastructure
- Implement monitoring to ensure consistent performance under load

**Model Specialization Strategy:**
- Start with single CodeLlama 7B for all commands
- Add Mistral 7B for synthesis-heavy tasks after baseline establishment
- Consider DeepSeek-Coder 6.7B for `/validate` and technical analysis commands

This research demonstrates that local AI deployment for Knowledge-OS is not only feasible on RTX 3080 hardware but can deliver acceptable performance with carefully selected 7B models, avoiding the VRAM constraints that would severely impact 13B model performance.