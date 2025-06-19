/**
 * AntiCheatCore - NUCLEAR ZERO TOLERANCE VERSION
 * Main coordinator for anti-cheat system
 * IMMEDIATE TERMINATION - NO WARNINGS - NO MERCY
 */
export class AntiCheatCore {
    constructor(socket, sessionId, config = {}) {
        this.socket = socket;
        this.sessionId = sessionId;
        this.isActive = false;
        this.fullscreenMode = false;
        this.devToolsWarned = false;
        this.devToolsDetected = false;
        this.fullscreenViolationDetected = false;

        // Will be initialized in setup
        this.violationTracker = null;
        this.detectionEngine = null;
        this.uiManager = null;
        this.reportingService = null;

        // Monitoring intervals
        this.monitoringInterval = null;
        this.heartbeatInterval = null;

        // NUCLEAR CONFIGURATION - ZERO TOLERANCE
        this.config = {
            enableAutoWarnings: false,           // ← DISABLED - No warnings!
            enableTeacherNotifications: true,
            logToConsole: true,
            zeroToleranceMode: true,             // ← НОВO - Nuclear mode
            immediateTermination: true,          // ← НОВO - No attempts allowed
            ...config
        };

        console.log('💀 AntiCheatCore initialized - NUCLEAR ZERO TOLERANCE MODE');
    }

    /**
     * Initialize all anti-cheat modules
     */
    async initialize() {
        try {
            console.log('🚀 Initializing anti-cheat modules...');

            // Dynamic imports for modules
            const [
                { ViolationTracker },
                { DetectionEngine },
                { UIManager },
                { ReportingService }
            ] = await Promise.all([
                import('./ViolationTracker.js'),
                import('./DetectionEngine.js'),
                import('./UIManager.js'),
                import('./ReportingService.js')
            ]);

            // Initialize modules
            this.violationTracker = new ViolationTracker(this.config);
            this.reportingService = new ReportingService(this.socket, this.sessionId);
            this.uiManager = new UIManager(this.config);
            this.detectionEngine = new DetectionEngine(this.violationTracker, this.config);

            // НОВО: Setup callback for critical violations от DetectionEngine
            this.detectionEngine.setCriticalViolationCallback((type, data, result) => {
                this.handleCriticalViolationFromDetection(type, data, result);
            });

            // NO UI callbacks needed - immediate termination only
            console.log('✅ Anti-cheat modules initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize anti-cheat modules:', error);
            throw error;
        }
    }

    /**
     * Activate the anti-cheat system
     */
    async activate() {
        if (this.isActive) {
            console.log('⚠️ Anti-cheat system already active');
            return;
        }

        try {
            console.log('🛡️ Activating anti-cheat system...');

            if (!this.detectionEngine) {
                throw new Error('DetectionEngine not initialized');
            }

            this.detectionEngine.activate();
            this.startMonitoring();
            this.startHeartbeat();
            this.isActive = true;

            console.log('🛡️ Anti-cheat system ACTIVATED');

        } catch (error) {
            console.error('❌ Failed to activate anti-cheat system:', error);
            throw error;
        }
    }

    /**
     * NUCLEAR: Handle critical violations - IMMEDIATE TERMINATION ONLY
     */
    handleCriticalViolationFromDetection(type, data, result) {
        console.error(`💀 NUCLEAR VIOLATION DETECTED: ${type}`, { data, result });

        // Log violation details
        const violation = {
            type: type,
            severity: 'NUCLEAR',
            data: data,
            count: result.count || 1,
            timestamp: Date.now(),
            action: 'IMMEDIATE_TERMINATION'
        };

        console.error(`💀 TERMINATION TRIGGERED:`, violation);

        // Report to server
        this.reportingService.reportViolation(violation);

        // 🚨 IMMEDIATE TERMINATION - NO QUESTIONS ASKED
        this.handleImmediateTermination(type, violation);
    }

    /**
     * NUCLEAR: Immediate termination handler
     */
    handleImmediateTermination(violationType, violationData) {
        console.error(`💀💀💀 IMMEDIATE TERMINATION: ${violationType}`);

        // Deactivate all systems
        this.deactivate();

        // Show nuclear termination screen
        this.showNuclearTerminationScreen(violationType, violationData);

        // Report termination to server
        this.reportingService.reportViolation({
            type: 'exam_terminated',
            reason: violationType,
            data: violationData,
            timestamp: Date.now()
        });

        // Block all further interactions
        this.blockAllInteractions();
    }

