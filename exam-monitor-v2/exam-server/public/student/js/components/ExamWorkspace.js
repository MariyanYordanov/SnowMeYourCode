/**
 * ExamWorkspace Component - Main exam workspace coordinator
 * Orchestrates all exam components and handles exam flow
 */
import { LoginForm } from './LoginForm.js';
import { ExamTimer } from './ExamTimer.js';
import { CodeEditor } from './CodeEditor.js';
import { ConsoleOutput } from './ConsoleOutput.js';

export class ExamWorkspace {
    constructor(websocketService, examService, antiCheatCore) {
        this.websocketService = websocketService;
        this.examService = examService;
        this.antiCheatCore = antiCheatCore;

        this.state = {
            currentView: 'login', // login, exam, exit
            isExamActive: false,
            isFullscreenActive: false,
            studentName: null,
            studentClass: null
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
        this.components.codeEditor = new CodeEditor();
        this.components.codeEditor.on('codeChange', (data) => {
            this.handleCodeChange(data);
        });
        this.components.codeEditor.on('codeExecute', (data) => {
            this.handleCodeExecute(data);
        });

        // Initialize console output
        this.components.consoleOutput = new ConsoleOutput(this.containers.output);

        console.log('🧩 Components initialized');
    }

    /**
     * Setup WebSocket event listeners
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

        this.websocketService.on('timeWarning', (data) => {
            this.handleTimeWarning(data);
        });

        // UI event listeners
        this.setupUIEventListeners();
    }

    /**
     * Setup UI event listeners
     */
    setupUIEventListeners() {
        // Run code button
        const runBtn = document.getElementById('run-code-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                this.components.codeEditor.executeCode();
            });
        }

        // Save code button
        const saveBtn = document.getElementById('save-code-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.components.codeEditor.saveCode();
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

        // Exit fullscreen prevention → Red screen
        document.addEventListener('keydown', (e) => {
            if (this.state.isFullscreenActive && e.key === 'Escape') {
                e.preventDefault();
                console.warn('🚨 ESC pressed during exam - showing violation warning');
                this.handleEscapeViolation();
            }
        });
    }

    /**
     * 🔧 ПОПРАВЕНО: Handle fullscreen changes with proper cleanup
     */
    handleFullscreenChange() {
        const isFullscreen = !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement);

        if (isFullscreen) {
            // Влизане в fullscreen
            this.state.isFullscreenActive = true;
            this.enhanceFullscreenProtection();
            console.log('🔒 Entered fullscreen mode');
        } else {
            // 🔧 ПОПРАВКА: ИЗЛИЗАНЕ ОТ FULLSCREEN - CLEANUP!
            this.state.isFullscreenActive = false;
            this.cleanupFullscreenProtection(); // ← ТОВА ЛИПСВАШЕ!
            console.log('🔓 Exited fullscreen mode - cleaned up blocking');

            // Върни focus на code editor
            setTimeout(() => {
                if (this.components.codeEditor) {
                    this.components.codeEditor.focus();
                }
            }, 100);
        }

