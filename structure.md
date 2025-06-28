# Exam Monitor v2 - Lightweight Refactoring Guide
exam-server/public/student/
├── templates/
│   ├── layouts/main.html          # Base layout
│   ├── components/
│   │   ├── login-form.html        # Login component  
│   │   ├── exam-workspace.html    # Editor workspace
│   │   ├── console-panel.html     # Console output
│   │   └── violation-screen.html  # Violation overlay
│   └── pages/student.html         # Main page
│
├── js/core/
│   ├── TemplateEngine.js          # Custom templating
│   ├── ComponentLoader.js         # Component system
│   └── EventBinder.js             # Event management
## 🎯 **Target Architecture - Local Development Optimized**

```
exam-monitor-v2/
├── package.json                          # Keep existing dependencies
├── .gitignore                            # Keep existing
├── README.md                             # Updated documentation
│
├── exam-server/                          # Backend (minimal changes)
│   ├── server.mjs                        # Keep existing (300+ lines)
│   ├── modules/                          # Keep existing backend modules
│   │   ├── SessionManager.mjs            # ✅ Keep as-is
│   │   ├── JSONDataStore.mjs             # ✅ Keep as-is
│   │   ├── StudentValidator.mjs          # ✅ Keep as-is
│   │   ├── WebSocketHandler.mjs          # ✅ Keep as-is
│   │   ├── ProxyHandler.mjs              # ✅ Keep as-is
│   │   └── AntiCheatMonitor.mjs          # ✅ Keep as-is
│   ├── data/                             # Keep existing
│   ├── config/                           # Keep existing
│   └── tests/                            # Keep existing backend tests
│
├── exam-server/public/                   # REFACTOR THIS PART
│   ├── shared/                           # NEW - Shared utilities
│   │   ├── js/
│   │   │   ├── utils.js                  # DOM helpers, formatters (< 100 lines)
│   │   │   ├── events.js                 # Event utilities (< 80 lines)
│   │   │   ├── constants.js              # App constants (< 50 lines)
│   │   │   └── networking.js             # WebSocket helpers (< 100 lines)
│   │   └── css/
│   │       ├── common.css                # Shared styles variables
│   │       └── components.css            # Common component styles
│   │
│   ├── student/                          # MAJOR REFACTOR
│   │   ├── index.html                    # 🔄 Clean structure (< 200 lines)
│   │   ├── js/
│   │   │   ├── main.js                   # Entry point (< 50 lines)
│   │   │   ├── components/               # UI Components
│   │   │   │   ├── LoginForm.js          # Login component (< 100 lines)
│   │   │   │   ├── CodeEditor.js         # Editor component (< 120 lines)
│   │   │   │   ├── ConsoleOutput.js      # Console component (< 80 lines)
│   │   │   │   ├── ExamTimer.js          # Timer component (< 100 lines)
│   │   │   │   └── ExamWorkspace.js      # Main workspace (< 150 lines)
│   │   │   ├── anticheat/                # Anti-cheat modules
│   │   │   │   ├── ViolationTracker.js   # ✅ Already created (< 200 lines)
│   │   │   │   ├── DetectionEngine.js    # ✅ Already created (< 200 lines)
│   │   │   │   ├── UIManager.js          # Clean UI only (< 120 lines)
│   │   │   │   ├── ReportingService.js   # Server comm (< 100 lines)
│   │   │   │   └── AntiCheatCore.js      # Coordinator (< 80 lines)
│   │   │   └── services/                 # Business logic
│   │   │       ├── examService.js        # Exam state management (< 100 lines)
│   │   │       ├── sessionService.js     # Session handling (< 80 lines)
│   │   │       └── websocketService.js   # WebSocket wrapper (< 120 lines)
│   │   └── css/
│   │       ├── student.css               # Main student styles
│   │       ├── components.css            # Component-specific styles
│   │       └── anticheat.css             # Anti-cheat overlays
│   │
│   └── teacher/                          # MINOR REFACTOR
│       ├── index.html                    # ✅ Keep mostly as-is (works well)
│       ├── js/
│       │   ├── main.js                   # ✅ Keep as-is
│       │   ├── components/               # NEW - Extract reusable parts
│       │   │   ├── StudentCard.js        # Student monitor card (< 100 lines)
│       │   │   ├── StatsPanel.js         # Statistics panel (< 80 lines)
│       │   │   └── Dashboard.js          # Main dashboard logic (< 150 lines)
│       │   └── services/
│       │       └── teacherService.js     # Teacher-specific logic (< 100 lines)
│       └── css/
│           ├── teacher.css               # ✅ Keep existing
│           └── monitoring.css            # ✅ Keep existing
│
└── practice-server/                      # ✅ NO CHANGES
    ├── server.mjs                        # Keep as-is
    ├── data/                             # Keep as-is
    └── student-data-manager.mjs          # Keep as-is
```

## 🔧 **Installation & Setup**

### **1. Current Dependencies (Keep):**
```json
{
  "dependencies": {
    "express": "^4.19.2",
    "express-session": "^1.18.0", 
    "http-proxy-middleware": "^3.0.0",
    "socket.io": "^4.7.5"
  },
  "devDependencies": {
    "chai": "^4.4.1",
    "mocha": "^10.2.0",
    "concurrently": "^8.2.2"
  }
}
```

### **2. No New Dependencies Needed:**
- ❌ No Vite/Webpack
- ❌ No TypeScript compiler
- ❌ No CSS preprocessors
- ✅ Pure ES6 modules served directly

