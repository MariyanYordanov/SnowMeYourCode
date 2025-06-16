/**
 * ExamExitManager - Service for exam termination business logic
 * Pure business logic, delegates UI to UIManager
 */
export class ExamExitManager {
    constructor() {
        this.isExiting = false;
        this.cleanupCallbacks = [];
        this.uiManager = null;

        this.exitReasons = {
            STUDENT_FINISH: 'student_finish',
            TIME_EXPIRED: 'time_expired',
            INSTRUCTOR_TERMINATED: 'instructor_terminated',
            ANTI_CHEAT_VIOLATION: 'anti_cheat_violation',
            FULLSCREEN_VIOLATION: 'fullscreen_violation',
            NETWORK_ERROR: 'network_error',
            BROWSER_CLOSE: 'browser_close'
        };

        this.setupBeforeUnloadHandler();
        console.log('🚪 ExamExitManager service initialized');
    }

    /**
     * Set UI manager for delegation
     */
    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Register cleanup callback
     */
    registerCleanupCallback(callback) {
        this.cleanupCallbacks.push(callback);
    }

    /**
     * Main exit handler - coordinates the exit process
     */
    async handleExamExit(reason, details = {}) {
        if (this.isExiting) {
            console.log('🔄 Exit already in progress');
            return;
        }

        this.isExiting = true;
        console.log(`🚪 Handling exam exit: ${reason}`, details);

        try {
            // Show exit UI
            await this.showExitUI(reason, details);

            // Perform cleanup
            await this.performCleanup(reason, details);

            // Handle exit-specific logic
            this.handleExitSpecifics(reason, details);

        } catch (error) {
            console.error('❌ Exit handling error:', error);
        }
    }

    /**
     * Delegate UI showing to UIManager
     */
    async showExitUI(reason, details) {
        if (!this.uiManager) {
            console.warn('⚠️ No UIManager available for exit UI');
            return;
        }

        const exitData = this.prepareExitData(reason, details);
        await this.uiManager.showExitScreen(exitData);
    }

    /**
     * Prepare exit data for UI
     */
    prepareExitData(reason, details) {
        return {
            reason,
            timestamp: new Date().toISOString(),
            isVoluntary: reason === this.exitReasons.STUDENT_FINISH,
            details: details || {},
            exitConfig: this.getExitConfig(reason)
        };
    }

    /**
     * Get exit configuration
     */
    getExitConfig(reason) {
        const configs = {
            [this.exitReasons.STUDENT_FINISH]: {
                type: 'success',
                autoClose: false,
                showCloseButton: true
            },
            [this.exitReasons.TIME_EXPIRED]: {
                type: 'warning',
                autoClose: true,
                autoCloseDelay: 10000
            },
            [this.exitReasons.ANTI_CHEAT_VIOLATION]: {
                type: 'error',
                autoClose: true,
                autoCloseDelay: 5000
            },
            [this.exitReasons.FULLSCREEN_VIOLATION]: {
                type: 'error',
                autoClose: true,
                autoCloseDelay: 5000
            }
        };

        return configs[reason] || configs[this.exitReasons.STUDENT_FINISH];
    }

    /**
     * Perform cleanup using registered callbacks
     */
    async performCleanup(reason, details) {
        console.log('🧹 Performing cleanup...');

        for (const callback of this.cleanupCallbacks) {
            try {
                await callback(reason, details);
            } catch (error) {
                console.error('❌ Cleanup callback error:', error);
            }
        }

        this.clearSystemResources();
        console.log('✅ Cleanup completed');
    }

    /**
     * Clear system resources
     */
    clearSystemResources() {
        // Clear high timer IDs (common cleanup pattern)
        for (let id = 1; id <= 10000; id++) {
            clearTimeout(id);
            clearInterval(id);
        }

        // Remove event listeners
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }

    /**
     * Handle exit-specific logic
     */
    handleExitSpecifics(reason, details) {
        switch (reason) {
            case this.exitReasons.FULLSCREEN_VIOLATION:
                this.handleFullscreenExit();
                break;
            case this.exitReasons.BROWSER_CLOSE:
                this.handleBrowserClose();
                break;
            case this.exitReasons.NETWORK_ERROR:
                this.handleNetworkError(details);
                break;
        }
    }

    /**
     * Handle fullscreen violation exit
     */
    handleFullscreenExit() {
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        } catch (error) {
            console.warn('Could not exit fullscreen:', error);
        }
    }

    /**
     * Handle browser close
     */
    handleBrowserClose() {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }

    /**
     * Handle network error
     */
    handleNetworkError(details) {
        // Could implement retry logic here
        console.log('Network error exit:', details);
    }

    /**
     * Setup beforeunload protection
     */
    setupBeforeUnloadHandler() {
        this.beforeUnloadHandler = (e) => {
            if (!this.isExiting) {
                e.preventDefault();
                e.returnValue = 'Изпитът все още е активен. Сигурни ли сте?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }

    /**
     * Get exit reasons (for external use)
     */
    getExitReasons() {
        return { ...this.exitReasons };
    }

    /**
     * Check if exit is in progress
     */
    isExitInProgress() {
        return this.isExiting;
    }
}

// Global singleton instance
window.ExamExitManager = new ExamExitManager();