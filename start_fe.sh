#!/bin/bash

# Configuration
PORT=${PORT:-5175}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Error handling
set -e

echo -e "${YELLOW}Starting Frontend Server...${NC}"

# Kill any existing frontend process before starting new one
echo "Checking for existing frontend process..."
pid=$(lsof -ti:$PORT 2>/dev/null || true)
if [ ! -z "$pid" ]; then
    echo "Killing process on port $PORT (PID: $pid)..."
    kill -9 $pid 2>/dev/null || true
fi

echo "Port check completed"

# Function to verify frontend environment variables
verify_frontend_env() {
    echo "Verifying environment variables..."
    local env_file=".env"
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}Error: .env file not found${NC}"
        return 1
    fi
    
    echo "Found .env file"
    
    # Required environment variables
    local required_vars=("VITE_API_BASE_URL" "VITE_PUBLIC_KEY")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        echo "Checking $var..."
        if ! grep -q "^${var}=" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}Error: Missing required environment variables in .env:${NC}"
        printf '%s\n' "${missing_vars[@]}"
        return 1
    fi
    
    echo -e "${GREEN}Frontend environment variables verified${NC}"
    return 0
}

# Initialize frontend
echo -e "\n${YELLOW}Setting up frontend...${NC}"

# Verify environment variables
if ! verify_frontend_env; then
    echo "Environment verification failed"
    exit 1
fi

echo "Starting npm install..."

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install || { echo -e "${RED}Failed to install frontend dependencies${NC}"; exit 1; }

echo "Dependencies installed successfully"

# Generate API credentials (non-blocking)
echo "Generating API credentials..."
if npm run generate-jwt; then
    echo -e "${GREEN}API credentials generated successfully${NC}"
else
    echo -e "${YELLOW}Warning: Failed to generate API credentials - continuing anyway${NC}"
fi

# Run frontend auth initialization (non-blocking)
echo "Running frontend auth initialization..."
if npm run frontend-auth-init; then
    echo -e "${GREEN}Frontend auth initialized successfully${NC}"
else
    echo -e "${YELLOW}Warning: Failed to initialize frontend auth - backend may not be running${NC}"
fi

# Function to check if frontend is ready
check_frontend() {
    local max_attempts=30
    local attempt=1
    local wait_time=2

    echo "Checking frontend status..."
    while [ $attempt -le $max_attempts ]; do
        # Check if process is running
        if ! ps -p $FRONTEND_PID > /dev/null; then
            echo -e "${RED}Frontend process died${NC}"
            # Check logs for errors
            echo -e "\nFrontend startup error:"
            tail -n 10 frontend.log
            return 1
        fi

        # Check if Vite server is responding
        if curl -s http://localhost:$PORT > /dev/null && grep -q "VITE.*ready" frontend.log; then
            echo -e "${GREEN}Frontend is ready!${NC}"
            return 0
        fi

        echo "Waiting for frontend to start (attempt $attempt/$max_attempts)..."
        sleep $wait_time
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}Frontend failed to start after $((max_attempts * wait_time)) seconds${NC}"
    echo -e "\nLast few lines of frontend.log:"
    tail -n 10 frontend.log
    return 1
}

# Start frontend with error output
echo -e "${GREEN}Starting frontend server...${NC}"
npm run dev -- --port $PORT > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "Frontend process started with PID: $FRONTEND_PID"

# Wait for frontend to be ready
frontend_status=$(check_frontend)
status_code=$?

if [ $status_code -eq 1 ]; then
    echo -e "${RED}Frontend failed to start properly. Check frontend.log for details${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

# Final status message
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "\n${GREEN}🚀 Frontend is running:${NC}"
    echo -e "   Frontend: ${GREEN}http://localhost:$PORT${NC}"
    echo -e "\nLogs are available in:"
    echo -e "   Frontend: ${YELLOW}frontend.log${NC}"
    echo -e "\n${YELLOW}Press Ctrl+C to stop the frontend server${NC}"
else
    echo -e "\n${RED}Error: Frontend failed to start${NC}"
    echo -e "\nChecking frontend log:"
    tail -n 5 frontend.log
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

# Cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down frontend server...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Frontend server stopped${NC}"
    exit 0
}

trap cleanup INT TERM

# Keep script running
wait
