/* ================================
   STUDENT EXAM SYSTEM - COMPLETE LOGIC
   ================================ */

// ================================
// GLOBAL STATE MANAGEMENT
// ================================
window.ExamApp = {
    // Core state
    socket: null,
    editor: null,
    sessionId: null,
    studentName: null,
    studentClass: null,

    // Exam timing
    examStartTime: null,
    examDuration: 3 * 60 * 60 * 1000, // 3 hours
    timerInterval: null,

    // Security state
    isFullscreen: false,
    violationCount: 0,
    antiCheatActive: false,

    // UI state
    isLoggedIn: false,
    lastSaveTime: null,
    isConnected: false
};

// ================================
// APPLICATION INITIALIZATION
// ================================
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Initializing Student Exam System...');

    // Initialize all components
    initializeApp();
});

function initializeApp() {
    try {
        // Setup core components
        setupLoginForm();
        setupSocket();
        setupAntiCheat();
        setupFullscreenMonitoring();

        // Setup UI event handlers
        setupExamControls();

        console.log('✅ Student Exam System initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        showError('Грешка при зареждане на системата');
    }
}

// ================================
// LOGIN SYSTEM
// ================================
function setupLoginForm() {
    const loginBtn = document.getElementById('login-btn');
    const studentName = document.getElementById('student-name');
    const studentClass = document.getElementById('student-class');

    // Login button handler
    loginBtn.addEventListener('click', handleLogin);

    // Enter key support
    [studentName, studentClass].forEach(input => {
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    });

    console.log('✅ Login form initialized');
}

function handleLogin() {
    const name = document.getElementById('student-name').value.trim();
    const studentClass = document.getElementById('student-class').value;

    // Validation
    if (!name || !studentClass) {
        showLoginStatus('Моля въведете име и изберете клас', 'error');
        return;
    }

    if (name.length < 3) {
        showLoginStatus('Името трябва да е поне 3 символа', 'error');
        return;
    }

    // Show loading
    showLoginStatus('Влизане в изпита...', 'info');

    // Store student info
    window.ExamApp.studentName = name;
    window.ExamApp.studentClass = studentClass;

    // Send login request
    if (window.ExamApp.socket && window.ExamApp.socket.connected) {
        window.ExamApp.socket.emit('student-join', {
            studentName: name,
            studentClass: studentClass
        });
    } else {
        showLoginStatus('Няма връзка със сървъра', 'error');
    }
}

function showLoginStatus(message, type) {
    const statusEl = document.getElementById('login-status');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;

    console.log(`Login status: ${type} - ${message}`);
}

// ================================
// SOCKET.IO COMMUNICATION - FIXED VERSION
// ================================
function setupSocket() {
    try {
        console.log('🔌 Attempting to setup Socket.io...');
        console.log('Document ready state:', document.readyState);
        console.log('Available objects:', {
            'typeof io': typeof io,
            'window.io': typeof window.io,
            'globalThis.io': typeof globalThis.io
        });

        // Wait for document to be fully loaded
        if (document.readyState !== 'complete') {
            console.log('⏳ Waiting for document to load completely...');
            window.addEventListener('load', setupSocket, { once: true });
            return;
        }

        // Multiple ways to access Socket.io
        let socketIO = null;

        // Try different global scopes
        if (typeof io !== 'undefined') {
            socketIO = io;
            console.log('✅ Found io in global scope');
        } else if (typeof window.io !== 'undefined') {
            socketIO = window.io;
            console.log('✅ Found io in window scope');
        } else if (typeof globalThis.io !== 'undefined') {
            socketIO = globalThis.io;
            console.log('✅ Found io in globalThis scope');
        } else if (typeof self.io !== 'undefined') {
            socketIO = self.io;
            console.log('✅ Found io in self scope');
        }

        // If still not found, check if script is loaded but not executed yet
        if (!socketIO) {
            const socketScript = document.querySelector('script[src*="socket.io"]');
            if (socketScript) {
                console.log('📜 Socket.io script found, but not ready. Retrying in 200ms...');
                setTimeout(setupSocket, 200);
                return;
            } else {
                console.error('❌ No Socket.io script found in DOM');
                // Try to load manually as fallback
                loadSocketIOManually();
                return;
            }
        }

        // Validate that socketIO is actually a function
        if (typeof socketIO !== 'function') {
            console.error('❌ Socket.io found but not a function:', typeof socketIO);
            setTimeout(setupSocket, 500);
            return;
        }

        console.log('🚀 Initializing Socket.io connection...');

        const socket = socketIO({
            transports: ['websocket', 'polling'],
            timeout: 10000,
            forceNew: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        window.ExamApp.socket = socket;

        // Connection events
        socket.on('connect', handleSocketConnect);
        socket.on('disconnect', handleSocketDisconnect);
        socket.on('connect_error', handleSocketError);

        // Login responses
        socket.on('student-id-assigned', handleLoginSuccess);
        socket.on('session-restored', handleSessionRestore);
        socket.on('login-error', handleLoginError);

        // Exam events
        socket.on('time-warning', handleTimeWarning);
        socket.on('exam-expired', handleExamExpired);
        socket.on('force-disconnect', handleForceDisconnect);

        // Anti-cheat events
        socket.on('anti-cheat-warning', handleAntiCheatWarning);

        console.log('✅ Socket.io initialized successfully');

        // Test connection immediately
        socket.emit('test-connection', { timestamp: Date.now() });

    } catch (error) {
        console.error('❌ Socket setup failed:', error);
        console.log('🔄 Retrying in 1 second...');
        setTimeout(setupSocket, 1000);
    }
}

// Manual Socket.io loading as fallback
function loadSocketIOManually() {
    console.log('🔧 Loading Socket.io manually...');

    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.async = true;

    script.onload = function () {
        console.log('📦 Socket.io script loaded manually');
        // Wait a bit for the script to execute
        setTimeout(setupSocket, 100);
    };

    script.onerror = function (error) {
        console.error('❌ Failed to load Socket.io manually:', error);
        // Try CDN fallback
        loadSocketIOFromCDN();
    };

    document.head.appendChild(script);
}

// CDN fallback
function loadSocketIOFromCDN() {
    console.log('🌐 Trying Socket.io from CDN...');

    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    script.async = true;

    script.onload = function () {
        console.log('📦 Socket.io loaded from CDN');
        setTimeout(setupSocket, 100);
    };

    script.onerror = function (error) {
        console.error('❌ Failed to load Socket.io from CDN:', error);
        showError('Неуспешно зареждане на Socket.io. Моля опитайте отново.');
    };

    document.head.appendChild(script);
}

// ================================
// IMPROVED INITIALIZATION
// ================================
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 DOM Content Loaded - Initializing Student Exam System...');

    // Wait for all scripts to load
    if (document.readyState === 'loading') {
        console.log('⏳ Document still loading, waiting...');
        document.addEventListener('readystatechange', function () {
            if (document.readyState === 'interactive' || document.readyState === 'complete') {
                console.log('📄 Document ready state:', document.readyState);
                initializeAppSafely();
            }
        });
    } else {
        initializeAppSafely();
    }
});

// Safe initialization with proper timing
function initializeAppSafely() {
    console.log('🎯 Starting safe initialization...');

    try {
        // Setup core components first
        setupLoginForm();
        setupAntiCheat();
        setupFullscreenMonitoring();
        setupExamControls();

        console.log('✅ Core components initialized');

        // Setup Socket.io with delay to ensure scripts are ready
        setTimeout(() => {
            setupSocket();
        }, 100);

        console.log('✅ Student Exam System initialization started');

    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        showError('Грешка при зареждане на системата');
    }
}

function handleSocketConnect() {
    console.log('✅ Connected to server');
    window.ExamApp.isConnected = true;
    updateConnectionStatus(true);
}

function handleSocketDisconnect(reason) {
    console.warn('❌ Disconnected from server:', reason);
    window.ExamApp.isConnected = false;
    updateConnectionStatus(false);

    // Show reconnection message if in exam
    if (window.ExamApp.isLoggedIn) {
        showError('Връзката със сървъра е прекъсната. Опитваме да се свържем отново...');
    }
}

function handleSocketError(error) {
    console.error('❌ Socket connection error:', error);
    updateConnectionStatus(false);
}

function handleLoginSuccess(data) {
    console.log('✅ Login successful:', data);

    window.ExamApp.sessionId = data.sessionId;
    window.ExamApp.examStartTime = Date.now();

    showLoginStatus('Влизане успешно! Стартиране на изпита...', 'success');

    setTimeout(() => {
        startExam(data);
    }, 1500);
}

function handleSessionRestore(data) {
    console.log('🔄 Session restored:', data);

    window.ExamApp.sessionId = data.sessionId;

    showLoginStatus(data.message, 'success');

    setTimeout(() => {
        startExam(data);
    }, 1500);
}

function handleLoginError(data) {
    console.error('❌ Login error:', data);
    showLoginStatus(data.message, 'error');
}

// ================================
// EXAM STARTUP
// ================================
function startExam(data) {
    try {
        console.log('🎯 Starting exam...');

        // Hide login, show exam
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('exam-container').style.display = 'flex';

        // Update student info display
        updateStudentDisplay();

        // Start timer
        startExamTimer(data.timeLeft || window.ExamApp.examDuration);

        // Initialize Monaco Editor
        initializeMonacoEditor(data.lastCode || '');

        // Enter fullscreen
        enterFullscreenMode();

        // Activate anti-cheat
        activateAntiCheat();

        // Mark as logged in
        window.ExamApp.isLoggedIn = true;

        console.log('✅ Exam started successfully');
    } catch (error) {
        console.error('❌ Failed to start exam:', error);
        showError('Грешка при стартиране на изпита');
    }
}

function updateStudentDisplay() {
    document.getElementById('student-name-display').textContent = window.ExamApp.studentName;
    document.getElementById('student-class-display').textContent = window.ExamApp.studentClass;
    document.getElementById('session-id-display').textContent = window.ExamApp.sessionId;
}

// ================================
// MONACO EDITOR INTEGRATION
// ================================
function initializeMonacoEditor(initialCode = '') {
    console.log('🎨 Initializing Monaco Editor...');

    // Configure Monaco paths
    require.config({
        paths: {
            'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs'
        }
    });

    require(['vs/editor/editor.main'], function () {
        try {
            const defaultCode = initialCode || `// Напишете вашият JavaScript код тук
console.log("Здравей, свят!");

// Пример за функция
function решиЗадача() {
    // Вашето решение тук
    return "Готово!";
}

// Тествайте кода си
console.log(решиЗадача());`;

            const editor = monaco.editor.create(document.getElementById('monaco-editor'), {
                value: defaultCode,
                language: 'javascript',
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                wordWrap: 'on',
                bracketPairColorization: { enabled: true },
                suggest: {
                    enableExtendedKeywords: true,
                    showWords: true,
                    showSnippets: true
                },
                quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false
                }
            });

            window.ExamApp.editor = editor;

            // Auto-save on change (debounced)
            let saveTimeout;
            editor.onDidChangeModelContent(() => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    saveCode();
                }, 2000); // Save after 2 seconds of inactivity
            });

            console.log('✅ Monaco Editor initialized successfully');
        } catch (error) {
            console.error('❌ Monaco Editor initialization failed:', error);
            showError('Грешка при зареждане на редактора');
        }
    });
}