    /**
     * Show nuclear termination screen
     */
    showNuclearTerminationScreen(violationType, violationData) {
        // Remove all existing content
        document.body.innerHTML = '';

        // Create nuclear termination screen
        const terminationScreen = document.createElement('div');
        terminationScreen.id = 'nuclear-termination';

        terminationScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(45deg, #ff0000, #8b0000);
            color: white;
            font-family: 'Arial Black', Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            z-index: 2147483647;
            user-select: none;
            overflow: hidden;
        `;

        terminationScreen.innerHTML = `
            <div style="font-size: 120px; margin-bottom: 30px; animation: shake 0.5s infinite;">⛔</div>
            <h1 style="font-size: 48px; margin-bottom: 30px; text-shadow: 3px 3px 6px black;">
                ИЗПИТЪТ Е ПРЕКРАТЕН
            </h1>
            <div style="font-size: 28px; margin-bottom: 40px; max-width: 800px; line-height: 1.4;">
                <strong>ПРИЧИНА:</strong> ${this.getNuclearViolationMessage(violationType)}
            </div>
            <div style="font-size: 20px; margin-bottom: 30px; color: #ffcccc;">
                Засечено е нарушение със ZERO TOLERANCE политика
            </div>
            <div style="font-size: 18px; color: #ffdddd; max-width: 600px; line-height: 1.3;">
                • Изпитът е автоматично прекратен<br>
                • Всички данни са запазени<br>
                • Преподавателят е уведомен<br>
                • Този екран НЕ МОЖЕ да бъде затворен
            </div>
            <div style="position: absolute; bottom: 20px; font-size: 14px; color: #ffcccc;">
                Exam Monitor v2 - Nuclear Security System
            </div>
        `;

        // Add shake animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shake {
                0% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                50% { transform: translateX(5px); }
                75% { transform: translateX(-5px); }
                100% { transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(terminationScreen);

        // Block all events on the termination screen
        ['click', 'contextmenu', 'keydown', 'keyup', 'mousedown', 'mouseup'].forEach(eventType => {
            terminationScreen.addEventListener(eventType, (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }, { capture: true, passive: false });
        });
    }

    /**
     * Get nuclear violation message
     */
    getNuclearViolationMessage(violationType) {
        const messages = {
            windowsKey: 'Натискане на Windows клавиш',
            escapeKey: 'Натискане на Escape клавиш',
            altF4Key: 'Натискане на Alt+F4',
            altTabKey: 'Натискане на Alt+Tab',
            topAreaClick: 'Опит за достъп до браузър контролите',
            topAreaRightClick: 'Десен клик в забранена зона',
            ctrlAltDelKey: 'Натискане на Ctrl+Alt+Del',
            taskManagerKey: 'Опит за отваряне на Task Manager',
            devTools: 'Опит за отваряне на Developer Tools',
            focusLoss: 'Излизане от прозореца на изпита',
            fullscreenExit: 'Излизане от fullscreen режим',
            clipboardAttempt: 'Неразрешен достъп до clipboard'
        };

        return messages[violationType] || 'Неидентифицирано нарушение';
    }

    /**
     * Block all interactions after termination
     */
    blockAllInteractions() {
        // Override all global event handlers
        const blockEvent = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        };

        // Block all possible events
        const events = [
            'keydown', 'keyup', 'keypress',
            'mousedown', 'mouseup', 'click', 'dblclick',
            'contextmenu', 'wheel', 'scroll',
            'touchstart', 'touchend', 'touchmove',
            'dragstart', 'drop', 'paste', 'copy', 'cut'
        ];

        events.forEach(eventType => {
            document.addEventListener(eventType, blockEvent, { capture: true, passive: false });
            window.addEventListener(eventType, blockEvent, { capture: true, passive: false });
        });

        // Block beforeunload
        window.addEventListener('beforeunload', (e) => {
            e.preventDefault();
            e.returnValue = 'Изпитът е прекратен. Този прозорец не може да бъде затворен.';
            return 'Изпитът е прекратен. Този прозорец не може да бъде затворен.';
        });

        console.log('🔒 ALL INTERACTIONS BLOCKED');
    }

    /**
     * NUCLEAR: Zero tolerance limits - NO ATTEMPTS ALLOWED
     */
    getMaxAttempts(type) {
        // NUCLEAR POLICY - ZERO TOLERANCE
        const nuclearLimits = {
            windowsKey: 0,              // ← ZERO attempts allowed
            escapeKey: 0,               // ← ZERO attempts allowed
            altF4Key: 0,                // ← ZERO attempts allowed
            altTabKey: 0,               // ← ZERO attempts allowed
            topAreaClick: 0,            // ← ZERO attempts allowed
            topAreaRightClick: 0,       // ← ZERO attempts allowed
            ctrlAltDelKey: 0,           // ← ZERO attempts allowed
            taskManagerKey: 0,          // ← ZERO attempts allowed
            devTools: 0,                // ← ZERO attempts allowed
            focusLoss: 2,               // ← Slightly tolerant for technical issues
            fullscreenExit: 0,          // ← ZERO attempts allowed
            clipboardAttempt: 0,        // ← ZERO attempts allowed
            mouseDangerZone: 5,         // ← Some tolerance for accidental movement
            rightClick: 2               // ← Some tolerance for accidents
        };

        return nuclearLimits[type] !== undefined ? nuclearLimits[type] : 0;
    }

    /**
     * Handle violation (legacy method - now triggers immediate termination)
     */
    handleViolation(type, severity, data) {
        console.error(`💀 NUCLEAR: Legacy violation converted to termination: ${type}`);

        // Convert legacy violation to immediate termination
        this.handleImmediateTermination(type, {
            legacyViolation: true,
            severity: severity,
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Start monitoring systems
     */
    startMonitoring() {
        if (this.monitoringInterval) return;

        this.monitoringInterval = setInterval(() => {
            this.performMonitoringCheck();
        }, 5000); // Every 5 seconds

        console.log('👁️ Monitoring systems started');
    }

    /**
     * Perform periodic monitoring check
     */
    performMonitoringCheck() {
        if (!this.isActive) return;

        // Check for developer tools (simplified but effective)
        const threshold = 160;
        const currentDevToolsOpen = window.outerHeight - window.innerHeight > threshold ||
            window.outerWidth - window.innerWidth > threshold;

        if (currentDevToolsOpen && !this.devToolsDetected) {
            this.devToolsDetected = true;
            this.handleImmediateTermination('devTools', {
                orientation: window.outerHeight - window.innerHeight > threshold ?
                    'horizontal' : 'vertical',
                timestamp: Date.now()
            });
        } else if (!currentDevToolsOpen && this.devToolsDetected) {
            this.devToolsDetected = false;
        }
    }

    /**
     * Start heartbeat
     */
    startHeartbeat() {
        if (this.heartbeatInterval || !this.reportingService) return;

        this.heartbeatInterval = setInterval(() => {
            this.reportingService.sendHeartbeat();
        }, 30000); // Every 30 seconds

        console.log('💓 Heartbeat started');
    }

    /**
     * Set fullscreen mode
     */
    setFullscreenMode(enabled) {
        this.fullscreenMode = enabled;
        if (this.detectionEngine) {
            this.detectionEngine.setFullscreenMode(enabled);
        }
        console.log(`🖥️ Fullscreen mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Deactivate anti-cheat system
     */
    deactivate() {
        if (!this.isActive) return;

        console.log('🔓 Deactivating anti-cheat system...');

        this.isActive = false;

        if (this.detectionEngine) {
            this.detectionEngine.deactivate();
        }

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        console.log('✅ Anti-cheat system deactivated');
    }

    /**
     * Get system statistics
     */
    getStatistics() {
        return {
            isActive: this.isActive,
            fullscreenMode: this.fullscreenMode,
            violations: this.violationTracker ? this.violationTracker.getStatistics() : null,
            detection: this.detectionEngine ? this.detectionEngine.getStatistics() : null,
            reporting: this.reportingService ? this.reportingService.getStatus() : null,
            ui: this.uiManager ? this.uiManager.getState() : null
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        this.deactivate();

        if (this.reportingService) {
            this.reportingService.destroy();
        }

        console.log('🧹 AntiCheatCore destroyed');
    }
}

// Global export for backward compatibility
window.AntiCheatCore = AntiCheatCore;