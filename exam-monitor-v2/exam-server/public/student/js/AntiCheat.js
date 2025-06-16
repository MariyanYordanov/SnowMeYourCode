/**
 * AGGRESSIVE Anti-Cheat System v2
 * Zero tolerance policy for Windows key and system access attempts
 */
class AntiCheat {
    constructor(socket) {
        this.socket = socket;
        this.isActive = false;
        this.isRedScreenVisible = false;
        this.violations = 0;
        this.sessionId = null;
        this.fullscreenMode = false;

        // SMART AGGRESSIVE CONFIGURATION
        this.config = {
            // Smart tolerance - reduce false positives
            zeroTolerance: false,

            // Detection intervals (reasonable)
            focusCheckInterval: 500, // Check every 500ms (less aggressive)
            fullscreenCheckInterval: 200, // Check every 200ms
            heartbeatInterval: 1000, // Heartbeat every 1 second

            // Violation limits (smart thresholds)
            maxWindowsKeyAttempts: 1, // Still 1 attempt = termination
            maxFocusLossAttempts: 3, // Allow 3 brief focus losses
            maxFullscreenExitAttempts: 2, // Allow 1 accidental exit

            // Focus loss tolerance
            focusLossGracePeriod: 2000, // 2 seconds grace period
            focusLossMinDuration: 1000, // Must be lost for 1+ seconds

            // Response settings
            immediateTermination: false, // Smart evaluation first
            showWarningsFirst: true, // Show warning before termination
            aggressiveFocusSteal: true,
            preventRecovery: false,

            // Logging
            logAllActivity: true,
            detailedLogging: true
        };

        // Detection state
        this.detectionState = {
            lastFocusTime: Date.now(),
            lastFullscreenTime: Date.now(),
            focusLossCount: 0,
            windowsKeyCount: 0,
            fullscreenExitCount: 0,
            systemKeyAttempts: 0,
            isMonitoring: false,

            // Smart tracking
            focusLossStartTime: null,
            focusLossDuration: 0,
            recentFocusLosses: [],
            lastWindowsKeyTime: 0
        };

        // Monitoring intervals
        this.intervals = {
            focusMonitor: null,
            fullscreenMonitor: null,
            heartbeat: null,
            focusSteal: null
        };

        // Event listeners for cleanup
        this.eventListeners = [];

        console.log('🛡️ SMART AGGRESSIVE Anti-Cheat System v2 initialized - BALANCED MODE');
    }

    /**
     * Activate aggressive anti-cheat protection
     */
    activate() {
        if (this.isActive) return;

        this.isActive = true;
        console.log('🚫 ACTIVATING SMART AGGRESSIVE ANTI-CHEAT - BALANCED MODE');

        // Setup all detection systems
        this.setupKeyboardDetection();
        this.setupFocusDetection();
        this.setupFullscreenDetection();
        this.setupSystemDetection();
        this.setupAggressiveMonitoring();
        this.setupPreventionMeasures();

        console.log('✅ SMART AGGRESSIVE Anti-cheat activated - BALANCED PROTECTION ONLINE');
    }

    /**
     * Setup aggressive keyboard detection
     */
    setupKeyboardDetection() {
        const keydownHandler = (e) => {
            if (!this.isActive) return;

            // Detect Windows key combinations
            if (this.isWindowsKeyEvent(e)) {
                this.handleWindowsKeyViolation(e);
                return;
            }

            // Detect system shortcuts
            if (this.isSystemShortcut(e)) {
                this.handleSystemShortcutViolation(e);
                return;
            }

            // Block all suspicious combinations
            if (this.isSuspiciousKeyCombo(e)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.reportViolation('blocked_shortcut', `Blocked: ${this.getKeyComboName(e)}`);
                return false;
            }
        };

        // Add to both document and window with high priority
        document.addEventListener('keydown', keydownHandler, { capture: true, passive: false });
        window.addEventListener('keydown', keydownHandler, { capture: true, passive: false });

        // Also listen for keyup to detect Windows key release
        const keyupHandler = (e) => {
            if (!this.isActive) return;

            if (e.code === 'MetaLeft' || e.code === 'MetaRight' ||
                e.code === 'OSLeft' || e.code === 'OSRight' ||
                e.key === 'Meta' || e.key === 'OS') {
                this.handleWindowsKeyViolation(e, 'keyup');
            }
        };

        document.addEventListener('keyup', keyupHandler, { capture: true, passive: false });
        window.addEventListener('keyup', keyupHandler, { capture: true, passive: false });

        this.trackEventListener(document, 'keydown', keydownHandler);
        this.trackEventListener(window, 'keydown', keydownHandler);
        this.trackEventListener(document, 'keyup', keyupHandler);
        this.trackEventListener(window, 'keyup', keyupHandler);

        console.log('⌨️ AGGRESSIVE keyboard detection activated');
    }

