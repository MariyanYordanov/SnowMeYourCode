/**
 * ExamWorkspace Component - Main exam workspace coordinator
 * Orchestrates all exam components and handles exam flow
 */
import { LoginForm } from './LoginForm.js';
import { ExamTimer } from './ExamTimer.js';
import { CodeEditor } from './CodeEditor.js';
import { ConsoleOutput } from './ConsoleOutput.js';
import { ExamExitManager } from '/student/js/components/ExamExitManager.js';

export class ExamWorkspace {
    constructor(websocketService, examService, antiCheatCore) {
        this.websocketService = websocketService;
        this.examService = examService;
        this.antiCheatCore = antiCheatCore;

        this.state = {
            currentView: 'login', // login, exam, exit
            isExamActive: false,
            isFullscreenActive: false
        };

        // Component instances
        this.components = {
            loginForm: null,
            examTimer: null,
            codeEditor: null,
            consoleOutput: null  // Now using the new component
        };

        // Cache DOM containers
        this.containers = {
            login: document.getElementById('login-container'),
            exam: document.getElementById('exam-container'),
            output: document.getElementById('code-output')
        };

        this.validateContainers();
        this.initializeComponents();
        this.setupEventListeners();
        this.setupFullscreenHandling();

        console.log('🏗️ ExamWorkspace initialized');
    }

    /**
     * Validate required DOM containers exist
     */
    validateContainers() {
        const required = ['login', 'exam', 'output'];
        const missing = required.filter(key => !this.containers[key]);

        if (missing.length > 0) {
            throw new Error(`ExamWorkspace requires containers: ${missing.join(', ')}`);
        }
    }

    /**
     * Initialize all child components
     */
    initializeComponents() {
        // Initialize login form
        this.components.loginForm = new LoginForm(this.websocketService);
        this.components.loginForm.on('loginSuccess', (data) => {
            this.handleLoginSuccess(data);
        });

        // Initialize exam timer
        this.components.examTimer = new ExamTimer();
        this.components.examTimer.on('timerExpired', () => {
            this.handleExamTimeExpired();
        });
        this.components.examTimer.on('timeWarning', (data) => {
            this.handleTimeWarning(data);
        });

        // Initialize code editor
        this.components.codeEditor = new CodeEditor(this.examService);
        this.components.codeEditor.on('runCode', (data) => {
            this.handleRunCode(data);
        });
        this.components.codeEditor.on('codeSaved', () => {
            this.updateLastSavedIndicator();
        });

        // Initialize console output component
        this.components.consoleOutput = new ConsoleOutput(this.containers.output, {
            maxOutputLines: 100,
            clearOnRun: true
        });

        console.log('🧩 Components initialized');
    }

    /**
     * Setup workspace event listeners
     */
    setupEventListeners() {
        // WebSocket events
        this.websocketService.on('studentIdAssigned', (data) => {
            this.handleNewSession(data);
        });

        this.websocketService.on('sessionRestored', (data) => {
            this.handleSessionRestore(data);
        });

        this.websocketService.on('loginError', (data) => {
            this.components.loginForm.handleLoginError(data);
        });

        this.websocketService.on('examExpired', (data) => {
            this.handleExamExpired(data);
        });

        this.websocketService.on('forceDisconnect', (data) => {
            this.handleForceDisconnect(data);
        });

        // Exam service events
        this.examService.on('timerUpdate', (data) => {
            this.components.examTimer.update(data.timeLeft);
        });

        this.examService.on('examExpired', () => {
            this.handleExamTimeExpired();
        });

        // UI buttons
        this.setupUIButtons();
    }

