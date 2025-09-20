#!/bin/bash

echo "🧹 Cleaning up existing processes..."

# Kill processes with more targeted approach
pkill -f "python3 main.py" 2>/dev/null || true
pkill -f "electron.*main.js" 2>/dev/null || true

# Wait a moment for processes to die
sleep 2

# Check if ports are free
if lsof -i :8000 >/dev/null 2>&1; then
    echo "⚠️  Port 8000 still in use, killing process..."
    fuser -k 8000/tcp 2>/dev/null || true
    sleep 1
fi

if lsof -i :5174 >/dev/null 2>&1; then
    echo "⚠️  Port 5174 still in use, killing process..."
    fuser -k 5174/tcp 2>/dev/null || true
    sleep 1
fi

echo "✅ Cleanup complete!"
echo "🚀 Starting development servers..."

# Start the dev servers
npm run dev:all