    /**
     * Check if event is Windows key related
     */
    isWindowsKeyEvent(e) {
        // Direct Windows key detection
        if (e.code === 'MetaLeft' || e.code === 'MetaRight' ||
            e.code === 'OSLeft' || e.code === 'OSRight' ||
            e.key === 'Meta' || e.key === 'OS') {
            return true;
        }

        // Windows key combinations
        if (e.metaKey || e.getModifierState?.('Meta') || e.getModifierState?.('OS')) {
            return true;
        }

        // Alt+Tab (system switching)
        if (e.altKey && e.code === 'Tab') {
            return true;
        }

        // Ctrl+Alt+Del combination
        if (e.ctrlKey && e.altKey && e.code === 'Delete') {
            return true;
        }

        return false;
    }

    /**
     * Check if event is system shortcut
     */
    isSystemShortcut(e) {
        const systemShortcuts = [
            // Task Manager
            { ctrl: true, shift: true, code: 'Escape' },

            // Alt+F4 (close window)
            { alt: true, code: 'F4' },

            // Windows + L (lock screen)
            { meta: true, code: 'KeyL' },

            // Ctrl+Shift+Esc (task manager)
            { ctrl: true, shift: true, code: 'Escape' },

            // F11 (toggle fullscreen)
            { code: 'F11' },

            // Ctrl+W (close tab)
            { ctrl: true, code: 'KeyW' },

            // Ctrl+T (new tab)
            { ctrl: true, code: 'KeyT' },

            // Ctrl+N (new window)
            { ctrl: true, code: 'KeyN' }
        ];

        return systemShortcuts.some(shortcut => {
            return Object.keys(shortcut).every(key => {
                if (key === 'code') return e.code === shortcut[key];
                if (key === 'ctrl') return e.ctrlKey === shortcut[key];
                if (key === 'alt') return e.altKey === shortcut[key];
                if (key === 'shift') return e.shiftKey === shortcut[key];
                if (key === 'meta') return e.metaKey === shortcut[key];
                return true;
            });
        });
    }

    /**
     * Check if suspicious key combination
     */
    isSuspiciousKeyCombo(e) {
        // Any F-key except allowed ones
        if (e.code.startsWith('F') && !['F1', 'F2', 'F3'].includes(e.code)) {
            return true;
        }

        // Print Screen
        if (e.code === 'PrintScreen') {
            return true;
        }

        // Context menu key
        if (e.code === 'ContextMenu') {
            return true;
        }

        // Refresh combinations
        if ((e.ctrlKey && e.code === 'KeyR') || e.code === 'F5') {
            return true;
        }

        return false;
    }

    /**
     * SMART EVALUATION for Windows key - still immediate but with logging
     */
    handleWindowsKeyViolation(e, eventType = 'keydown') {
        e.preventDefault();
        e.stopImmediatePropagation();

        this.detectionState.windowsKeyCount++;
        this.detectionState.lastWindowsKeyTime = Date.now();

        const violationData = {
            type: 'windows_key_detected',
            eventType: eventType,
            keyCode: e.code,
            keyName: e.key,
            metaKey: e.metaKey,
            timestamp: Date.now(),
            attempt: this.detectionState.windowsKeyCount
        };

        console.error('🚫 CRITICAL VIOLATION: Windows key detected!', violationData);

        // Windows key = STILL immediate termination (most critical)
        this.terminateExamImmediate('WINDOWS_KEY_VIOLATION', violationData);

        return false;
    }

    /**
     * Handle system shortcut violations
     */
    handleSystemShortcutViolation(e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        this.detectionState.systemKeyAttempts++;

        const violationData = {
            type: 'system_shortcut_violation',
            shortcut: this.getKeyComboName(e),
            attempt: this.detectionState.systemKeyAttempts,
            timestamp: Date.now()
        };

        console.error('🚫 SYSTEM SHORTCUT VIOLATION:', violationData);

        // IMMEDIATE TERMINATION for critical shortcuts
        if (this.isCriticalSystemShortcut(e)) {
            this.terminateExamImmediate('SYSTEM_SHORTCUT_VIOLATION', violationData);
        } else {
            this.reportViolation('system_shortcut', violationData);
        }

        return false;
    }

