#!/bin/bash

# 🔥 EXAM MONITOR v2.0 - KIOSK MODE STARTUP SCRIPT
# This script launches Chrome in full kiosk mode for maximum security
# Platform: macOS, Linux, Windows (Git Bash)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   EXAM MONITOR v2.0 - KIOSK MODE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Configuration
EXAM_SERVER_URL="http://localhost:8080/student"
CHROME_USER_DATA="/tmp/exam-chrome-profile-$$"

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)
            OS="mac"
            CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            ;;
        Linux*)
            OS="linux"
            CHROME_PATH=$(which google-chrome || which google-chrome-stable || which chromium-browser || which chromium)
            ;;
        MINGW*|MSYS*|CYGWIN*)
            OS="windows"
            CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
            ;;
        *)
            OS="unknown"
            ;;
    esac
}

# Check if Chrome exists
check_chrome() {
    if [ ! -f "$CHROME_PATH" ] && [ ! -x "$CHROME_PATH" ]; then
        echo -e "${RED}❌ Chrome not found at: $CHROME_PATH${NC}"
        echo -e "${YELLOW}Please install Google Chrome or update CHROME_PATH in this script.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Chrome found: $CHROME_PATH${NC}"
}

# Check if exam server is running
check_server() {
    echo -e "${YELLOW}Checking if exam server is running...${NC}"

    if curl -s --connect-timeout 2 http://localhost:8080 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Exam server is running${NC}"
    else
        echo -e "${RED}❌ Exam server is NOT running!${NC}"
        echo -e "${YELLOW}Please start the server first:${NC}"
        echo -e "   cd exam-monitor-v2"
        echo -e "   npm run dev"
        exit 1
    fi
}

# Kill existing Chrome processes
kill_chrome() {
    echo -e "${YELLOW}Closing existing Chrome instances...${NC}"

    case "$OS" in
        mac)
            killall "Google Chrome" 2>/dev/null || true
            ;;
        linux)
            killall chrome chromium-browser chromium google-chrome google-chrome-stable 2>/dev/null || true
            ;;
        windows)
            taskkill //F //IM chrome.exe 2>/dev/null || true
            ;;
    esac

    sleep 2
    echo -e "${GREEN}✅ Chrome processes closed${NC}"
}

# Start Chrome in kiosk mode
start_kiosk() {
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🚀 Starting KIOSK MODE...${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}INSTRUCTIONS:${NC}"
    echo -e "  1. Browser will open in FULLSCREEN automatically"
    echo -e "  2. Login with your name and class"
    echo -e "  3. Accept the exam terms"
    echo -e "  4. Click 'Enter Fullscreen' button"
    echo -e "  5. Exam will start - DO NOT exit fullscreen!"
    echo ""
    echo -e "${RED}⚠️  To exit KIOSK mode: Press Cmd+Q (Mac) or Alt+F4 (Windows/Linux)${NC}"
    echo ""
    echo -e "${YELLOW}Starting in 3 seconds...${NC}"
    sleep 3

    # Chrome kiosk flags
    "$CHROME_PATH" \
        --kiosk \
        --fullscreen \
        --disable-pinch \
        --overscroll-history-navigation=0 \
        --disable-features=TranslateUI \
        --disable-blink-features=OverscrollCustomization \
        --disable-infobars \
        --disable-session-crashed-bubble \
        --disable-restore-session-state \
        --disable-component-extensions-with-background-pages \
        --disable-background-networking \
        --disable-sync \
        --disable-default-apps \
        --no-first-run \
        --no-default-browser-check \
        --disable-hang-monitor \
        --disable-prompt-on-repost \
        --disable-client-side-phishing-detection \
        --disable-offer-store-unmasked-wallet-cards \
        --disable-offer-upload-credit-cards \
        --disable-speech-api \
        --disable-file-system \
        --disable-presentation-api \
        --disable-permissions-api \
        --user-data-dir="$CHROME_USER_DATA" \
        "$EXAM_SERVER_URL" \
        > /dev/null 2>&1 &

    CHROME_PID=$!
    echo -e "${GREEN}✅ Chrome started in KIOSK mode (PID: $CHROME_PID)${NC}"

    # Wait for Chrome to exit
    wait $CHROME_PID

    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Exam session ended${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Cleanup
    rm -rf "$CHROME_USER_DATA"
}

# Main execution
main() {
    detect_os
    echo -e "${YELLOW}Detected OS: $OS${NC}"
    echo ""

    check_chrome
    check_server
    kill_chrome
    start_kiosk
}

# Run main
main
