# CLAUDE.md - Exam Monitor v2 Implementation Reference

## 🎯 Project Overview
**Exam Monitor v2** е anti-cheat система за изпити по програмиране, работеща в локална мрежа. Учителят стартира системата на лаптоп, учениците се свързват през WiFi и работят в задължителен fullscreen режим.

## 🏗️ Current Project Structure
```
exam-monitor-v2/
├── exam-server/
│   ├── server.mjs                    # Main server (port 8080)
│   ├── modules/
│   │   ├── SessionManager.mjs        # Student sessions
│   │   ├── WebSocketHandler.mjs      # Real-time communication
│   │   ├── ProxyHandler.mjs          # Proxy to practice server
│   │   ├── StudentValidator.mjs      # Student validation
│   │   ├── AntiCheatMonitor.mjs      # Anti-cheat logic
│   │   └── JSONDataStore.mjs         # Data persistence
│   ├── routes/
│   │   └── project-routes.mjs        # Project files API
│   ├── public/
│   │   ├── student/
│   │   │   ├── index.html            # Student interface
│   │   │   ├── js/
│   │   │   │   ├── main.js           # Main entry point
│   │   │   │   ├── editor.js         # Monaco editor logic
│   │   │   │   ├── timer.js          # Exam timer
│   │   │   │   ├── socket.js         # WebSocket client
│   │   │   │   ├── login.js          # Login logic
│   │   │   │   ├── tabs.js           # Tab management
│   │   │   │   ├── anticheat.js      # Anti-cheat client
│   │   │   │   ├── dialogs.js        # Custom dialogs
│   │   │   │   ├── monaco-file-manager.js  # File management
│   │   │   │   ├── editor-integration.js   # Editor helpers
│   │   │   │   └── sidebar-manager.js      # Sidebar logic
│   │   │   └── css/
│   │   └── teacher/
│   │       ├── index.html            # Teacher dashboard
│   │       └── teacher.css           # Teacher styles
│   ├── config/
│   │   └── exam-config.json          # Configuration
│   └── data/
│       └── classes.json              # Student/class data
└── practice-server/
    ├── server.mjs                    # API server (port 3030)
    └── data/                         # JSONSTORE data
```

## 🔴 CRITICAL ISSUES TO FIX

### 1. Timer Not Working
**Problem**: Timer doesn't start/display correctly
**Files**: `timer.js`, `main.js`
**Fix**: 
```javascript
// In main.js - startExam() function
startExamTimer(sessionData.timeLeft || sessionData.examDuration);

// In timer.js - fix display element ID
const timerEl = document.getElementById('exam-timer'); // not 'timer-display'
```

### 2. Console Output Wrong Location
**Problem**: Results show in Chrome DevTools instead of editor console
**Files**: `editor.js`
**Fix**: Redirect console.log to DOM element `console-output`

### 3. Multiple Files Not in Tabs
**Problem**: Files open but no visible tabs
**Files**: `monaco-file-manager.js`, `index.html`
**Fix**: Add tab container in HTML, implement tab rendering

## 📋 IMPLEMENTATION TASKS

### Phase 1: Critical Fixes (Priority: HIGH)

#### 1.1 Fix Timer System
```javascript
// Add to exam-config.json
"exam": {
  "duration": 180,
  "durationUnit": "minutes",
  "warningIntervals": [30, 15, 5, 1]
}

// Add to teacher dashboard
<input type="number" id="exam-duration" min="30" max="240" value="180">
<button onclick="setExamDuration()">Set Duration</button>

// WebSocket event for duration change
socket.emit('set-exam-duration', { duration: minutes });
```

#### 1.2 Fix Console Output
```javascript
// In editor.js - runCode() function
function interceptConsole() {
  const methods = ['log', 'error', 'warn', 'info', 'table'];
  const originalConsole = {};
  
  methods.forEach(method => {
    originalConsole[method] = console[method];
    console[method] = (...args) => {
      originalConsole[method](...args);
      displayInEditorConsole(method, args);
    };
  });
}

function displayInEditorConsole(type, args) {
  const output = document.getElementById('console-output');
  const entry = document.createElement('div');
  entry.className = `console-${type}`;
  entry.textContent = args.map(formatArg).join(' ');
  output.appendChild(entry);
  output.scrollTop = output.scrollHeight;
}
```

#### 1.3 UI Cleanup
- Remove light theme from `editor.js` and `index.html`
- Remove Save button from toolbar
- Remove session ID display from header
- Hide fullscreen exit button

### Phase 2: Core Features (Priority: HIGH)