// ================================
// EXAM CONTROLS
// ================================
function setupExamControls() {
    // Run code button
    document.getElementById('run-code-btn').addEventListener('click', runCode);

    // Format code button
    document.getElementById('format-code-btn').addEventListener('click', formatCode);

    // Save code button
    document.getElementById('save-code-btn').addEventListener('click', saveCode);

    // Clear output button
    document.getElementById('clear-output-btn').addEventListener('click', clearOutput);

    // Theme selector
    document.getElementById('theme-selector').addEventListener('change', changeTheme);

    // Finish exam button
    document.getElementById('finish-exam-btn').addEventListener('click', finishExam);

    // Violation screen buttons
    document.getElementById('continue-exam-btn').addEventListener('click', continueAfterViolation);
    document.getElementById('exit-violation-btn').addEventListener('click', exitAfterViolation);

    console.log('✅ Exam controls initialized');
}

function runCode() {
    if (!window.ExamApp.editor) return;

    console.log('▶️ Running code...');

    const code = window.ExamApp.editor.getValue();
    const outputEl = document.getElementById('code-output');
    const errorEl = document.getElementById('error-panel');

    // Clear previous output
    clearOutput();
    hideError();

    try {
        // Capture console.log output
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const output = [];

        // Override console methods
        console.log = function (...args) {
            output.push({
                type: 'log',
                content: args.map(arg => formatOutput(arg)).join(' ')
            });
            originalLog.apply(console, arguments);
        };

        console.error = function (...args) {
            output.push({
                type: 'error',
                content: args.map(arg => formatOutput(arg)).join(' ')
            });
            originalError.apply(console, arguments);
        };

        console.warn = function (...args) {
            output.push({
                type: 'warn',
                content: args.map(arg => formatOutput(arg)).join(' ')
            });
            originalWarn.apply(console, arguments);
        };

        // Execute code in isolated scope
        const func = new Function(code);
        func();

        // Restore console methods
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;

        // Display output
        displayOutput(output);

    } catch (error) {
        // Restore console methods
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;

        showError(`Грешка в кода: ${error.message}`);
        console.error('Code execution error:', error);
    }
}

