#!/bin/bash

# Start both backend and frontend in development mode
echo "Starting Scheduler App development servers..."

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Start backend in background
cd "$SCRIPT_DIR/backend" && npm run dev &
BACKEND_PID=$!

# Start frontend in background  
cd "$SCRIPT_DIR/frontend" && npm start &
FRONTEND_PID=$!

# Function to cleanup processes on exit
cleanup() {
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

echo "Backend running on http://localhost:3001"
echo "Frontend will run on http://localhost:3000"
echo "Press Ctrl+C to stop both servers"

# Wait for processes
wait