# 📊 EXAM MONITOR V2 - APPLICATION FLOW DIAGRAM

## 🎯 Системна Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXAM MONITOR SYSTEM v2.0                      │
│                  Античийт система за изпити                      │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         ├─────────────────┬─────────────────┴──────────────┐
         ▼                 ▼                                 ▼
┌────────────────┐  ┌────────────────┐          ┌────────────────────┐
│  EXAM SERVER   │  │ PRACTICE SERVER│          │   УЧИТЕЛ ПАНЕЛ     │
│   Port: 8080   │  │   Port: 3030   │          │   /teacher         │
│   (Main)       │  │   (JSONStore)  │          │   (Real-time)      │
└────────────────┘  └────────────────┘          └────────────────────┘
```

---

## 🚀 ВХОДНИ ТОЧКИ (Entry Points)

### 1️⃣ **Ученик (Student Entry)** - `http://localhost:8080/student`
### 2️⃣ **Учител (Teacher Entry)** - `http://localhost:8080/teacher`
### 3️⃣ **Practice API** - `http://localhost:3030/jsonstore/*` (proxy през exam server)

---

## 📋 ПОТРЕБИТЕЛСКИ ПЪТИЩА (User Flows)

## 🎓 УЧЕНИЧЕСКИ FLOW

### **СТЪПКА 1: Начален екран (Login Screen)**
**Файл:** `exam-server/public/student/index.html:38-110`

```
┌────────────────────────────────────────┐
│   ВХОД В ИЗПИТА ПО ПРОГРАМИРАНЕ       │
├────────────────────────────────────────┤
│                                        │
│  📜 УСЛОВИЯ НА ИЗПИТА:                │
│  ❌ Забранени действия:                │
│     - Смяна на прозорци/табове         │
│     - Копиране от външни източници     │
│     - Отваряне на DevTools             │
│     - AI асистенти                     │
│     - Комуникация с други             │
│                                        │
│  ✅ Позволени действия:                │
│     - Monaco редактор                  │
│     - MDN документация                 │
│     - Вградена конзола                │
│                                        │
│  ☑️ [Прочетох и се съгласявам]        │
│                                        │
│  Име: [_________________]              │
│  Клас: [11А ▼]                        │
│                                        │
│  [  ВЛЕЗ В ИЗПИТА  ]                  │
└────────────────────────────────────────┘
```

**Код:** `exam-server/public/student/js/login.js:1-100`
- Валидация: Име (min 3 символа) + Клас + Чекбокс за условия
- Бутонът е disabled докато всички полета не са валидни

---

### **СТЪПКА 2: Изпращане на Login Request**

```javascript
// POST /api/student-login
{
  "studentName": "Петър Петров",
  "studentClass": "11А"
}
```

**Backend обработка:** `exam-server/server.mjs:232-253`
↓
**Session Manager:** `exam-server/modules/SessionManager.mjs:63-115`

**Валидация:**
1. ✅ Проверка дали студентът съществува в `data/classes.json`
2. ✅ Проверка за активна сесия
3. ✅ Проверка дали изпитът не е приключен

**Възможни резултати:**

| Резултат | Тип | Действие |
|----------|-----|----------|
| ✅ Success | `success` | Създава нова сесия |
| 🔄 Continue | `continue_session` | Възстановява съществуваща сесия |
| ⏱️ Expired | `exam_expired` | Изпитът е изтекъл |
| 🚫 Exists | `student_exists` | Студентът вече участва |
| ❌ Invalid | `invalid_student/invalid_class` | Невалидни данни |

---

### **СТЪПКА 3: Създаване на сесия**

При успешен логин се създава:

```javascript
Session {
  sessionId: "11А-петър-петров-1729512345678",
  studentName: "Петър Петров",
  studentClass: "11А",
  examStartTime: 1729512345678,
  examEndTime: 1729512345678 + (30 * 60 * 1000), // 30min от config
  timeLeft: 1800000, // milliseconds
  status: "active",
  violationCount: 0,
  suspicionScore: 0
}
```

**Конфигурация:** `exam-server/config/exam-config.json:2-13`
- Продължителност: **30 минути** (може да се конфигурира)
- Grace period: **3 минути**

---