function formatOutput(arg) {
    if (typeof arg === 'object' && arg !== null) {
        try {
            return JSON.stringify(arg, null, 2);
        } catch (e) {
            return '[Object object]';
        }
    }
    return String(arg);
}

function displayOutput(output) {
    const outputEl = document.getElementById('code-output');

    if (output.length === 0) {
        outputEl.innerHTML = '<div class="output-placeholder">Кодът е изпълнен успешно (няма output)</div>';
        return;
    }

    const outputHtml = output.map(item => {
        const className = `output-line output-${item.type}`;
        return `<div class="${className}">${escapeHtml(item.content)}</div>`;
    }).join('');

    outputEl.innerHTML = outputHtml;
}

function formatCode() {
    if (window.ExamApp.editor) {
        window.ExamApp.editor.getAction('editor.action.formatDocument').run();
        console.log('🎨 Code formatted');
    }
}

function saveCode() {
    if (!window.ExamApp.editor || !window.ExamApp.socket || !window.ExamApp.socket.connected) {
        return;
    }

    const code = window.ExamApp.editor.getValue();

    window.ExamApp.socket.emit('code-update', {
        code: code,
        filename: 'main.js',
        timestamp: Date.now()
    });

    updateLastSaved();
    console.log('💾 Code saved');
}

