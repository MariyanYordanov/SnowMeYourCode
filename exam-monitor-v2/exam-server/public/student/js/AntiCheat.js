/**
 * Balanced Anti-Cheat System v3
 * Progressive enforcement with smart detection and warnings
 */
class AntiCheat {
    constructor(socket) {
        this.socket = socket;
        this.isActive = false;
        this.isWarningVisible = false;
        this.violations = 0;
        this.sessionId = null;
        this.fullscreenMode = false;

        // BALANCED CONFIGURATION
        this.config = {
            // Progressive enforcement
            enableWarnings: true,
            enableProgressivePenalties: true,

            // Detection intervals (reasonable)
            focusCheckInterval: 1000, // Check every 1 second
            fullscreenCheckInterval: 500, // Check every 500ms
            heartbeatInterval: 2000, // Heartbeat every 2 seconds

            // Violation limits (balanced thresholds)
            maxWindowsKeyAttempts: 2, // Allow 1 warning before termination
            maxFocusLossAttempts: 5, // Allow 4 warnings before termination
            maxFullscreenExitAttempts: 3, // Allow 2 warnings before termination
            maxTotalViolations: 8, // Total violations before termination

            // Focus loss tolerance (more lenient)
            focusLossGracePeriod: 3000, // 3 seconds grace period
            focusLossMinDuration: 2000, // Must be lost for 2+ seconds to count
            shortFocusLossIgnore: 1000, // Ignore losses under 1 second

            // Response settings (balanced)
            immediateTermination: false, // Always warn first
            showWarningsFirst: true,
            warningDuration: 8000, // 8 seconds to respond to warning

            // System protection (moderate)
            enableFocusSteal: false, // Don't steal focus aggressively
            blockDevTools: true,
            blockSystemShortcuts: true,
            allowCodeEditorInteraction: true,

            // Logging
            logAllActivity: true,
            detailedLogging: false // Less verbose
        };

        // Detection state
        this.detectionState = {
            lastFocusTime: Date.now(),
            focusLossCount: 0,
            windowsKeyCount: 0,
            fullscreenExitCount: 0,
            systemKeyAttempts: 0,
            totalViolations: 0,

            // Smart tracking
            focusLossStartTime: null,
            recentFocusLosses: [],
            lastWarningTime: 0,
            warningCooldown: 5000, // 5 seconds between warnings

            // Progressive state
            warningLevel: 0, // 0=none, 1=yellow, 2=orange, 3=red
            lastViolationType: null
        };

        // Monitoring intervals
        this.intervals = {
            focusMonitor: null,
            fullscreenMonitor: null,
            heartbeat: null
        };

        // Event listeners for cleanup
        this.eventListeners = [];

        console.log('🛡️ Balanced Anti-Cheat System v3 initialized');
    }

    /**
     * Activate anti-cheat protection with graceful startup
     */
    activate() {
        if (this.isActive) return;

        console.log('🚫 Activating Balanced Anti-Cheat Protection...');

        // Graceful activation with delay to avoid startup conflicts
        setTimeout(() => {
            this.isActive = true;
            this.setupDetectionSystems();
            this.startMonitoring();
            console.log('✅ Balanced Anti-cheat activated successfully');
        }, 2000); // 2 second delay for fullscreen to stabilize
    }

    /**
     * Setup all detection systems
     */
    setupDetectionSystems() {
        this.setupKeyboardDetection();
        this.setupFocusDetection();
        this.setupFullscreenDetection();
        this.setupSystemDetection();

        console.log('🔍 Detection systems initialized');
    }

    /**
     * Setup balanced keyboard detection
     */
    setupKeyboardDetection() {
        const keydownHandler = (e) => {
            if (!this.isActive || this.isWarningVisible) return;

            // Critical violations (still immediate but with warning)
            if (this.isWindowsKeyEvent(e)) {
                this.handleCriticalViolation('windows_key', e);
                return;
            }

            // System shortcuts (progressive)
            if (this.isSystemShortcut(e)) {
                this.handleSystemShortcut(e);
                return;
            }

            // Suspicious combinations (block but don't penalize heavily)
            if (this.isSuspiciousKeyCombo(e)) {
                e.preventDefault();
                this.handleMinorViolation('blocked_shortcut', `Blocked: ${this.getKeyComboName(e)}`);
                return false;
            }
        };

        document.addEventListener('keydown', keydownHandler, { capture: true, passive: false });
        this.trackEventListener(document, 'keydown', keydownHandler);

        console.log('⌨️ Balanced keyboard detection active');
    }