    /**
     * Show warning notification
     */
    showWarningNotification(message, duration = 5000) {
        // Remove existing warning
        const existingWarning = document.getElementById('anticheat-warning-notification');
        if (existingWarning) {
            existingWarning.remove();
        }

        // Create warning notification
        const warning = document.createElement('div');
        warning.id = 'anticheat-warning-notification';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ff6b6b, #ff5252);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
            border-left: 4px solid #fff;
            max-width: 300px;
            white-space: pre-line;
            animation: slideInRight 0.3s ease-out;
        `;

        warning.innerHTML = message;

        // Add slide animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(warning);

        // Auto-remove after duration
        setTimeout(() => {
            if (warning.parentNode) {
                warning.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (warning.parentNode) {
                        warning.remove();
                    }
                }, 300);
            }
        }, duration);

        console.log(`⚠️ Warning notification shown: ${message}`);
    }

    /**
     * Setup SMART focus detection
     */
    setupFocusDetection() {
        // Window focus/blur events with smart evaluation
        const blurHandler = () => {
            if (!this.isActive) return;

            this.detectionState.focusLossStartTime = Date.now();
            console.warn('⚠️ Window focus lost - starting evaluation...');
        };

        const focusHandler = () => {
            if (!this.isActive) return;

            if (this.detectionState.focusLossStartTime) {
                const focusLossDuration = Date.now() - this.detectionState.focusLossStartTime;
                this.detectionState.focusLossDuration = focusLossDuration;

                console.log(`🎯 Focus regained after ${focusLossDuration}ms`);

                // Evaluate if focus loss was significant
                if (focusLossDuration > this.config.focusLossMinDuration) {
                    this.handleSignificantFocusLoss(focusLossDuration);
                }

                this.detectionState.focusLossStartTime = null;
            }

            this.detectionState.lastFocusTime = Date.now();
        };

        window.addEventListener('blur', blurHandler, { passive: false });
        window.addEventListener('focus', focusHandler, { passive: false });

        // Document visibility change with smart evaluation
        const visibilityHandler = () => {
            if (!this.isActive) return;

            if (document.hidden) {
                console.warn('⚠️ Document hidden - evaluating...');

                // Give grace period before considering it a violation
                setTimeout(() => {
                    if (document.hidden && this.isActive) {
                        console.error('🚫 Document still hidden after grace period');
                        this.handleSignificantVisibilityLoss();
                    }
                }, this.config.focusLossGracePeriod);
            } else {
                console.log('🎯 Document visible again');
            }
        };

        document.addEventListener('visibilitychange', visibilityHandler, { passive: false });

        this.trackEventListener(window, 'blur', blurHandler);
        this.trackEventListener(window, 'focus', focusHandler);
        this.trackEventListener(document, 'visibilitychange', visibilityHandler);

        console.log('👁️ SMART focus detection activated');
    }

    /**
     * Handle significant focus loss (duration-based)
     */
    handleSignificantFocusLoss(duration) {
        this.detectionState.focusLossCount++;
        this.detectionState.recentFocusLosses.push({
            duration: duration,
            timestamp: Date.now()
        });

        // Keep only recent focus losses (last 5 minutes)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        this.detectionState.recentFocusLosses = this.detectionState.recentFocusLosses
            .filter(loss => loss.timestamp > fiveMinutesAgo);

        console.warn(`⚠️ Significant focus loss #${this.detectionState.focusLossCount} - Duration: ${duration}ms`);

        // Evaluate pattern
        if (this.detectionState.recentFocusLosses.length >= this.config.maxFocusLossAttempts) {
            console.error('🚫 Too many focus losses detected!');

            this.terminateExamImmediate('REPEATED_FOCUS_LOSS_VIOLATION', {
                type: 'repeated_focus_loss',
                count: this.detectionState.focusLossCount,
                recentLosses: this.detectionState.recentFocusLosses,
                timestamp: Date.now()
            });
        } else {
            // Show warning but don't terminate yet
            this.showFocusWarning(duration);
        }
    }