### **СТЪПКА 4: Kiosk Mode & Fullscreen Activation**

**След успешен login:**

```javascript
// 1. Отваря се popup window в kiosk mode
const kioskWindow = window.open(
  '/student?kiosk=true',
  'ExamKiosk',
  'fullscreen=yes,location=no,menubar=no,toolbar=no,status=no'
);

// 2. Parent window се затваря след 2 секунди (point of no return)
setTimeout(() => {
  window.close();
}, 2000);

// 3. В kiosk window се активира fullscreen
document.documentElement.requestFullscreen();

// 4. Anti-cheat се активира
setupAntiCheat();
activateAntiCheat();
```

**Anti-Cheat Protection:** `exam-server/public/student/js/anticheat.js`
- ✅ Fullscreen monitoring (ESC, F11 blocking)
- ✅ Window blur/focus detection (Alt+Tab)
- ✅ Keyboard blocking (Ctrl+W, Ctrl+N, etc)
- ✅ Context menu blocking (Right click)
- ✅ DevTools blocking (F12, Ctrl+Shift+I)
- ✅ Mouse lock in fullscreen
- ✅ Clipboard monitoring

---

### **СТЪПКА 5: Изпитен интерфейс**

```
┌─────────────────────────────────────────────────────────────────┐
│ 👤 Петър Петров  │  11А       ⏱️ Time: 00:29:45    [📤 Send]  │
├──────────┬──────────────────────────────────────────────────────┤
│          │  ▶ Run  🌐 Preview  🚀 Start Server  ⚡ Format       │
│ FILES    │  ┌──────────────────────────────────────────────┐   │
│ [MDN]    │  │                                              │   │
│ [DevTools│  │         MONACO CODE EDITOR                   │   │
│          │  │                                              │   │
│ 📁 src/  │  │  // Your code here...                        │   │
│   app.js │  │                                              │   │
│   ...    │  │                                              │   │
│          │  └──────────────────────────────────────────────┘   │
│          │                                                      │
│ + New    │  Ln 1, Col 1 | JavaScript | UTF-8                   │
├──────────┴──────────────────────────────────────────────────────┤
│ 🟢 Connected  │  0/5 tasks completed         v2.0.0  ❓ Help  │
└─────────────────────────────────────────────────────────────────┘
```

**Ключови компоненти:**
- **Monaco Editor** (`editor.js`)
- **File Manager** (`monaco-file-manager.js`)
- **Timer** (`timer.js`)
- **Anti-Cheat** (`anticheat.js`)
- **WebSocket** (`socket.js`)

---

### **СТЪПКА 6: Зареждане на изпитни файлове**

**Учителят качва файлове в:**
```
practice-server/exam-files/
  ├── src/
  │   ├── app.js
  │   └── utils.js
  ├── index.html
  └── package.json
```

**API за зареждане:** `exam-server/server.mjs:122-167`
```
GET /api/exam-files
Response: {
  success: true,
  files: [
    { name: "app.js", path: "src/app.js", size: 1024, modified: "..." },
    { name: "index.html", path: "index.html", size: 512 }
  ]
}
```

**Auto-copy към студент:** `exam-server/routes/project-routes.mjs:48-56`
- Файловете се копират в `student-data/{sessionId}/project-files/`
- Ако има `package.json` → автоматично `npm install`
- Зареждат се в Monaco Editor

---

### **СТЪПКА 7: Работа по време на изпита**

**Real-time функционалности:**

1. **Auto-save** (на всеки 10 секунди) - `exam-config.json:98-99`
2. **Heartbeat** (на всеки 30 секунди) - изпраща се към сървъра
3. **Timer warnings** - 60, 30, 15, 5 минути преди край
4. **WebSocket комуникация** - real-time sync

**WebSocket events:**
```javascript
// Client → Server
socket.emit('code-update', { code, fileName, sessionId })
socket.emit('heartbeat', { sessionId, timestamp, focusHistory, screenInfo })
socket.emit('suspicious-activity', { type, severity })

// Server → Client
socket.on('time-warning', { minutesLeft })
socket.on('force-disconnect', { reason })
socket.on('exam-expired')
```

**WebSocket Handler:** `exam-server/modules/WebSocketHandler.mjs`