    /**
     * Check if event is Windows key related
     */
    isWindowsKeyEvent(e) {
        // Direct Windows key detection with better browser support
        if (e.code === 'MetaLeft' || e.code === 'MetaRight' ||
            e.code === 'OSLeft' || e.code === 'OSRight' ||
            e.key === 'Meta' || e.key === 'OS') {
            return true;
        }

        // Windows key combinations with fallbacks
        if (e.metaKey) {
            return true;
        }

        // Additional checks for different browsers
        if (e.getModifierState) {
            if (e.getModifierState('Meta') || e.getModifierState('OS')) {
                return true;
            }
        }

        // Alt+Tab (system switching) - also critical
        if (e.altKey && e.code === 'Tab') {
            return true;
        }

        // Ctrl+Alt+Del combination
        if (e.ctrlKey && e.altKey && e.code === 'Delete') {
            return true;
        }

        // Additional Windows shortcuts that should be blocked
        if (e.ctrlKey && e.shiftKey && e.code === 'Escape') { // Task Manager
            return true;
        }

        return false;
    }

    /**
     * Check if event is system shortcut
     */
    isSystemShortcut(e) {
        const criticalShortcuts = [
            { ctrl: true, shift: true, code: 'Escape' }, // Task Manager
            { alt: true, code: 'F4' }, // Close window
            { code: 'F11' }, // Toggle fullscreen
            { ctrl: true, code: 'KeyW' }, // Close tab
            { ctrl: true, code: 'KeyT' }, // New tab
            { ctrl: true, code: 'KeyN' } // New window
        ];

        return criticalShortcuts.some(shortcut => {
            return Object.keys(shortcut).every(key => {
                if (key === 'code') return e.code === shortcut[key];
                if (key === 'ctrl') return e.ctrlKey === shortcut[key];
                if (key === 'alt') return e.altKey === shortcut[key];
                if (key === 'shift') return e.shiftKey === shortcut[key];
                return true;
            });
        });
    }

    /**
     * Check if suspicious but not critical
     */
    isSuspiciousKeyCombo(e) {
        // F-keys (except allowed ones)
        if (e.code.startsWith('F') && !['F1', 'F2', 'F3'].includes(e.code)) {
            return true;
        }

        // Print Screen, Context Menu
        if (['PrintScreen', 'ContextMenu'].includes(e.code)) {
            return true;
        }

        // Refresh (but not critical)
        if ((e.ctrlKey && e.code === 'KeyR') || e.code === 'F5') {
            return true;
        }

        // Esc key (block but allow in warnings)
        if (e.code === 'Escape' && !this.isWarningVisible) {
            return true;
        }

        return false;
    }

    /**
     * Setup balanced focus detection
     */
    setupFocusDetection() {
        const blurHandler = () => {
            if (!this.isActive || this.isWarningVisible) return;

            this.detectionState.focusLossStartTime = Date.now();
            console.log('👁️ Focus lost - monitoring...');
        };

        const focusHandler = () => {
            if (!this.isActive) return;

            if (this.detectionState.focusLossStartTime) {
                const duration = Date.now() - this.detectionState.focusLossStartTime;
                this.evaluateFocusLoss(duration);
                this.detectionState.focusLossStartTime = null;
            }

            this.detectionState.lastFocusTime = Date.now();
        };

        const visibilityHandler = () => {
            if (!this.isActive || this.isWarningVisible) return;

            if (document.hidden) {
                // Start monitoring but don't immediately penalize
                setTimeout(() => {
                    if (document.hidden && this.isActive) {
                        this.handleModeratViolation('prolonged_hidden', 'Document hidden for extended period');
                    }
                }, this.config.focusLossGracePeriod);
            }
        };

        window.addEventListener('blur', blurHandler, { passive: false });
        window.addEventListener('focus', focusHandler, { passive: false });
        document.addEventListener('visibilitychange', visibilityHandler, { passive: false });

        this.trackEventListener(window, 'blur', blurHandler);
        this.trackEventListener(window, 'focus', focusHandler);
        this.trackEventListener(document, 'visibilitychange', visibilityHandler);

        console.log('👁️ Balanced focus detection active');
    }