    /**
     * Handle significant visibility loss
     */
    handleSignificantVisibilityLoss() {
        console.error('🚫 CRITICAL: Prolonged document hidden state!');

        this.terminateExamImmediate('VISIBILITY_VIOLATION', {
            type: 'document_hidden_prolonged',
            timestamp: Date.now()
        });
    }

    /**
     * Show focus warning (non-terminating)
     */
    showFocusWarning(duration) {
        console.warn(`⚠️ Focus warning shown - Duration: ${duration}ms`);

        // Report as suspicious activity but don't terminate
        this.reportViolation('focus_loss_warning', {
            duration: duration,
            count: this.detectionState.focusLossCount,
            timestamp: Date.now()
        });

        // Show brief warning notification
        this.showWarningNotification(
            `⚠️ Focus Loss Detected\nDuration: ${Math.round(duration / 1000)}s\nWarning ${this.detectionState.focusLossCount}/${this.config.maxFocusLossAttempts}`,
            3000
        );
    }

    /**
     * Setup SMART fullscreen detection
     */
    setupFullscreenDetection() {
        const fullscreenHandler = () => {
            if (!this.isActive) return;

            const isFullscreen = !!(document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement);

            if (!isFullscreen && this.fullscreenMode) {
                this.detectionState.fullscreenExitCount++;

                console.warn(`⚠️ Fullscreen exit detected #${this.detectionState.fullscreenExitCount}`);

                // Smart evaluation - allow one accidental exit
                if (this.detectionState.fullscreenExitCount >= this.config.maxFullscreenExitAttempts) {
                    console.error('🚫 CRITICAL: Too many fullscreen exits!');

                    this.terminateExamImmediate('FULLSCREEN_EXIT_VIOLATION', {
                        type: 'repeated_fullscreen_exit',
                        attempt: this.detectionState.fullscreenExitCount,
                        timestamp: Date.now()
                    });
                } else {
                    // Show warning for first exit
                    this.showFullscreenWarning();
                }
            }
        };

        // Listen for all fullscreen change events
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
            .forEach(eventName => {
                document.addEventListener(eventName, fullscreenHandler, { passive: false });
                this.trackEventListener(document, eventName, fullscreenHandler);
            });

        console.log('🖥️ SMART fullscreen detection activated');
    }

    /**
     * Show fullscreen warning
     */
    showFullscreenWarning() {
        console.warn('⚠️ Fullscreen warning shown');

        this.reportViolation('fullscreen_exit_warning', {
            attempt: this.detectionState.fullscreenExitCount,
            maxAttempts: this.config.maxFullscreenExitAttempts,
            timestamp: Date.now()
        });

        this.showWarningNotification(
            `⚠️ Fullscreen Exit Detected\nAttempt ${this.detectionState.fullscreenExitCount}/${this.config.maxFullscreenExitAttempts}\nReturn to fullscreen immediately!`,
            5000
        );
    }

    /**
     * Setup system-level detection
     */
    setupSystemDetection() {
        // Mouse detection for context menu
        const contextMenuHandler = (e) => {
            if (!this.isActive) return;

            // Block right-click everywhere except code editor
            if (!this.isCodeEditorArea(e.target)) {
                e.preventDefault();
                e.stopImmediatePropagation();

                this.reportViolation('right_click_blocked', {
                    element: e.target.tagName,
                    className: e.target.className
                });

                return false;
            }
        };

        document.addEventListener('contextmenu', contextMenuHandler, { capture: true, passive: false });
        this.trackEventListener(document, 'contextmenu', contextMenuHandler);

        // Copy/paste detection
        const clipboardHandler = (e) => {
            if (!this.isActive) return;

            if (!this.isCodeEditorArea(e.target)) {
                e.preventDefault();
                e.stopImmediatePropagation();

                this.reportViolation('clipboard_blocked', {
                    type: e.type,
                    element: e.target.tagName
                });

                return false;
            }
        };

        ['copy', 'cut', 'paste'].forEach(eventType => {
            document.addEventListener(eventType, clipboardHandler, { capture: true, passive: false });
            this.trackEventListener(document, eventType, clipboardHandler);
        });

        console.log('🖱️ AGGRESSIVE system detection activated');
    }