function clearOutput() {
    document.getElementById('code-output').innerHTML =
        '<div class="output-placeholder">Резултатът от вашия код ще се покаже тук...</div>';
    hideError();
}

function changeTheme(e) {
    const theme = e.target.value;
    if (window.ExamApp.editor) {
        monaco.editor.setTheme(theme);
        console.log(`🎨 Theme changed to: ${theme}`);
    }
}

// ================================
// EXAM TIMER SYSTEM
// ================================
function startExamTimer(duration) {
    const endTime = Date.now() + duration;

    window.ExamApp.timerInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = Math.max(0, endTime - now);

        updateTimerDisplay(timeLeft);

        // Check for time warnings
        checkTimeWarnings(timeLeft);

        // Auto-expire if time is up
        if (timeLeft <= 0) {
            handleExamExpired();
        }
    }, 1000);

    console.log('⏱️ Exam timer started');
}

function updateTimerDisplay(timeLeft) {
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    document.getElementById('timer-display').textContent = display;

    // Change color based on time left
    const timerEl = document.querySelector('.exam-timer');
    if (timeLeft < 5 * 60 * 1000) { // Last 5 minutes
        timerEl.style.color = '#ff4757';
    } else if (timeLeft < 15 * 60 * 1000) { // Last 15 minutes
        timerEl.style.color = '#ffa502';
    }
}

function checkTimeWarnings(timeLeft) {
    const minutes = Math.floor(timeLeft / (1000 * 60));
    const warnings = [60, 30, 15, 5, 1];

    warnings.forEach(warningMinutes => {
        if (minutes === warningMinutes) {
            showTimeWarning(warningMinutes);
        }
    });
}

function showTimeWarning(minutes) {
    const message = `⚠️ Внимание! Остават ${minutes} минути до края на изпита!`;
    showNotification(message, 'warning');
    console.log(`⚠️ Time warning: ${minutes} minutes left`);
}

function handleTimeWarning(data) {
    showTimeWarning(data.minutesLeft);
}