**Server-side Anti-Cheat:** `exam-server/modules/ServerSideAntiCheat.mjs`
- Heartbeat validation
- Focus history verification
- Keystroke pattern analysis
- Screen properties validation
- Automatic termination при suspicion > 80

---

### **СТЪПКА 8A: Нормално приключване (Finish Exam)**

```
Ученик натиска [📤 Send]
         ↓
  Показва се диалог:
  "Сигурни ли сте че искате да предадете?"
         ↓
    Потвърждение
         ↓
  socket.emit('complete-exam', { sessionId })
         ↓
  Сесията се маркира като "completed"
         ↓
  Кодът се запазва в:
  exam-server/data/student-data/classes/11А/{sessionId}/
         ↓
  Информативен екран:
  "✅ Изпитът е предаден успешно!"
```

---

### **СТЪПКА 8B: Прекратяване при нарушение**

```
Anti-cheat засича нарушение
         ↓
  Увеличава violation counter & suspicion score
         ↓
  Проверява threshold (config)
         ↓
  Ако suspicionScore > 80:
    - socket.emit('suspicious-activity', { violation })
         ↓
  Server → ServerSideAntiCheat.validateHeartbeat()
         ↓
  Маркира сесията като "terminated"
         ↓
  socket.emit('force-disconnect', { reason })
         ↓
  Информативен екран:
  "⚠️ Изпитът е прекратен принудително!"
  Причина: [нарушение]
```

**Конфигурация на нарушения:** `exam-config.json:36-40`
```json
"allowedViolations": {
  "tabSwitches": 5,
  "copyAttempts": 3,
  "devToolsAttempts": 2
}
```

**Severity scoring:**
- Warning threshold: 30 точки
- Critical threshold: 70 точки
- Auto-disconnect: 80 точки

---

## 👨‍🏫 УЧИТЕЛСКИ FLOW

### **СТЪПКА 1: Teacher Login**
```
http://localhost:8080/teacher
         ↓
  Login форма (teacher/login.html)
  Username: admin / teacher
  Password: exam-admin-2024 / teacher-pass-2024
         ↓
  POST /api/teacher/login
         ↓
  Session се създава (express-session)
         ↓
  Redirect to /teacher dashboard
```

**Auth routes:** `exam-server/routes/teacher-auth.mjs`

---

### **СТЪПКА 2: Real-time Monitoring Dashboard**

```
┌──────────────────────────────────────────────────────────────┐
│  👨‍🏫 EXAM MONITOR - Teacher Dashboard              🔄 Auto  │
├──────────────────────────────────────────────────────────────┤
│  📊 АКТИВНИ УЧЕНИЦИ (5)                                     │
│  ┌────────────┬────────┬──────────┬───────────┬──────────┐  │
│  │ Име        │ Клас   │ Време    │ Нарушения │ Статус   │  │
│  ├────────────┼────────┼──────────┼───────────┼──────────┤  │
│  │ П.Петров   │ 11А    │ 25:30    │ 0         │ 🟢 OK    │  │
│  │ М.Иванова  │ 11А    │ 23:15    │ 2 ⚠️     │ 🟡 Warn  │  │
│  │ С.Георгиев │ 11А    │ 20:45    │ 5 ❌     │ 🔴 Crit  │  │
│  └────────────┴────────┴──────────┴───────────┴──────────┘  │
│                                                              │
│  🔍 SUSPICIOUS ACTIVITIES (Real-time):                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🚨 14:35 - Мария Иванова - Alt+Tab detected         │   │
│  │ ⚠️  14:28 - Стефан Георгиев - DevTools attempt      │   │
│  │ ⚠️  14:20 - Мария Иванова - Focus loss (5s)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [📤 Upload Exam Files] [🔴 Emergency Broadcast]            │
└──────────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Real-time student list (WebSocket updates)
- ✅ Live violation alerts with sound
- ✅ Connection status indicator
- 🔄 Live code preview modal (click student → view code)
- 🔄 File upload interface
- 🔄 Emergency broadcast messaging

**Refresh rate:** 5 секунди (`exam-config.json:81-82`)

**API endpoints:**
- `GET /api/anticheat/stats` - общи статистики
- `GET /api/anticheat/student/:sessionId` - студент детайли

---

### **СТЪПКА 3: Live Code Preview**

```
Teacher clicks "View Code" на ученик
         ↓
  Modal се отваря:
  ┌───────────────────────────────────┐
  │ 📄 Петър Петров - Live Code       │
  ├───────────────────────────────────┤
  │ Files: [app.js] [index.html]      │
  │                                   │
  │ app.js (Last edit: 2s ago)        │
  │ ┌─────────────────────────────┐   │
  │ │ 1  function sum(a, b) {     │   │
  │ │ 2    return a + b;          │   │
  │ │ 3  }                        │   │
  │ │ 4                           │   │
  │ │ 5  console.log(sum(5, 10)); │   │
  │ └─────────────────────────────┘   │
  │                                   │
  │ Activity: ████▓▓▓░░░ (typing)     │
  │ [Copy Code] [Close]               │
  └───────────────────────────────────┘
