# Exam Monitor v2.0

### for Windows - SEB 3.8.0
### for macOS - SEB 3.3.2

> Web-based programming exam system with built-in anti-cheat protection

## What does it do?

Exam Monitor is a web-based system for conducting programming exams in a controlled environment. It provides:

- **Real-time monitoring** of students during exams
- **Anti-cheat system** with automatic termination upon violation
- **Monaco Editor** for code writing
- **WebSocket communication** between students and teacher
- **Auto-save** functionality
- **Practice Server** with JSONStore API for exercises

## Project Structure

```
exam-monitor-v2/
├── exam-server/              # Main server (Port 8080)
│   ├── server.mjs           # Entry point
│   ├── config/
│   │   └── exam-config.json # Central configuration
│   ├── modules/
│   │   ├── SessionManager.mjs      # Session management
│   │   ├── WebSocketHandler.mjs    # Real-time communication
│   │   ├── JSONDataStore.mjs       # Data storage
│   │   └── ProxyHandler.mjs        # Proxy to practice server
│   ├── routes/
│   │   ├── teacher-auth.mjs        # Teacher authentication
│   │   └── project-routes.mjs      # Project files
│   ├── public/
│   │   ├── student/                # Student interface
│   │   └── teacher/                # Teacher dashboard
│   └── data/
│       ├── classes/                # Student data by class
│       ├── sessions/               # Active sessions
│       └── classes.json            # Student database
│
└── practice-server/          # JSONStore API (Port 3030)
    ├── server.mjs
    ├── data/                 # JSON collections
    └── exam-files/           # Exam files
```

## Getting Started

### Initial Installation
```bash
npm install
```

### Starting the Servers
```bash
# Start both exam + practice servers
npm start

# Or start only exam server
cd exam-server && node server.mjs

# Or start only practice server
cd practice-server && node server.mjs
```

### Access
- **Students:** http://localhost:8080/student
- **Teacher:** http://localhost:8080/teacher
- **Practice API:** http://localhost:3030/jsonstore/*

## Login

### Teacher Access
```
URL: http://localhost:8080/teacher
Username: admin
Password: exam-admin-2024
```

### Student Login
1. Go to http://localhost:8080/student
2. Read the terms and conditions
3. Check "I agree"
4. Enter name and class (11A, 11B, 12A, 12B)
5. Click "Enter Exam"
6. Red screen with fullscreen button will appear
7. Click the button → exam starts

## How does it work?

### 1. Student starts exam:
```
Login → Fullscreen mode → Monaco Editor → Write code → Auto-save
```

### 2. Teacher monitors:
```
Dashboard → Real-time student list → Violation notifications → Code preview
```

### 3. Anti-cheat system:
- **Fullscreen monitoring** (ESC, F11 blocked)
- **Alt+Tab detection** (window switching)
- **Keyboard blocking** (Ctrl+W, Cmd+Q, etc.)
- **Context menu disabled** (right-click)
- **Clipboard monitoring**
- **F12 ALLOWED** for debugging in dev mode
- **3 fullscreen exit attempts** → automatic termination with warning dialogs

### 4. Data flow:
```
Student → WebSocket → Exam Server → Teacher Dashboard
                   ↓
                Database (sessions + student data)
```

## Configuration

Edit `exam-server/config/exam-config.json`:

```json
{
  "exam": {
    "duration": 30,              // minutes
    "durationUnit": "minutes"
  },
  "security": {
    "antiCheat": {
      "enabled": true,
      "maxFullscreenExitAttempts": 3,  // 3 attempts → termination
      "showWarningDialog": true
    },
    "sessionSecurity": {
      "sessionTimeout": 240,
      "allowSessionRecovery": false    // Students CANNOT rejoin
    }
  },
  "monitoring": {
    "timeWarnings": [5],               // Warning at 5 minutes
    "timeWarningsUnit": "minutes"
  }
}
```

### Key Security Settings:

- **No `gracePeriod`** - Students cannot join after exam starts
- **`allowSessionRecovery: false`** - Students cannot rejoin after disconnect
- **Teacher restart** - Only teachers can restart student sessions via dashboard
- **Timer warnings** - Only at 5 minutes remaining
- **Timer turns red** - Last 5 minutes with pulse animation

