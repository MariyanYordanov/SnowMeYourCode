/**
 * ExamWorkspace Component - NUCLEAR FULLSCREEN PROTECTION
 * Enhanced with aggressive overlay protection and zero tolerance
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
            nuclearProtectionActive: false  // ← НОВО
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

        // NUCLEAR: Protection overlays tracking
        this.nuclearOverlays = new Map();
        this.protectionLayers = [];

        this.validateContainers();
        this.initializeComponents();
        this.setupEventListeners();
        this.setupNuclearFullscreenHandling();

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

        // Initialize code editor with executeCode() support
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
        // Run code button - ПОПРАВЕН с executeCode()
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
     * NUCLEAR: Setup fullscreen handling with ZERO TOLERANCE
     */
    setupNuclearFullscreenHandling() {
        // Fullscreen change events
        document.addEventListener('fullscreenchange', () => {
            this.handleNuclearFullscreenChange();
        });

        document.addEventListener('fullscreenerror', (event) => {
            console.error('Fullscreen error:', event);
            this.handleFullscreenError(event);
        });

        // NUCLEAR: ALL forbidden keys trigger immediate termination
        document.addEventListener('keydown', (e) => {
            if (this.state.isFullscreenActive) {
                this.handleNuclearKeyPress(e);
            }
        }, { capture: true, passive: false });

        console.log('💀 NUCLEAR fullscreen protection armed');
    }

    /**
     * NUCLEAR: Handle any key press in fullscreen
     */
    handleNuclearKeyPress(e) {
        // Define NUCLEAR forbidden keys (immediate termination)
        const nuclearKeys = [
            'Escape', 'F11', 'F5', 'F1', 'F12',
            'Meta', 'OS', 'ContextMenu'
        ];

        const nuclearCombos = [
            e.altKey && e.key === 'F4',           // Alt+F4
            e.altKey && e.key === 'Tab',          // Alt+Tab
            e.ctrlKey && e.key === 'w',           // Ctrl+W
            e.ctrlKey && e.key === 't',           // Ctrl+T
            e.ctrlKey && e.key === 'r',           // Ctrl+R
            e.ctrlKey && e.key === 'l',           // Ctrl+L
            e.ctrlKey && e.shiftKey && e.key === 'I', // Ctrl+Shift+I
            e.metaKey,                            // Windows key
        ];

        // Check if it's a forbidden key or combo
        if (nuclearKeys.includes(e.key) || nuclearCombos.some(combo => combo)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            console.error(`💀 NUCLEAR KEY DETECTED: ${e.key}`);

            // Trigger immediate termination via anti-cheat
            if (this.antiCheatCore && this.antiCheatCore.detectionEngine) {
                this.antiCheatCore.detectionEngine.handleNuclearDetection('forbidden_key_nuclear', {
                    key: e.key,
                    code: e.code,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    shiftKey: e.shiftKey,
                    metaKey: e.metaKey,
                    timestamp: Date.now()
                });
            }

            return false;
        }
    }

    /**
     * NUCLEAR: Handle fullscreen changes with ZERO TOLERANCE
     */
    handleNuclearFullscreenChange() {
        const isFullscreen = !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement);

        if (isFullscreen) {
            // Entering fullscreen - ACTIVATE NUCLEAR PROTECTION
            this.state.isFullscreenActive = true;
            this.activateNuclearProtection();
            console.log('💀 NUCLEAR FULLSCREEN PROTECTION ACTIVATED');
        } else {
            // Exiting fullscreen - IMMEDIATE TERMINATION
            this.state.isFullscreenActive = false;

            if (this.state.isExamActive) {
                console.error('💀 NUCLEAR VIOLATION: Unauthorized fullscreen exit');

                // Trigger immediate termination
                if (this.antiCheatCore && this.antiCheatCore.detectionEngine) {
                    this.antiCheatCore.detectionEngine.handleNuclearDetection('unauthorized_fullscreen_exit', {
                        timestamp: Date.now(),
                        examActive: true
                    });
                }
            }
        }

        // Update anti-cheat system
        if (this.antiCheatCore) {
            this.antiCheatCore.setFullscreenMode(isFullscreen);
        }
    }

    /**
     * NUCLEAR: Activate protection layers
     */
    activateNuclearProtection() {
        if (this.state.nuclearProtectionActive) return;

        this.state.nuclearProtectionActive = true;
        console.log('💀 Activating NUCLEAR protection layers...');

        // Layer 1: Create invisible overlays covering browser chrome
        this.createNuclearOverlays();

        // Layer 2: Apply nuclear CSS protection
        this.applyNuclearCSS();

        // Layer 3: Block browser interactions
        this.blockBrowserInteractions();

        // Layer 4: Create monitoring indicators
        this.createMonitoringIndicators();

        console.log('💀💀💀 NUCLEAR PROTECTION LAYERS ACTIVE');
    }

    /**
     * NUCLEAR: Create invisible overlays covering ALL browser chrome
     */
    createNuclearOverlays() {
        const overlayConfigs = [
            // Top chrome (X button, tabs, address bar)
            { id: 'nuclear-top', top: 0, left: 0, right: 0, height: 120 },
            // Right edge (scroll bars, resize)
            { id: 'nuclear-right', top: 0, right: 0, bottom: 0, width: 80 },
            // Bottom chrome (status bar, downloads)
            { id: 'nuclear-bottom', bottom: 0, left: 0, right: 0, height: 60 },
            // Left edge
            { id: 'nuclear-left', top: 0, left: 0, bottom: 0, width: 30 },
            // X button specific area (multiple layers)
            { id: 'nuclear-x-1', top: 0, right: 0, width: 100, height: 100 },
            { id: 'nuclear-x-2', top: -10, right: -10, width: 120, height: 120 },
            { id: 'nuclear-x-3', top: -20, right: -20, width: 140, height: 140 }
        ];

        overlayConfigs.forEach(config => {
            const overlay = this.createNuclearOverlay(config);
            this.nuclearOverlays.set(config.id, overlay);
        });

        console.log('💀 Nuclear overlays deployed');
    }

    /**
     * Create individual nuclear overlay
     */
    createNuclearOverlay(config) {
        const overlay = document.createElement('div');
        overlay.id = config.id;
        overlay.className = 'nuclear-overlay';

        // Maximum z-index and aggressive blocking
        overlay.style.cssText = `
            position: fixed;
            ${config.top !== undefined ? `top: ${config.top}px;` : ''}
            ${config.bottom !== undefined ? `bottom: ${config.bottom}px;` : ''}
            ${config.left !== undefined ? `left: ${config.left}px;` : ''}
            ${config.right !== undefined ? `right: ${config.right}px;` : ''}
            ${config.width !== undefined ? `width: ${config.width}px;` : ''}
            ${config.height !== undefined ? `height: ${config.height}px;` : ''}
            z-index: 2147483647;
            background: transparent;
            pointer-events: all;
            cursor: not-allowed;
            user-select: none;
        `;

        // Add nuclear event handlers
        this.addNuclearEventHandlers(overlay);

        document.documentElement.appendChild(overlay);
        return overlay;
    }

    /**
     * Add nuclear event handlers to overlay
     */
    addNuclearEventHandlers(overlay) {
        const nuclearEvents = [
            'click', 'mousedown', 'mouseup', 'mousemove',
            'contextmenu', 'wheel', 'dblclick',
            'touchstart', 'touchend', 'touchmove'
        ];

        nuclearEvents.forEach(eventType => {
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                console.error(`💀 NUCLEAR OVERLAY VIOLATION: ${eventType} on ${overlay.id}`);

                // Immediate termination for ANY overlay interaction
                if (this.antiCheatCore && this.antiCheatCore.detectionEngine) {
                    this.antiCheatCore.detectionEngine.handleNuclearDetection('nuclear_overlay_violation', {
                        event: eventType,
                        overlayId: overlay.id,
                        x: e.clientX,
                        y: e.clientY,
                        timestamp: Date.now()
                    });
                }

                return false;
            };

            overlay.addEventListener(eventType, handler, {
                capture: true,
                passive: false
            });
        });
    }

    /**
     * NUCLEAR: Apply aggressive CSS protection
     */
    applyNuclearCSS() {
        const nuclearStyle = document.createElement('style');
        nuclearStyle.id = 'nuclear-css-protection';
        nuclearStyle.textContent = `
            /* NUCLEAR CSS PROTECTION */
            html, body {
                overflow: hidden !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-app-region: no-drag !important;
                position: fixed !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            /* Hide ALL browser UI elements */
            ::-webkit-scrollbar { display: none !important; }
            ::selection { background: transparent !important; }
            ::-moz-selection { background: transparent !important; }
            
            /* Block ALL interactions except code editor */
            * { 
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                pointer-events: none !important;
            }
            
            /* Enable interactions ONLY for exam elements */
            #code-editor,
            #run-code-btn,
            #save-code-btn,
            #clear-output-btn,
            #finish-exam-btn,
            .exam-container,
            .exam-container * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                pointer-events: auto !important;
            }
            
            /* Force cursor for dangerous areas */
            .nuclear-overlay {
                cursor: not-allowed !important;
                pointer-events: all !important;
            }
            
            /* Hide dangerous browser elements */
            body:fullscreen {
                cursor: default !important;
            }
        `;

        document.head.appendChild(nuclearStyle);
        console.log('💀 Nuclear CSS protection applied');
    }

    /**
     * NUCLEAR: Block browser interactions
     */
    blockBrowserInteractions() {
        // Block beforeunload to prevent easy exit
        const beforeUnloadHandler = (e) => {
            const message = '💀 NUCLEAR PROTECTION: Изпитът е защитен от излизане!';
            e.preventDefault();
            e.returnValue = message;
            return message;
        };

        window.addEventListener('beforeunload', beforeUnloadHandler);

        // Block window.close
        window.close = () => {
            console.error('💀 NUCLEAR: window.close() blocked');
            if (this.antiCheatCore && this.antiCheatCore.detectionEngine) {
                this.antiCheatCore.detectionEngine.handleNuclearDetection('window_close_attempt', {
                    timestamp: Date.now()
                });
            }
        };

        console.log('💀 Browser interactions blocked');
    }

    /**
     * Create monitoring indicators
     */
    createMonitoringIndicators() {
        // Nuclear monitoring indicator
        const indicator = document.createElement('div');
        indicator.id = 'nuclear-monitoring-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #ff0000, #8b0000);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-family: 'Arial Black', Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 2147483646;
            pointer-events: none;
            animation: nuclearPulse 1.5s infinite;
            box-shadow: 0 0 20px rgba(255, 0, 0, 0.7);
        `;

        indicator.innerHTML = '💀 NUCLEAR PROTECTION ACTIVE 💀';

        // Add nuclear pulse animation
        const pulseStyle = document.createElement('style');
        pulseStyle.textContent = `
            @keyframes nuclearPulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.05); }
                100% { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(pulseStyle);

        document.body.appendChild(indicator);
        console.log('💀 Nuclear monitoring indicators active');
    }

    /**
     * Enter fullscreen mode with NUCLEAR protection
     */
    async enterFullscreen() {
        try {
            const element = document.documentElement;

            if (element.requestFullscreen) {
                await element.requestFullscreen({ navigationUI: "hide" });
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
            }

            // Activate anti-cheat after fullscreen
            if (this.antiCheatCore) {
                await this.antiCheatCore.activate();
                this.antiCheatCore.setFullscreenMode(true);
            }

            console.log('💀 NUCLEAR fullscreen mode activated');

        } catch (error) {
            console.error('❌ Failed to enter fullscreen:', error);
            throw error;
        }
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
        this.components.consoleOutput.execute(data.code);
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
            this.cleanupNuclearProtection();

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
        this.cleanupNuclearProtection();

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

        // If fullscreen fails, trigger immediate termination
        if (this.state.isExamActive && this.antiCheatCore && this.antiCheatCore.detectionEngine) {
            this.antiCheatCore.detectionEngine.handleNuclearDetection('fullscreen_failure', {
                error: error.message || 'Unknown fullscreen error',
                timestamp: Date.now()
            });
        }
    }

    /**
     * NUCLEAR: Cleanup protection when exam ends legitimately
     */
    cleanupNuclearProtection() {
        if (!this.state.nuclearProtectionActive) return;

        console.log('🧹 Cleaning up nuclear protection...');

        // Remove nuclear overlays
        this.nuclearOverlays.forEach((overlay, id) => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
        this.nuclearOverlays.clear();

        // Remove nuclear CSS
        const nuclearStyle = document.getElementById('nuclear-css-protection');
        if (nuclearStyle) nuclearStyle.remove();

        // Remove monitoring indicators
        const indicator = document.getElementById('nuclear-monitoring-indicator');
        if (indicator) indicator.remove();

        // Reset state
        this.state.nuclearProtectionActive = false;

        console.log('✅ Nuclear protection cleanup complete');
    }

    /**
     * Emergency deactivation (for legitimate exam completion)
     */
    emergencyDeactivate() {
        console.log('🚨 Emergency deactivation initiated...');

        this.cleanupNuclearProtection();

        if (this.antiCheatCore) {
            this.antiCheatCore.deactivate();
        }

        // Exit fullscreen if possible
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {
                console.warn('Could not exit fullscreen during emergency deactivation');
            });
        }

        console.log('✅ Emergency deactivation complete');
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Clean up nuclear protection
        this.cleanupNuclearProtection();

        // Clean up components
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