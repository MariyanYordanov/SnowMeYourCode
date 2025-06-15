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

        // Grace period management
        this.gracePeriodActive = false;
        this.gracePeriodDuration = 5000; // 5 seconds
        this.gracePeriodTimer = null;

        // Configuration for JS exam
        this.config = {
            enableKeyboardDetection: true,
            enableWindowDetection: true,
            enableContextMenuBlocking: true,
            enableCopyPasteBlocking: true,
            enableDevToolsBlocking: false, // No red screen for DevTools
            enableDevToolsWarning: true,   // Show warning + notify teacher
            maxWarnings: 5,
            logToConsole: true
        };

        // Initialize but don't activate yet
        this.log('Anti-cheat system initialized (inactive) - JS exam mode with grace period');
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
        this.log('🛡️ Anti-cheat protection activated - DevTools warnings enabled');
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
        this.clearGracePeriod();
        this.log('Anti-cheat protection deactivated');
    }

    /**
     * Start grace period - temporarily disable detection
     */
    startGracePeriod() {
        this.gracePeriodActive = true;
        this.clearGracePeriod(); // Clear any existing timer

        this.log(`🕐 Grace period started (${this.gracePeriodDuration / 1000} seconds)`);
        this.updateStatus('grace');

        this.gracePeriodTimer = setTimeout(() => {
            this.gracePeriodActive = false;
            this.updateStatus('active');
            this.log('🕐 Grace period ended - detection reactivated');
        }, this.gracePeriodDuration);
    }

    /**
     * Clear grace period timer
     */
    clearGracePeriod() {
        if (this.gracePeriodTimer) {
            clearTimeout(this.gracePeriodTimer);
            this.gracePeriodTimer = null;
        }
    }

    /**
     * Check if currently in grace period
     */
    isInGracePeriod() {
        return this.gracePeriodActive;
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

        // Window focus/blur detection - STRICT with grace period
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

        // Developer tools monitoring with warnings
        if (this.config.enableDevToolsWarning) {
            this.startDevToolsMonitoring();
        }

        this.log('Event listeners registered - Grace period support enabled');
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
        if (!this.isActive || this.isInGracePeriod()) return;

        // RED SCREEN TRIGGERS - Tab switching
        if (e.altKey && e.code === 'Tab') {
            e.preventDefault();
            this.showRedScreen('tab_switch', 'Превключване между приложения (Alt+Tab)', 'critical');
            return;
        }

        if (e.ctrlKey && e.code === 'Tab') {
            e.preventDefault();
            this.showRedScreen('tab_switch', 'Превключване между табове (Ctrl+Tab)', 'critical');
            return;
        }

        // Block window/tab management - RED SCREEN
        if (e.altKey && e.code === 'F4') {
            e.preventDefault();
            this.showRedScreen('window_close_attempt', 'Опит за затваряне на прозореца (Alt+F4)', 'critical');
            return;
        }

        if (e.ctrlKey && e.code === 'KeyW') {
            e.preventDefault();
            this.showRedScreen('tab_close_attempt', 'Опит за затваряне на таба (Ctrl+W)', 'critical');
            return;
        }

        if (e.ctrlKey && e.code === 'KeyT') {
            e.preventDefault();
            this.showRedScreen('new_tab_attempt', 'Опит за отваряне на нов таб (Ctrl+T)', 'critical');
            return;
        }

        if (e.ctrlKey && e.code === 'KeyN') {
            e.preventDefault();
            this.showRedScreen('new_window_attempt', 'Опит за отваряне на нов прозорец (Ctrl+N)', 'critical');
            return;
        }

        // Block page refresh - RED SCREEN
        if (e.code === 'F5' || (e.ctrlKey && e.code === 'KeyR')) {
            e.preventDefault();
            this.showRedScreen('refresh_attempt', 'Опит за презареждане на страницата', 'critical');
            return;
        }

        // Block copy/paste operations - RED SCREEN
        if (e.ctrlKey && e.code === 'KeyC') {
            e.preventDefault();
            this.showRedScreen('copy_attempt', 'Опит за копиране (Ctrl+C)', 'high');
            return;
        }

        if (e.ctrlKey && e.code === 'KeyV') {
            e.preventDefault();
            this.showRedScreen('paste_attempt', 'Опит за поставяне (Ctrl+V)', 'high');
            return;
        }

        if (e.ctrlKey && e.code === 'KeyX') {
            e.preventDefault();
            this.showRedScreen('cut_attempt', 'Опит за изрязване (Ctrl+X)', 'high');
            return;
        }

        // Block select all (outside code editor) - RED SCREEN
        if (e.ctrlKey && e.code === 'KeyA') {
            const activeElement = document.activeElement;
            if (!activeElement ||
                (activeElement.tagName !== 'TEXTAREA' && activeElement.id !== 'code-editor')) {
                e.preventDefault();
                this.showRedScreen('select_all_attempt', 'Опит за селектиране извън редактора', 'medium');
                return;
            }
        }

        // Block view source - RED SCREEN
        if (e.ctrlKey && e.code === 'KeyU') {
            e.preventDefault();
            this.showRedScreen('view_source_attempt', 'Опит за преглед на изходния код (Ctrl+U)', 'high');
            return;
        }

        // DevTools - WARNING ONLY (no red screen)
        if (e.code === 'F12') {
            this.showDevToolsWarning('F12 pressed - DevTools opened');
            // DON'T prevent default - allow DevTools
            return;
        }

        if (e.ctrlKey && e.shiftKey && e.code === 'KeyI') {
            this.showDevToolsWarning('Ctrl+Shift+I pressed - DevTools opened');
            // DON'T prevent default - allow DevTools
            return;
        }

        if (e.ctrlKey && e.shiftKey && e.code === 'KeyJ') {
            this.showDevToolsWarning('Ctrl+Shift+J pressed - Console opened');
            // DON'T prevent default - allow Console
            return;
        }

        if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
            this.showDevToolsWarning('Ctrl+Shift+C pressed - Element inspector');
            // DON'T prevent default - allow inspector
            return;
        }
    }

    handleKeyUp(e) {
        // Track key release events if needed
    }

    /**
     * Handle window focus/blur events - RED SCREEN with grace period
     */
    handleWindowBlur() {
        if (!this.isActive || this.isInGracePeriod()) {
            this.log('Window blur ignored (grace period or inactive)');
            return;
        }

        this.showRedScreen('window_blur', 'Напускане на прозореца на изпита', 'critical');
    }

    handleWindowFocus() {
        if (!this.isActive) return;
        this.log('Window regained focus');
        if (!this.isInGracePeriod()) {
            this.updateStatus('active');
        }
    }

    /**
     * Handle visibility change - RED SCREEN with grace period
     */
    handleVisibilityChange() {
        if (!this.isActive || this.isInGracePeriod()) {
            this.log('Visibility change ignored (grace period or inactive)');
            return;
        }

        if (document.hidden) {
            this.showRedScreen('visibility_change', 'Скриване на таба на изпита', 'critical');
        } else {
            this.log('Tab/window visible again');
            if (!this.isInGracePeriod()) {
                this.updateStatus('active');
            }
        }
    }

    /**
     * Show RED SCREEN for critical violations
     */
    showRedScreen(type, description, severity) {
        this.suspiciousCount++;
        this.log(`🚨 RED SCREEN: ${description} (Count: ${this.suspiciousCount})`);

        // Update status
        this.updateStatus('violation');

        // Show red screen overlay
        this.showWarning(description);

        // Report to server with teacher notification
        this.reportToTeacher(type, description, severity, true); // isRedScreen = true

        // Flash warning visual effect
        this.flashWarning();
    }

    /**
     * Show DevTools warning (not red screen)
     */
    showDevToolsWarning(activity) {
        this.log(`🔧 DevTools Warning: ${activity}`);

        // Show brief warning notification (not red screen)
        this.showDevToolsNotification(activity);

        // Report to teacher
        this.reportToTeacher('dev_tools_usage', activity, 'info', false); // Not red screen
    }

    /**
     * Show brief DevTools notification
     */
    showDevToolsNotification(activity) {
        // Remove any existing notification
        const existingNotif = document.getElementById('devToolsNotification');
        if (existingNotif) {
            existingNotif.remove();
        }

        // Create notification
        const notification = document.createElement('div');
        notification.id = 'devToolsNotification';
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 10px;
            background-color: #ffc107;
            color: #212529;
            padding: 12px 16px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            z-index: 1001;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: opacity 0.3s;
        `;
        notification.innerHTML = `
            <div>⚠️ DevTools Detection</div>
            <div style="font-size: 12px; margin-top: 4px;">
                ${activity}<br>
                <small>Разрешено за debugging, но е регистрирано</small>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-hide after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 4000);
    }

    /**
     * Report activity to teacher
     */
    reportToTeacher(type, description, severity, isRedScreen) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('suspicious-activity', {
                activity: description,
                type: type,
                severity: severity,
                timestamp: Date.now(),
                count: this.suspiciousCount,
                blocked: isRedScreen,
                isRedScreen: isRedScreen,
                studentAction: isRedScreen ? 'shown_red_screen' : 'shown_warning'
            });
            this.log(`📤 Reported to teacher: ${type} (Red screen: ${isRedScreen})`);
        }
    }

    /**
     * Handle context menu, copy, paste, etc.
     */
    handleContextMenu(e) {
        if (!this.isActive || this.isInGracePeriod()) return;

        // Allow right-click in code editor
        if (e.target && (e.target.id === 'code-editor' || e.target.tagName === 'TEXTAREA')) {
            return true;
        }

        e.preventDefault();
        this.showRedScreen('right_click', 'Опит за десен клик извън редактора', 'low');
        return false;
    }

    handleCopyAttempt(e) {
        if (!this.isActive || this.isInGracePeriod()) return;

        // Allow copy from code editor
        if (e.target && (e.target.id === 'code-editor' || e.target.tagName === 'TEXTAREA')) {
            return true;
        }

        e.preventDefault();
        this.showRedScreen('copy_attempt', 'Опит за копиране извън редактора', 'high');
        return false;
    }

    handlePasteAttempt(e) {
        if (!this.isActive || this.isInGracePeriod()) return;

        // Allow paste into code editor
        if (e.target && (e.target.id === 'code-editor' || e.target.tagName === 'TEXTAREA')) {
            return true;
        }

        e.preventDefault();
        this.showRedScreen('paste_attempt', 'Опит за поставяне извън редактора', 'high');
        return false;
    }

    handleCutAttempt(e) {
        if (!this.isActive || this.isInGracePeriod()) return;

        // Allow cut from code editor
        if (e.target && (e.target.id === 'code-editor' || e.target.tagName === 'TEXTAREA')) {
            return true;
        }

        e.preventDefault();
        this.showRedScreen('cut_attempt', 'Опит за изрязване извън редактора', 'high');
        return false;
    }

    handleMouseDown(e) {
        if (!this.isActive || this.isInGracePeriod()) return;

        // Allow right mouse button in code editor
        if (e.button === 2) {
            if (e.target && (e.target.id === 'code-editor' || e.target.tagName === 'TEXTAREA')) {
                return true;
            }

            e.preventDefault();
            this.showRedScreen('right_click', 'Десен клик извън редактора', 'low');
            return false;
        }
    }

    handleSelectStart(e) {
        if (!this.isActive || this.isInGracePeriod()) return;

        // Allow selection in code areas
        if (e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.id === 'code-editor' ||
            e.target.closest('#code-output')) {
            return true;
        }

        e.preventDefault();
        return false;
    }

    /**
     * DevTools monitoring (size-based detection)
     */
    startDevToolsMonitoring() {
        let devToolsOpen = false;
        let lastLogTime = 0;

        setInterval(() => {
            if (!this.isActive) return;

            const threshold = 160;
            const heightDiff = window.outerHeight - window.innerHeight;
            const widthDiff = window.outerWidth - window.innerWidth;

            const currentlyOpen = heightDiff > threshold || widthDiff > threshold;

            // Only log state changes, not continuous monitoring
            if (currentlyOpen !== devToolsOpen) {
                const now = Date.now();
                if (now - lastLogTime > 5000) { // Throttle to once per 5 seconds
                    devToolsOpen = currentlyOpen;
                    lastLogTime = now;

                    if (devToolsOpen) {
                        this.showDevToolsWarning('DevTools opened (size detection)');
                    } else {
                        this.log('🔧 DevTools closed (size detection)');
                        // Don't show warning for closing DevTools
                    }
                }
            }
        }, 1000); // Check every second
    }

    /**
     * Show warning dialog overlay (RED SCREEN)
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
            <br>
            <small>За JavaScript изпити Developer Tools са разрешени за debugging.</small><br>
            <small>Забранени са: копиране/поставяне, превключване между приложения, навигация.</small>
        `;

        overlay.style.display = 'block';
        this.warningCount++;
        this.log(`🔴 Red screen shown: ${description} (Warning #${this.warningCount})`);
    }

    /**
     * Hide warning dialog
     */
    hideWarning() {
        const overlay = document.getElementById('antiCheatOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            this.log('🟢 Red screen hidden');
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
        this.log('Red screen overlay created');
    }

    /**
     * Handle continue exam button - WITH GRACE PERIOD
     */
    continueExam() {
        this.hideWarning();

        // START GRACE PERIOD - key part!
        this.startGracePeriod();

        // Ensure exam interface is visible and functional
        const workspace = document.getElementById('workspace');
        const loginForm = document.getElementById('login-form');

        if (workspace) {
            workspace.style.display = 'block';
            workspace.style.pointerEvents = 'auto';
        }

        if (loginForm) {
            loginForm.style.display = 'none';
        }

        // Remove any blocking overlays
        document.body.classList.remove('warning-flash');

        // Auto-focus to code editor (as requested)
        setTimeout(() => {
            const codeEditor = document.getElementById('code-editor');
            if (codeEditor) {
                codeEditor.focus();
                this.log('🎯 Auto-focused code editor');
            }
        }, 100);

        this.log('🟢 Student chose to continue exam - Grace period active');
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

            // Redirect
            window.location.href = '/';
        }
    }

    /**
     * Add protection CSS classes to body
     */
    addProtectionClasses() {
        document.body.classList.add('exam-protected');
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
            statusEl.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 12px;
                font-weight: bold;
                z-index: 1000;
                color: white;
            `;
            document.body.appendChild(statusEl);
        }

        this.updateStatus(status);
    }

    updateStatus(status) {
        const statusEl = document.getElementById('antiCheatStatus');
        if (!statusEl) return;

        const statusConfig = {
            'active': { text: '🛡️ Защитен', color: '#28a745' },
            'grace': { text: '⏰ Grace Period', color: '#17a2b8' },
            'warning': { text: '⚠️ Внимание', color: '#ffc107' },
            'violation': { text: '🚨 Нарушение', color: '#dc3545' }
        };

        const config = statusConfig[status] || statusConfig.active;
        statusEl.textContent = config.text;
        statusEl.style.backgroundColor = config.color;
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
            isExamMode: this.isExamMode,
            gracePeriodActive: this.gracePeriodActive,
            devToolsAllowed: !this.config.enableDevToolsBlocking
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