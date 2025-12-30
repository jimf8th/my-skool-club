#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  MySkool Club - Local Test Script${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Stop processes on port 5173 (Frontend)
echo -e "${YELLOW}[1/6] Stopping processes on port 5173...${NC}"
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Port 5173 cleared${NC}" || echo -e "${GREEN}✓ No process on port 5173${NC}"

# Stop processes on port 8080 (Backend)
echo -e "${YELLOW}[2/6] Stopping processes on port 8080...${NC}"
lsof -ti:8080 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Port 8080 cleared${NC}" || echo -e "${GREEN}✓ No process on port 8080${NC}"

sleep 2

# Compile Backend
echo -e "\n${YELLOW}[3/6] Compiling backend...${NC}"
cd backend
mvn clean compile -DskipTests
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend compiled successfully${NC}"
else
    echo -e "${RED}✗ Backend compilation failed${NC}"
    exit 1
fi
cd ..

# Build Frontend
echo -e "\n${YELLOW}[4/6] Building frontend...${NC}"
cd frontend
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}✗ Frontend npm install failed${NC}"
    exit 1
fi
cd ..

# Start Backend
echo -e "\n${YELLOW}[5/6] Starting backend on port 8080...${NC}"
cd backend
nohup mvn spring-boot:run > ../backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
cd ..

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 10

# Start Frontend
echo -e "\n${YELLOW}[6/6] Starting frontend on port 5173...${NC}"
cd frontend
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
cd ..

# Wait for frontend to be ready
sleep 5

# Display status
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Application Started Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Frontend:${NC} http://localhost:5173"
echo -e "${GREEN}Backend:${NC}  http://localhost:8080"
echo -e "${GREEN}Backend PID:${NC}  $BACKEND_PID"
echo -e "${GREEN}Frontend PID:${NC} $FRONTEND_PID"
echo -e "\n${YELLOW}Logs:${NC}"
echo -e "  Backend:  tail -f backend.log"
echo -e "  Frontend: tail -f frontend.log"
echo -e "\n${YELLOW}To stop:${NC}"
echo -e "  kill $BACKEND_PID $FRONTEND_PID"
echo -e "  or run: lsof -ti:8080,5173 | xargs kill -9"
echo -e "${GREEN}========================================${NC}\n"