```

**Tech Stack:**
- Prism.js за syntax highlighting (lightweight ~20KB)
- WebSocket listener за `student-code-update` events
- Real-time updates без refresh

---

## 🗄️ PRACTICE SERVER FLOW

**Practice Server цел:** JSONStore API за учебни задачи

```
Ученик прави HTTP заявка:
  fetch('http://localhost:8080/proxy/jsonstore/phonebook')
         ↓
  Exam server → ProxyHandler
         ↓
  Добавя X-Student-ID header
         ↓
  Proxy към practice-server:3030
         ↓
  Practice server връща данни от:
  practice-server/data/phonebook.json
         ↓
  Response се връща на ученика
```

**Proxy Handler:** `exam-server/modules/ProxyHandler.mjs`
**Practice Server:** `practice-server/server.mjs:99-268`

**Allowed collections:** `exam-config.json:118-129`
```json
"allowedCollections": [
  "collections", "blog", "phonebook",
  "cookbook", "advanced", "bus",
  "forecaster", "messenger", "shift"
]
```

---

## 📊 DATA FLOW DIAGRAM

```
┌─────────────┐
│   STUDENT   │
│   Browser   │
└──────┬──────┘
       │ 1. Login (POST /api/student-login)
       ▼
┌─────────────────┐      ┌────────────────┐
│  EXAM SERVER    │◄────►│ SessionManager │
│  (Express)      │      └────────────────┘
│  Port: 8080     │
└────┬────┬───────┘
     │    │
     │    │ 2. WebSocket (code-update, heartbeat, violations)
     │    ▼
     │  ┌────────────────────┐      ┌──────────────────────┐
     │  │ WebSocketHandler   │◄────►│ ServerSideAntiCheat  │
     │  │ - heartbeat        │      │ - validation         │
     │  │ - code-update      │      │ - scoring            │
     │  │ - violations       │      │ - termination        │
     │  └────────┬───────────┘      └──────────────────────┘
     │           │
     │           │ 3. Broadcast to Teacher
     │           ▼
     │  ┌────────────────────┐
     │  │  TEACHER SOCKET    │
     │  │  - student updates │
     │  │  - code preview    │
     │  │  - violations      │
     │  └────────────────────┘
     │
     │ 4. Proxy to Practice Server
     ▼