### **3. Development Commands (Keep Existing):**
```bash
# Install dependencies (one time)
npm install

# Start development
npm run dev                    # Both servers
npm start                      # Exam server only
npm run start-practice         # Practice server only

# Testing
npm test                       # Backend tests
```

## 🧪 **Testing Strategy**

### **1. Browser Testing (Primary):**
```bash
# Start servers
npm run dev

# Open browsers:
http://localhost:8080/student    # Student interface
http://localhost:8080/teacher    # Teacher dashboard

# Test in console:
# Check for ES6 module loading
# Verify component imports
# Test functionality manually
```

### **2. Module Testing (In Browser Console):**
```javascript
// Test ViolationTracker
import('./js/anticheat/ViolationTracker.js').then(module => {
    const tracker = new module.ViolationTracker();
    console.log('✅ ViolationTracker loaded');
    
    // Quick test
    const result = tracker.addViolation('windowsKey');
    console.log('Test result:', result);
});

// Test DetectionEngine  
import('./js/anticheat/DetectionEngine.js').then(module => {
    console.log('✅ DetectionEngine loaded');
});
```

### **3. Backend Testing (Keep Existing):**
```bash
# Backend tests work as-is
npm test
```

## 📁 **File Paths & Structure**

### **1. Import Paths (ES6 Modules):**
```javascript
// From student/js/main.js
import { LoginForm } from './components/LoginForm.js';
import { AntiCheatCore } from './anticheat/AntiCheatCore.js';
import { utils } from '../shared/js/utils.js';

// From components
import { ViolationTracker } from '../anticheat/ViolationTracker.js';
import { websocketService } from '../services/websocketService.js';
```

### **2. CSS Imports:**
```html
<!-- In student/index.html -->
<link rel="stylesheet" href="../shared/css/common.css">
<link rel="stylesheet" href="css/student.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/anti-cheat.css">
```

### **3. File Organization Rules:**
- **Components**: UI + minimal logic (< 120 lines)
- **Services**: Pure business logic (< 100 lines)  
- **Utils**: Pure functions, no state (< 80 lines)
- **AntiCheat**: Specialized modules (< 200 lines)

## 🚀 **Refactoring Steps**

### **Phase 1: Setup Structure (Week 1)**
```bash
# 1. Create new directories
mkdir -p exam-server/public/shared/js
mkdir -p exam-server/public/shared/css
mkdir -p exam-server/public/student/js/components
mkdir -p exam-server/public/student/js/services
mkdir -p exam-server/public/teacher/js/components

# 2. Create utility files
touch exam-server/public/shared/js/utils.js
touch exam-server/public/shared/js/events.js
touch exam-server/public/shared/js/constants.js
```

### **Phase 2: Extract AntiCheat (Week 2)**
```bash
# 1. We already have:
# - ViolationTracker.js ✅
# - DetectionEngine.js ✅  
# - UIManager.js (needs cleanup) 🔄

# 2. Create remaining:
touch exam-server/public/student/js/anticheat/ReportingService.js
touch exam-server/public/student/js/anticheat/AntiCheatCore.js

# 3. Clean up UIManager.js (remove inline HTML/CSS)
```

### **Phase 3: Component Extraction (Week 3)**
```bash
# Extract from massive index.html:
touch exam-server/public/student/js/components/LoginForm.js
touch exam-server/public/student/js/components/CodeEditor.js
touch exam-server/public/student/js/components/ExamTimer.js
touch exam-server/public/student/js/components/ExamWorkspace.js
```

### **Phase 4: Services Layer (Week 4)**
```bash
# Create service abstractions:
touch exam-server/public/student/js/services/examService.js
touch exam-server/public/student/js/services/sessionService.js
touch exam-server/public/student/js/services/websocketService.js
```

## 📏 **Quality Standards**

### **File Size Limits:**
- **Components**: < 120 lines (UI logic only)
- **Services**: < 100 lines (business logic only)
- **Utils**: < 80 lines (pure functions)
- **AntiCheat modules**: < 200 lines (specialized logic)

### **Code Standards:**
- ✅ ES6 modules (`import`/`export`)
- ✅ Clear function names
- ✅ Single responsibility per file
- ✅ No inline HTML/CSS in JS
- ✅ Comments in English, responses in Bulgarian

### **Testing Standards:**
- ✅ Manual browser testing for each component
- ✅ Console testing for module loading
- ✅ Integration testing via user workflow
- ✅ Backend tests remain unchanged

## 🎯 **Success Criteria**

### **Before Refactoring:**
- ❌ student/index.html: 2000+ lines
- ❌ AntiCheat.js: 1500+ lines  
- ❌ Mixed responsibilities
- ❌ Hard to maintain

### **After Refactoring:**
- ✅ student/index.html: < 200 lines (structure only)
- ✅ Largest component: < 200 lines
- ✅ Clear separation of concerns
- ✅ Easy to test and modify
- ✅ Same functionality, better code

## 🔄 **Migration Workflow**

### **Daily Process:**
1. **Pick one module** to refactor
2. **Create new file** in proper location
3. **Extract functionality** keeping same API
4. **Test in browser** with `npm run dev`
5. **Update imports** in dependent files
6. **Remove old code** when working

### **Testing Each Step:**
```bash
# After each module creation:
npm run dev

# Test in browser console:
# 1. Check for loading errors
# 2. Test component functionality  
# 3. Verify no regressions
# 4. Check WebSocket connectivity
```