    /**
     * Evaluate focus loss with balanced approach
     */
    evaluateFocusLoss(duration) {
        // Ignore very short focus losses (likely innocent)
        if (duration < this.config.shortFocusLossIgnore) {
            console.log(`👁️ Ignoring short focus loss: ${duration}ms`);
            return;
        }

        // Significant focus loss
        if (duration > this.config.focusLossMinDuration) {
            this.detectionState.focusLossCount++;

            console.warn(`⚠️ Significant focus loss #${this.detectionState.focusLossCount}: ${duration}ms`);

            // Progressive response
            if (this.detectionState.focusLossCount >= this.config.maxFocusLossAttempts) {
                this.handleCriticalViolation('repeated_focus_loss', {
                    count: this.detectionState.focusLossCount,
                    duration: duration
                });
            } else {
                this.handleModeratViolation('focus_loss', {
                    duration: duration,
                    count: this.detectionState.focusLossCount
                });
            }
        }
    }

    /**
     * Setup balanced fullscreen detection
     */
    setupFullscreenDetection() {
        const fullscreenHandler = () => {
            if (!this.isActive || this.isWarningVisible) return;

            const isFullscreen = this.isDocumentInFullscreen();

            if (!isFullscreen && this.fullscreenMode) {
                this.detectionState.fullscreenExitCount++;

                console.warn(`⚠️ Fullscreen exit #${this.detectionState.fullscreenExitCount}`);

                if (this.detectionState.fullscreenExitCount >= this.config.maxFullscreenExitAttempts) {
                    this.handleCriticalViolation('repeated_fullscreen_exit', {
                        attempt: this.detectionState.fullscreenExitCount
                    });
                } else {
                    this.handleModeratViolation('fullscreen_exit', {
                        attempt: this.detectionState.fullscreenExitCount,
                        maxAttempts: this.config.maxFullscreenExitAttempts
                    });
                }
            }
        };

        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
            .forEach(eventName => {
                document.addEventListener(eventName, fullscreenHandler, { passive: false });
                this.trackEventListener(document, eventName, fullscreenHandler);
            });

        console.log('🖥️ Balanced fullscreen detection active');
    }