    /**
     * Setup UI button handlers
     */
    setupUIButtons() {
        // Run code button
        const runBtn = document.getElementById('run-code-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                const code = this.components.codeEditor.getCode();
                this.handleRunCode({ code });
            });
        }

        // Clear output button
        const clearBtn = document.getElementById('clear-output-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.components.consoleOutput.clear();
            });
        }

        // Finish exam button
        const finishBtn = document.getElementById('finish-exam-btn');
        if (finishBtn) {
            finishBtn.addEventListener('click', () => {
                this.handleFinishExam();
            });
        }
    }

    /**
     * Setup fullscreen handling
     */
    setupFullscreenHandling() {
        // Fullscreen change events
        document.addEventListener('fullscreenchange', () => {
            this.handleFullscreenChange();
        });

        document.addEventListener('fullscreenerror', (event) => {
            console.error('Fullscreen error:', event);
            this.handleFullscreenError(event);
        });

        // Exit fullscreen prevention
        document.addEventListener('keydown', (e) => {
            if (this.state.isFullscreenActive && e.key === 'Escape') {
                e.preventDefault();
                console.warn('🔒 ESC blocked during exam');
            }
        });
    }

    /**
     * Handle login success
     */
    async handleLoginSuccess(data) {
        const { studentName, studentClass } = data;

        // Initialize exam session
        await this.examService.startSession(studentName, studentClass);

        // Enter fullscreen
        await this.enterFullscreen();

        // Switch to exam view
        this.switchToExamView();
    }

    /**
     * Handle new session creation
     */
    handleNewSession(data) {
        const { sessionId, timeLeft } = data;

        this.examService.setSessionData({
            sessionId,
            timeLeft,
            isActive: true
        });

        console.log(`📝 New session created: ${sessionId}`);
    }

    /**
     * Handle session restore
     */
    handleSessionRestore(data) {
        const { sessionId, lastCode, timeLeft } = data;

        console.log(`♻️ Session restored: ${sessionId}`);

        // Restore exam state
        this.examService.setSessionData({
            sessionId,
            timeLeft,
            isActive: true
        });

        // Enter fullscreen
        this.enterFullscreen();

        // Switch to exam view with restored code
        this.switchToExamView(lastCode);
    }

    /**
     * Enter fullscreen mode
     */
    async enterFullscreen() {
        try {
            const elem = document.documentElement;

            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }

            this.state.isFullscreenActive = true;

            // Activate anti-cheat
            if (this.antiCheatCore) {
                await this.antiCheatCore.activate();
                this.antiCheatCore.setFullscreenMode(true);
            }

            console.log('🔒 Entered fullscreen mode');
        } catch (error) {
            console.error('❌ Fullscreen failed:', error);
            this.handleFullscreenError(error);
        }
    }

    /**
     * Switch to exam view
     */
    switchToExamView(lastCode = '') {
        // Hide login, show exam
        this.containers.login.style.display = 'none';
        this.containers.exam.style.display = 'flex';

        // Setup exam
        this.state.currentView = 'exam';
        this.state.isExamActive = true;

        // Initialize exam timer
        const examState = this.examService.getState();
        this.components.examTimer.start(examState.timeLeft);

        // Setup code editor
        this.components.codeEditor.enable();
        if (lastCode) {
            this.components.codeEditor.setCode(lastCode);
        }

        // Update student info in header
        this.updateStudentInfo(examState);

        console.log('📚 Switched to exam view');
    }

    /**
     * Update student info in exam header
     */
    updateStudentInfo(examState) {
        const nameEl = document.getElementById('student-name-display');
        const classEl = document.getElementById('student-class-display');
        const sessionEl = document.getElementById('session-id-display');

        if (nameEl) nameEl.textContent = examState.studentName;
        if (classEl) classEl.textContent = examState.studentClass;
        if (sessionEl) sessionEl.textContent = examState.sessionId;
    }

    /**
     * Handle code execution - NOW USING ConsoleOutput component
     */
    handleRunCode(data) {
        const { code } = data;

        // Save code before running
        this.examService.saveCode(code);

        // Execute using ConsoleOutput component
        this.components.consoleOutput.execute(code);

        console.log('▶️ Code executed');
    }

    /**
     * Handle finish exam request
     */
    handleFinishExam() {
        if (!this.state.isExamActive) return;

        if (confirm('Are you sure you want to finish the exam?')) {
            this.examService.completeExam();
            ExamExitManager.handleExamExit(
                ExamExitManager.getExitReasons().STUDENT_FINISH,
                { voluntary: true }
            );
        }
    }

    /**
     * Handle exam time expiration
     */
    handleExamTimeExpired() {
        this.state.isExamActive = false;
        this.components.codeEditor.disable();

        ExamExitManager.handleExamExit(
            ExamExitManager.getExitReasons().TIME_EXPIRED,
            { message: 'Exam time has expired!' }
        );
    }

    /**
     * Handle time warning
     */
    handleTimeWarning(data) {
        const { minutesLeft, message } = data;

        // Show notification
        if (this.antiCheatCore) {
            this.antiCheatCore.uiManager.showNotification(message, 'warning');
        }

        console.log(`⏰ Time warning: ${minutesLeft} minutes left`);
    }

    /**
     * Handle fullscreen change
     */
    handleFullscreenChange() {
        const isFullscreen = !!document.fullscreenElement;

        if (this.state.isExamActive && !isFullscreen) {
            console.warn('⚠️ Exited fullscreen during exam!');

            // Notify anti-cheat
            if (this.antiCheatCore) {
                this.antiCheatCore.handleViolation('fullscreenExit');
            }
        }

        this.state.isFullscreenActive = isFullscreen;
    }

    /**
     * Handle fullscreen error
     */
    handleFullscreenError(error) {
        console.error('Fullscreen error:', error);

        // Show error to user
        if (this.antiCheatCore) {
            this.antiCheatCore.uiManager.showNotification(
                'Fullscreen mode is required for the exam!',
                'error'
            );
        }
    }

    /**
     * Handle exam expired
     */
    handleExamExpired(data) {
        this.state.isExamActive = false;
        ExamExitManager.handleExamExit(
            ExamExitManager.getExitReasons().TIME_EXPIRED,
            data
        );
    }

    /**
     * Handle force disconnect
     */
    handleForceDisconnect(data) {
        this.state.isExamActive = false;
        ExamExitManager.handleExamExit(
            ExamExitManager.getExitReasons().TEACHER_FORCE,
            data
        );
    }

    /**
     * Update last saved indicator
     */
    updateLastSavedIndicator() {
        const indicator = document.getElementById('last-saved-display');
        if (indicator) {
            const now = new Date().toLocaleTimeString();
            indicator.textContent = `Last saved: ${now}`;
        }
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        // Cleanup components
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });

        // Exit fullscreen
        if (document.exitFullscreen && this.state.isFullscreenActive) {
            document.exitFullscreen();
        }

        console.log('🧹 ExamWorkspace destroyed');
    }
}