┌─────────────────┐
│ PRACTICE SERVER │
│ (JSONStore API) │
│ Port: 3030      │
└─────────────────┘
```

---

## 🔐 SECURITY LAYERS

**1. Client-side Anti-Cheat** (`anticheat.js`)
- ✅ Fullscreen monitoring
- ✅ Window focus tracking
- ✅ Clipboard blocking
- ✅ DevTools detection
- ✅ Context menu blocking
- ✅ Keyboard blocking (Alt+Tab, F11, Ctrl+W, etc)
- ✅ Mouse lock
- 🔄 VM detection (in progress)
- 🔄 Multiple monitor detection (in progress)
- 🔄 Screenshot blocking (in progress)

**2. Server-side Anti-Cheat** (`ServerSideAntiCheat.mjs`)
- ✅ Pattern analysis
- ✅ Heartbeat validation
- ✅ Focus history verification
- ✅ Keystroke pattern analysis
- ✅ Session integrity
- ✅ Automatic termination

**3. Session Security**
- Timeout: 240 минути
- Grace period: 3 минути
- Session recovery: Enabled
- Forced termination при нарушение

**4. Network Security**
- Hotspot isolation (WiFi: ExamNet)
- DNS filtering (блокира ChatGPT, Google, etc)
- MAC address whitelisting (optional)
- Captive portal (auto-redirect към exam server)

---

## 📁 FILE STRUCTURE

```
exam-monitor-v2/
├── exam-server/                    # Main exam server
│   ├── server.mjs                  # Entry point (Port 8080)
│   ├── config/
│   │   └── exam-config.json        # Централна конфигурация
│   ├── modules/
│   │   ├── SessionManager.mjs      # Session management
│   │   ├── WebSocketHandler.mjs    # Real-time communication
│   │   ├── AntiCheatMonitor.mjs    # Client violations
│   │   ├── ServerSideAntiCheat.mjs # Server-side detection
│   │   ├── ProxyHandler.mjs        # Practice server proxy
│   │   └── JSONDataStore.mjs       # Data persistence
│   ├── routes/
│   │   ├── teacher-auth.mjs        # Teacher authentication
│   │   └── project-routes.mjs      # Project file management
│   ├── public/
│   │   ├── student/                # Student interface
│   │   │   ├── index.html          # Main student page
│   │   │   └── js/
│   │   │       ├── main.js         # Entry point
│   │   │       ├── login.js        # Login logic
│   │   │       ├── editor.js       # Monaco editor
│   │   │       ├── anticheat.js    # Client-side anti-cheat
│   │   │       ├── timer.js        # Exam timer
│   │   │       └── socket.js       # WebSocket client
│   │   └── teacher/                # Teacher dashboard
│   │       ├── index.html          # Dashboard UI
│   │       └── login.html          # Teacher login
│   └── data/
│       ├── classes.json            # Student database
│       ├── sessions/               # Active sessions
│       └── student-data/           # Submitted code
│           └── classes/
│               └── 11А/
│                   └── {sessionId}/
│
├── practice-server/                # JSONStore API server
│   ├── server.mjs                  # Entry point (Port 3030)
│   ├── data/                       # JSON collections
│   │   ├── phonebook.json
│   │   ├── blog.json
│   │   └── ...
│   └── exam-files/                 # Files for students
│       ├── src/
│       ├── index.html
│       └── package.json
│
└── package.json                    # Root package
```

---

## 🌐 NETWORK SETUP (Hotspot Configuration)

### **Препоръчан Hardware:**
- **Router:** TP-Link Archer AX73 (~180 лв)
- **Капацитет:** До 30 ученика едновременно
- **UPS:** За резервно захранване (~150 лв)

### **Network Configuration:**

```
┌─────────────────────────────────────┐
│     TP-Link Archer AX73 Router      │
│     SSID: ExamNet                   │
│     Password: [exam-password]       │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
   ┌────▼────┐      ┌───────▼────────┐
   │ Teacher │      │ Students (30)  │
   │ Laptop  │      │ 192.168.1.2-31 │
   │ .1.1    │      │                │
   └─────────┘      └────────────────┘
```

**DNS Filtering (блокира):**
- *.google.com (освен docs.google.com)
- *.openai.com
- *.github.com (GitHub Copilot)
- *.stackoverflow.com (optional)
- Social media sites

**Firewall Rules:**
- Allow: localhost:8080 (exam server)
- Allow: localhost:3030 (practice server)
- Block: All external internet

---

## 🎯 EXAM WORKFLOW SUMMARY

```
1. Teacher Setup
   ├─ Login to dashboard
   ├─ Upload exam files
   ├─ Verify network (ExamNet WiFi)
   └─ Start monitoring

2. Student Join
   ├─ Connect to ExamNet WiFi
   ├─ Navigate to http://192.168.1.1/student
   ├─ Read & accept terms
   ├─ Login (name + class)
   └─ Popup window opens → Parent closes

3. Exam Session
   ├─ Fullscreen activated
   ├─ Anti-cheat enabled
   ├─ Files loaded automatically
   ├─ Real-time auto-save (10s)
   ├─ Heartbeat monitoring (30s)
   └─ Timer warnings (60, 30, 15, 5 min)

4. Teacher Monitoring
   ├─ View live student list
   ├─ Real-time violation alerts
   ├─ Live code preview (click student)
   ├─ Emergency broadcast messages
   └─ Force disconnect if needed