        // Уведоми anti-cheat системата
        if (this.antiCheatCore) {
            this.antiCheatCore.setFullscreenMode(isFullscreen);
        }
    }

    /**
     * 🆕 НОВО: Cleanup fullscreen protection when exiting
     */
    cleanupFullscreenProtection() {
        // Премахни protection overlay
        const overlay = document.getElementById('fullscreen-protection');
        if (overlay) {
            overlay.remove();
            console.log('🧹 Removed fullscreen protection overlay');
        }

        // Премахни CSS restrictions
        const protectionStyles = document.getElementById('fullscreen-protection-styles');
        if (protectionStyles) {
            protectionStyles.remove();
            console.log('🧹 Removed fullscreen protection styles');
        }

        // Премахни event listeners
        this.removeFullscreenEventListeners();

        // Activate normal interaction mode
        this.enableNormalInteraction();
    }

    /**
     * 🆕 НОВО: Remove fullscreen event listeners
     */
    removeFullscreenEventListeners() {
        // Премахни blocking listeners
        document.removeEventListener('contextmenu', this.blockContextMenu, { capture: true });
        document.removeEventListener('dragstart', this.blockDrag, { capture: true });
        document.removeEventListener('drop', this.blockDrag, { capture: true });
        document.removeEventListener('selectstart', this.blockSelection, { capture: true });

        console.log('🧹 Removed fullscreen event listeners');
    }

    /**
     * 🆕 НОВО: Enable normal interaction after fullscreen exit
     */
    enableNormalInteraction() {
        // Възстанови pointer events
        document.body.style.pointerEvents = '';

        // Възстанови user-select
        document.body.style.userSelect = '';

        // Възстанови cursor
        document.body.style.cursor = '';

        // Премахни blocking classes
        document.body.classList.remove('fullscreen-blocking', 'no-interaction');

        console.log('✅ Normal interaction restored');
    }

    /**
     * Handle Escape key violation
     */
    handleEscapeViolation() {
        if (this.antiCheatCore && this.antiCheatCore.detectionEngine) {
            this.antiCheatCore.detectionEngine.handleCriticalDetection('escapeKey', {
                key: 'Escape',
                code: 'Escape',
                blocked: true,
                message: 'Escape key pressed during exam'
            });
        } else {
            console.error('❌ AntiCheatCore not available for Escape violation');
            this.showFallbackExitConfirmation();
        }
    }

    /**
     * Fallback exit confirmation if antiCheatCore unavailable
     */
    showFallbackExitConfirmation() {
        const confirmed = confirm('⚠️ ВНИМАНИЕ!\n\nЗасечено е натискане на забранен клавиш!\n\nИскате ли да напуснете изпита?');

        if (confirmed) {
            const doubleConfirm = confirm('Сигурни ли сте че искате да напуснете изпита?\n\nТова действие не може да бъде отменено!');

            if (doubleConfirm && window.ExamExitManager) {
                window.ExamExitManager.handleExamExit('escape_key_violation', {
                    voluntary: true,
                    reason: 'Student pressed Escape key'
                });
            }
        }
    }

    /**
     * Enter fullscreen mode
     */
    async enterFullscreen() {
        try {
            const element = document.documentElement;

            this.createFullscreenProtection();

            if (element.requestFullscreen) {
                await element.requestFullscreen({ navigationUI: "hide" });
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
            }

            if (this.antiCheatCore) {
                await this.antiCheatCore.activate();
                this.antiCheatCore.setFullscreenMode(true);
            }

            console.log('🔒 Entered fullscreen mode');

        } catch (error) {
            console.error('❌ Failed to enter fullscreen:', error);
            throw error;
        }
    }

    /**
     * Create fullscreen protection overlay
     */
    createFullscreenProtection() {
        const existingOverlay = document.getElementById('fullscreen-protection');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'fullscreen-protection';
        overlay.className = 'fullscreen-protection-overlay';

        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 100px;
            z-index: 999999;
            pointer-events: all;
            background: transparent;
        `;

        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (this.antiCheatCore && this.antiCheatCore.detectionEngine) {
                this.antiCheatCore.detectionEngine.handleCriticalDetection('topAreaClick', {
                    x: e.clientX,
                    y: e.clientY,
                    blocked: true,
                    timestamp: Date.now()
                });
            }
            return false;
        }, { capture: true, passive: false });

        document.body.appendChild(overlay);
        console.log('🛡️ Fullscreen protection overlay created');
    }

    /**
     * 🔧 ПОПРАВЕНО: Enhanced fullscreen protection with proper cleanup tracking
     */
    enhanceFullscreenProtection() {
        // CSS protection
        this.addFullscreenCSS();

        // Event blocking
        this.addFullscreenEventListeners();

        console.log('🔒 Enhanced fullscreen protection activated');
    }

    /**
     * 🆕 НОВО: Add fullscreen event listeners with proper tracking
     */
    addFullscreenEventListeners() {
        // Use arrow functions to maintain 'this' context
        document.addEventListener('contextmenu', this.blockContextMenu, {
            capture: true,
            passive: false
        });

        document.addEventListener('dragstart', this.blockDrag, {
            capture: true,
            passive: false
        });

        document.addEventListener('drop', this.blockDrag, {
            capture: true,
            passive: false
        });

        document.addEventListener('selectstart', this.blockSelection, {
            capture: true,
            passive: false
        });

        console.log('🔒 Added fullscreen event listeners');
    }

    /**
     * Add fullscreen CSS protection
     */
    addFullscreenCSS() {
        const style = document.createElement('style');
        style.id = 'fullscreen-protection-styles';
        style.textContent = `
            body:fullscreen {
                -webkit-app-region: no-drag !important;
                cursor: default !important;
            }
            
            body:fullscreen *:hover {
                cursor: default !important;
            }
            
            body:fullscreen .exam-container::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 100px;
                z-index: 999998;
                pointer-events: all;
                background: transparent;
            }
        `;

        const existingStyle = document.getElementById('fullscreen-protection-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        document.head.appendChild(style);
    }

    /**
     * Block context menu
     */
    blockContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }

    /**
     * Block drag operations
     */
    blockDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }

    /**
     * Block text selection
     */
    blockSelection = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }

    /**
     * Switch to exam view
     */
    switchToExamView() {
        this.containers.login.style.display = 'none';
        this.containers.exam.style.display = 'block';

        this.state.currentView = 'exam';
        this.state.isExamActive = true;

        this.components.examTimer.start();
        this.components.codeEditor.focus();

        console.log('📚 Switched to exam view');
    }

    /**
     * Handle login success
     */
    async handleLoginSuccess(data) {
        const { studentName, studentClass } = data;
        this.state.studentName = studentName;
        this.state.studentClass = studentClass;

        await this.enterFullscreen();
        this.switchToExamView();
    }

    /**
     * Handle new session creation
     */
    handleNewSession(data) {
        const { sessionId, timeLeft, studentName, studentClass } = data;

        console.log(`📝 New session created: ${sessionId}`);
        this.state.sessionId = sessionId;

        if (studentName && studentClass) {
            this.state.studentName = studentName;
            this.state.studentClass = studentClass;
        }

        this.examService.startExam({
            sessionId,
            timeLeft,
            studentName: this.state.studentName,
            studentClass: this.state.studentClass
        });

        if (this.state.currentView === 'login') {
            this.handleLoginSuccess({
                studentName: this.state.studentName,
                studentClass: this.state.studentClass
            });
        }
    }

    /**
     * Handle session restore
     */
    handleSessionRestore(data) {
        console.log('📝 Session restored:', data);
        this.handleNewSession(data);
    }

    /**
     * Handle code changes
     */
    handleCodeChange(data) {
        if (this.state.sessionId) {
            this.examService.saveCode(data.code, data.filename);
        }
    }

    /**
     * Handle code execution
     */
    handleCodeExecute(data) {
        console.log('▶️ Code executed');
        this.components.consoleOutput.addOutput(data.output, data.type);
    }

    /**
     * Handle time warning
     */
    handleTimeWarning(data) {
        const { minutesLeft, message } = data;

        if (this.antiCheatCore && this.antiCheatCore.uiManager) {
            this.antiCheatCore.uiManager.showNotification({
                message: message || `Остават ${minutesLeft} минути`,
                type: 'warning',
                duration: 5000
            });
        }

        console.log(`⏰ Time warning: ${minutesLeft} minutes left`);
    }

    /**
     * Handle finish exam
     */
    handleFinishExam() {
        if (confirm('Сигурни ли сте че искате да завършите изпита?')) {
            this.examService.completeExam();

            if (window.ExamExitManager) {
                window.ExamExitManager.handleExamExit('STUDENT_FINISH', {
                    voluntary: true
                });
            }
        }
    }

    /**
     * Handle exam time expiration
     */
    handleExamTimeExpired() {
        this.state.isExamActive = false;
        this.components.codeEditor.disable();

        if (window.ExamExitManager) {
            window.ExamExitManager.handleExamExit('TIME_EXPIRED', {
                message: 'Времето за изпита изтече!'
            });
        }
    }

    /**
     * Handle exam expired
     */
    handleExamExpired(data) {
        this.state.isExamActive = false;
        this.components.codeEditor.disable();

        if (window.ExamExitManager) {
            window.ExamExitManager.handleExamExit('TIME_EXPIRED', {
                message: data.message || 'Времето за изпита изтече!'
            });
        }
    }

    /**
     * Handle force disconnect
     */
    handleForceDisconnect(data) {
        this.state.isExamActive = false;

        if (window.ExamExitManager) {
            window.ExamExitManager.handleExamExit('INSTRUCTOR_TERMINATED', {
                message: data.message || 'Изпитът беше прекратен от преподавателя',
                reason: data.reason
            });
        }
    }

    /**
     * Handle fullscreen error
     */
    handleFullscreenError(error) {
        console.error('❌ Fullscreen error:', error);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.cleanupFullscreenProtection();

        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });

        if (document.exitFullscreen) {
            document.exitFullscreen();
        }

        console.log('🧹 ExamWorkspace destroyed');
    }
}