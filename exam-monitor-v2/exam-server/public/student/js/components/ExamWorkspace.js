/**
 * ExamWorkspace Component - Clean Architecture
 * Main exam coordinator with nuclear fullscreen protection
 * FOLLOWS REFACTORING GUIDELINES: No inline HTML/CSS, clean separation
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
            currentView: 'login',
            isExamActive: false,
            isFullscreenActive: false,
            studentName: null,
            studentClass: null,
            nuclearProtectionActive: false
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

        // Nuclear protection tracking
        this.nuclearOverlays = new Map();

        this.validateContainers();
        this.initializeComponents();
        this.setupEventListeners();
        this.setupFullscreenHandling();

        console.log('💀 ExamWorkspace initialized - NUCLEAR PROTECTION READY');
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
        // Initialize with correct parameters
        this.components.loginForm = new LoginForm(this.websocketService);
        this.components.examTimer = new ExamTimer(document.getElementById('exam-timer'));
        this.components.codeEditor = new CodeEditor(document.getElementById('code-editor'));
        this.components.consoleOutput = new ConsoleOutput(this.containers.output);

        console.log('🧩 Components initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Component events
        this.components.loginForm.on('loginSubmit', (data) => this.handleLoginSubmit(data));
        this.components.codeEditor.on('codeSaved', (data) => this.handleCodeSaved(data));
        this.components.codeEditor.on('runCode', (data) => this.handleRunCode(data));

        // WebSocket events - use correct event names
        this.websocketService.on('studentIdAssigned', (data) => this.handleNewSession(data));
        this.websocketService.on('sessionRestored', (data) => this.handleSessionRestore(data));
        this.websocketService.on('loginError', (data) => this.handleLoginError(data));
        this.websocketService.on('examExpired', (data) => this.handleExamExpired(data));
        this.websocketService.on('forceDisconnect', (data) => this.handleForceDisconnect(data));

        // Finish exam button
        const finishBtn = document.getElementById('finish-exam-btn');
        if (finishBtn) {
            finishBtn.addEventListener('click', () => this.handleFinishExam());
        }
    }

    /**
     * Setup fullscreen handling with nuclear protection
     */
    setupFullscreenHandling() {
        // Fullscreen change events
        const fullscreenEvents = [
            'fullscreenchange',
            'webkitfullscreenchange',
            'mozfullscreenchange',
            'MSFullscreenChange'
        ];

        fullscreenEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.handleFullscreenChange();
            });
        });

        // Fullscreen error handling
        document.addEventListener('fullscreenerror', (event) => {
            console.error('Fullscreen error:', event);
            this.handleFullscreenError(event);
        });

        // Escape key blocking during exam
        document.addEventListener('keydown', (e) => {
            if (this.state.isFullscreenActive && e.key === 'Escape') {
                e.preventDefault();
                console.warn('🚨 ESC pressed during exam - showing violation warning');
                this.handleEscapeViolation();
            }
        });
    }

    /**
     * Handle login form submission
     */
    async handleLoginSubmit(data) {
        const { studentName, studentClass } = data;

        try {
            this.websocketService.emit('student-join', {
                studentName,
                studentClass
            });

            // Store for later use
            this.state.studentName = studentName;
            this.state.studentClass = studentClass;

        } catch (error) {
            console.error('❌ Login failed:', error);
            this.components.loginForm.showError('Login failed. Please try again.');
        }
    }

    /**
     * Handle successful login and session creation
     */
    async handleLoginSuccess(sessionData) {
        console.log('📝 Login successful:', sessionData);

        this.state.currentView = 'exam';
        this.state.isExamActive = true;

        // Update components
        this.components.examTimer.start(sessionData.timeLeft);
        this.examService.start(sessionData.sessionId);

        // Initialize and activate anti-cheat with proper parameters
        try {
            // FIXED: Initialize before activate
            if (!this.antiCheatCore.violationTracker) {
                await this.antiCheatCore.initialize();
            }

            // Switch to exam view and enter fullscreen
            this.showExamView();
            await this.enterFullscreen();

        } catch (error) {
            console.error('❌ Failed to activate anti-cheat:', error);
            // Continue with exam but log error
            this.showExamView();
        }
    }

    /**
     * Show exam view and hide login
     */
    showExamView() {
        this.containers.login.style.display = 'none';
        this.containers.exam.style.display = 'flex';

        // Load saved code if available
        const savedCode = sessionStorage.getItem('exam_code') || '';
        this.components.codeEditor.setCode(savedCode);
    }

    /**
     * Enter fullscreen mode with nuclear protection
     */
    async enterFullscreen() {
        try {
            const element = document.documentElement;

            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            }

            // Activate anti-cheat after successful fullscreen
            await this.antiCheatCore.activate();

        } catch (error) {
            console.error('❌ Failed to enter fullscreen:', error);
            throw error;
        }
    }

    /**
     * Handle fullscreen state changes
     */
    handleFullscreenChange() {
        const isFullscreen = !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement);

        if (isFullscreen) {
            this.state.isFullscreenActive = true;
            this.activateNuclearProtection();
            console.log('💀 NUCLEAR FULLSCREEN PROTECTION ACTIVATED');
        } else {
            this.state.isFullscreenActive = false;

            if (this.state.isExamActive) {
                console.error('💀 UNAUTHORIZED FULLSCREEN EXIT');
                this.handleUnauthorizedExit();
            }
        }

        // Update anti-cheat system
        if (this.antiCheatCore) {
            this.antiCheatCore.setFullscreenMode(isFullscreen);
        }
    }

    /**
     * Activate nuclear protection (overlays and CSS loaded from files)
     */
    activateNuclearProtection() {
        if (this.state.nuclearProtectionActive) return;

        this.state.nuclearProtectionActive = true;
        console.log('💀 Activating NUCLEAR protection layers...');

        // Add nuclear protection CSS class to body
        document.body.classList.add('nuclear-protection-active');

        // Create overlays with CSS classes (no inline styles)
        this.createNuclearOverlays();

        console.log('💀💀💀 NUCLEAR PROTECTION LAYERS ACTIVE');
    }

    /**
     * Create nuclear overlays using CSS classes
     */
    createNuclearOverlays() {
        const overlayConfigs = [
            { id: 'nuclear-top', className: 'nuclear-overlay-top' },
            { id: 'nuclear-right', className: 'nuclear-overlay-right' },
            { id: 'nuclear-bottom', className: 'nuclear-overlay-bottom' },
            { id: 'nuclear-left', className: 'nuclear-overlay-left' },
            { id: 'nuclear-x-1', className: 'nuclear-overlay-x-button' },
            { id: 'nuclear-x-2', className: 'nuclear-overlay-x-extended' },
            { id: 'nuclear-x-3', className: 'nuclear-overlay-x-wide' }
        ];

        overlayConfigs.forEach(config => {
            const overlay = document.createElement('div');
            overlay.id = config.id;
            overlay.className = `nuclear-overlay ${config.className}`;

            // Add violation handlers
            this.addViolationHandlers(overlay);

            document.documentElement.appendChild(overlay);
            this.nuclearOverlays.set(config.id, overlay);
        });

        console.log('💀 Nuclear overlays deployed');
    }

    /**
     * Add violation handlers to overlay elements
     */
    addViolationHandlers(overlay) {
        const events = ['click', 'mousedown', 'mouseup', 'mousemove', 'contextmenu'];

        events.forEach(eventType => {
            overlay.addEventListener(eventType, (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.error(`💀 NUCLEAR OVERLAY VIOLATION: ${eventType} on ${overlay.id}`);

                if (this.antiCheatCore?.detectionEngine) {
                    this.antiCheatCore.detectionEngine.handleCriticalDetection('nuclear_overlay_violation', {
                        event: eventType,
                        overlayId: overlay.id,
                        timestamp: Date.now()
                    });
                }
            }, { capture: true, passive: false });
        });
    }

    /**
     * Handle unauthorized fullscreen exit
     */
    handleUnauthorizedExit() {
        if (this.antiCheatCore?.detectionEngine) {
            this.antiCheatCore.detectionEngine.handleCriticalDetection('unauthorized_fullscreen_exit', {
                timestamp: Date.now(),
                examActive: true
            });
        }
    }

    /**
     * Handle escape key violation
     */
    handleEscapeViolation() {
        if (this.antiCheatCore?.detectionEngine) {
            this.antiCheatCore.detectionEngine.handleCriticalDetection('escapeKey', {
                key: 'Escape',
                blocked: true,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Handle login error
     */
    handleLoginError(data) {
        console.error('❌ Login error:', data);

        // Let LoginForm handle the error display
        if (this.components.loginForm?.handleLoginError) {
            this.components.loginForm.handleLoginError(data);
        }
    }

    /**
     * Handle session restoration
     */
    handleSessionRestore(data) {
        console.log('📝 Session restored:', data);
        this.handleLoginSuccess(data);
    }

    /**
     * Handle new session creation
     */
    handleNewSession(data) {
        console.log('📝 New session created:', data.sessionId);
        this.handleLoginSuccess(data);
    }

    /**
     * Handle code save
     */
    handleCodeSaved(data) {
        // Save to session storage as backup
        sessionStorage.setItem('exam_code', data.code);

        // Send to server via exam service
        this.examService.saveCode(data.code);
    }

    /**
     * Handle code execution
     */
    handleRunCode(data) {
        this.components.consoleOutput.executeCode(data.code);
    }

    /**
     * Handle exam expiration
     */
    handleExamExpired(data) {
        this.state.isExamActive = false;
        this.components.codeEditor.disable();
        this.cleanupNuclearProtection();

        // Show exit screen or redirect
        alert(data.message || 'Времето за изпита изтече!');
    }

    /**
     * Handle forced disconnection
     */
    handleForceDisconnect(data) {
        this.state.isExamActive = false;
        this.cleanupNuclearProtection();

        alert(data.message || 'Изпитът беше прекратен от преподавателя');
    }

    /**
     * Handle finish exam button
     */
    handleFinishExam() {
        if (confirm('Сигурни ли сте, че искате да завършите изпита?')) {
            this.state.isExamActive = false;
            this.examService.finishExam();
            this.cleanupNuclearProtection();
        }
    }

    /**
     * Handle fullscreen errors
     */
    handleFullscreenError(error) {
        console.error('❌ Fullscreen error:', error);

        if (this.state.isExamActive && this.antiCheatCore?.detectionEngine) {
            this.antiCheatCore.detectionEngine.handleCriticalDetection('fullscreen_failure', {
                error: error.message || 'Unknown fullscreen error',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Cleanup nuclear protection
     */
    cleanupNuclearProtection() {
        if (!this.state.nuclearProtectionActive) return;

        console.log('🧹 Cleaning up nuclear protection...');

        // Remove CSS class
        document.body.classList.remove('nuclear-protection-active');

        // Remove overlays
        this.nuclearOverlays.forEach((overlay) => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
        this.nuclearOverlays.clear();

        this.state.nuclearProtectionActive = false;
        console.log('✅ Nuclear protection cleanup complete');
    }

    /**
     * Emergency deactivation
     */
    emergencyDeactivate() {
        console.log('🚨 Emergency deactivation initiated...');

        this.cleanupNuclearProtection();

        if (this.antiCheatCore) {
            this.antiCheatCore.deactivate();
        }

        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {
                console.warn('Could not exit fullscreen during emergency');
            });
        }

        console.log('✅ Emergency deactivation complete');
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.cleanupNuclearProtection();

        Object.values(this.components).forEach(component => {
            if (component?.destroy) {
                component.destroy();
            }
        });

        if (document.exitFullscreen) {
            document.exitFullscreen();
        }

        console.log('🧹 ExamWorkspace destroyed');
    }
}