function handleExamExpired() {
    console.log('⏰ Exam time expired');

    clearInterval(window.ExamApp.timerInterval);

    // Save final code
    saveCode();

    // Show expiration message
    showViolationScreen('Времето за изпита изтече!');

    // Auto-close after 10 seconds
    setTimeout(() => {
        window.close();
    }, 10000);
}

// ================================
// FULLSCREEN MANAGEMENT
// ================================
function setupFullscreenMonitoring() {
    // Listen for fullscreen changes
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
        .forEach(eventName => {
            document.addEventListener(eventName, handleFullscreenChange);
        });

    console.log('🔒 Fullscreen monitoring initialized');
}

function enterFullscreenMode() {
    console.log('🔒 Entering fullscreen mode...');

    const element = document.documentElement;

    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

function handleFullscreenChange() {
    const isFullscreen = !!(document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement);

    window.ExamApp.isFullscreen = isFullscreen;

    if (isFullscreen) {
        console.log('✅ Entered fullscreen mode');
        updateFullscreenStatus('🔒 Fullscreen активен');
    } else {
        console.log('⚠️ Exited fullscreen mode');
        updateFullscreenStatus('⚠️ Fullscreen неактивен');

        // Trigger violation if exam is active
        if (window.ExamApp.isLoggedIn && window.ExamApp.antiCheatActive) {
            handleFullscreenViolation();
        }
    }
}

function handleFullscreenViolation() {
    console.log('🚫 Fullscreen violation detected');

    window.ExamApp.violationCount++;

    // Report to server
    reportSuspiciousActivity('fullscreen_exit', {
        count: window.ExamApp.violationCount,
        timestamp: Date.now()
    });

    // Show violation screen
    showViolationScreen('Излизане от fullscreen режим е забранено!');
}

function updateFullscreenStatus(text) {
    document.getElementById('fullscreen-status').textContent = text;
}

// ================================
// ANTI-CHEAT SYSTEM
// ================================
function setupAntiCheat() {
    console.log('🛡️ Setting up anti-cheat system...');
    // Will be activated when exam starts
}

function activateAntiCheat() {
    console.log('🛡️ Activating anti-cheat protection...');

    window.ExamApp.antiCheatActive = true;

    // Setup keyboard monitoring
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    // Setup focus monitoring
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Setup visibility monitoring
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Setup context menu blocking
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });

    // Setup copy/paste monitoring
    document.addEventListener('copy', handleCopyAttempt, { capture: true });
    document.addEventListener('paste', handlePasteAttempt, { capture: true });
    document.addEventListener('cut', handleCutAttempt, { capture: true });

    console.log('✅ Anti-cheat protection activated');
}

function handleKeyDown(e) {
    if (!window.ExamApp.antiCheatActive) return;

    // Block dangerous key combinations
    const blocked = [
        // Windows key
        e.key === 'Meta' || e.code === 'MetaLeft' || e.code === 'MetaRight',

        // Alt+Tab
        e.altKey && e.code === 'Tab',

        // Ctrl+Shift+I (Dev Tools)
        e.ctrlKey && e.shiftKey && e.code === 'KeyI',

        // F12 (Dev Tools)
        e.code === 'F12',

        // Ctrl+U (View Source)
        e.ctrlKey && e.code === 'KeyU',

        // Ctrl+Shift+C (Inspect Element)
        e.ctrlKey && e.shiftKey && e.code === 'KeyC',

        // Ctrl+W (Close Tab)
        e.ctrlKey && e.code === 'KeyW',

        // Ctrl+R (Refresh)
        e.ctrlKey && e.code === 'KeyR',

        // F5 (Refresh)
        e.code === 'F5',

        // Alt+F4 (Close Window)
        e.altKey && e.code === 'F4'
    ];

    if (blocked.some(condition => condition)) {
        e.preventDefault();
        e.stopPropagation();

        const violation = getViolationType(e);
        handleKeyboardViolation(violation);

        return false;
    }
}

function getViolationType(e) {
    if (e.key === 'Meta' || e.code === 'MetaLeft' || e.code === 'MetaRight') {
        return 'windows_key';
    }
    if (e.altKey && e.code === 'Tab') {
        return 'alt_tab';
    }
    if ((e.ctrlKey && e.shiftKey && e.code === 'KeyI') || e.code === 'F12') {
        return 'dev_tools';
    }
    if (e.ctrlKey && e.code === 'KeyU') {
        return 'view_source';
    }
    if ((e.ctrlKey && e.code === 'KeyW') || (e.altKey && e.code === 'F4')) {
        return 'close_attempt';
    }
    if ((e.ctrlKey && e.code === 'KeyR') || e.code === 'F5') {
        return 'refresh_attempt';
    }

    return 'unknown_shortcut';
}