5. Exam Completion
   ├─ Student clicks "Send" OR Time expires
   ├─ Code saved to server
   ├─ Session marked completed
   └─ Informative screen shown

6. Post-Exam
   ├─ Teacher reviews submissions
   ├─ Plagiarism detection runs
   ├─ Export all data (ZIP)
   └─ Delete sessions after 30 days
```

---

## 📝 CONFIGURATION FILES

### **exam-config.json**
```json
{
  "exam": {
    "duration": 30,              // минути
    "durationUnit": "minutes"
  },
  "security": {
    "antiCheat": {
      "enabled": true,
      "strictMode": true,
      "maxSuspicionScore": 100,
      "warningThreshold": 30,
      "criticalThreshold": 70,
      "autoDisconnectScore": 80
    },
    "sessionSecurity": {
      "gracePeriod": 3,          // минути
      "allowSessionRecovery": true
    }
  },
  "monitoring": {
    "heartbeatInterval": 30,     // секунди
    "timeWarnings": [60, 30, 15, 5]  // минути
  }
}
```

---

## 🚨 ANTI-CHEAT VIOLATION TYPES

| Violation Type | Severity | Points | Action |
|---------------|----------|--------|--------|
| Focus Loss (blur) | CRITICAL | 100 | Instant termination |
| Alt+Tab | HIGH | 20 | Warning → Termination |
| ESC (fullscreen exit) | CRITICAL | 100 | Instant termination |
| F11 | HIGH | 15 | Warning |
| DevTools (F12) | CRITICAL | 50 | Termination after 2 attempts |
| Copy from external | MEDIUM | 10 | Warning after 3 attempts |
| Right click | LOW | 5 | Disabled, no penalty |
| Heartbeat missed | MEDIUM | 15 | Warning after 3 misses |
| VM detected | CRITICAL | 100 | Login blocked |
| Multiple monitors | HIGH | 30 | Warning |

**Scoring System:**
- Total < 30: ✅ Safe
- 30 ≤ Total < 70: ⚠️ Warning
- 70 ≤ Total < 80: 🔴 Critical
- Total ≥ 80: ❌ Auto-disconnect

---

## 📊 TEACHER DASHBOARD ENDPOINTS

```
GET  /teacher                        # Dashboard HTML
POST /api/teacher/login              # Teacher authentication
GET  /api/teacher/logout             # Logout
GET  /api/anticheat/stats            # Overall statistics
GET  /api/anticheat/student/:id      # Individual student stats
GET  /api/exam-files                 # List exam files
POST /api/teacher/upload             # Upload exam files
POST /api/teacher/broadcast          # Emergency broadcast message
```

---

## 🔄 REAL-TIME WEBSOCKET EVENTS

### **Student → Server:**
```javascript
'student-join'         // Student connects
'code-update'          // Code changed
'heartbeat'            // Periodic ping with metadata
'suspicious-activity'  // Client detected violation
'exam-complete'        // Student finished
```

### **Server → Student:**
```javascript
'student-id-assigned'  // Session ID provided
'time-warning'         // 30, 15, 5 min warnings
'force-disconnect'     // Termination
'exam-expired'         // Time's up
```

### **Server → Teacher:**
```javascript
'student-connected'    // New student joined
'student-disconnected' // Student left
'student-code-update'  // Student modified code
'student-suspicious'   // Violation detected
'all-students'         // Full student list
```

---

## 🎓 SUPPORTED EXAM TYPES

1. **Vanilla JavaScript**
   - HTML + CSS + JS files
   - Preview in iframe
   - No backend

2. **Express.js Projects**
   - Full Node.js stack
   - Auto npm install
   - Student server spawned on port 4000+
   - Proxy to student server

---

## 📈 FUTURE ENHANCEMENTS

- [ ] Code plagiarism detection (Levenshtein + AST comparison)
- [ ] Exam pause/resume functionality
- [ ] Advanced analytics dashboard
- [ ] PDF exam report generation
- [ ] Multi-language support
- [ ] Mobile app for teacher monitoring

---

**Version:** 2.0.0
**Last Updated:** 2025-10-21
**Author:** Exam Monitor Team
