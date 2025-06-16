/**
 * Main Student Workspace Controller - Updated for Modal AntiCheat
 */
class ExamSystem {
    constructor() {
        this.socket = null;
        this.antiCheat = null;
        this.sessionId = null;
        this.studentInfo = null;
        this.examTimer = null;
        this.isExamActive = false;
        this.lastSaved = null;

        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize the exam system
     */
    initialize() {
        console.log('🚀 Initializing Exam System...');

        // Initialize Socket.IO connection
        this.initializeSocket();

        // Initialize Modal AntiCheat (inactive until exam starts)
        this.initializeAntiCheat();

        // Setup UI event listeners
        this.setupUIListeners();

        // Setup auto-save
        this.setupAutoSave();

        console.log('✅ Exam System initialized');
    }

    /**
     * Initialize Socket.IO connection
     */
    initializeSocket() {
        this.socket = io();

        // Connection events
        this.socket.on('connect', () => {
            console.log('🔗 Connected to server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from server');
            this.updateConnectionStatus(false);
        });

        // Login response events
        this.socket.on('student-id-assigned', (data) => {
            this.handleLoginSuccess(data, 'new');
        });

        this.socket.on('session-restored', (data) => {
            this.handleLoginSuccess(data, 'restored');
        });

        this.socket.on('login-error', (data) => {
            this.handleLoginError(data);
        });

        // Exam events
        this.socket.on('exam-expired', (data) => {
            this.handleExamExpired(data);
        });

        this.socket.on('force-disconnect', (data) => {
            this.handleForceDisconnect(data);
        });
    }

    /**
     * Initialize Modal AntiCheat system (inactive until exam starts)
     */
    initializeAntiCheat() {
        if (window.ModalAntiCheat) {
            this.antiCheat = new window.ModalAntiCheat(this.socket);
            window.antiCheat = this.antiCheat; // Global access
            console.log('🛡️ Modal AntiCheat system ready (inactive)');
        } else {
            console.error('❌ ModalAntiCheat class not found');
        }
    }

    /**
     * Setup UI event listeners
     */
    setupUIListeners() {
        // Login form
        const loginBtn = document.getElementById('login-btn');
        const nameInput = document.getElementById('student-name');
        const classInput = document.getElementById('student-class');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }

        // Enter key in login form
        [nameInput, classInput].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleLogin();
                    }
                });
            }
        });

        // Code editor events
        const codeEditor = document.getElementById('code-editor');
        if (codeEditor) {
            codeEditor.addEventListener('input', () => {
                this.handleCodeChange();
            });
        }

        // Exam control buttons
        const saveBtn = document.getElementById('save-code');
        const runBtn = document.getElementById('run-code');
        const finishBtn = document.getElementById('finish-exam');
        const clearBtn = document.getElementById('clear-output');

        if (saveBtn) saveBtn.addEventListener('click', () => this.saveCode());
        if (runBtn) runBtn.addEventListener('click', () => this.runCode());
        if (finishBtn) finishBtn.addEventListener('click', () => this.finishExam());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearOutput());
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        setInterval(() => {
            if (this.isExamActive) {
                this.autoSaveCode();
            }
        }, 10000); // Auto-save every 10 seconds
    }

    /**
     * Handle login attempt
     */
    handleLogin() {
        const nameInput = document.getElementById('student-name');
        const classInput = document.getElementById('student-class');
        const loginBtn = document.getElementById('login-btn');

        if (!nameInput || !classInput) return;

        const studentName = nameInput.value.trim();
        const studentClass = classInput.value.trim();

        if (!studentName || !studentClass) {
            this.showLoginStatus('Моля въведете име и клас!', 'error');
            return;
        }

        // Disable login button and show loading
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Влизане...';
        }

        this.showLoginStatus('Влизане в изпита...', 'loading');

        // Send login request
        this.socket.emit('student-join', {
            studentName: studentName,
            studentClass: studentClass
        });

        console.log(`🎓 Login attempt: "${studentName}" from "${studentClass}"`);
    }

    /**
     * Handle successful login
     */
    handleLoginSuccess(data, type) {
        console.log(`✅ Login successful (${type}):`, data);

        this.sessionId = data.sessionId;
        this.studentInfo = {
            name: document.getElementById('student-name').value.trim(),
            class: document.getElementById('student-class').value.trim()
        };

        // Show success message
        const message = type === 'restored' ?
            `${data.message}` :
            `Изпитът започна! Session ID: ${data.sessionId}`;
        this.showLoginStatus(message, 'success');

        // Start exam after short delay
        setTimeout(() => {
            this.startExam(data);
        }, 2000);
    }

    /**
     * Handle login error
     */
    handleLoginError(data) {
        console.error('❌ Login error:', data);

        this.showLoginStatus(data.message, 'error');

        // Re-enable login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Влез в изпита';
        }
    }

    /**
     * Start the exam
     */
    startExam(data) {
        console.log('🎯 Starting exam...');

        // Hide login form and show workspace
        this.showWorkspace();

        // Update student info display
        this.updateStudentInfo();

        // Start timer
        this.startExamTimer(data.timeLeft);

        // ACTIVATE MODAL ANTI-CHEAT PROTECTION
        if (this.antiCheat) {
            this.antiCheat.activate();
            console.log('🛡️ Modal AntiCheat protection ACTIVATED');
        }

        // Load previous code if available
        if (data.lastCode) {
            const codeEditor = document.getElementById('code-editor');
            if (codeEditor) {
                codeEditor.value = data.lastCode;
            }
        }

        // Mark exam as active
        this.isExamActive = true;

        // Update session display
        this.updateSessionDisplay();

        console.log('🎓 Exam started successfully with modal protection');
    }

    /**
     * Show workspace and hide login form
     */
    showWorkspace() {
        const loginForm = document.getElementById('login-form');
        const workspace = document.getElementById('workspace');

        if (loginForm) loginForm.style.display = 'none';
        if (workspace) workspace.style.display = 'block';

        // Adjust body layout for workspace
        document.body.style.display = 'block';
        document.body.style.justifyContent = 'initial';
        document.body.style.alignItems = 'initial';
        document.body.style.height = 'auto';
    }

    /**
     * Update student info display
     */
    updateStudentInfo() {
        const studentInfoEl = document.getElementById('student-info');
        if (studentInfoEl && this.studentInfo) {
            studentInfoEl.textContent = `${this.studentInfo.name} (${this.studentInfo.class})`;
        }
    }

    /**
     * Start exam timer
     */
    startExamTimer(timeLeft) {
        const timerEl = document.getElementById('timer');
        if (!timerEl) return;

        this.examTimer = setInterval(() => {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // Change color when time is running low
            if (timeLeft < 15 * 60 * 1000) { // Last 15 minutes
                timerEl.style.color = '#dc3545';
                timerEl.style.fontWeight = 'bold';
            } else if (timeLeft < 30 * 60 * 1000) { // Last 30 minutes
                timerEl.style.color = '#ffc107';
            }

            timeLeft -= 1000;

            if (timeLeft <= 0) {
                this.handleExamExpired({ message: 'Времето за изпита изтече!' });
            }
        }, 1000);
    }

    /**
     * Handle code changes
     */
    handleCodeChange() {
        if (!this.isExamActive) return;

        // Mark as unsaved
        this.updateLastSaved('Незапазено');
    }

    /**
     * Save code manually
     */
    saveCode() {
        if (!this.isExamActive) return;

        const codeEditor = document.getElementById('code-editor');
        if (!codeEditor) return;

        const code = codeEditor.value;

        // Send to server
        this.socket.emit('code-update', {
            code: code,
            filename: 'main.js',
            timestamp: Date.now()
        });

        this.updateLastSaved('Сега');
        console.log('💾 Code saved manually');
    }

    /**
     * Auto-save code
     */
    autoSaveCode() {
        const codeEditor = document.getElementById('code-editor');
        if (!codeEditor) return;

        const code = codeEditor.value;

        // Send to server
        this.socket.emit('code-update', {
            code: code,
            filename: 'main.js',
            timestamp: Date.now(),
            auto: true
        });

        this.updateLastSaved('Автоматично');
    }

    /**
     * Run code (basic implementation)
     */
    runCode() {
        const codeEditor = document.getElementById('code-editor');
        const outputEl = document.getElementById('code-output');

        if (!codeEditor || !outputEl) return;

        const code = codeEditor.value;

        // Clear previous output
        outputEl.innerHTML = '';

        // Capture console.log output
        const originalLog = console.log;
        const outputs = [];

        console.log = (...args) => {
            outputs.push(args.join(' '));
            originalLog.apply(console, args);
        };

        try {
            // Execute code
            eval(code);

            // Display output
            if (outputs.length > 0) {
                outputs.forEach(output => {
                    const outputLine = document.createElement('div');
                    outputLine.className = 'output-line';
                    outputLine.textContent = output;
                    outputEl.appendChild(outputLine);
                });
            } else {
                outputEl.innerHTML = '<div class="output-placeholder">Кодът се изпълни без изход</div>';
            }
        } catch (error) {
            const errorEl = document.createElement('div');
            errorEl.className = 'output-error';
            errorEl.textContent = `Грешка: ${error.message}`;
            outputEl.appendChild(errorEl);
        }

        // Restore console.log
        console.log = originalLog;
    }

    /**
     * Clear output area
     */
    clearOutput() {
        const outputEl = document.getElementById('code-output');
        if (outputEl) {
            outputEl.innerHTML = '<div class="output-placeholder">Изходът от вашия код ще се покаже тук...</div>';
        }
    }

    /**
     * Finish exam
     */
    finishExam() {
        if (!this.isExamActive) return;

        if (confirm('Сигурни ли сте че искате да приключите изпита?')) {
            // Save final code
            this.saveCode();

            // Deactivate anti-cheat
            if (this.antiCheat) {
                this.antiCheat.deactivate();
            }

            // Send completion to server
            this.socket.emit('exam-complete', {
                sessionId: this.sessionId,
                completedAt: Date.now(),
                reason: 'student_finish'
            });

            // Stop timer
            if (this.examTimer) {
                clearInterval(this.examTimer);
            }

            // Mark as inactive
            this.isExamActive = false;

            // Show completion screen
            this.showCompletionScreen();

            console.log('✅ Exam completed by student');
        }
    }

    /**
     * Handle exam expiration
     */
    handleExamExpired(data) {
        console.log('⏰ Exam time expired:', data);

        // Stop timer
        if (this.examTimer) {
            clearInterval(this.examTimer);
        }

        // Deactivate anti-cheat
        if (this.antiCheat) {
            this.antiCheat.deactivate();
        }

        // Mark as inactive
        this.isExamActive = false;

        // Show expiration message
        alert(data.message || 'Времето за изпита изтече!');

        // Show completion screen
        this.showCompletionScreen('Времето изтече');
    }

    /**
     * Handle force disconnect
     */
    handleForceDisconnect(data) {
        console.log('🚫 Force disconnect:', data);

        // Deactivate anti-cheat
        if (this.antiCheat) {
            this.antiCheat.deactivate();
        }

        // Show error screen
        this.showErrorScreen(data.message || 'Изпитът беше прекратен от преподавателя');
    }

    /**
     * Show completion screen
     */
    showCompletionScreen(reason = '') {
        const completionScreen = document.getElementById('completion-screen');
        const completionTime = document.getElementById('completion-time');
        const completionSession = document.getElementById('completion-session');

        if (completionScreen) {
            if (completionTime) {
                completionTime.textContent = new Date().toLocaleString();
            }
            if (completionSession) {
                completionSession.textContent = this.sessionId || 'N/A';
            }

            // Hide workspace and show completion
            const workspace = document.getElementById('workspace');
            if (workspace) workspace.style.display = 'none';

            completionScreen.style.display = 'block';
        }
    }

    /**
     * Show error screen
     */
    showErrorScreen(message) {
        const errorScreen = document.getElementById('error-screen');
        const errorMessage = document.getElementById('error-message');

        if (errorScreen) {
            if (errorMessage) {
                errorMessage.textContent = message;
            }

            // Hide all other screens
            ['login-form', 'workspace', 'completion-screen'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            errorScreen.style.display = 'block';
        }
    }

    /**
     * Show login status message
     */
    showLoginStatus(message, type) {
        const statusEl = document.getElementById('login-status');
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.className = `login-status ${type}`;
        statusEl.style.display = 'block';

        // Hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Update last saved display
     */
    updateLastSaved(status) {
        const lastSavedEl = document.getElementById('last-saved');
        if (lastSavedEl) {
            const time = status === 'Сега' ? new Date().toLocaleTimeString() : status;
            lastSavedEl.textContent = `Последно запазено: ${time}`;
        }
    }

    /**
     * Update session display
     */
    updateSessionDisplay() {
        const sessionEl = document.getElementById('session-id');
        if (sessionEl && this.sessionId) {
            sessionEl.textContent = `Session: ${this.sessionId}`;
        }
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(connected) {
        console.log(connected ? '🟢 Online' : '🔴 Offline');
    }
}

// Initialize exam system when page loads
const examSystem = new ExamSystem();

// Make it globally available for HTML onclick handlers
window.examSystem = examSystem;