function handleKeyboardViolation(violationType) {
    console.log(`🚫 Keyboard violation: ${violationType}`);

    window.ExamApp.violationCount++;

    // Report to server
    reportSuspiciousActivity(violationType, {
        count: window.ExamApp.violationCount,
        timestamp: Date.now()
    });

    // Show violation screen for serious violations
    const seriousViolations = ['windows_key', 'dev_tools', 'close_attempt'];
    if (seriousViolations.includes(violationType)) {
        const messages = {
            'windows_key': 'Натискане на Windows клавиша е забранено!',
            'dev_tools': 'Опит за отваряне на Developer Tools!',
            'close_attempt': 'Опит за затваряне на изпита!'
        };

        showViolationScreen(messages[violationType] || 'Засечено нарушение!');
    }
}

function handleWindowBlur() {
    if (!window.ExamApp.antiCheatActive) return;

    console.log('👁️ Window lost focus');

    reportSuspiciousActivity('window_blur', {
        timestamp: Date.now()
    });

    // Give grace period for accidental clicks
    setTimeout(() => {
        if (!document.hasFocus() && window.ExamApp.antiCheatActive) {
            showViolationScreen('Излизане от прозореца на изпита е забранено!');
        }
    }, 3000);
}

function handleWindowFocus() {
    if (!window.ExamApp.antiCheatActive) return;

    console.log('👁️ Window regained focus');
}

function handleVisibilityChange() {
    if (!window.ExamApp.antiCheatActive) return;

    if (document.hidden) {
        console.log('👁️ Document hidden');

        reportSuspiciousActivity('document_hidden', {
            timestamp: Date.now()
        });

        // Show violation after grace period
        setTimeout(() => {
            if (document.hidden && window.ExamApp.antiCheatActive) {
                showViolationScreen('Скриване на прозореца е забранено!');
            }
        }, 5000);
    }
}

function handleContextMenu(e) {
    if (!window.ExamApp.antiCheatActive) return;

    // Allow context menu only in editor area
    const editorArea = e.target.closest('#monaco-editor');
    if (!editorArea) {
        e.preventDefault();
        reportSuspiciousActivity('context_menu', {
            timestamp: Date.now()
        });
        return false;
    }
}

function handleCopyAttempt(e) {
    if (!window.ExamApp.antiCheatActive) return;

    // Allow copy only in editor area
    const editorArea = e.target.closest('#monaco-editor');
    if (!editorArea) {
        e.preventDefault();
        reportSuspiciousActivity('copy_attempt', {
            timestamp: Date.now()
        });
        return false;
    }
}

function handlePasteAttempt(e) {
    if (!window.ExamApp.antiCheatActive) return;

    // Allow paste only in editor area
    const editorArea = e.target.closest('#monaco-editor');
    if (!editorArea) {
        e.preventDefault();
        reportSuspiciousActivity('paste_attempt', {
            timestamp: Date.now()
        });
        return false;
    }
}

function handleCutAttempt(e) {
    if (!window.ExamApp.antiCheatActive) return;

    // Allow cut only in editor area
    const editorArea = e.target.closest('#monaco-editor');
    if (!editorArea) {
        e.preventDefault();
        reportSuspiciousActivity('cut_attempt', {
            timestamp: Date.now()
        });
        return false;
    }
}

function reportSuspiciousActivity(activity, data) {
    if (window.ExamApp.socket && window.ExamApp.socket.connected) {
        window.ExamApp.socket.emit('suspicious-activity', {
            activity: activity,
            data: data,
            sessionId: window.ExamApp.sessionId,
            timestamp: Date.now()
        });
    }
}

function handleAntiCheatWarning(data) {
    console.log('⚠️ Anti-cheat warning received:', data);
    showNotification(data.message, 'warning');
}