## Development Mode

### For development with DevTools:
```
http://localhost:8080/student?dev=true
```

Or in browser console:
```javascript
window.ALLOW_DEV_MODE = true;
location.reload();
```

** IMPORTANT:** Dev mode works ONLY on localhost/127.0.0.1

### To test anti-cheat:
```
http://localhost:8080/student
// without ?dev=true
```

## Data Directories

### Ignored by Git:
```
exam-server/data/classes/*/      # Student data
exam-server/data/sessions/*/     # Sessions
package-lock.json                # Auto-generated
```

### Preserved:
```
exam-server/data/classes/.gitkeep
exam-server/data/sessions/.gitkeep
```

## Teacher Features

### Session Management:
- **Restart Session** button for each student
- Works for both active and terminated students
- Clears session data and allows student re-login
- Real-time notifications for all teachers
- Session history preserved with 'CLEARED' status

### Dashboard:
- Real-time student monitoring
- Code preview
- Violation tracking
- Help chat system
- Session statistics

### How to restart a student session:
1. Find the student in the dashboard
2. Click "Restart Session" button
3. Confirm the action
4. Session is cleared - student can log in again with same credentials

## WebSocket Events

### Student → Server:
- `student-join` - Student connects
- `code-update` - Code changed
- `heartbeat` - Periodic ping (every 30s)
- `suspicious-activity` - Violation detected
- `exam-complete` - Exam finished

### Server → Student:
- `student-id-assigned` - Session ID
- `time-warning` - 5 min warning
- `force-disconnect` - Forced termination
- `exam-expired` - Time expired
- `session-restarted` - Session restarted by teacher

### Server → Teacher:
- `student-connected` - New student
- `student-disconnected` - Student left
- `student-code-update` - Code updated
- `student-suspicious` - Violation
- `all-students` - Full list
- `session-restart-success` - Session restarted successfully
- `session-restart-error` - Restart failed

## API Endpoints

### Student endpoints:
```
POST /api/student-login       # Login
GET  /api/exam-files          # File list
GET  /api/project/files       # File structure
POST /api/project/file        # Create file
PUT  /api/project/file/:name  # Edit file
```

### Teacher endpoints:
```
POST /api/teacher/login         # Teacher login
GET  /api/teacher/logout        # Logout
POST /api/teacher/verify-session # Verify session
GET  /api/anticheat/stats       # Statistics
```

### Practice Server (proxy):
```
GET  http://localhost:8080/proxy/jsonstore/phonebook
POST http://localhost:8080/proxy/jsonstore/phonebook
PUT  http://localhost:8080/proxy/jsonstore/phonebook/:id
```

## Supported Exam Types

### 1. Vanilla JavaScript
- HTML + CSS + JS
- Preview in iframe
- No backend

### 2. Express.js projects
- Full Node.js stack
- Auto `npm install`
- Student server on port 4000+
- Proxy to student server

## Common Issues

### "Cannot enter the exam"
- Check that name is at least 3 characters
- Check that class is selected
- Check that terms are accepted

### "Exam kicked me out immediately"
- Anti-cheat system likely detected a violation
- Check console for errors (F12 in dev mode)
- Don't use Alt+Tab during exam
- Maximum 3 fullscreen exit attempts allowed

### "Red screen after login"
- This is normal - click the fullscreen button
- After entering fullscreen, exam will start

### "Student has technical problems"
- Teacher can restart the session from dashboard
- Click "Restart Session" button
- Student can log in again with same credentials

## Version History

### v2.0.0 (Current)
- Simplified anti-cheat system (3-attempt fullscreen exit)
- Teacher session restart functionality
- Removed `gracePeriod` security vulnerability
- Disabled `allowSessionRecovery` for security
- Timer warnings only at 5 minutes
- Red timer with pulse animation in last 5 minutes
- Removed Gemini API integration
- Simplified directory structure
- Updated documentation

## License

ISC

## 👥 Authors

Exam Monitor Team

---

**Version:** 2.0.0
**Last Updated:** 2025-01-21
