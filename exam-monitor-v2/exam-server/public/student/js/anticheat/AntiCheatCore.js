/**
 * AntiCheatCore - Main coordinator for anti-cheat system
 * Orchestrates all anti-cheat modules and provides unified API
 */
export class AntiCheatCore {
    constructor(socket, sessionId, config = {}) {
        this.socket = socket;
        this.sessionId = sessionId;
        this.isActive = false;
        this.fullscreenMode = false;

        // Will be initialized in setup
        this.violationTracker = null;
        this.detectionEngine = null;
        this.uiManager = null;
        this.reportingService = null;

        // Default configuration
        this.config = {
            enableAutoWarnings: true,
            enableTeacherNotifications: true,
            logToConsole: true,
            ...config
        };

        console.log('🛡️ AntiCheatCore initialized');
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

            // Setup module interconnections
            this.setupModuleCallbacks();

            console.log('✅ AntiCheat modules initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize anti-cheat modules:', error);
            return false;
        }
    }

    /**
     * Setup callbacks between modules
     */
    setupModuleCallbacks() {
        // ViolationTracker callbacks
        this.violationTracker.setCallbacks({
            onViolationAdded: (data) => this.handleViolationAdded(data),
            onThresholdExceeded: (data) => this.handleThresholdExceeded(data),
            onWarningLevelChanged: (data) => this.handleWarningLevelChanged(data)
        });

        // UIManager callbacks
        this.uiManager.setCallbacks({
            onContinueExam: () => this.handleContinueExam(),
            onExitExam: () => this.handleExitExam(),
            onForceClose: () => this.handleForceClose()
        });

        // ReportingService callbacks
        this.reportingService.setCallback('serverWarning', (data) => {
            this.handleServerWarning(data);
        });

        this.reportingService.setCallback('serverAction', (data) => {
            this.handleServerAction(data);
        });

        console.log('🔗 Module callbacks configured');
    }

    /**
     * Activate anti-cheat protection
     */
    async activate() {
        if (this.isActive) {
            console.log('⚠️ AntiCheat already active');
            return;
        }

        console.log('🚫 Activating anti-cheat protection...');

        // Ensure modules are initialized
        if (!this.violationTracker) {
            const success = await this.initialize();
            if (!success) {
                console.error('❌ Cannot activate - initialization failed');
                return;
            }
        }

        // Activate detection engine
        this.detectionEngine.activate();
        this.isActive = true;

        // Report activation
        await this.reportingService.reportExamEvent('anticheat_activated', {
            config: this.config,
            fullscreenMode: this.fullscreenMode
        });

        console.log('✅ Anti-cheat protection activated');
    }

    /**
     * Deactivate anti-cheat protection
     */
    async deactivate() {
        if (!this.isActive) return;

        console.log('🔓 Deactivating anti-cheat protection...');

        // Deactivate detection
        if (this.detectionEngine) {
            this.detectionEngine.deactivate();
        }

        // Hide any visible warnings
        if (this.uiManager) {
            this.uiManager.hideWarning();
        }

        this.isActive = false;

        // Report deactivation
        if (this.reportingService) {
            await this.reportingService.reportExamEvent('anticheat_deactivated');
        }

        console.log('🔓 Anti-cheat protection deactivated');
    }

    /**
     * Handle violation added
     */
    async handleViolationAdded(data) {
        const { type, violations, thresholdResult } = data;

        if (this.config.logToConsole) {
            console.log(`🚨 Violation: ${type}`, data);
        }

        // Report to server
        await this.reportingService.reportViolation(
            type,
            data,
            this.violationTracker.getViolationSeverity(type)
        );

        // Handle based on threshold result
        if (thresholdResult.exceeded) {
            this.handleThresholdExceeded({ type, result: thresholdResult });
        } else {
            // Show appropriate UI response
            this.showViolationResponse(type, data);
        }
    }

    /**
     * Handle threshold exceeded
     */
    async handleThresholdExceeded(data) {
        const { type, result } = data;

        console.warn(`🚫 Threshold exceeded: ${type} - ${result.action}`);

        // Report critical violation
        await this.reportingService.reportCriticalViolation(type, {
            action: result.action,
            message: result.message,
            violations: this.violationTracker.getStatistics().violations
        });

        // Execute action
        switch (result.action) {
            case 'terminate':
                this.terminateExam(type, result);
                break;
            case 'critical_warning':
                this.showCriticalWarning(type, result);
                break;
            default:
                this.showViolationResponse(type, data);
        }
    }

    /**
     * Handle warning level changed
     */
    handleWarningLevelChanged(data) {
        const { newLevel, violations } = data;

        console.log(`⚠️ Warning level changed: ${newLevel}`, data);

        // Could update UI indicators, change behavior, etc.
        if (newLevel >= 2) {
            this.uiManager.showNotification(
                `Предупреждение ниво ${newLevel} - внимавайте с действията си!`,
                'warning'
            );
        }
    }

    /**
     * Show violation response in UI
     */
    showViolationResponse(type, data) {
        const count = data.count || 1;
        const maxAttempts = this.getMaxAttempts(type);

        // Only show warning if cooldown allows
        if (this.violationTracker.shouldShowWarning()) {
            this.uiManager.showWarning(type, {
                count: count,
                maxAttempts: maxAttempts,
                ...data
            });
        } else {
            // Show minor notification
            this.uiManager.showNotification(
                this.getViolationMessage(type, count),
                'warning'
            );
        }
    }

    /**
     * Show critical warning
     */
    showCriticalWarning(type, result) {
        this.uiManager.showWarning(type, {
            critical: true,
            message: result.message,
            ...result
        });
    }

    /**
     * Terminate exam due to violations
     */
    async terminateExam(violationType, result) {
        console.error(`🚫 TERMINATING EXAM: ${violationType}`);

        // Use ExamExitManager if available
        if (window.ExamExitManager) {
            window.ExamExitManager.handleExamExit(
                window.ExamExitManager.exitReasons.ANTI_CHEAT_VIOLATION,
                {
                    violation: violationType,
                    reason: result.message,
                    automatic: true
                }
            );
        } else {
            // Fallback termination
            this.uiManager.showWarning('totalViolations', {
                immediate: true,
                violationType: violationType,
                message: result.message
            });
        }
    }

    /**
     * Handle continue exam button
     */
    handleContinueExam() {
        console.log('✅ Student chose to continue exam');

        // Focus back on exam
        setTimeout(() => {
            const codeEditor = document.getElementById('code-editor');
            if (codeEditor) {
                codeEditor.focus();
            }
        }, 100);
    }

    /**
     * Handle exit exam button
     */
    handleExitExam() {
        console.log('🚪 Student chose to exit exam');

        if (window.ExamExitManager) {
            window.ExamExitManager.handleExamExit(
                window.ExamExitManager.exitReasons.STUDENT_FINISH,
                { voluntary: true }
            );
        }
    }

    /**
     * Handle force close
     */
    handleForceClose() {
        console.log('🔴 Force close requested');

        if (window.ExamExitManager) {
            window.ExamExitManager.handleExamExit(
                window.ExamExitManager.exitReasons.ANTI_CHEAT_VIOLATION,
                { forced: true }
            );
        }
    }

    /**
     * Handle server warning
     */
    handleServerWarning(data) {
        console.log('📡 Server warning:', data.message);
        this.uiManager.showNotification(data.message, 'warning', 5000);
    }

    /**
     * Handle server action
     */
    handleServerAction(data) {
        console.log('📡 Server action:', data);

        if (data.action === 'force_disconnect') {
            this.terminateExam('server_action', data);
        }
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
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Update module configs
        if (this.violationTracker) {
            this.violationTracker.updateConfig(newConfig);
        }
        if (this.detectionEngine) {
            this.detectionEngine.updateConfig(newConfig);
        }
        if (this.uiManager) {
            this.uiManager.updateConfig(newConfig);
        }

        console.log('⚙️ AntiCheat configuration updated');
    }

    /**
     * Get system statistics
     */
    getStatistics() {
        return {
            isActive: this.isActive,
            fullscreenMode: this.fullscreenMode,
            sessionId: this.sessionId,
            violations: this.violationTracker ? this.violationTracker.getStatistics() : null,
            detection: this.detectionEngine ? this.detectionEngine.getStatistics() : null,
            reporting: this.reportingService ? this.reportingService.getStatus() : null,
            ui: this.uiManager ? this.uiManager.getState() : null
        };
    }

    /**
     * Helper methods
     */
    getMaxAttempts(type) {
        const limits = {
            windowsKey: 2,
            focusLoss: 5,
            fullscreenExit: 3
        };
        return limits[type] || 3;
    }

    getViolationMessage(type, count) {
        const messages = {
            windowsKey: `Windows клавиш засечен (${count}/2)`,
            focusLoss: `Излизане от прозореца (${count}/5)`,
            fullscreenExit: `Излизане от fullscreen (${count}/3)`,
            clipboardAttempt: 'Опит за копиране/поставяне',
            rightClick: 'Десен клик ограничен'
        };
        return messages[type] || `Подозрителна активност: ${type}`;
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