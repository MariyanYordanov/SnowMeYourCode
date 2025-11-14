#!/bin/bash

# 🎓 STUDENT EXAM LAUNCHER - JUST DOUBLE-CLICK!
# This file starts Chrome in exam mode automatically

# ⚠️ IMPORTANT: Edit this line with your teacher's IP address!
TEACHER_IP="192.168.2.1"  # ← CHANGE THIS!

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   🎓 STARTING EXAM - PLEASE WAIT...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if Chrome exists
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ ! -f "$CHROME_PATH" ]; then
    echo -e "${RED}❌ Chrome not found!${NC}"
    echo -e "${YELLOW}Please install Google Chrome first.${NC}"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if teacher server is reachable
echo -e "${YELLOW}Connecting to exam server...${NC}"
if ! curl -s --connect-timeout 3 "http://$TEACHER_IP:8080" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to exam server!${NC}"
    echo -e "${YELLOW}Please check:${NC}"
    echo "  1. Are you connected to the exam Wi-Fi?"
    echo "  2. Is the teacher's computer turned on?"
    echo "  3. Is the IP address correct? Current: $TEACHER_IP"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo -e "${GREEN}✅ Connected to exam server!${NC}"
echo ""

# Close existing Chrome
killall "Google Chrome" 2>/dev/null || true
sleep 1

# Start Chrome in exam mode
echo -e "${GREEN}🚀 Starting Chrome in exam mode...${NC}"
echo ""
echo -e "${YELLOW}INSTRUCTIONS:${NC}"
echo "  1. Enter your NAME and CLASS"
echo "  2. Accept the exam terms (checkbox)"
echo "  3. Click 'Enter Fullscreen' button"
echo "  4. DO NOT exit fullscreen during exam!"
echo ""
echo -e "${RED}⚠️  To exit: Press Cmd+Q AFTER exam is finished${NC}"
echo ""

"$CHROME_PATH" \
    --kiosk \
    --fullscreen \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --disable-blink-features=OverscrollCustomization \
    --disable-infobars \
    --no-first-run \
    --no-default-browser-check \
    "http://$TEACHER_IP:8080/student" \
    > /dev/null 2>&1 &

echo -e "${GREEN}✅ Exam started successfully!${NC}"
echo ""
echo "Good luck! 🍀"

# Keep terminal open for 3 seconds
sleep 3
