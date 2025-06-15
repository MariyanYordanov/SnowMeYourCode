/**
 * Anti-Cheat Detection System - STRICT MODE
 * Shows red screen immediately on ANY tab switching attempt
 * FIXED: Window blur loop issue with grace period
 */
class AntiCheat {
    constructor(socket) {
        this.socket = socket;
        this.isActive = false;
        this.suspiciousCount = 0;
        this.warningCount = 0;
        this.isExamMode = false;
        this.isRedScreenVisible = false;
        this.continueButtonClicked = false; // Prevent double-clicking
        this.windowEventGracePeriod = false; // FIX: Grace period for window events

        // Configuration for strict JS exam mode
        this.config = {
            enableKeyboardDetection: true,
            enableWindowDetection: true,
            enableContextMenuBlocking: true,
            enableCopyPasteBlocking: true,
            enableDevToolsWarning: true,
            strictTabProtection: true,
            logToConsole: true
        };

        this.log('Anti-cheat system initialized (inactive) - STRICT tab protection mode');
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
        this.log('🛡️ Anti-cheat protection activated - STRICT tab protection enabled');
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
        this.hideWarning();
        this.log('Anti-cheat protection deactivated');
    }

    /**
     * Initialize all event listeners for detection
     */
    initializeEventListeners() {
        // Keyboard event detection
        if (this.config.enableKeyboardDetection) {
            document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
        }

        // STRICT Window focus/blur detection - NO EXCEPTIONS
        if (this.config.enableWindowDetection) {
            window.addEventListener('blur', this.handleWindowBlur.bind(this), true);
            window.addEventListener('focus', this.handleWindowFocus.bind(this), true);
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this), true);
        }

        // Context menu blocking
        if (this.config.enableContextMenuBlocking) {
            document.addEventListener('contextmenu', this.handleContextMenu.bind(this), true);
        }

        // Copy/paste detection
        if (this.config.enableCopyPasteBlocking) {
            document.addEventListener('copy', this.handleCopyAttempt.bind(this), true);
            document.addEventListener('paste', this.handlePasteAttempt.bind(this), true);
            document.addEventListener('cut', this.handleCutAttempt.bind(this), true);
        }

        // Mouse events
        document.addEventListener('mousedown', this.handleMouseDown.bind(this), true);
        document.addEventListener('selectstart', this.handleSelectStart.bind(this), true);

        // Developer tools monitoring with warnings only
        if (this.config.enableDevToolsWarning) {
            this.startDevToolsMonitoring();
        }

        // PREVENT window/tab management at document level
        document.addEventListener('beforeunload', this.handleBeforeUnload.bind(this), true);

        this.log('Event listeners registered - STRICT protection mode');
    }

    /**
     * Remove all event listeners
     */
    removeEventListeners() {
        document.removeEventListener('keydown', this.handleKeyDown.bind(this), true);
        window.removeEventListener('blur', this.handleWindowBlur.bind(this), true);
        window.removeEventListener('focus', this.handleWindowFocus.bind(this), true);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this), true);
        document.removeEventListener('contextmenu', this.handleContextMenu.bind(this), true);
        document.removeEventListener('copy', this.handleCopyAttempt.bind(this), true);
        document.removeEventListener('paste', this.handlePasteAttempt.bind(this), true);
        document.removeEventListener('cut', this.handleCutAttempt.bind(this), true);
        document.removeEventListener('mousedown', this.handleMouseDown.bind(this), true);
        document.removeEventListener('selectstart', this.handleSelectStart.bind(this), true);
        document.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this), true);
    }

    /**
     * Handle keyboard events - BLOCK ALL TAB NAVIGATION
     */
    handleKeyDown(e) {
        if (!this.isActive) return;

        // If red screen is visible, block ALL keyboard input except specific keys
        if (this.isRedScreenVisible) {
            // Allow only Enter and Space for warning dialog buttons
            if (e.code !== 'Enter' && e.code !== 'Space' && e.code !== 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }

        // STRICT TAB NAVIGATION BLOCKING - RED SCREEN TRIGGERS

        // Alt+Tab (switch applications)
        if (e.altKey && e.code === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('alt_tab', 'Опит за превключване между приложения (Alt+Tab)', 'critical');
            return false;
        }

        // Ctrl+Tab (next tab)
        if (e.ctrlKey && e.code === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('ctrl_tab', 'Опит за превключване към следващ таб (Ctrl+Tab)', 'critical');
            return false;
        }

        // Ctrl+Shift+Tab (previous tab)
        if (e.ctrlKey && e.shiftKey && e.code === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('ctrl_shift_tab', 'Опит за превключване към предишен таб (Ctrl+Shift+Tab)', 'critical');
            return false;
        }

        // Block window/tab management
        if (e.altKey && e.code === 'F4') {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('alt_f4', 'Опит за затваряне на прозореца (Alt+F4)', 'critical');
            return false;
        }

        if (e.ctrlKey && e.code === 'KeyW') {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('ctrl_w', 'Опит за затваряне на таба (Ctrl+W)', 'critical');
            return false;
        }

        if (e.ctrlKey && e.code === 'KeyT') {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('ctrl_t', 'Опит за отваряне на нов таб (Ctrl+T)', 'critical');
            return false;
        }

        if (e.ctrlKey && e.code === 'KeyN') {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('ctrl_n', 'Опит за отваряне на нов прозорец (Ctrl+N)', 'critical');
            return false;
        }

        // Block page refresh
        if (e.code === 'F5' || (e.ctrlKey && e.code === 'KeyR')) {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('refresh', 'Опит за презареждане на страницата', 'critical');
            return false;
        }

        // Block copy/paste operations
        if (e.ctrlKey && e.code === 'KeyC') {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('copy', 'Опит за копиране (Ctrl+C)', 'high');
            return false;
        }

        if (e.ctrlKey && e.code === 'KeyV') {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('paste', 'Опит за поставяне (Ctrl+V)', 'high');
            return false;
        }

        if (e.ctrlKey && e.code === 'KeyX') {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('cut', 'Опит за изрязване (Ctrl+X)', 'high');
            return false;
        }

        // Block view source
        if (e.ctrlKey && e.code === 'KeyU') {
            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('view_source', 'Опит за преглед на изходния код (Ctrl+U)', 'high');
            return false;
        }

        // DevTools - WARNING ONLY (no red screen, but prevent default)
        if (e.code === 'F12') {
            e.preventDefault(); // Prevent DevTools opening
            this.showDevToolsWarning('F12 pressed - DevTools blocked');
            return false;
        }

        if (e.ctrlKey && e.shiftKey && e.code === 'KeyI') {
            e.preventDefault(); // Prevent DevTools opening
            this.showDevToolsWarning('Ctrl+Shift+I pressed - DevTools blocked');
            return false;
        }

        if (e.ctrlKey && e.shiftKey && e.code === 'KeyJ') {
            e.preventDefault(); // Prevent Console opening
            this.showDevToolsWarning('Ctrl+Shift+J pressed - Console blocked');
            return false;
        }

        if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
            e.preventDefault(); // Prevent Element inspector
            this.showDevToolsWarning('Ctrl+Shift+C pressed - Element inspector blocked');
            return false;
        }
    }

    /**
     * Handle window focus/blur events - FIXED: With grace period
     */
    handleWindowBlur() {
        if (!this.isActive) {
            this.log('Window blur ignored - anti-cheat inactive');
            return;
        }

        // FIX: Check grace period
        if (this.windowEventGracePeriod) {
            this.log('Window blur ignored - grace period active');
            return;
        }

        // If red screen is already visible, don't show another one
        if (this.isRedScreenVisible) {
            this.log('Window blur ignored - red screen already visible');
            return;
        }

        // IMMEDIATE RED SCREEN - NO EXCEPTIONS
        this.showRedScreen('window_blur', 'Излизане от прозореца на изпита', 'critical');
    }

    handleWindowFocus() {
        if (!this.isActive) return;
        this.log('Window regained focus');
        // Don't automatically hide red screen - only via button
    }

    /**
     * Handle visibility change - FIXED: With grace period
     */
    handleVisibilityChange() {
        if (!this.isActive) {
            this.log('Visibility change ignored - anti-cheat inactive');
            return;
        }

        // FIX: Check grace period
        if (this.windowEventGracePeriod) {
            this.log('Visibility change ignored - grace period active');
            return;
        }

        if (document.hidden) {
            // If red screen is already visible, don't show another one
            if (this.isRedScreenVisible) {
                this.log('Visibility change ignored - red screen already visible');
                return;
            }

            // IMMEDIATE RED SCREEN - NO EXCEPTIONS
            this.showRedScreen('visibility_change', 'Скриване на таба на изпита', 'critical');
        } else {
            this.log('Tab/window visible again');
            // Don't automatically hide red screen - only via button
        }
    }

    /**
     * Handle beforeunload to prevent navigation - STRICT BLOCKING
     */
    handleBeforeUnload(e) {
        if (!this.isActive) return;

        // BLOCK ALL NAVIGATION ATTEMPTS - no confirmation dialog
        e.preventDefault();
        e.returnValue = '';
        e.stopImmediatePropagation();

        // Show red screen instead of browser dialog
        setTimeout(() => {
            if (this.isActive && !this.isRedScreenVisible) {
                this.showRedScreen('navigation_attempt', 'Опит за навигация/refresh на страницата', 'critical');
            }
        }, 100);

        return '';
    }

    /**
     * Show RED SCREEN for critical violations - BLOCKS EVERYTHING
     */
    showRedScreen(type, description, severity) {
        this.suspiciousCount++;
        this.isRedScreenVisible = true;
        this.log(`🚨 RED SCREEN: ${description} (Count: ${this.suspiciousCount})`);

        // Update status
        this.updateStatus('violation');

        // Show red screen overlay
        this.showWarning(description);

        // Report to teacher
        this.reportToTeacher(type, description, severity, true);

        // Flash warning visual effect
        this.flashWarning();

        // Block all user interaction except warning dialog
        this.blockAllInteraction();
    }

    /**
     * Block all user interaction while red screen is visible
     */
    blockAllInteraction() {
        // Add class to body to block interaction
        document.body.classList.add('red-screen-active');

        // Add CSS to block interaction
        const blockingStyle = document.createElement('style');
        blockingStyle.id = 'red-screen-blocking';
        blockingStyle.textContent = `
            body.red-screen-active * {
                pointer-events: none !important;
            }
            body.red-screen-active .anti-cheat-overlay,
            body.red-screen-active .anti-cheat-overlay * {
                pointer-events: auto !important;
            }
        `;
        document.head.appendChild(blockingStyle);
    }

    /**
     * Unblock user interaction
     */
    unblockAllInteraction() {
        document.body.classList.remove('red-screen-active');
        const blockingStyle = document.getElementById('red-screen-blocking');
        if (blockingStyle) {
            blockingStyle.remove();
        }
    }

    /**
     * Show DevTools warning (not red screen)
     */
    showDevToolsWarning(activity) {
        this.log(`🔧 DevTools Warning: ${activity}`);
        this.showDevToolsNotification(activity);
        this.reportToTeacher('dev_tools_blocked', activity, 'info', false);
    }

    /**
     * Show brief DevTools notification
     */
    showDevToolsNotification(activity) {
        const existingNotif = document.getElementById('devToolsNotification');
        if (existingNotif) {
            existingNotif.remove();
        }

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
            pointer-events: none;
        `;
        notification.innerHTML = `
            <div>⚠️ DevTools Detection</div>
            <div style="font-size: 12px; margin-top: 4px;">
                ${activity}<br>
                <small>Блокирано и регистрирано</small>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
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
        if (!this.isActive) return;

        // Allow right-click in code editor only
        if (e.target && (e.target.id === 'code-editor' || e.target.tagName === 'TEXTAREA')) {
            return true;
        }

        e.preventDefault();
        e.stopPropagation();
        this.showRedScreen('right_click', 'Опит за десен клик извън редактора', 'medium');
        return false;
    }

    handleCopyAttempt(e) {
        if (!this.isActive) return;

        // Allow copy from code editor only
        if (e.target && (e.target.id === 'code-editor' || e.target.tagName === 'TEXTAREA')) {
            return true;
        }

        e.preventDefault();
        e.stopPropagation();
        this.showRedScreen('copy_attempt', 'Опит за копиране извън редактора', 'high');
        return false;
    }

    handlePasteAttempt(e) {
        if (!this.isActive) return;

        // Allow paste into code editor only
        if (e.target && (e.target.id === 'code-editor' || e.target.tagName === 'TEXTAREA')) {
            return true;
        }

        e.preventDefault();
        e.stopPropagation();
        this.showRedScreen('paste_attempt', 'Опит за поставяне извън редактора', 'high');
        return false;
    }

    handleCutAttempt(e) {
        if (!this.isActive) return;

        // Allow cut from code editor only
        if (e.target && (e.target.id === 'code-editor' || e.target.tagName === 'TEXTAREA')) {
            return true;
        }

        e.preventDefault();
        e.stopPropagation();
        this.showRedScreen('cut_attempt', 'Опит за изрязване извън редактора', 'high');
        return false;
    }

    handleMouseDown(e) {
        if (!this.isActive) return;

        // Allow right mouse button in code editor only
        if (e.button === 2) {
            if (e.target && (e.target.id === 'code-editor' || e.target.tagName === 'TEXTAREA')) {
                return true;
            }

            e.preventDefault();
            e.stopPropagation();
            this.showRedScreen('right_click_mouse', 'Десен клик с мишката извън редактора', 'medium');
            return false;
        }
    }

    handleSelectStart(e) {
        if (!this.isActive) return;

        // Allow selection in code areas only
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
     * DevTools monitoring with delay and higher threshold
     */
    startDevToolsMonitoring() {
        let devToolsOpen = false;
        let lastLogTime = 0;
        let initDelay = true;

        // Wait 10 seconds after activation before starting monitoring (INCREASED from 3)
        setTimeout(() => {
            initDelay = false;
            this.log('🔧 DevTools monitoring activated after delay');
        }, 10000);

        setInterval(() => {
            if (!this.isActive || initDelay) return;

            const threshold = 300; // Increased from 200
            const heightDiff = window.outerHeight - window.innerHeight;
            const widthDiff = window.outerWidth - window.innerWidth;

            const currentlyOpen = heightDiff > threshold || widthDiff > threshold;

            if (currentlyOpen !== devToolsOpen) {
                const now = Date.now();
                if (now - lastLogTime > 5000) {
                    devToolsOpen = currentlyOpen;
                    lastLogTime = now;

                    if (devToolsOpen) {
                        this.showDevToolsWarning('DevTools opened (size detection)');
                    } else {
                        this.log('🔧 DevTools closed (size detection)');
                    }
                }
            }
        }, 3000); // Check every 3 seconds instead of 2
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
            <small>Трябва да натиснете "Продължи изпита" за да се върнете.</small><br>
            <small>Всички опити за навигация са блокирани.</small>
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
            this.isRedScreenVisible = false;
            this.unblockAllInteraction();
            this.log('🟢 Red screen hidden');
        }
    }

    /**
     * Create warning overlay with proper event listeners (no onclick in HTML)
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
                    <button class="warning-button continue-button" id="continue-exam-btn">
                        Продължи изпита
                    </button>
                    <button class="warning-button exit-button" id="exit-exam-btn">
                        Напусни изпита
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add event listeners instead of onclick
        const continueBtn = overlay.querySelector('#continue-exam-btn');
        const exitBtn = overlay.querySelector('#exit-exam-btn');

        if (continueBtn) {
            continueBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.continueExam();
            });
        }

        if (exitBtn) {
            exitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.exitExam();
            });
        }

        this.log('Red screen overlay created with event listeners');
    }

    /**
     * Handle continue exam button - FIXED: With grace period
     */
    continueExam() {
        // Prevent double-clicking
        if (this.continueButtonClicked) {
            this.log('Continue button already clicked, ignoring');
            return;
        }

        this.continueButtonClicked = true;

        // FIX: Grace period for window events
        this.windowEventGracePeriod = true;
        this.log('🔄 Window event grace period started (5 seconds)');

        // Reset after 2 seconds for button, 5 seconds for window events
        setTimeout(() => {
            this.continueButtonClicked = false;
        }, 2000);

        setTimeout(() => {
            this.windowEventGracePeriod = false;
            this.log('✅ Window event grace period ended');
        }, 5000);

        this.hideWarning();

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

        // Focus code editor
        setTimeout(() => {
            const codeEditor = document.getElementById('code-editor');
            if (codeEditor) {
                codeEditor.focus();
                this.log('🎯 Auto-focused code editor');
            }
        }, 100);

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

            // Close window or redirect
            window.close();
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
                pointer-events: none;
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
            isRedScreenVisible: this.isRedScreenVisible,
            strictMode: true
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