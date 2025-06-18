/**
 * ViolationTracker - Tracks and manages exam violations
 * Handles violation counting, thresholds, and progressive penalties
 */
export class ViolationTracker {
    constructor(config = {}) {
        this.config = {
            // Violation limits (balanced thresholds)
            maxWindowsKeyAttempts: 2,
            maxFocusLossAttempts: 5,
            maxFullscreenExitAttempts: 3,
            maxTotalViolations: 8,

            // Warning cooldowns
            warningCooldown: 5000, // 5 seconds between warnings

            // Override with provided config
            ...config
        };

        // Violation tracking state
        this.violations = {
            totalCount: 0,
            windowsKeyCount: 0,
            focusLossCount: 0,
            fullscreenExitCount: 0,
            systemKeyAttempts: 0,
            devToolsCount: 0
        };

        // Progressive tracking
        this.state = {
            warningLevel: 0, // 0=none, 1=yellow, 2=orange, 3=red
            lastViolationType: null,
            lastWarningTime: 0,
            recentViolations: []
        };

        // Event callbacks
        this.callbacks = {
            onViolationAdded: null,
            onThresholdExceeded: null,
            onWarningLevelChanged: null
        };
    }

    /**
     * Add a violation and check thresholds
     */
    addViolation(type, data = {}) {
        // Increment counters
        this.violations.totalCount++;

        if (this.violations.hasOwnProperty(`${type}Count`)) {
            this.violations[`${type}Count`]++;
        }

        // Update state
        this.state.lastViolationType = type;

        // Add to recent violations (keep last 10)
        this.state.recentViolations.unshift({
            type,
            data,
            timestamp: Date.now(),
            count: this.violations[`${type}Count`] || 1
        });

        if (this.state.recentViolations.length > 10) {
            this.state.recentViolations.pop();
        }

        // Check thresholds
        const thresholdResult = this.checkThresholds(type);

        // Update warning level
        const oldLevel = this.state.warningLevel;
        this.state.warningLevel = this.calculateWarningLevel();

        if (oldLevel !== this.state.warningLevel) {
            this.notifyWarningLevelChanged(this.state.warningLevel);
        }

        // Create result object
        const result = {
            type,
            count: this.violations[`${type}Count`] || 1,
            totalCount: this.violations.totalCount,
            warningLevel: this.state.warningLevel,
            thresholdExceeded: thresholdResult.exceeded,
            shouldTerminate: thresholdResult.action === 'terminate',
            terminated: false
        };

        // Notify callbacks
        this.notifyViolationAdded(type, data, thresholdResult);

        return result;
    }

    /**
     * Check violation thresholds
     */
    checkThresholds(violationType) {
        const result = {
            exceeded: false,
            action: 'none',
            message: ''
        };

        switch (violationType) {
            case 'windowsKey':
                if (this.violations.windowsKeyCount >= this.config.maxWindowsKeyAttempts) {
                    result.exceeded = true;
                    result.action = 'terminate';
                    result.message = 'Windows key limit exceeded';
                }
                break;

            case 'focusLoss':
                if (this.violations.focusLossCount >= this.config.maxFocusLossAttempts) {
                    result.exceeded = true;
                    result.action = 'critical_warning';
                    result.message = 'Focus loss limit exceeded';
                }
                break;

            case 'fullscreenExit':
                if (this.violations.fullscreenExitCount >= this.config.maxFullscreenExitAttempts) {
                    result.exceeded = true;
                    result.action = 'critical_warning';
                    result.message = 'Fullscreen exit limit exceeded';
                }
                break;

            case 'devTools':
                if (this.violations.devToolsCount >= 3) {
                    result.exceeded = true;
                    result.action = 'critical_warning';
                    result.message = 'Dev tools detection limit exceeded';
                }
                break;
        }

        // Check total violations
        if (this.violations.totalCount >= this.config.maxTotalViolations) {
            result.exceeded = true;
            result.action = 'terminate';
            result.message = 'Total violations limit exceeded';
        }

        // Notify if threshold exceeded
        if (result.exceeded) {
            this.notifyThresholdExceeded(violationType, result);
        }

        return result;
    }

    /**
     * Calculate warning level based on violations
     */
    calculateWarningLevel() {
        const total = this.violations.totalCount;

        if (total >= 6) return 3; // Red
        if (total >= 4) return 2; // Orange  
        if (total >= 2) return 1; // Yellow
        return 0; // None
    }

    /**
     * Get violation severity based on type and count
     */
    getViolationSeverity(type, count = null) {
        const currentCount = count || this.violations[`${type}Count`] || 0;

        const severityMap = {
            windowsKey: currentCount >= 2 ? 'critical' : 'high',
            focusLoss: currentCount >= 3 ? 'high' : 'medium',
            fullscreenExit: currentCount >= 2 ? 'high' : 'medium',
            devTools: currentCount >= 2 ? 'high' : 'medium',
            systemKey: 'low',
            clipboard: 'low'
        };

        return severityMap[type] || 'medium';
    }

    /**
     * Check if warning should be shown (cooldown logic)
     */
    shouldShowWarning() {
        const now = Date.now();
        const timeSinceLastWarning = now - this.state.lastWarningTime;

        if (timeSinceLastWarning >= this.config.warningCooldown) {
            this.state.lastWarningTime = now;
            return true;
        }

        return false;
    }

    /**
     * Get violation statistics
     */
    getStatistics() {
        return {
            violations: { ...this.violations },
            state: { ...this.state },
            warningLevel: this.state.warningLevel,
            recentViolations: [...this.state.recentViolations],
            config: { ...this.config }
        };
    }

    /**
     * Get violation history for reporting
     */
    getViolationHistory() {
        return {
            violations: { ...this.violations },
            recentViolations: [...this.state.recentViolations],
            warningLevel: this.state.warningLevel,
            totalCount: this.violations.totalCount,
            lastViolationType: this.state.lastViolationType,
            timestamp: Date.now()
        };
    }

    /**
     * Reset specific violation type
     */
    resetViolationType(type) {
        if (this.violations.hasOwnProperty(`${type}Count`)) {
            this.violations[`${type}Count`] = 0;
        }

        // Recalculate warning level
        this.state.warningLevel = this.calculateWarningLevel();
    }

    /**
     * Reset all violations (admin function)
     */
    resetAll() {
        this.violations = {
            totalCount: 0,
            windowsKeyCount: 0,
            focusLossCount: 0,
            fullscreenExitCount: 0,
            systemKeyAttempts: 0,
            devToolsCount: 0
        };

        this.state = {
            warningLevel: 0,
            lastViolationType: null,
            lastWarningTime: 0,
            recentViolations: []
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Set callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Notify violation added
     */
    notifyViolationAdded(type, data, thresholdResult) {
        if (this.callbacks.onViolationAdded) {
            this.callbacks.onViolationAdded({
                type,
                data,
                violations: this.violations,
                thresholdResult,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Notify threshold exceeded
     */
    notifyThresholdExceeded(type, result) {
        if (this.callbacks.onThresholdExceeded) {
            this.callbacks.onThresholdExceeded({
                type,
                result,
                violations: this.violations,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Notify warning level changed
     */
    notifyWarningLevelChanged(newLevel) {
        if (this.callbacks.onWarningLevelChanged) {
            this.callbacks.onWarningLevelChanged({
                oldLevel: this.state.warningLevel,
                newLevel,
                violations: this.violations,
                timestamp: Date.now()
            });
        }
    }
}

// Test (remove after testing)
console.log('✅ ViolationTracker module loaded');