#### 2.1 MDN Reference Implementation
```javascript
// Create mdn-reference.json with offline data
{
  "javascript": {
    "Array": {
      "map": { "syntax": "...", "description": "...", "examples": [] },
      "filter": { "syntax": "...", "description": "...", "examples": [] },
      "reduce": { "syntax": "...", "description": "...", "examples": [] }
    },
    "String": { /* methods */ },
    "Object": { /* methods */ }
  },
  "dom": {
    "document": { /* methods */ },
    "element": { /* methods */ }
  }
}

// Create mdn-viewer.js
class MDNViewer {
  constructor() {
    this.loadReference();
  }
  
  async loadReference() {
    const response = await fetch('/student/data/mdn-reference.json');
    this.data = await response.json();
  }
  
  search(query) { /* implement search */ }
  displayMethod(path) { /* show in sidebar */ }
}
```

#### 2.2 DevTools Simulation
```javascript
// network-monitor.js
class NetworkMonitor {
  constructor() {
    this.requests = [];
    this.interceptFetch();
  }
  
  interceptFetch() {
    const original = window.fetch;
    window.fetch = async (url, options = {}) => {
      const id = Date.now();
      const start = performance.now();
      
      this.logRequest(id, url, options);
      
      try {
        const response = await original(url, options);
        this.logResponse(id, response, performance.now() - start);
        return response;
      } catch (error) {
        this.logError(id, error);
        throw error;
      }
    };
  }
}

// storage-viewer.js
class StorageViewer {
  getAll() {
    return {
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage }
    };
  }
  
  monitor() {
    // Override setItem/removeItem to track changes
  }
}
```

#### 2.3 File Manager Tabs
```html
<!-- Add to index.html after editor-header -->
<div id="file-tabs-container" class="file-tabs">
  <!-- Tabs will be inserted here -->
</div>
```

```javascript
// In monaco-file-manager.js
addTab(filename) {
  const tab = document.createElement('div');
  tab.className = 'file-tab';
  tab.innerHTML = `
    <span class="tab-name">${filename}</span>
    <span class="tab-close" data-file="${filename}">×</span>
  `;
  document.getElementById('file-tabs-container').appendChild(tab);
}
```

### Phase 3: Enhancements (Priority: MEDIUM)

#### 3.1 Resizable Console
```javascript
// resizer.js
class PanelResizer {
  constructor(editorEl, consoleEl) {
    this.createResizeHandle();
  }
  
  createResizeHandle() {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.addEventListener('mousedown', this.startResize.bind(this));
  }
}
```

#### 3.2 Help Chat System
```javascript
// help-chat.js
class HelpChat {
  constructor(socket) {
    this.socket = socket;
    this.createUI();
  }
  
  sendMessage(text) {
    this.socket.emit('help-request', {
      studentId: window.ExamApp.sessionId,
      message: text,
      timestamp: Date.now()
    });
  }
}

// Add to WebSocketHandler.mjs
socket.on('help-request', (data) => {
  this.notifyTeacher('student-help', data);
});
```

#### 3.3 Fullscreen Button Hiding
```css
/* Add to components.css */
/* Hide fullscreen exit hint */
:fullscreen::backdrop {
  background: #1e1e1e;
}

/* Prevent exit button area */
body:fullscreen {
  margin-top: -50px;
  padding-top: 50px;
}

/* For webkit browsers */
:-webkit-full-screen {
  margin-top: -50px !important;
  padding-top: 50px !important;
}
```

## 🔌 WebSocket Events Reference

### Student → Server
- `student-join` - Login
- `code-update` - Auto-save code
- `suspicious-activity` - Anti-cheat violations
- `help-request` - Ask teacher for help
- `exam-complete` - Finish exam

### Server → Student
- `timer-warning` - Time warnings
- `help-response` - Teacher response
- `force-disconnect` - Terminate exam
- `exam-expired` - Time's up

### Teacher → Server
- `teacher-join` - Open dashboard
- `set-exam-duration` - Configure timer
- `send-help-response` - Reply to student
- `terminate-student` - Force end exam

## 🚀 Implementation Order

1. **Day 1**: Fix timer, console output, remove unnecessary UI
2. **Day 2**: Implement MDN reference, start DevTools
3. **Day 3**: Complete DevTools, add file tabs
4. **Day 4**: Resizable panels, help system
5. **Day 5**: Testing, bug fixes, fullscreen security

## ⚠️ Important Notes

- **Anti-cheat**: Any fullscreen exit = instant exam termination
- **Auto-save**: Every 2 seconds (already implemented)
- **Network**: Students connect to teacher's laptop WiFi
- **Data**: All stored in JSON files, no external DB
- **Browser**: Optimize for Chrome/Edge

## 🔧 Configuration Variables
```javascript
// Key settings to make configurable
EXAM_DURATION: 180 // minutes
AUTO_SAVE_INTERVAL: 2000 // ms
MAX_FILES: 10
ALLOWED_EXTENSIONS: ['.js', '.html', '.css', '.json']
WARNING_INTERVALS: [30, 15, 5, 1] // minutes
FULLSCREEN_VIOLATIONS_LIMIT: 0 // instant termination
```