/**
 * ExamWorkspace Component - Main exam workspace coordinator
 * Orchestrates all exam components and handles exam flow
 */
import { LoginForm } from './LoginForm.js';
import { ExamTimer } from './ExamTimer.js';
import { CodeEditor } from './CodeEditor.js';
import { ExamExitManager } from './ExamExitManager.js';

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
            consoleOutput: null
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
        // Monitor fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            this.handleFullscreenChange();
        });

        // Setup fullscreen violation tracking
        document.addEventListener('visibilitychange', () => {
            if (this.state.isExamActive && document.hidden) {
                this.reportSuspiciousActivity('window_blur', { duration: 'unknown' });
            }
        });
    }

    /**
     * Handle new session creation
     */
    async handleNewSession(data) {
        console.log('🆕 New session created:', data.sessionId);

        // Start exam
        this.examService.startExam({
            sessionId: data.sessionId,
            timeLeft: data.timeLeft,
            lastCode: ''
        });

        await this.enterFullscreenMode();
        this.switchToExamView();
    }

    /**
     * Handle session restoration
     */
    async handleSessionRestore(data) {
        console.log('🔄 Session restored:', data.sessionId);

        // Update exam service
        this.examService.updateSession({
            sessionId: data.sessionId,
            timeLeft: data.timeLeft,
            lastCode: data.lastCode || ''
        });

        await this.enterFullscreenMode();
        this.switchToExamView(data.lastCode);
    }

    /**
     * Handle successful login (delegates to specific handlers)
     */
    handleLoginSuccess(data) {
        this.components.loginForm.handleLoginSuccess(data.data, data.type);
    }

    /**
     * Enter fullscreen mode
     */
    async enterFullscreenMode() {
        try {
            await document.documentElement.requestFullscreen();
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
     * Handle code execution
     */
    handleRunCode(data) {
        const { code } = data;

        try {
            // Clear previous output
            this.clearConsoleOutput();

            // Capture console.log
            const originalLog = console.log;
            const outputs = [];

            console.log = (...args) => {
                outputs.push({ type: 'log', content: args.join(' ') });
                originalLog.apply(console, args);
            };

            // Execute code
            eval(code);

            // Restore console.log
            console.log = originalLog;

            // Display output
            this.displayConsoleOutput(outputs);

        } catch (error) {
            console.log = console.log; // Restore if error
            this.displayConsoleOutput([{
                type: 'error',
                content: `Error: ${error.message}`
            }]);
        }
    }

    /**
     * Display console output
     */
    displayConsoleOutput(outputs) {
        if (outputs.length === 0) {
            this.containers.output.innerHTML = '<div class="output-placeholder">Code executed without output</div>';
            return;
        }

        const outputHtml = outputs.map(output => {
            const className = `output-line output-${output.type}`;
            return `<div class="${className}">${this.escapeHtml(output.content)}</div>`;
        }).join('');

        this.containers.output.innerHTML = outputHtml;
        this.containers.output.scrollTop = this.containers.output.scrollHeight;
    }

    /**
     * Clear console output
     */
    clearConsoleOutput() {
        this.containers.output.innerHTML = '<div class="output-placeholder">Your code output will appear here...</div>';
    }

    /**
     * Escape HTML for safe display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
     * Handle forced disconnection
     */
    handleForceDisconnect(data) {
        this.state.isExamActive = false;

        ExamExitManager.handleExamExit(
            ExamExitManager.getExitReasons().INSTRUCTOR_TERMINATED,
            { message: data.message || 'Exam terminated by instructor' }
        );
    }

    /**
     * Handle exam expiration from server
     */
    handleExamExpired(data) {
        this.handleExamTimeExpired();
    }

    /**
     * Handle fullscreen changes
     */
    handleFullscreenChange() {
        const isFullscreen = !!document.fullscreenElement;

        if (!isFullscreen && this.state.isExamActive) {
            this.reportSuspiciousActivity('fullscreen_exit', {
                timestamp: Date.now()
            });
        }

        this.state.isFullscreenActive = isFullscreen;
    }

    /**
     * Handle fullscreen error
     */
    handleFullscreenError(error) {
        console.error('❌ Fullscreen error:', error);
        this.components.loginForm.showStatus(
            'Failed to enter fullscreen mode. Please allow fullscreen and try again.',
            'error'
        );
    }

    /**
     * Handle time warnings
     */
    handleTimeWarning(data) {
        // Could show notification here if needed
        console.log('⏰ Time warning:', data.message);
    }

    /**
     * Report suspicious activity
     */
    reportSuspiciousActivity(type, data) {
        this.websocketService.reportSuspiciousActivity(
            this.examService.getState().sessionId,
            type,
            'medium'
        );
    }

    /**
     * Update last saved indicator
     */
    updateLastSavedIndicator() {
        const indicator = document.getElementById('last-saved-display');
        if (indicator) {
            const time = new Date().toLocaleTimeString();
            indicator.textContent = `Last saved: ${time}`;
        }
    }

    /**
     * Get workspace state
     */
    getState() {
        return {
            ...this.state,
            examState: this.examService.getState(),
            hasUnsavedChanges: this.components.codeEditor?.hasUnsaved() || false
        };
    }

    /**
     * Destroy workspace and all components
     */
    destroy() {
        Object.values(this.components).forEach(component => {
            if (component && component.destroy) {
                component.destroy();
            }
        });

        this.state.isExamActive = false;
        console.log('🧹 ExamWorkspace destroyed');
    }
}