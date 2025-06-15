/**
 * Anti-Cheat Detection System
 * Monitors and prevents suspicious activities during exam
 */
class AntiCheat {
    constructor(socket) {
        this.socket = socket;
        this.isActive = false;
        this.suspiciousCount = 0;
        this.warningCount = 0;
        this.isExamMode = false;

        // Configuration
        this.config = {
            enableKeyboardDetection: true,
            enableWindowDetection: true,
            enableContextMenuBlocking: true,
            enableCopyPasteBlocking: true,
            enableDevToolsBlocking: true,
            maxWarnings: 5,
            logToConsole: true
        };

        // Initialize but don't activate yet
        this.log('Anti-cheat system initialized (inactive)');
    }

    /**
     * Activate anti-cheat protection when exam starts
     */
    activate() {
        if (this.isActive) return;

        this.isActive = true;
        this.isExamMode = true;
        this.initializeEventListeners();
        this.addProtectionClasses();
        this.showStatus('active');
        this.log('🛡️ Anti-cheat protection activated');
    }

    /**
     * Deactivate anti-cheat protection
     */
    deactivate() {
        if (!this.isActive) return;

        this.isActive = false;
        this.isExamMode = false;
        this.removeEventListeners();
        this.removeProtectionClasses();
        this.hideStatus();
        this.log('Anti-cheat protection deactivated');
    }

    /**
     * Initialize all event listeners for detection
     */
    initializeEventListeners() {
        // Keyboard event detection
        if (this.config.enableKeyboardDetection) {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
            document.addEventListener('keyup', this.handleKeyUp.bind(this));
        }

        // Window focus/blur detection
        if (this.config.enableWindowDetection) {
            window.addEventListener('blur', this.handleWindowBlur.bind(this));
            window.addEventListener('focus', this.handleWindowFocus.bind(this));
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        }

        // Context menu blocking
        if (this.config.enableContextMenuBlocking) {
            document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        }

        // Copy/paste detection
        if (this.config.enableCopyPasteBlocking) {
            document.addEventListener('copy', this.handleCopyAttempt.bind(this));
            document.addEventListener('paste', this.handlePasteAttempt.bind(this));
            document.addEventListener('cut', this.handleCutAttempt.bind(this));
        }

        // Mouse events
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('selectstart', this.handleSelectStart.bind(this));

        // Developer tools detection (basic)
        if (this.config.enableDevToolsBlocking) {
            this.startDevToolsDetection();
        }

        this.log('Event listeners registered');
    }

    /**
     * Remove all event listeners
     */
    removeEventListeners() {
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
        window.removeEventListener('blur', this.handleWindowBlur.bind(this));
        window.removeEventListener('focus', this.handleWindowFocus.bind(this));
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        document.removeEventListener('contextmenu', this.handleContextMenu.bind(this));
        document.removeEventListener('copy', this.handleCopyAttempt.bind(this));
        document.removeEventListener('paste', this.handlePasteAttempt.bind(this));
        document.removeEventListener('cut', this.handleCutAttempt.bind(this));
        document.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        document.removeEventListener('selectstart', this.handleSelectStart.bind(this));
    }