    /**
     * Setup system detection
     */
    setupSystemDetection() {
        // Context menu with balanced approach
        const contextMenuHandler = (e) => {
            if (!this.isActive || this.isWarningVisible) return;

            if (!this.isCodeEditorArea(e.target)) {
                e.preventDefault();
                this.handleMinorViolation('right_click', 'Right-click outside editor');
                return false;
            }
        };

        // Clipboard with balanced approach
        const clipboardHandler = (e) => {
            if (!this.isActive || this.isWarningVisible) return;

            if (!this.isCodeEditorArea(e.target)) {
                e.preventDefault();
                this.handleMinorViolation('clipboard_attempt', `${e.type} outside editor`);
                return false;
            }
        };

        document.addEventListener('contextmenu', contextMenuHandler, { capture: true, passive: false });
        ['copy', 'cut', 'paste'].forEach(eventType => {
            document.addEventListener(eventType, clipboardHandler, { capture: true, passive: false });
            this.trackEventListener(document, eventType, clipboardHandler);
        });
        this.trackEventListener(document, 'contextmenu', contextMenuHandler);

        console.log('🖱️ Balanced system detection active');
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
     * Handle critical violations (Windows key, repeated violations)
     */
    handleCriticalViolation(type, data) {
        this.detectionState.totalViolations++;

        if (type === 'windows_key') {
            this.detectionState.windowsKeyCount++;
        }

        this.detectionState.lastViolationType = type;

        console.error(`🚫 CRITICAL VIOLATION: ${type}`, data);

        // For Windows key - show critical warning with option to continue
        if (type === 'windows_key') {
            // If it's the second Windows key press, terminate immediately
            if (this.detectionState.windowsKeyCount >= 2) {
                this.terminateExamWithWarning('Повторно натискане на Windows клавиша!', type, data);
            } else {
                // First time - show warning
                this.showWindowsKeyWarning();
            }
        } else {
            // For other critical violations - show warning first
            this.showCriticalWarning(type, data);
        }

        // Report to server
        this.reportToServer('critical_violation', { type, data, immediate: false });
    }

    /**
     * Handle moderate violations (focus loss, fullscreen exit)
     */
    handleModeratViolation(type, data) {
        this.detectionState.totalViolations++;
        this.detectionState.lastViolationType = type;

        console.warn(`⚠️ MODERATE VIOLATION: ${type}`, data);

        // Check if total violations exceeded
        if (this.detectionState.totalViolations >= this.config.maxTotalViolations) {
            this.handleCriticalViolation('total_violations_exceeded', {
                total: this.detectionState.totalViolations,
                lastType: type
            });
            return;
        }

        // Show progressive warning
        this.showProgressiveWarning(type, data);

        // Report to server
        this.reportToServer('moderate_violation', { type, data });
    }

    /**
     * Handle minor violations (blocked shortcuts, right-click)
     */
    handleMinorViolation(type, description) {
        this.violations++;

        console.log(`ℹ️ Minor violation: ${type} - ${description}`);

        // Just show notification, no major penalty
        this.showMinorNotification(description);

        // Report to server as suspicious activity
        this.reportToServer('minor_violation', { type, description });
    }

    /**
     * Show Windows key specific warning with continue option
     */
    showWindowsKeyWarning() {
        if (this.isWarningVisible) return;

        this.isWarningVisible = true;
        this.detectionState.warningLevel = 3; // Red alert

        // Remove existing overlay
        const existingOverlay = document.getElementById('antiCheatOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Create warning overlay
        const overlay = document.createElement('div');
        overlay.id = 'antiCheatOverlay';
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(220, 53, 69, 0.95) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            font-family: Arial, sans-serif !important;
            color: white !important;
        `;

        overlay.innerHTML = `
            <div style="
                background: #dc3545 !important;
                padding: 40px !important;
                border-radius: 12px !important;
                text-align: center !important;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5) !important;
                max-width: 500px !important;
                width: 90% !important;
            ">
                <div style="font-size: 48px !important; margin-bottom: 20px !important;">⚠️</div>
                
                <h1 style="
                    font-size: 28px !important;
                    margin-bottom: 20px !important;
                    color: white !important;
                    font-weight: bold !important;
                ">КРИТИЧНО ПРЕДУПРЕЖДЕНИЕ</h1>
                
                <p style="
                    font-size: 18px !important;
                    margin-bottom: 30px !important;
                    line-height: 1.5 !important;
                    color: white !important;
                ">Засечено е натискане на Windows клавиша!<br>
                Това е строго забранено по време на изпита.<br><br>
                <strong>Повторно нарушение ще доведе до прекратяване на изпита!</strong></p>
                
                <div style="
                    display: flex !important;
                    gap: 20px !important;
                    justify-content: center !important;
                ">
                    <button onclick="window.antiCheat.continueAfterWindowsKey()" style="
                        background: #28a745 !important;
                        color: white !important;
                        border: none !important;
                        padding: 15px 30px !important;
                        border-radius: 6px !important;
                        font-size: 16px !important;
                        font-weight: bold !important;
                        cursor: pointer !important;
                    ">Продължи изпита</button>
                    
                    <button onclick="window.antiCheat.exitExam('windows_key_violation')" style="
                        background: rgba(255,255,255,0.2) !important;
                        color: white !important;
                        border: 2px solid white !important;
                        padding: 15px 30px !important;
                        border-radius: 6px !important;
                        font-size: 16px !important;
                        font-weight: bold !important;
                        cursor: pointer !important;
                    ">Напусни изпита</button>
                </div>
            </div>
        `;

        // Force inject into body
        document.body.appendChild(overlay);

        // Make antiCheat globally accessible
        window.antiCheat = this;

        console.log('🔴 Windows key warning dialog shown');
    }

    /**
     * Continue after Windows key warning
     */
    continueAfterWindowsKey() {
        console.log('✅ Student chose to continue after Windows key warning');

        // Hide warning
        this.hideWarningDialog();

        // Update violation count and warn about consequences
        if (this.detectionState.windowsKeyCount >= 2) {
            // Next Windows key will terminate
            this.showMinorNotification('ПОСЛЕДНО ПРЕДУПРЕЖДЕНИЕ: Следващо натискане на Windows клавиша ще прекрати изпита!');
        }

        // Focus back on exam
        setTimeout(() => {
            const codeEditor = document.getElementById('code-editor');
            if (codeEditor) {
                codeEditor.focus();
            }
        }, 100);
    }

    /**
     * Show critical warning dialog
     */
    showCriticalWarning(type, data) {
        if (this.isWarningVisible) return;

        this.isWarningVisible = true;
        this.detectionState.warningLevel = 3; // Red alert

        const messages = {
            'windows_key': 'Засечено е натискане на Windows клавиша!\nТова е строго забранено по време на изпита.',
            'repeated_focus_loss': 'Твърде много опити за излизане от изпита!\nИзпитът ще бъде прекратен при следващо нарушение.',
            'repeated_fullscreen_exit': 'Твърде много опити за излизане от fullscreen режим!\nИзпитът ще бъде прекратен при следващо нарушение.',
            'total_violations_exceeded': 'Превишен е лимитът от нарушения!\nИзпитът ще бъде прекратен.'
        };

        const message = messages[type] || 'Засечено е критично нарушение на правилата за изпита!';

        this.showWarningDialog(message, 'critical', () => {
            // On continue - final warning
            this.hideWarningDialog();
            console.log('🔔 Final warning given for critical violation');
        }, () => {
            // On exit
            this.exitExam('critical_violation_exit');
        });
    }

    /**
     * Show progressive warning based on violation count
     */
    showProgressiveWarning(type, data) {
        const now = Date.now();

        // Cooldown between warnings
        if (now - this.detectionState.lastWarningTime < this.detectionState.warningCooldown) {
            return;
        }

        this.detectionState.lastWarningTime = now;

        // Determine warning level
        const warningLevel = Math.min(this.detectionState.totalViolations, 3);
        this.detectionState.warningLevel = warningLevel;

        const messages = {
            'focus_loss': `Засечено е излизане от прозореца на изпита!\nПредупреждение ${this.detectionState.focusLossCount}/${this.config.maxFocusLossAttempts}`,
            'fullscreen_exit': `Опит за излизане от fullscreen режим!\nПредупреждение ${this.detectionState.fullscreenExitCount}/${this.config.maxFullscreenExitAttempts}`,
            'prolonged_hidden': 'Прозорецът на изпита е скрит твърде дълго!\nВърнете се към изпита незабавно.'
        };

        const message = messages[type] || 'Засечена е подозрителна активност!';

        if (warningLevel >= 2) {
            // Show dialog for serious warnings
            this.showWarningDialog(message, 'moderate', () => {
                this.hideWarningDialog();
            });
        } else {
            // Show notification for lighter warnings
            this.showWarningNotification(message, 5000);
        }
    }

    /**
     * Immediate termination with warning screen for critical violations
     */
    terminateExamWithWarning(message, violationType, violationData) {
        if (this.isTerminating) return;
        this.isTerminating = true;

        console.error(`🚫🚫🚫 IMMEDIATE TERMINATION: ${violationType} 🚫🚫🚫`);

        // Create termination overlay with inline styles
        const overlay = document.createElement('div');
        overlay.id = 'criticalViolationOverlay';
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(220, 53, 69, 0.95) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            font-family: Arial, sans-serif !important;
            color: white !important;
        `;

        overlay.innerHTML = `
            <div style="
                background: #dc3545 !important;
                padding: 40px !important;
                border-radius: 12px !important;
                text-align: center !important;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5) !important;
                max-width: 500px !important;
                width: 90% !important;
            ">
                <div style="
                    font-size: 48px !important;
                    margin-bottom: 20px !important;
                ">🚫</div>
                
                <h1 style="
                    font-size: 28px !important;
                    margin-bottom: 20px !important;
                    color: white !important;
                    font-weight: bold !important;
                ">ИЗПИТЪТ Е ПРЕКРАТЕН</h1>
                
                <p style="
                    font-size: 18px !important;
                    margin-bottom: 30px !important;
                    line-height: 1.5 !important;
                    color: white !important;
                ">${message}<br><br>Всички действия са регистрирани.</p>
                
                <div style="
                    background: rgba(255,255,255,0.1) !important;
                    padding: 15px !important;
                    border-radius: 8px !important;
                    margin-bottom: 25px !important;
                ">
                    <div style="font-size: 14px !important; color: #ffdddd !important;">
                        Нарушение: ${violationType}<br>
                        Време: ${new Date().toLocaleTimeString()}
                    </div>
                </div>
                
                <div id="countdown-text" style="
                    font-size: 16px !important;
                    color: #ffdddd !important;
                    margin-bottom: 20px !important;
                ">Прозорецът ще се затвори след <span id="countdown">5</span> секунди...</div>
                
                <button id="close-now-btn" style="
                    background: rgba(255,255,255,0.2) !important;
                    color: white !important;
                    border: 2px solid white !important;
                    padding: 12px 24px !important;
                    border-radius: 6px !important;
                    font-size: 14px !important;
                    font-weight: bold !important;
                    cursor: pointer !important;
                    transition: background 0.3s !important;
                " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                   onmouseout="this.style.background='rgba(255,255,255,0.2)'"
                   onclick="window.antiCheat.forceCloseExam()">
                    Затвори сега
                </button>
            </div>
        `;

        // Force inject into body
        document.body.appendChild(overlay);

        // Make antiCheat globally accessible for the onclick handler
        window.antiCheat = this;

        // Start countdown
        let countdown = 5;
        const countdownElement = overlay.querySelector('#countdown');

        const countdownTimer = setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }

            if (countdown <= 0) {
                clearInterval(countdownTimer);
                this.forceExamTermination(violationType, violationData);
            }
        }, 1000);

        // Store timer for manual close
        this.terminationTimer = countdownTimer;

        // Report immediate termination to server
        if (this.socket && this.socket.connected) {
            this.socket.emit('critical-violation', {
                sessionId: this.sessionId,
                violationType: violationType,
                violationData: violationData,
                terminatedAt: Date.now(),
                immediate: true
            });
        }
    }

    /**
     * Force close exam (called from onclick)
     */
    forceCloseExam() {
        console.log('🔴 Manual close button clicked');

        // Clear countdown timer
        if (this.terminationTimer) {
            clearInterval(this.terminationTimer);
            this.terminationTimer = null;
        }

        // Force termination immediately
        this.forceExamTermination('manual_close', { timestamp: Date.now() });
    }

    /**
     * Force exam termination
     */
    forceExamTermination(violationType, violationData) {
        console.error(`🚫 FORCING EXAM TERMINATION: ${violationType}`);

        // Remove the termination overlay first
        const overlay = document.getElementById('criticalViolationOverlay');
        if (overlay) {
            overlay.remove();
        }

        // Use ExamExitManager if available
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
            try {
                window.close();
            } catch (e) {
                // If window.close() fails, show permanent block screen
                document.body.innerHTML = `
                    <div style="
                        position: fixed;
                        top: 0; left: 0;
                        width: 100vw; height: 100vh;
                        background: #000;
                        color: #fff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-family: Arial, sans-serif;
                        text-align: center;
                        z-index: 999999;
                    ">
                        <div>
                            <h1 style="color: #ff4444; font-size: 48px;">🚫 ИЗПИТ ПРЕКРАТЕН 🚫</h1>
                            <p style="font-size: 18px;">Затворете този прозорец ръчно</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Show warning dialog
     */
    showWarningDialog(message, severity, onContinue, onExit = null) {
        // Remove existing overlay
        const existingOverlay = document.getElementById('antiCheatOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Create warning overlay
        const overlay = document.createElement('div');
        overlay.id = 'antiCheatOverlay';
        overlay.className = 'anti-cheat-overlay';

        const severityConfig = {
            'critical': {
                title: '🚫 КРИТИЧНО ПРЕДУПРЕЖДЕНИЕ',
                bgColor: '#dc3545',
                titleColor: '#fff'
            },
            'moderate': {
                title: '⚠️ ПРЕДУПРЕЖДЕНИЕ',
                bgColor: '#fd7e14',
                titleColor: '#fff'
            }
        };

        const config = severityConfig[severity] || severityConfig.moderate;

        overlay.innerHTML = `
            <div class="warning-dialog" style="background-color: ${config.bgColor};">
                <div class="warning-title" style="color: ${config.titleColor};">${config.title}</div>
                <div class="warning-message">${message}</div>
                <div class="warning-buttons">
                    <button class="warning-button continue-button" id="continue-exam-btn">
                        Продължи изпита
                    </button>
                    ${onExit ? '<button class="warning-button exit-button" id="exit-exam-btn">Напусни изпита</button>' : ''}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Event listeners
        const continueBtn = overlay.querySelector('#continue-exam-btn');
        const exitBtn = overlay.querySelector('#exit-exam-btn');

        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                if (onContinue) onContinue();
            });
        }

        if (exitBtn && onExit) {
            exitBtn.addEventListener('click', () => {
                if (onExit) onExit();
            });
        }

        // Auto-hide after timeout for non-critical warnings
        if (severity !== 'critical') {
            setTimeout(() => {
                if (document.getElementById('antiCheatOverlay')) {
                    this.hideWarningDialog();
                }
            }, this.config.warningDuration);
        }
    }

    /**
     * Hide warning dialog
     */
    hideWarningDialog() {
        const overlay = document.getElementById('antiCheatOverlay');
        if (overlay) {
            overlay.remove();
        }
        this.isWarningVisible = false;
    }

    /**
     * Show minor notification
     */
    showMinorNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ffc107;
            color: #212529;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            z-index: 9999;
            max-width: 250px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    /**
     * Show warning notification
     */
    showWarningNotification(message, duration = 5000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
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
            max-width: 300px;
            white-space: pre-line;
        `;
        notification.innerHTML = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    /**
     * Start monitoring intervals
     */
    startMonitoring() {
        // Heartbeat
        this.intervals.heartbeat = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('anticheat-heartbeat', {
                    sessionId: this.sessionId,
                    timestamp: Date.now(),
                    violations: this.detectionState.totalViolations,
                    warningLevel: this.detectionState.warningLevel,
                    isActive: this.isActive,
                    isInFocus: document.hasFocus(),
                    isVisible: !document.hidden
                });
            }
        }, this.config.heartbeatInterval);

        console.log('📊 Monitoring intervals started');
    }

    /**
     * Report to server
     */
    reportToServer(severity, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('suspicious-activity', {
                activity: data.type || 'unknown',
                severity: severity,
                data: data,
                sessionId: this.sessionId,
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
     * Update configuration (was missing)
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Anti-cheat configuration updated:', this.config);
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
     * Continue exam (called from warning dialog)
     */
    continueExam() {
        this.hideWarningDialog();
        console.log('✅ Student chose to continue exam');
    }

    /**
     * Exit exam (called from warning dialog)
     */
    exitExam(reason = 'student_choice') {
        console.log(`🚪 Student chose to exit exam: ${reason}`);

        // Hide any visible warnings first
        this.hideWarningDialog();

        // Use ExamExitManager for proper exit handling
        if (window.ExamExitManager) {
            let exitReason;

            // Map specific reasons to ExamExitManager reasons
            switch (reason) {
                case 'windows_key_violation':
                    exitReason = window.ExamExitManager.exitReasons.ANTI_CHEAT_VIOLATION;
                    break;
                case 'critical_violation_exit':
                    exitReason = window.ExamExitManager.exitReasons.SECURITY_VIOLATION;
                    break;
                default:
                    exitReason = window.ExamExitManager.exitReasons.STUDENT_FINISH;
            }

            window.ExamExitManager.handleExamExit(exitReason, {
                reason: reason,
                antiCheatViolations: this.detectionState.totalViolations,
                windowsKeyCount: this.detectionState.windowsKeyCount,
                voluntary: reason === 'student_choice'
            });
        } else {
            // Fallback
            if (confirm('Сигурни ли сте че искате да напуснете изпита?')) {
                // Send completion to server to mark session as completed
                if (this.socket && this.socket.connected) {
                    this.socket.emit('exam-complete', {
                        sessionId: this.sessionId,
                        reason: reason,
                        completed: true,
                        timestamp: Date.now()
                    });
                }

                // Close window
                setTimeout(() => {
                    window.close();
                }, 500);
            }
        }
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

        // Clear intervals
        Object.values(this.intervals).forEach(interval => {
            if (interval) clearInterval(interval);
        });

        // Remove event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];

        // Hide any visible warnings
        this.hideWarningDialog();

        console.log('🔓 Balanced Anti-cheat deactivated');
    }

    /**
     * Get system statistics
     */
    getStats() {
        return {
            isActive: this.isActive,
            totalViolations: this.detectionState.totalViolations,
            focusLossCount: this.detectionState.focusLossCount,
            windowsKeyCount: this.detectionState.windowsKeyCount,
            fullscreenExitCount: this.detectionState.fullscreenExitCount,
            warningLevel: this.detectionState.warningLevel,
            config: { ...this.config },
            sessionId: this.sessionId,
            fullscreenMode: this.fullscreenMode
        };
    }
}

// Make available globally
window.AntiCheat = AntiCheat;

console.log('🛡️ Balanced Anti-Cheat System v3 loaded and ready');