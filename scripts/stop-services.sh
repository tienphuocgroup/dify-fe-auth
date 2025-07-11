#!/bin/bash

# Stop script for webapp-conversation services
# This script kills any processes running on port 3847

echo "🛑 Stopping webapp-conversation services..."

# Find and kill processes on port 3847
PORT=3847
PID=$(lsof -ti:$PORT)

if [ -n "$PID" ]; then
    echo "📍 Found process $PID running on port $PORT"
    kill -9 $PID
    echo "✅ Successfully stopped process on port $PORT"
else
    echo "ℹ️  No process found running on port $PORT"
fi

echo "🏁 Stop script completed"