    /**
     * Setup SMART monitoring intervals
     */
    setupAggressiveMonitoring() {
        // Smart focus monitoring (less aggressive)
        this.intervals.focusMonitor = setInterval(() => {
            if (!this.isActive) return;

            // Check for prolonged focus loss
            if (this.detectionState.focusLossStartTime) {
                const focusLossDuration = Date.now() - this.detectionState.focusLossStartTime;

                // If focus lost for more than grace period, evaluate
                if (focusLossDuration > this.config.focusLossGracePeriod) {
                    console.warn(`⚠️ Prolonged focus loss: ${focusLossDuration}ms`);

                    // Only terminate for very long focus loss (over 5 seconds)
                    if (focusLossDuration > 5000) {
                        console.error('🚫 CRITICAL: Extremely long focus loss!');
                        this.terminateExamImmediate('PROLONGED_FOCUS_LOSS_VIOLATION', {
                            type: 'focus_lost_too_long',
                            duration: focusLossDuration,
                            timestamp: Date.now()
                        });
                    }
                }
            }

        }, this.config.focusCheckInterval);

        // Smart fullscreen monitoring
        this.intervals.fullscreenMonitor = setInterval(() => {
            if (!this.isActive || !this.fullscreenMode) return;

            const isFullscreen = !!(document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement);

            // Don't immediately terminate - let the event handler deal with it
            if (!isFullscreen) {
                console.warn('⚠️ Monitor detected fullscreen exit');
            }

        }, this.config.fullscreenCheckInterval);

        // Heartbeat for connection monitoring
        this.intervals.heartbeat = setInterval(() => {
            if (!this.isActive) return;

            if (this.socket && this.socket.connected) {
                this.socket.emit('anticheat-heartbeat', {
                    sessionId: this.sessionId,
                    timestamp: Date.now(),
                    violations: this.violations,
                    focusLossCount: this.detectionState.focusLossCount,
                    windowsKeyCount: this.detectionState.windowsKeyCount,
                    isInFocus: document.hasFocus(),
                    isVisible: !document.hidden
                });
            }

        }, this.config.heartbeatInterval);

        console.log('📊 SMART monitoring intervals started');
    }

    /**
     * Setup prevention measures
     */
    setupPreventionMeasures() {
        // Aggressive focus stealing
        if (this.config.aggressiveFocusSteal) {
            this.intervals.focusSteal = setInterval(() => {
                if (!this.isActive) return;

                // Steal focus back aggressively
                window.focus();

                // Try to bring window to front
                if (window.moveBy) {
                    try {
                        window.moveBy(0, 0);
                    } catch (e) {
                        // Ignore errors
                    }
                }

            }, 50); // Every 50ms
        }

        // Disable browser shortcuts globally
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;

            // Disable common browser shortcuts
            if ((e.ctrlKey || e.metaKey) && ['KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyL', 'KeyO', 'KeyP', 'KeyU'].includes(e.code)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        }, { capture: true, passive: false });

