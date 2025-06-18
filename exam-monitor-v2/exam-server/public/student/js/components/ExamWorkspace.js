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
     * Setup WebSocket event listeners - ПОПРАВЕНО: Complete implementation
     */
    setupEventListeners() {
        // WebSocket events - ПОПРАВЕНО: Правилни event names
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
     * Setup fullscreen handling - ПОПРАВЕНО: Esc показва червен екран
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

        // ПОПРАВЕНО: Exit fullscreen prevention → Red screen
        document.addEventListener('keydown', (e) => {
            if (this.state.isFullscreenActive && e.key === 'Escape') {
                e.preventDefault();
                console.warn('🚨 ESC pressed during exam - showing violation warning');

                // НОВО: Показваме червен екран вместо просто блокиране
                this.handleEscapeViolation();
            }
        });
    }

    /**
     * НОВО: Handle Escape key violation
     */
    handleEscapeViolation() {
        // Trigger same critical violation as other forbidden keys
        if (this.antiCheatCore && this.antiCheatCore.detectionEngine) {
            // Manually trigger critical violation
            this.antiCheatCore.detectionEngine.handleCriticalDetection('escapeKey', {
                key: 'Escape',
                code: 'Escape',
                blocked: true,
                message: 'Escape key pressed during exam'
            });
        } else {
            // Fallback if antiCheatCore not available
            console.error('❌ AntiCheatCore not available for Escape violation');
            this.showFallbackExitConfirmation();
        }
    }

    /**
     * НОВО: Fallback exit confirmation if antiCheatCore unavailable
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
     * Handle login success
     */
    async handleLoginSuccess(data) {
        const { studentName, studentClass } = data;

        // Store student info
        this.state.studentName = studentName;
        this.state.studentClass = studentClass;

        // Enter fullscreen
        await this.enterFullscreen();

        // Switch to exam view
        this.switchToExamView();
    }

    /**
     * Handle new session creation - ПОПРАВЕНО: Complete implementation
     */
    handleNewSession(data) {
        const { sessionId, timeLeft, studentName, studentClass } = data;

        console.log(`📝 New session created: ${sessionId}`);

        // Store session info
        this.state.sessionId = sessionId;

        // Update student info if available
        if (studentName && studentClass) {
            this.state.studentName = studentName;
            this.state.studentClass = studentClass;
        }

        // Start exam with session data
        this.examService.startExam({
            sessionId,
            timeLeft,
            studentName: this.state.studentName,
            studentClass: this.state.studentClass
        });

        // If not already in exam view, switch to it
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
        // Auto-save code changes
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
     * Enter fullscreen mode - ПОПРАВЕНО: Enhanced protection
     */
    async enterFullscreen() {
        try {
            const element = document.documentElement;

            // НОВО: Добавяме protection overlay преди fullscreen
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

            // НОВО: Допълнителна защита след fullscreen
            this.enhanceFullscreenProtection();

            // Activate anti-cheat after fullscreen
            if (this.antiCheatCore) {
                await this.antiCheatCore.activate();
                this.antiCheatCore.setFullscreenMode(true);
            }

            this.state.isFullscreenActive = true;
            console.log('🔒 Entered fullscreen mode');

        } catch (error) {
            console.error('❌ Failed to enter fullscreen:', error);
            throw error;
        }
    }

    /**
     * НОВО: Create fullscreen protection overlay
     */
    createFullscreenProtection() {
        // Премахваме стар overlay ако съществува
        const existingOverlay = document.getElementById('fullscreen-protection');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Създаваме нов protection overlay
        const overlay = document.createElement('div');
        overlay.id = 'fullscreen-protection';
        overlay.className = 'fullscreen-protection-overlay';

        // Блокираме всички mouse events в top area
        overlay.addEventListener('mousemove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, { capture: true, passive: false });

        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            // Trigger violation
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

        overlay.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, { capture: true, passive: false });

        document.body.appendChild(overlay);
        console.log('🛡️ Fullscreen protection overlay created');
    }

    /**
     * НОВО: Enhanced fullscreen protection
     */
    enhanceFullscreenProtection() {
        // Скриваме browser cursor hints
        document.body.style.cursor = 'default';

        // Блокираме context menu глобално
        document.addEventListener('contextmenu', this.blockContextMenu, { capture: true, passive: false });

        // Блокираме drag операции
        document.addEventListener('dragstart', this.blockDrag, { capture: true, passive: false });
        document.addEventListener('drop', this.blockDrag, { capture: true, passive: false });

        // Блокираме selection
        document.addEventListener('selectstart', this.blockSelection, { capture: true, passive: false });

        // НОВО: Скриваме всички потенциални browser UI елементи
        this.hideBrowserUI();

        console.log('🔒 Enhanced fullscreen protection activated');
    }

    /**
     * НОВО: Hide browser UI elements
     */
    hideBrowserUI() {
        // Добавяме CSS за скриване на browser controls
        const style = document.createElement('style');
        style.id = 'fullscreen-protection-styles';
        style.textContent = `
            /* КРИТИЧНО: Скриваме browser fullscreen controls */
            body:fullscreen {
                -webkit-app-region: no-drag !important;
            }
            
            /* Скриваме hover effects в top area */
            body:fullscreen *:hover {
                cursor: default !important;
            }
            
            /* Блокираме pointer events в top 100px */
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

        // Премахваме стар style ако съществува
        const existingStyle = document.getElementById('fullscreen-protection-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        document.head.appendChild(style);
    }

    /**
     * НОВО: Block context menu
     */
    blockContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }

    /**
     * НОВО: Block drag operations
     */
    blockDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }

    /**
     * НОВО: Block text selection
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
        // Hide login container
        this.containers.login.style.display = 'none';

        // Show exam container
        this.containers.exam.style.display = 'block';

        // Update state
        this.state.currentView = 'exam';
        this.state.isExamActive = true;

        // Start timer
        this.components.examTimer.start();

        // Focus on code editor
        this.components.codeEditor.focus();

        console.log('📚 Switched to exam view');
    }

    /**
     * Handle finish exam
     */
    handleFinishExam() {
        if (confirm('Сигурни ли сте че искате да завършите изпита?')) {
            this.examService.completeExam();

            // Use ExamExitManager if available
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

        // Use ExamExitManager if available
        if (window.ExamExitManager) {
            window.ExamExitManager.handleExamExit('TIME_EXPIRED', {
                message: 'Времето за изпита изтече!'
            });
        }
    }

    /**
     * Handle time warning
     */
    handleTimeWarning(data) {
        const { minutesLeft, message } = data;

        // Show notification
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
     * Handle fullscreen change - ПОПРАВЕНО: Enhanced detection
     */
    handleFullscreenChange() {
        const isFullscreen = !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement);

        this.state.isFullscreenActive = isFullscreen;

        if (!isFullscreen && this.state.isExamActive) {
            console.warn('⚠️ Exited fullscreen during exam!');

            // Почистваме protection
            this.cleanupFullscreenProtection();

            if (this.antiCheatCore) {
                this.antiCheatCore.handleFullscreenExit();
            }
        } else if (isFullscreen) {
            // Усилваме защитата когато влизаме в fullscreen
            setTimeout(() => {
                this.enhanceFullscreenProtection();
            }, 500);
        }
    }

    /**
     * НОВО: Cleanup fullscreen protection
     */
    cleanupFullscreenProtection() {
        // Премахваме overlay
        const overlay = document.getElementById('fullscreen-protection');
        if (overlay) {
            overlay.remove();
        }

        // Премахваме styles
        const style = document.getElementById('fullscreen-protection-styles');
        if (style) {
            style.remove();
        }

        // Премахваме event listeners
        document.removeEventListener('contextmenu', this.blockContextMenu, { capture: true });
        document.removeEventListener('dragstart', this.blockDrag, { capture: true });
        document.removeEventListener('drop', this.blockDrag, { capture: true });
        document.removeEventListener('selectstart', this.blockSelection, { capture: true });

        console.log('🧹 Fullscreen protection cleaned up');
    }

    /**
     * Handle fullscreen error
     */
    handleFullscreenError(error) {
        console.error('❌ Fullscreen error:', error);
        // Could show user-friendly error message
    }

    /**
     * Handle exam expired
     */
    handleExamExpired(data) {
        this.state.isExamActive = false;
        this.components.codeEditor.disable();

        // Use ExamExitManager if available
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

        // Use ExamExitManager if available
        if (window.ExamExitManager) {
            window.ExamExitManager.handleExamExit('INSTRUCTOR_TERMINATED', {
                message: data.message || 'Изпитът беше прекратен от преподавателя',
                reason: data.reason
            });
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        // Cleanup fullscreen protection
        this.cleanupFullscreenProtection();

        // Cleanup components
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });

        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }

        console.log('🧹 ExamWorkspace destroyed');
    }
}