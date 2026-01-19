# Exam Monitor v2 - Project Overview

## What is this project?

A real-time exam monitoring system for programming exams. Students write code in a Monaco Editor (VS Code-like), while teachers monitor their progress in real-time through a dashboard. The system uses **Safe Exam Browser (SEB)** to prevent cheating.

## Architecture

```
exam-monitor-v2/
├── exam-server/          # Main exam server (Node.js + Express + Socket.IO)
│   ├── server.mjs        # Main server file
│   ├── public/
│   │   ├── student/      # Student interface (Monaco Editor)
│   │   └── teacher/      # Teacher dashboard (real-time monitoring)
│   ├── seb-config/       # Safe Exam Browser configuration
│   │   └── exam-config.seb
│   ├── data/
│   │   └── classes.json  # Student enrollment data
│   └── routes/
│       ├── project-routes.mjs  # File management API
│       └── teacher-auth.mjs    # Teacher authentication
│
└── practice-server/      # Practice server with exam tasks
    └── exam-files/       # Exam task files (Subtraction, Pascal Case, etc.)
```

## How to Run

### Start the servers:
```bash
cd exam-server
npm install
npm start
```

The server runs on `http://0.0.0.0:8080`

### Access points:
- **Student interface**: `http://<server-ip>:8080/student/`
- **Teacher dashboard**: `http://<server-ip>:8080/teacher/`

### Teacher login credentials:
- Username: `admin`, Password: `exam-admin-2024`
- Username: `teacher`, Password: `teacher-pass-2024`

## Current Network Configuration

The SEB config is set up for local network testing:
- **Server IP**: `192.168.0.223`
- **Port**: `8080`

If you're on a different network, update the IP in:
- `exam-server/seb-config/exam-config.seb` (startURL, quitURL, URLFilterRules)

## Safe Exam Browser (SEB) Setup

### For students:
1. Download SEB from https://safeexambrowser.org/download_en.html
   - Windows: SEB 3.8.0+
   - macOS: SEB 3.3.2+
2. Get the `exam-config.seb` file from the teacher
3. Double-click the `.seb` file to start the exam

### SEB features enabled:
- JavaScript and WebSocket (required for Monaco Editor and Socket.IO)
- Private clipboard (copy/paste within browser only)
- URL filtering (only exam server and MDN allowed)
- Process monitoring (blocks TeamViewer, Discord, etc.)
- Quit URL: `/quit-exam` - SEB closes when student submits

### Current SEB settings:
- `allowQuit: true` (for testing - set to false for real exams)
- `URLFilterEnable: false` (disabled for testing)

## Features Completed

1. **Student Interface**
   - Monaco Editor with syntax highlighting
   - File tree with create/delete/rename
   - Real-time code sync to server
   - Exam submission with SEB quit integration

2. **Teacher Dashboard**
   - Real-time student monitoring
   - Code preview for each student
   - File list per student
   - Anti-cheat violation tracking

3. **Anti-Cheat System**
   - Tab visibility detection
   - Copy/paste monitoring
   - Focus loss tracking
   - Process blocking via SEB

4. **SEB Integration**
   - Auto-redirect to `/quit-exam` after submission
   - Proper quit URL configuration
   - JavaScript/WebSocket enabled

## Testing Tools

### Simulate 15 students:
```bash
cd exam-server
node test-exam-simulation.mjs
```

This creates 15 virtual students who:
- Connect to the server
- Write different solutions to the Subtraction task
- Type character-by-character with realistic delays
- Simulate typos and corrections

## Known Issues / TODO

1. **Practice server** - Not fully tested with SEB
2. **MDN documentation access** - URL filters need testing when enabled
3. **Production hardening** - Set `allowQuit: false` and add quit password

## Files Modified Recently

- `exam-server/server.mjs` - Added `/quit-exam` endpoint
- `exam-server/public/student/js/main.js` - Redirect to quit-exam after submission
- `exam-server/seb-config/exam-config.seb` - Network IP, JavaScript, WebSocket settings
- `exam-server/public/teacher/teacher.css` - Fixed file name colors (white)

## Quick Troubleshooting

### Students can't connect:
- Check if server is running on `0.0.0.0:8080` (not just localhost)
- Verify students are on the same network
- Check firewall settings

### SEB won't load the page:
- Verify the IP in `exam-config.seb` matches the server
- Make sure JavaScript is enabled in SEB config
- Check if WebSocket is allowed

### Files don't load in editor:
- Ensure `practice-server/exam-files/` exists and has task folders
- Check server console for errors

## Contact

Repository: https://github.com/MariyanYordanov/SnowMeYourCode
