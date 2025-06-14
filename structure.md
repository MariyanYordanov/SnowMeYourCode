# Exam Monitor v2 - Complete Project Structure

```
exam-monitor-v2/
├── package.json                          # Dependencies & scripts
├── .gitignore                            # Git ignore rules
├── README.md                             # Documentation
│
├── exam-server/                          # Main exam server
│   ├── server.mjs                        # Clean entry point (< 50 lines)
│   │
│   ├── modules/                          # Core modules
│   │   ├── SessionManager.mjs            # ✅ Session handling, recovery
│   │   ├── JSONDataStore.mjs             # ✅ File operations
│   │   ├── StudentValidator.mjs          # ✅ Student/class validation
│   │   ├── WebSocketHandler.mjs          # 🔄 Real-time communication
│   │   ├── ProxyHandler.mjs              # 🔄 HTTP proxy to practice server
│   │   ├── AntiCheatMonitor.mjs          # 🔄 Suspicious activity detection
│   │   └── FileManager.mjs               # 🔄 Student file management
│   │
│   ├── config/                           # Configuration
│   │   ├── exam-config.json              # 🔄 Exam settings (duration, rules)
│   │   └── network-config.json           # 🔄 Network settings for ExamNet
│   │
│   ├── data/                             # Data storage
│   │   ├── classes.json                  # ✅ Valid classes & students
│   │   ├── sessions/                     # Session storage
│   │   │   └── 2025-06-14/              # Daily session files
│   │   │       ├── session-{id}.json    # Individual session files
│   │   │       └── daily-stats.json     # Daily statistics
│   │   └── student-data/                 # Student work storage
│   │       └── classes/                  # Organized by class
│   │           ├── 11А/
│   │           │   ├── Иван_Иванов/
│   │           │   │   ├── session-info.json
│   │           │   │   ├── code/
│   │           │   │   │   ├── main.js
│   │           │   │   │   └── backups/
│   │           │   │   ├── data/         # Practice server data copy
│   │           │   │   │   ├── collections.json
│   │           │   │   │   ├── blog.json
│   │           │   │   │   └── ...
│   │           │   │   └── activities/
│   │           │   │       └── suspicious.log
│   │           │   └── Петър_Петров/
│   │           └── 11Б/
│   │               └── Георги_Стоянов/
│   │
│   ├── public/                           # Frontend files
│   │   ├── shared/                       # Shared resources
│   │   │   ├── js/
│   │   │   │   ├── constants.js          # 🔄 App constants
│   │   │   │   ├── utils.js              # 🔄 Common utilities
│   │   │   │   └── NetworkManager.js     # 🔄 WebSocket/HTTP wrapper
│   │   │   └── css/
│   │   │       ├── common.css            # 🔄 Shared styles
│   │   │       └── components.css        # 🔄 UI components
│   │   │
│   │   ├── student/                      # Student workspace
│   │   │   ├── index.html                # 🔄 Clean HTML structure
│   │   │   ├── js/
│   │   │   │   ├── main.js               # 🔄 Entry point (< 30 lines)
│   │   │   │   ├── LoginHandler.js       # 🔄 Login/validation logic
│   │   │   │   ├── WorkspaceUI.js        # 🔄 Editor, preview, UI
│   │   │   │   ├── CodeEditor.js         # 🔄 Code editing functionality
│   │   │   │   ├── PreviewManager.js     # 🔄 Code preview & console
│   │   │   │   ├── AntiCheat.js          # 🔄 Client-side anti-cheat
│   │   │   │   ├── SessionRecovery.js    # 🔄 Disconnection handling
│   │   │   │   └── ExamTimer.js          # 🔄 Timer & exam flow
│   │   │   └── css/
│   │   │       ├── student.css           # 🔄 Student workspace styles
│   │   │       ├── editor.css            # 🔄 Code editor styles
│   │   │       └── anti-cheat.css        # 🔄 Warning overlays
│   │   │
│   │   └── teacher/                      # Teacher dashboard
│   │       ├── index.html                # 🔄 Dashboard HTML
│   │       ├── js/
│   │       │   ├── main.js               # 🔄 Dashboard entry point
│   │       │   ├── StudentMonitor.js     # 🔄 Real-time student monitoring
│   │       │   ├── Dashboard.js          # 🔄 Dashboard UI & stats
│   │       │   ├── SessionManager.js     # 🔄 Session control panel
│   │       │   └── ExportManager.js      # 🔄 Export results/logs
│   │       └── css/
│   │           ├── teacher.css           # 🔄 Teacher dashboard styles
│   │           └── monitoring.css        # 🔄 Student monitoring styles
│   │
│   ├── tests/                           # Test suite
│   │   ├── SessionManager.test.mjs       # ✅ Session management tests
│   │   ├── StudentValidator.test.mjs     # 🔄 Validation tests
│   │   ├── JSONDataStore.test.mjs        # 🔄 Data storage tests
│   │   ├── WebSocketHandler.test.mjs     # 🔄 WebSocket tests
│   │   └── integration/                  # 🔄 Integration tests
│   │       ├── full-exam-flow.test.mjs   # 🔄 Complete exam simulation
│   │       └── recovery-scenarios.test.mjs # 🔄 Recovery testing
│   │
│   ├── scripts/                         # Utility scripts
│   │   ├── validate-classes.mjs          # 🔄 Validate classes.json
│   │   ├── create-sample-data.mjs        # 🔄 Generate test data
│   │   ├── cleanup-old-sessions.mjs      # 🔄 Clean old session data
│   │   └── export-results.mjs            # 🔄 Export exam results
│   │
│   └── utils/                           # Server utilities
│       ├── security.mjs                  # 🔄 ID generation, validation
│       ├── logger.mjs                    # 🔄 Centralized logging
│       └── backup.mjs                    # 🔄 Backup functionality
│
├── practice-server/                      # Practice data server (unchanged)
│   ├── server.mjs                        # Existing practice server
│   ├── data/                            # Practice data files
│   │   ├── collections.json
│   │   ├── blog.json
│   │   ├── phonebook.json
│   │   └── ...
│   └── student-data-manager.mjs          # Existing data manager
│
└── docs/                                # Documentation
    ├── API.md                           # 🔄 API documentation
    ├── SETUP.md                         # 🔄 Setup instructions
    ├── ARCHITECTURE.md                  # 🔄 Architecture overview
    └── TROUBLESHOOTING.md               # 🔄 Common issues & fixes
```

## Legend:
- ✅ **Completed** - Ready files from artifacts above
- 🔄 **To Create** - Need to implement next
- 📁 **Auto-generated** - Created by application runtime

## Priority Order for Implementation:

### Phase 1: Core Backend (Current)
1. ✅ SessionManager.mjs
2. ✅ JSONDataStore.mjs  
3. ✅ StudentValidator.mjs
4. 🔄 WebSocketHandler.mjs
5. 🔄 ProxyHandler.mjs

### Phase 2: Frontend Refactor
6. 🔄 Student workspace modules
7. 🔄 Teacher dashboard modules  
8. 🔄 Anti-cheat system

### Phase 3: Enhanced Features
9. 🔄 Export/import functionality
10. 🔄 Advanced monitoring
11. 🔄 Backup systems

## File Sizes (Target):
- **server.mjs**: < 50 lines
- **Each module**: < 300 lines  
- **Client modules**: < 200 lines each
- **Test files**: Comprehensive coverage

## Key Directories:
- **`/data/sessions/`** - Daily session storage
- **`/data/student-data/classes/`** - Student work organized by class
- **`/public/shared/`** - Reusable frontend components
- **`/tests/`** - Complete test suite with Mocha/Chai