    /**
     * Handle keyboard events for suspicious key combinations
     */
    handleKeyDown(e) {
        if (!this.isActive) return;

        const suspiciousKeys = [
            { key: 'F12', description: 'Developer Tools attempt (F12)' },
            { key: 'F5', description: 'Page refresh attempt (F5)' },
            { keys: ['Control', 'Shift', 'I'], description: 'Developer Tools shortcut (Ctrl+Shift+I)' },
            { keys: ['Control', 'Shift', 'J'], description: 'Console shortcut (Ctrl+Shift+J)' },
            { keys: ['Control', 'Shift', 'C'], description: 'Element inspector (Ctrl+Shift+C)' },
            { keys: ['Control', 'U'], description: 'View source attempt (Ctrl+U)' },
            { keys: ['Alt', 'Tab'], description: 'Application switching (Alt+Tab)' },
            { keys: ['Control', 'Tab'], description: 'Tab switching (Ctrl+Tab)' },
            { keys: ['Alt', 'F4'], description: 'Close window attempt (Alt+F4)' }
        ];

        // Check single key events
        if (e.code === 'F12' || e.code === 'F5') {
            e.preventDefault();
            this.reportSuspiciousActivity(
                'keyboard_shortcut',
                e.code === 'F12' ? suspiciousKeys[0].description : suspiciousKeys[1].description
            );
            return;
        }

        // Check key combinations
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyI') {
            e.preventDefault();
            this.reportSuspiciousActivity('dev_tools_attempt', 'Developer Tools shortcut (Ctrl+Shift+I)');
        } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyJ') {
            e.preventDefault();
            this.reportSuspiciousActivity('dev_tools_attempt', 'Console shortcut (Ctrl+Shift+J)');
        } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
            e.preventDefault();
            this.reportSuspiciousActivity('dev_tools_attempt', 'Element inspector (Ctrl+Shift+C)');
        } else if (e.ctrlKey && e.code === 'KeyU') {
            e.preventDefault();
            this.reportSuspiciousActivity('view_source_attempt', 'View source attempt (Ctrl+U)');
        } else if (e.altKey && e.code === 'Tab') {
            e.preventDefault();
            this.reportSuspiciousActivity('tab_switch', 'Application switching (Alt+Tab)');
        } else if (e.ctrlKey && e.code === 'Tab') {
            e.preventDefault();
            this.reportSuspiciousActivity('tab_switch', 'Tab switching (Ctrl+Tab)');
        } else if (e.altKey && e.code === 'F4') {
            e.preventDefault();
            this.reportSuspiciousActivity('window_close_attempt', 'Close window attempt (Alt+F4)');
        } else if (e.ctrlKey && e.code === 'KeyC') {
            e.preventDefault();
            this.reportSuspiciousActivity('copy_attempt', 'Copy attempt (Ctrl+C)');
        } else if (e.ctrlKey && e.code === 'KeyV') {
            e.preventDefault();
            this.reportSuspiciousActivity('paste_attempt', 'Paste attempt (Ctrl+V)');
        } else if (e.ctrlKey && e.code === 'KeyX') {
            e.preventDefault();
            this.reportSuspiciousActivity('cut_attempt', 'Cut attempt (Ctrl+X)');
        } else if (e.ctrlKey && e.code === 'KeyA') {
            e.preventDefault();
            this.reportSuspiciousActivity('select_all_attempt', 'Select all attempt (Ctrl+A)');
        }
    }

    handleKeyUp(e) {
        // Track key release events if needed
    }

    /**
     * Handle window focus/blur events
     */
    handleWindowBlur() {
        if (!this.isActive) return;
        this.reportSuspiciousActivity('window_blur', 'Window lost focus - possible app switching');
    }

    handleWindowFocus() {
        if (!this.isActive) return;
        this.log('Window regained focus');
        this.updateStatus('active');
    }

    /**
     * Handle visibility change (tab switching, minimizing)
     */
    handleVisibilityChange() {
        if (!this.isActive) return;

        if (document.hidden) {
            this.reportSuspiciousActivity('visibility_change', 'Tab/window hidden - possible navigation away');
        } else {
            this.log('Tab/window visible again');
        }
    }

    /**
     * Handle and block context menu (right-click)
     */
    handleContextMenu(e) {
        if (!this.isActive) return;

        e.preventDefault();
        this.reportSuspiciousActivity('right_click', 'Right-click context menu blocked');
        return false;
    }

    /**
     * Handle copy attempts
     */
    handleCopyAttempt(e) {
        if (!this.isActive) return;

        e.preventDefault();
        this.reportSuspiciousActivity('copy_attempt', 'Copy operation blocked');
        return false;
    }

    /**
     * Handle paste attempts  
     */
    handlePasteAttempt(e) {
        if (!this.isActive) return;

        e.preventDefault();
        this.reportSuspiciousActivity('paste_attempt', 'Paste operation blocked');
        return false;
    }

    /**
     * Handle cut attempts
     */
    handleCutAttempt(e) {
        if (!this.isActive) return;

        e.preventDefault();
        this.reportSuspiciousActivity('cut_attempt', 'Cut operation blocked');
        return false;
    }

    /**
     * Handle mouse events
     */
    handleMouseDown(e) {
        if (!this.isActive) return;

        // Block right mouse button
        if (e.button === 2) {
            e.preventDefault();
            this.reportSuspiciousActivity('right_click', 'Right mouse button blocked');
            return false;
        }
    }

    /**
     * Handle text selection attempts
     */
    handleSelectStart(e) {
        if (!this.isActive) return;

        // Allow selection in text input areas
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return true;
        }

        e.preventDefault();
        return false;
    }

    /**
     * Basic developer tools detection
     */
    startDevToolsDetection() {
        const devtools = {
            open: false,
            orientation: null
        };

        setInterval(() => {
            if (!this.isActive) return;

            if (window.outerHeight - window.innerHeight > 160 ||
                window.outerWidth - window.innerWidth > 160) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.reportSuspiciousActivity('dev_tools_detected', 'Developer Tools window detected');
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    }

    /**
     * Report suspicious activity to server and show warning
     */
    reportSuspiciousActivity(type, description) {
        this.suspiciousCount++;
        this.log(`🚨 SUSPICIOUS: ${description} (Count: ${this.suspiciousCount})`);

        // Update status
        this.updateStatus('warning');

        // Determine severity and action
        const severity = this.getSeverity(type);

        // Show warning for high/critical severity activities
        if (['high', 'critical'].includes(severity)) {
            this.showWarning(description);
        }

        // Report to server
        if (this.socket && this.socket.connected) {
            this.socket.emit('suspicious-activity', {
                activity: description,
                type: type,
                severity: severity,
                timestamp: Date.now(),
                count: this.suspiciousCount
            });
            this.log(`📤 Reported to server: ${type}`);
        }

        // Flash warning visual effect
        this.flashWarning();
    }

    /**
     * Get severity level for activity type
     */
    getSeverity(type) {
        const severityMap = {
            'tab_switch': 'high',
            'window_blur': 'medium',
            'dev_tools_attempt': 'critical',
            'dev_tools_detected': 'critical',
            'copy_attempt': 'high',
            'paste_attempt': 'high',
            'cut_attempt': 'high',
            'right_click': 'low',
            'view_source_attempt': 'high',
            'window_close_attempt': 'high',
            'visibility_change': 'medium'
        };
        return severityMap[type] || 'medium';
    }

    /**
     * Show warning dialog overlay
     */
    showWarning(description) {
        const overlay = document.getElementById('antiCheatOverlay');
        const message = document.getElementById('warningMessage');

        if (!overlay || !message) {
            this.createWarningOverlay();
            return this.showWarning(description);
        }

        message.innerHTML = `
            Засечено е напускане на изпита!<br>
            <strong>Действие:</strong> ${description}<br>
            Това действие е регистрирано.
        `;

        overlay.style.display = 'block';
        this.warningCount++;
        this.log(`🔴 Warning dialog shown: ${description} (Warning #${this.warningCount})`);
    }

    /**
     * Hide warning dialog
     */
    hideWarning() {
        const overlay = document.getElementById('antiCheatOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            this.log('🟢 Warning dialog hidden');
        }
    }

    /**
     * Create warning overlay if it doesn't exist
     */
    createWarningOverlay() {
        if (document.getElementById('antiCheatOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'antiCheatOverlay';
        overlay.className = 'anti-cheat-overlay';
        overlay.innerHTML = `
            <div class="warning-dialog">
                <div class="warning-title">⚠️ ПРЕДУПРЕЖДЕНИЕ ⚠️</div>
                <div class="warning-message" id="warningMessage">
                    Засечено е напускане на изпита!<br>
                    Това действие е регистрирано.
                </div>
                <div class="warning-buttons">
                    <button class="warning-button continue-button" onclick="window.antiCheat?.continueExam()">
                        Продължи изпита
                    </button>
                    <button class="warning-button exit-button" onclick="window.antiCheat?.exitExam()">
                        Напусни изпита
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.log('Warning overlay created');
    }

    /**
     * Handle continue exam button
     */
    continueExam() {
        this.hideWarning();
        this.updateStatus('active');
        this.log('🟢 Student chose to continue exam');
    }

    /**
     * Handle exit exam button
     */
    exitExam() {
        this.log('🔴 Student chose to exit exam');

        if (confirm('Сигурни ли сте че искате да напуснете изпита?')) {
            // Report exam termination
            if (this.socket && this.socket.connected) {
                this.socket.emit('exam-complete', {
                    reason: 'student_exit',
                    timestamp: Date.now()
                });
            }

            // Hide warning and show completion message
            this.hideWarning();
            alert('Изпитът е прекратен. Благодарим за участието!');

            // Optionally redirect or close
            window.location.href = '/';
        }
    }

    /**
     * Add protection CSS classes to body
     */
    addProtectionClasses() {
        document.body.classList.add('exam-protected', 'no-select', 'no-context-menu');
    }

    /**
     * Remove protection CSS classes from body
     */
    removeProtectionClasses() {
        document.body.classList.remove('exam-protected', 'no-select', 'no-context-menu');
    }

    /**
     * Show/update anti-cheat status indicator
     */
    showStatus(status) {
        let statusEl = document.getElementById('antiCheatStatus');

        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'antiCheatStatus';
            statusEl.className = 'anti-cheat-status';
            document.body.appendChild(statusEl);
        }

        this.updateStatus(status);
    }

    updateStatus(status) {
        const statusEl = document.getElementById('antiCheatStatus');
        if (!statusEl) return;

        statusEl.className = `anti-cheat-status ${status}`;

        const statusTexts = {
            'active': '🛡️ Защитен',
            'warning': '⚠️ Внимание',
            'alert': '🚨 Нарушение'
        };

        statusEl.textContent = statusTexts[status] || '🛡️ Активен';
    }

    /**
     * Hide status indicator
     */
    hideStatus() {
        const statusEl = document.getElementById('antiCheatStatus');
        if (statusEl) {
            statusEl.remove();
        }
    }

    /**
     * Flash warning visual effect
     */
    flashWarning() {
        document.body.classList.add('warning-flash');
        setTimeout(() => {
            document.body.classList.remove('warning-flash');
        }, 500);
    }

    /**
     * Logging utility
     */
    log(message) {
        if (this.config.logToConsole) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[AntiCheat ${timestamp}] ${message}`);
        }
    }

    /**
     * Get current statistics
     */
    getStats() {
        return {
            isActive: this.isActive,
            suspiciousCount: this.suspiciousCount,
            warningCount: this.warningCount,
            isExamMode: this.isExamMode
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('Configuration updated');
    }
}

// Export for global access
window.AntiCheat = AntiCheat;