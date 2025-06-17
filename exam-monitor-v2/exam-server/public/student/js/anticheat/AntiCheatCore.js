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
        this.devToolsWarned = false;

        // Will be initialized in setup
        this.violationTracker = null;
        this.detectionEngine = null;
        this.uiManager = null;
        this.reportingService = null;

        // Monitoring intervals
        this.monitoringInterval = null;
        this.heartbeatInterval = null;

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

            // Initialize modules - ПОПРАВЕНО: правилен ред на параметрите
            this.violationTracker = new ViolationTracker(this.config);
            this.reportingService = new ReportingService(this.socket, this.sessionId);
            this.uiManager = new UIManager(this.config);
            // ПОПРАВЕНО: подаваме violationTracker като първи параметър
            this.detectionEngine = new DetectionEngine(this.violationTracker, this.config);

            // Setup UI callbacks
            this.uiManager.callbacks.onContinueExam = () => {
                console.log('Student chose to continue');
                this.reportingService.reportActivity({
                    type: 'warning_dismissed'
                });
            };

            this.uiManager.callbacks.onExitExam = () => {
                this.handleTermination('student_choice', 'Student chose to exit');
            };

            // ПРЕМАХНАТО: DetectionEngine не използва callbacks или events
            // Той директно използва violationTracker чрез handleDetection()

            console.log('✅ Anti-cheat modules initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize anti-cheat modules:', error);
            return false;
        }
    }

    /**
     * Activate anti-cheat system
     */
    async activate() {
        if (this.isActive) {
            console.warn('⚠️ Anti-cheat already active');
            return;
        }

        // Initialize modules if not done
        if (!this.violationTracker) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize anti-cheat modules');
            }
        }

        // Activate detection engine - ПОПРАВЕНО: правилен метод
        this.detectionEngine.activate();

        // Start monitoring
        this.startMonitoring();

        this.isActive = true;
        console.log('🛡️ Anti-cheat system ACTIVATED');
    }

    /**
     * Start monitoring intervals
     */
    startMonitoring() {
        // Periodic system checks
        this.monitoringInterval = setInterval(() => {
            this.performSystemCheck();
        }, 5000); // Every 5 seconds

        // Heartbeat to server
        this.heartbeatInterval = setInterval(() => {
            this.reportingService.sendHeartbeat();
        }, 30000); // Every 30 seconds
    }

    /**
     * Perform system integrity check
     */
    performSystemCheck() {
        // Check if still in fullscreen
        if (this.fullscreenMode && !document.fullscreenElement) {
            this.handleViolation({
                type: 'fullscreenExit',
                severity: 'high',
                details: { message: 'Exited fullscreen mode' }
            });
        }

        // Check for developer tools (basic check)
        const devToolsOpen = window.outerHeight - window.innerHeight > 200 ||
            window.outerWidth - window.innerWidth > 200;

        if (devToolsOpen && !this.devToolsWarned) {
            this.devToolsWarned = true;
            this.handleViolation({
                type: 'devTools',
                severity: 'medium',
                details: { message: 'Developer tools detected' }
            });
        }
    }

    /**
     * Handle violation from any source - ПОПРАВЕНО: един параметър
     */
    handleViolation(data) {
        const { type, severity = 'medium', details = {} } = data;
        console.warn(`🚨 Violation detected: ${type} (${severity})`);

        // Track violation
        const result = this.violationTracker.addViolation(type, severity, details);

        // Report to server
        this.reportingService.reportViolation({
            type,
            severity,
            details,
            count: result.count,
            totalScore: result.totalScore,
            timestamp: Date.now()
        });

        // Take action based on severity and count
        this.handleViolationAction(type, severity, result);

        return result;
    }

    /**
     * Handle violation actions
     */
    handleViolationAction(type, severity, violationResult) {
        const { count, totalScore, terminated } = violationResult;

        // Check if should terminate
        if (terminated) {
            this.handleTermination(type, 'Maximum violations exceeded');
            return;
        }

        // Get max attempts for this type
        const maxAttempts = this.getMaxAttempts(type);

        // Show warnings based on severity
        if (severity === 'critical' || count >= maxAttempts - 1) {
            // Show blocking warning
            this.showBlockingWarning(type, count, maxAttempts);
        } else if (severity === 'high' || count >= maxAttempts / 2) {
            // Show prominent notification
            this.uiManager.showNotification(
                this.getViolationMessage(type, count),
                'warning',
                5000
            );
        } else {
            // Log only for low severity
            console.log(`Violation logged: ${type} (${count})`);
        }
    }

    /**
     * Show blocking warning dialog
     */
    showBlockingWarning(type, count, maxAttempts) {
        const config = {
            title: '⚠️ ВНИМАНИЕ! НАРУШЕНИЕ!',
            message: this.getViolationMessage(type, count),
            severity: count >= maxAttempts - 1 ? 'critical' : 'high',
            description: `Опит ${count} от ${maxAttempts}. При достигане на лимита изпитът ще бъде прекратен!`,
            continueText: 'Продължи изпита',
            exitText: 'Прекрати изпита'
        };

        this.uiManager.showWarningDialog(config);
    }

    /**
     * Handle termination
     */
    handleTermination(reason, details) {
        console.error(`🛑 EXAM TERMINATED: ${reason}`);

        // Report termination
        this.reportingService.reportTermination({
            reason,
            details,
            violations: this.violationTracker.getViolationHistory(),
            timestamp: Date.now()
        });

        // Show termination screen
        this.uiManager.showTerminationScreen({
            reason: reason,
            message: 'Изпитът беше прекратен поради нарушения на правилата.',
            violations: this.violationTracker.getViolationHistory()
        });

        // Deactivate system
        this.deactivate();

        // Trigger exam exit - ПОПРАВЕНО: използваме import
        import('/student/js/components/ExamExitManager.js').then(({ examExitManager }) => {
            examExitManager.handleExamExit('anti_cheat_violation', {
                reason,
                details
            });
        });
    }

    /**
     * Handle fullscreen exit
     */
    handleFullscreenExit() {
        if (!this.isActive) return;

        this.handleViolation({
            type: 'fullscreenExit',
            severity: 'high',
            details: { message: 'Exited fullscreen during exam' }
        });
    }

    /**
     * Deactivate anti-cheat system
     */
    deactivate() {
        if (!this.isActive) return;

        // Stop monitoring
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        // Stop detection - ПОПРАВЕНО: правилен метод
        if (this.detectionEngine) {
            this.detectionEngine.deactivate();
        }

        // Clear UI
        if (this.uiManager) {
            this.uiManager.hideAll();
        }

        this.isActive = false;
        console.log('🔓 Anti-cheat system DEACTIVATED');
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
            fullscreenExit: 3,
            clipboardAttempt: 3,
            rightClick: 5,
            devTools: 2
        };
        return limits[type] || 3;
    }

    getViolationMessage(type, count) {
        const messages = {
            windowsKey: `Windows клавиш засечен (${count}/2)`,
            focusLoss: `Излизане от прозореца (${count}/5)`,
            fullscreenExit: `Излизане от fullscreen (${count}/3)`,
            clipboardAttempt: 'Опит за копиране/поставяне',
            rightClick: 'Десен клик ограничен',
            devTools: 'Developer tools засечени'
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