        console.log('🛡️ AGGRESSIVE prevention measures activated');
    }

    /**
     * IMMEDIATE EXAM TERMINATION - NO WARNINGS
     */
    terminateExamImmediate(violationType, violationData) {
        if (this.isTerminating) return; // Prevent multiple terminations
        this.isTerminating = true;

        console.error('🚫🚫🚫 IMMEDIATE EXAM TERMINATION 🚫🚫🚫');
        console.error('Violation Type:', violationType);
        console.error('Violation Data:', violationData);

        // Log critical violation
        this.logCriticalViolation(violationType, violationData);

        // Report to server immediately
        if (this.socket && this.socket.connected) {
            this.socket.emit('critical-violation', {
                sessionId: this.sessionId,
                violationType: violationType,
                violationData: violationData,
                terminatedAt: Date.now(),
                immediate: true
            });
        }

        // Use ExamExitManager for immediate termination
        if (window.ExamExitManager) {
            window.ExamExitManager.handleExamExit(
                window.ExamExitManager.exitReasons.SECURITY_VIOLATION,
                {
                    violationType: violationType,
                    violation: violationData,
                    immediate: true,
                    additionalInfo: 'IMMEDIATE TERMINATION - CRITICAL SECURITY VIOLATION'
                }
            );
        } else {
            // Fallback - force close
            this.forceTerminate(violationType);
        }
    }

    /**
     * Force terminate if ExamExitManager not available
     */
    forceTerminate(violationType) {
        // Show critical violation screen
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: #000;
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: Arial, sans-serif;
                z-index: 999999;
                text-align: center;
            ">
                <div>
                    <h1 style="color: #ff4444; font-size: 48px; margin-bottom: 30px;">
                        🚫 EXAM TERMINATED 🚫
                    </h1>
                    <h2 style="color: #fff; font-size: 24px; margin-bottom: 20px;">
                        CRITICAL SECURITY VIOLATION
                    </h2>
                    <p style="font-size: 18px; margin-bottom: 30px;">
                        Violation Type: ${violationType}
                    </p>
                    <p style="font-size: 16px; color: #ccc;">
                        All activity has been logged.<br>
                        Contact your instructor immediately.
                    </p>
                </div>
            </div>
        `;

        // Force close after brief display
        setTimeout(() => {
            window.close();
        }, 3000);
    }

    /**
     * Log critical violation with full details
     */
    logCriticalViolation(violationType, violationData) {
        const logEntry = {
            timestamp: Date.now(),
            sessionId: this.sessionId,
            violationType: violationType,
            violationData: violationData,
            browserInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack
            },
            windowInfo: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                devicePixelRatio: window.devicePixelRatio
            },
            documentInfo: {
                hasFocus: document.hasFocus(),
                hidden: document.hidden,
                visibilityState: document.visibilityState,
                fullscreenElement: !!document.fullscreenElement
            },
            violationCounts: {
                total: this.violations,
                focusLoss: this.detectionState.focusLossCount,
                windowsKey: this.detectionState.windowsKeyCount,
                fullscreenExit: this.detectionState.fullscreenExitCount,
                systemKey: this.detectionState.systemKeyAttempts
            }
        };

        console.error('📋 CRITICAL VIOLATION LOG:', logEntry);

        // Send to server
        if (this.socket && this.socket.connected) {
            this.socket.emit('violation-log', logEntry);
        }

        return logEntry;
    }

    /**
     * Report regular violation (non-critical)
     */
    reportViolation(type, data) {
        this.violations++;

        const violation = {
            type: type,
            data: data,
            timestamp: Date.now(),
            sessionId: this.sessionId
        };

        console.warn('⚠️ Anti-cheat violation:', violation);

        if (this.socket && this.socket.connected) {
            this.socket.emit('suspicious-activity', {
                activity: type,
                severity: 'medium',
                data: data,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Get human-readable key combination name
     */
    getKeyComboName(e) {
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Win');
        parts.push(e.code);
        return parts.join('+');
    }

    /**
     * Check if element is in code editor area
     */
    isCodeEditorArea(element) {
        return element.closest('#code-editor, textarea, input[type="text"], .code-output');
    }

    /**
     * Track event listener for cleanup
     */
    trackEventListener(element, event, handler) {
        this.eventListeners.push({ element, event, handler });
    }

    /**
     * Set session ID
     */
    setSessionId(sessionId) {
        this.sessionId = sessionId;
        console.log(`🔐 Anti-cheat session ID set: ${sessionId}`);
    }

    /**
     * Set fullscreen mode
     */
    setFullscreenMode(enabled) {
        this.fullscreenMode = enabled;
        console.log(`🖥️ Anti-cheat fullscreen mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Anti-cheat configuration updated:', this.config);
    }

    /**
     * Deactivate anti-cheat system
     */
    deactivate() {
        if (!this.isActive) return;

        this.isActive = false;

        // Clear all intervals
        Object.values(this.intervals).forEach(interval => {
            if (interval) clearInterval(interval);
        });

        // Remove all event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];

        console.log('🔓 AGGRESSIVE Anti-cheat deactivated');
    }

    /**
     * Continue exam (called from warning dialog - NOT USED in aggressive mode)
     */
    continueExam() {
        // In aggressive mode, there are no warnings - only termination
        console.warn('⚠️ continueExam() called but aggressive mode has no warnings');
    }

    /**
     * Exit exam (called from warning dialog)
     */
    exitExam() {
        if (window.ExamExitManager) {
            window.ExamExitManager.handleExamExit(
                window.ExamExitManager.exitReasons.ANTI_CHEAT_VIOLATION,
                { reason: 'Student chose to exit from violation dialog' }
            );
        } else {
            window.close();
        }
    }

    /**
     * Get system statistics
     */
    getStats() {
        return {
            isActive: this.isActive,
            violations: this.violations,
            detectionState: { ...this.detectionState },
            config: { ...this.config },
            sessionId: this.sessionId,
            fullscreenMode: this.fullscreenMode
        };
    }
}

// Make available globally
window.AntiCheat = AntiCheat;

console.log('🛡️ SMART AGGRESSIVE Anti-Cheat System v2 loaded - BALANCED MODE READY');