// ================================
// VIOLATION SCREEN MANAGEMENT
// ================================
function showViolationScreen(reason) {
    console.log(`🚫 Showing violation screen: ${reason}`);

    document.getElementById('violation-reason').textContent = reason;
    document.getElementById('violation-screen').style.display = 'flex';

    // Blur exam content
    document.getElementById('exam-container').classList.add('violation-detected');
}

function continueAfterViolation() {
    console.log('✅ Student chose to continue after violation');

    hideViolationScreen();

    // Re-enter fullscreen if needed
    if (!window.ExamApp.isFullscreen) {
        enterFullscreenMode();
    }
}

function exitAfterViolation() {
    if (confirm('Сигурен ли сте че искате да напуснете изпита?')) {
        console.log('🚪 Student chose to exit after violation');
        exitExam('violation');
    }
}

function hideViolationScreen() {
    document.getElementById('violation-screen').style.display = 'none';
    document.getElementById('exam-container').classList.remove('violation-detected');
}

// ================================
// EXAM EXIT SYSTEM
// ================================
function finishExam() {
    if (confirm('Сигурен ли сте че искате да приключите изпита?')) {
        console.log('🏁 Student finishing exam normally');
        exitExam('completed');
    }
}

function exitExam(reason) {
    console.log(`🚪 Exiting exam with reason: ${reason}`);

    // Save final code
    saveCode();

    // Send completion to server
    if (window.ExamApp.socket && window.ExamApp.socket.connected) {
        window.ExamApp.socket.emit('exam-complete', {
            sessionId: window.ExamApp.sessionId,
            reason: reason,
            completed: reason === 'completed',
            timestamp: Date.now()
        });
    }

    // Clean up
    deactivateAntiCheat();
    clearInterval(window.ExamApp.timerInterval);

    // Close window after short delay
    setTimeout(() => {
        window.close();
    }, 1000);
}

function deactivateAntiCheat() {
    console.log('🛡️ Deactivating anti-cheat...');

    window.ExamApp.antiCheatActive = false;

    // Remove event listeners
    document.removeEventListener('keydown', handleKeyDown, { capture: true });
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    document.removeEventListener('copy', handleCopyAttempt, { capture: true });
    document.removeEventListener('paste', handlePasteAttempt, { capture: true });
    document.removeEventListener('cut', handleCutAttempt, { capture: true });
}

function handleForceDisconnect(data) {
    console.log('🚫 Force disconnect received:', data);

    showViolationScreen(`Изпитът е прекратен: ${data.message}`);

    // Auto-close after 5 seconds
    setTimeout(() => {
        window.close();
    }, 5000);
}

// ================================
// UTILITY FUNCTIONS
// ================================
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');

    if (connected) {
        statusEl.className = 'status-connected';
        statusEl.textContent = '● Свързан';
    } else {
        statusEl.className = 'status-disconnected';
        statusEl.textContent = '● Изключен';
    }
}

function updateLastSaved() {
    const now = new Date().toLocaleTimeString('bg-BG');
    document.getElementById('last-saved').textContent = `Последно запазване: ${now}`;
    window.ExamApp.lastSaveTime = Date.now();
}

function showError(message) {
    document.getElementById('error-content').textContent = message;
    document.getElementById('error-panel').style.display = 'block';

    console.error('Error shown to user:', message);
}

function hideError() {
    document.getElementById('error-panel').style.display = 'none';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;

    // Set background color based on type
    const colors = {
        'success': '#4CAF50',
        'error': '#ff4757',
        'warning': '#ffc107',
        'info': '#2196F3'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Hide notification after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ================================
// EMERGENCY FUNCTIONS
// ================================
window.emergencyExit = function () {
    console.log('🚨 Emergency exit triggered');
    deactivateAntiCheat();
    window.close();
};

window.resetViolations = function () {
    console.log('🔄 Resetting violation count');
    window.ExamApp.violationCount = 0;
    hideViolationScreen();
};

// ================================
// DEBUGGING FUNCTIONS (DEVELOPMENT ONLY)
// ================================
if (window.location.hostname === 'localhost') {
    window.examDebug = {
        getState: () => window.ExamApp,
        triggerViolation: (reason) => showViolationScreen(reason),
        forceFullscreen: () => enterFullscreenMode(),
        saveCode: () => saveCode(),
        runCode: () => runCode()
    };

    console.log('🐛 Debug functions available: window.examDebug');
}

console.log('🎯 Student Exam System loaded successfully!');