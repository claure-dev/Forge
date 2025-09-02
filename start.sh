#!/bin/bash

echo "🔥 Starting Forge Local AI..."
echo ""

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "⚠️  Ollama is not running on localhost:11434"
    echo "   Please start Ollama with: ollama serve"
    echo ""
fi

echo "📦 Installing/checking dependencies..."
python3 -m pip install -r requirements.txt --user

echo ""
echo "🚀 Starting FastAPI server..."
echo "   Web interface: http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo ""
echo "   Loading embedding model on first run (may take a moment)..."
echo ""

uvicorn main:app --reload --host 127.0.0.1 --port 8000