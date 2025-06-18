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
        this.devToolsDetected = false; // За предотвратяване на множествени devTools детекции
        this.fullscreenViolationDetected = false; // За предотвратяване на множествени fullscreen детекции

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
     * Initialize all anti-cheat modules - ПОПРАВЕНО: Callback integration
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

        // Activate detection engine
        this.detectionEngine.activate();

        // Start monitoring
        this.startMonitoring();

        this.isActive = true;
        console.log('🛡️ Anti-cheat system ACTIVATED');
    }

    /**
     * Start monitoring for violations
     */
    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            this.performSystemCheck();
        }, 1000); // Check every second
    }

    /**
     * Perform system check for violations
     * ПОПРАВЕНО: Премахнато fullscreen checking (DetectionEngine го прави)
     */
    performSystemCheck() {
        if (!this.isActive) return;

        // Check for DevTools - ПОПРАВЕНО: Без nested setInterval!
        const threshold = 160;
        const currentDevToolsOpen = window.outerHeight - window.innerHeight > threshold ||
            window.outerWidth - window.innerWidth > threshold;

        // Само ако преди не бяха отворени, а сега са
        if (currentDevToolsOpen && !this.devToolsDetected) {
            this.devToolsDetected = true;
            this.handleViolation('devTools', 'medium', {
                orientation: window.outerHeight - window.innerHeight > threshold ?
                    'horizontal' : 'vertical'
            });
        } else if (!currentDevToolsOpen && this.devToolsDetected) {
            // Reset флага ако DevTools са затворени
            this.devToolsDetected = false;
        }

        // ПРЕМАХНАТО: Fullscreen checking (DetectionEngine го прави вече)
        // Това причиняваше двойното count-ване на fullscreen violations
    }

    /**
     * НОВО: Handle critical violations from DetectionEngine
     */
    handleCriticalViolationFromDetection(type, data, result) {
        console.log(`🚨 Critical violation from DetectionEngine: ${type}`, { data, result });

        // Determine severity and action based on violation count
        const maxAttempts = this.getMaxAttempts(type);
        const currentCount = result.count || 1;

        // Log violation
        console.log(`Violation logged: ${type} (${currentCount})`);

        // Report to server
        this.reportingService.reportViolation({
            type: type,
            severity: 'high',
            data: data,
            count: currentCount,
            maxAttempts: maxAttempts,
            timestamp: Date.now()
        });

        // Determine action based on count
        if (currentCount >= maxAttempts) {
            // Terminate exam
            this.handleTermination(`${type}_limit_exceeded`,
                `Превишен лимит от ${maxAttempts} опита за ${type}`);
        } else {
            // Show warning dialog ВЕДНАГА
            this.showBlockingWarning(type, currentCount, maxAttempts);
        }
    }

    /**
     * Show blocking warning dialog for critical violations - ПОПРАВЕНО: Support all critical keys
     */
    showBlockingWarning(type, count, maxAttempts) {
        const messages = {
            windowsKey: `⚠️ ВНИМАНИЕ! ЗАСЕЧЕНО НАТИСКАНЕ НА WINDOWS КЛАВИШ!\n\nТова е строго забранено по време на изпита.\n\nОпит ${count} от ${maxAttempts}.\n\nПри достигане на лимита изпитът ще бъде прекратен автоматично!`,

            escapeKey: `⚠️ ВНИМАНИЕ! ЗАСЕЧЕНО НАТИСКАНЕ НА ESCAPE КЛАВИШ!\n\nТова е строго забранено по време на изпита.\n\nОпит ${count} от ${maxAttempts}.\n\nПри достигане на лимита изпитът ще бъде прекратен автоматично!`,

            altF4Key: `⚠️ ВНИМАНИЕ! ЗАСЕЧЕНО НАТИСКАНЕ НА ALT+F4!\n\nТова е строго забранено по време на изпита.\n\nОпит ${count} от ${maxAttempts}.\n\nПри достигане на лимита изпитът ще бъде прекратен автоматично!`,

            altTabKey: `⚠️ ВНИМАНИЕ! ЗАСЕЧЕНО НАТИСКАНЕ НА ALT+TAB!\n\nПревключването между приложения е забранено.\n\nОпит ${count} от ${maxAttempts}.\n\nПри достигане на лимита изпитът ще бъде прекратен автоматично!`,

            topAreaClick: `⚠️ ВНИМАНИЕ! ЗАСЕЧЕН ОПИТ ЗА ЗАТВАРЯНЕ НА ПРОЗОРЕЦА!\n\nКликването в горната част на екрана е забранено.\n\nОпит ${count} от ${maxAttempts}.\n\nПри достигане на лимита изпитът ще бъде прекратен автоматично!`,

            topAreaRightClick: `⚠️ ВНИМАНИЕ! ЗАСЕЧЕН ДЕСЕН КЛИК В ЗАБРАНЕНА ЗОНА!\n\nДесният клик в горната част на екрана е забранен.\n\nОпит ${count} от ${maxAttempts}.\n\nПри достигане на лимита изпитът ще бъде прекратен автоматично!`,

            default: `⚠️ ВНИМАНИЕ! НАРУШЕНИЕ!\n\nЗасечена е забранена активност.\n\nОпит ${count} от ${maxAttempts}.`
        };

        const message = messages[type] || messages.default;

        const config = {
            title: '⚠️ ВНИМАНИЕ! НАРУШЕНИЕ!',
            message: message,
            severity: count >= maxAttempts - 1 ? 'critical' : 'high',
            description: count >= maxAttempts - 1 ?
                'ПОСЛЕДНО ПРЕДУПРЕЖДЕНИЕ! Следващото нарушение ще прекрати изпита!' :
                'Моля, спазвайте правилата на изпита.',
            continueText: 'Продължи изпита',
            exitText: 'Напусни изпита',
            // НОВО: Callback за exit бутона с double confirmation
            onExit: () => this.handleExitWithConfirmation(type)
        };

        this.uiManager.showWarningDialog(config);
    }

    /**
     * НОВО: Handle exit with double confirmation
     */
    handleExitWithConfirmation(violationType) {
        // First confirmation
        const confirmed = confirm('Сигурни ли сте че искате да напуснете изпита?\n\nТова действие не може да бъде отменено!');

        if (!confirmed) {
            console.log('✅ Student cancelled exam exit');
            return;
        }

        // Second confirmation for critical violations
        const doubleConfirm = confirm('ПОСЛЕДНО ПРЕДУПРЕЖДЕНИЕ!\n\nНапускането на изпита ще бъде записано като прекратяване поради нарушение.\n\nНаистина ли искате да продължите?');

        if (!doubleConfirm) {
            console.log('✅ Student cancelled exam exit on second confirmation');
            return;
        }

        // Hide warning dialog first
        if (this.uiManager) {
            this.uiManager.hideWarning();
        }

        // Proceed with exit
        this.handleExamExit(violationType);
    }

    /**
     * НОВО: Handle exam exit using ExamExitManager
     */
    handleExamExit(reason) {
        console.log(`🚪 Handling exam exit: ${reason}`);

        // Try to use ExamExitManager (window global)
        if (window.ExamExitManager && typeof window.ExamExitManager.handleExamExit === 'function') {
            const exitReason = this.mapToExitReason(reason);

            window.ExamExitManager.handleExamExit(exitReason, {
                violationType: reason,
                voluntary: true,
                confirmedByStudent: true,
                timestamp: Date.now()
            });
        } else {
            // Fallback to direct termination
            console.warn('⚠️ ExamExitManager not available, using fallback');
            this.handleTermination(`voluntary_exit_${reason}`, `Student chose to exit due to ${reason}`);
        }
    }

    /**
     * НОВО: Map violation types to ExamExitManager reasons
     */
    mapToExitReason(violationType) {
        const mapping = {
            'windowsKey': 'ANTI_CHEAT_VIOLATION',
            'escapeKey': 'ANTI_CHEAT_VIOLATION',
            'altF4Key': 'ANTI_CHEAT_VIOLATION',
            'altTabKey': 'ANTI_CHEAT_VIOLATION',
            'topAreaClick': 'ANTI_CHEAT_VIOLATION',
            'topAreaRightClick': 'ANTI_CHEAT_VIOLATION',
            'ctrlAltDelKey': 'ANTI_CHEAT_VIOLATION',
            'taskManagerKey': 'ANTI_CHEAT_VIOLATION',
            'fullscreenExit': 'FULLSCREEN_VIOLATION',
            'default': 'STUDENT_FINISH'
        };

        return mapping[violationType] || mapping.default;
    }

    /**
     * Handle violations - enhanced with proper tracking
     */
    handleViolation(type, severity, data = {}) {
        console.log(`🚨 Violation detected: ${type} (${severity})`);

        // Add violation through tracker
        const result = this.violationTracker.addViolation(type, {
            severity,
            timestamp: Date.now(),
            ...data
        });

        // Determine action based on violation count and severity
        const maxAttempts = this.getMaxAttempts(type);
        const shouldWarn = result.warningLevel > 0;
        const shouldTerminate = result.count >= maxAttempts;

        if (shouldTerminate) {
            this.handleTermination(`${type}_violation`,
                `Exceeded maximum attempts for ${type}: ${result.count}/${maxAttempts}`);
            return;
        }

        // Handle violation action
        this.handleViolationAction(type, result, severity);
    }

    /**
     * Handle violation actions
     */
    handleViolationAction(type, result, severity) {
        const { count, warningLevel, thresholdExceeded } = result;
        const maxAttempts = this.getMaxAttempts(type);

        // Report violation
        this.reportingService.reportViolation({
            type,
            severity,
            count,
            warningLevel,
            maxAttempts,
            timestamp: Date.now()
        });

        // Show appropriate response based on severity and count
        if (severity === 'critical' || thresholdExceeded) {
            this.showBlockingWarning(type, count, maxAttempts);
        } else if (warningLevel >= 2) {
            this.showNotification(type, count);
        }

        console.log(`Violation logged: ${type} (${count})`);
    }

    /**
     * Show notification for minor violations
     */
    showNotification(type, count) {
        const maxAttempts = this.getMaxAttempts(type);
        const message = this.getViolationMessage(type, count);

        this.uiManager.showNotification({
            message: `${message} (${count}/${maxAttempts})`,
            type: 'warning',
            duration: 3000
        });
    }

    /**
     * Handle fullscreen exit - ПОПРАВЕНО: Simplified (DetectionEngine handles detection)
     */
    handleFullscreenExit() {
        if (!this.isActive) return;

        // Само логваме, DetectionEngine вече е добавил violation-а
        console.log('🖥️ Fullscreen exit handled by DetectionEngine');

        // ПРЕМАХНАТО: handleViolation call (DetectionEngine го прави)
        // Това причиняваше двойното count-ване
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

        // Stop detection
        if (this.detectionEngine) {
            this.detectionEngine.deactivate();
        }

        // Clear UI
        if (this.uiManager) {
            this.uiManager.hideWarning();
        }

        this.isActive = false;
        console.log('🔓 Anti-cheat system DEACTIVATED');
    }

    /**
     * Handle termination - ПОПРАВЕНО: Better ExamExitManager integration
     */
    handleTermination(reason, details) {
        console.error(`🛑 EXAM TERMINATED: ${reason}`);

        // Get violation data
        const violationData = this.violationTracker &&
            typeof this.violationTracker.getViolationHistory === 'function'
            ? this.violationTracker.getViolationHistory()
            : { violations: {}, totalCount: 0 };

        // Report termination
        this.reportingService.reportTermination({
            reason,
            details,
            violations: violationData,
            timestamp: Date.now()
        });

        // Show termination screen
        this.uiManager.showTerminationScreen({
            reason: reason,
            message: 'Изпитът беше прекратен поради нарушения на правилата.',
            violations: violationData
        });

        // Deactivate system
        this.deactivate();

        // ПОПРАВЕНО: Use window.ExamExitManager directly
        if (window.ExamExitManager && typeof window.ExamExitManager.handleExamExit === 'function') {
            const exitReason = this.mapToExitReason(reason);

            window.ExamExitManager.handleExamExit(exitReason, {
                reason: reason,
                details: details,
                automatic: true,
                violationTerminated: true
            });
        } else {
            console.warn('⚠️ ExamExitManager not available during termination');
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
     * Check if document is in fullscreen
     */
    isDocumentInFullscreen() {
        return !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement);
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
     * Helper methods - ПОПРАВЕНО: Added escapeKey support
     */
    getMaxAttempts(type) {
        const limits = {
            windowsKey: 3,
            escapeKey: 3,           // НОВО: Escape key same as Windows key
            altF4Key: 3,            // НОВО: Alt+F4 same as Windows key
            altTabKey: 3,           // НОВО: Alt+Tab same as Windows key
            topAreaClick: 2,        // НОВО: Mouse clicks in top area - only 2 attempts
            topAreaRightClick: 2,   // НОВО: Right clicks in top area - only 2 attempts
            ctrlAltDelKey: 1,       // НОВО: Ctrl+Alt+Del - immediate termination
            taskManagerKey: 1,      // НОВО: Task Manager - immediate termination
            mouseDangerZone: 10,    // НОВО: Mouse in danger zone - many warnings
            focusLoss: 5,
            fullscreenExit: 3,
            clipboardAttempt: 3,
            rightClick: 5,
            devTools: 3
        };
        return limits[type] || 3;
    }

    getViolationMessage(type, count) {
        const messages = {
            windowsKey: `Windows клавиш засечен (${count}/3)`,
            escapeKey: `Escape клавиш засечен (${count}/3)`,         // ПОПРАВЕНО
            altF4Key: `Alt+F4 засечен (${count}/3)`,                // НОВО
            altTabKey: `Alt+Tab засечен (${count}/3)`,              // НОВО
            topAreaClick: `Клик в забранена зона (${count}/2)`,     // НОВО
            topAreaRightClick: `Десен клик в забранена зона (${count}/2)`, // НОВО
            ctrlAltDelKey: `Ctrl+Alt+Del засечен (${count}/1)`,     // НОВО
            taskManagerKey: `Task Manager клавиш засечен (${count}/1)`, // НОВО
            mouseDangerZone: `Мишка в опасна зона (${count}/10)`,   // НОВО
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