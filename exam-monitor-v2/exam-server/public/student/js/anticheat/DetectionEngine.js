/**
 * DetectionEngine - Core detection algorithms for anti-cheat system
 * Handles keyboard, mouse, focus, and fullscreen detection
 */
export class DetectionEngine {
    constructor(violationTracker, config = {}) {
        this.violationTracker = violationTracker;
        this.isActive = false;
        this.fullscreenMode = false;

        this.config = {
            // Detection settings
            enableKeyboardDetection: true,
            enableFocusDetection: true,
            enableFullscreenDetection: true,
            enableClipboardDetection: true,
            enableContextMenuDetection: true,

            // Tolerance settings
            focusLossGracePeriod: 3000, // 3 seconds
            focusLossMinDuration: 2000, // Must be lost for 2+ seconds
            shortFocusLossIgnore: 1000, // Ignore losses under 1 second

            // Override with provided config
            ...config
        };

        // Detection state
        this.state = {
            lastFocusTime: Date.now(),
            focusLossStartTime: null,
            isDocumentHidden: false,
            eventListeners: [] // Track for cleanup
        };

        console.log('🔍 DetectionEngine initialized');
    }

    /**
     * Activate detection systems
     */
    activate() {
        if (this.isActive) return;

        console.log('🚫 Activating detection systems...');
        this.isActive = true;

        // Setup detection systems with delay for stability
        setTimeout(() => {
            if (this.config.enableKeyboardDetection) {
                this.setupKeyboardDetection();
            }
            if (this.config.enableFocusDetection) {
                this.setupFocusDetection();
            }
            if (this.config.enableFullscreenDetection) {
                this.setupFullscreenDetection();
            }
            if (this.config.enableClipboardDetection) {
                this.setupClipboardDetection();
            }
            if (this.config.enableContextMenuDetection) {
                this.setupContextMenuDetection();
            }

            console.log('✅ Detection systems activated');
        }, 1000);
    }

    /**
     * Deactivate detection systems
     */
    deactivate() {
        if (!this.isActive) return;

        console.log('🔓 Deactivating detection systems...');
        this.isActive = false;

        // Remove all event listeners
        this.state.eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.state.eventListeners = [];

        console.log('🔓 Detection systems deactivated');
    }

    /**
     * Setup keyboard detection
     */
    setupKeyboardDetection() {
        const keydownHandler = (e) => {
            if (!this.isActive) return;

            // Critical violations (Windows key, system shortcuts)
            if (this.isWindowsKeyEvent(e)) {
                e.preventDefault();
                this.handleDetection('windowsKey', {
                    key: e.key,
                    code: e.code,
                    metaKey: e.metaKey
                });
                return false;
            }

            // System shortcuts
            if (this.isSystemShortcut(e)) {
                e.preventDefault();
                this.handleDetection('systemShortcut', {
                    combination: this.getKeyComboName(e),
                    blocked: true
                });
                return false;
            }

            // Suspicious combinations (block but don't penalize heavily)
            if (this.isSuspiciousKeyCombo(e)) {
                e.preventDefault();
                this.handleDetection('suspiciousKey', {
                    combination: this.getKeyComboName(e),
                    blocked: true
                });
                return false;
            }
        };

        this.addEventListenerWithTracking(
            document,
            'keydown',
            keydownHandler,
            { capture: true, passive: false }
        );

        console.log('⌨️ Keyboard detection active');
    }

    /**
     * Check if event is Windows key related
     */
    isWindowsKeyEvent(e) {
        // Direct Windows key detection
        if (['MetaLeft', 'MetaRight', 'OSLeft', 'OSRight'].includes(e.code) ||
            ['Meta', 'OS'].includes(e.key) ||
            e.metaKey) {
            return true;
        }

        // Alt+Tab (system switching)
        if (e.altKey && e.code === 'Tab') {
            return true;
        }

        // Ctrl+Alt+Del
        if (e.ctrlKey && e.altKey && e.code === 'Delete') {
            return true;
        }

        // Ctrl+Shift+Esc (Task Manager)
        if (e.ctrlKey && e.shiftKey && e.code === 'Escape') {
            return true;
        }

        return false;
    }

    /**
     * Check if event is system shortcut
     */
    isSystemShortcut(e) {
        const criticalShortcuts = [
            { alt: true, code: 'F4' }, // Close window
            { code: 'F11' }, // Toggle fullscreen
            { ctrl: true, code: 'KeyW' }, // Close tab
            { ctrl: true, code: 'KeyT' }, // New tab
            { ctrl: true, code: 'KeyN' } // New window
        ];

        return criticalShortcuts.some(shortcut =>
            this.matchesShortcut(e, shortcut)
        );
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

        // Refresh
        if ((e.ctrlKey && e.code === 'KeyR') || e.code === 'F5') {
            return true;
        }

        // Escape key (in exam context)
        if (e.code === 'Escape') {
            return true;
        }

        return false;
    }

    /**
     * Setup focus detection
     */
    setupFocusDetection() {
        const blurHandler = () => {
            if (!this.isActive) return;
            this.state.focusLossStartTime = Date.now();
            console.log('👁️ Focus lost - monitoring...');
        };

        const focusHandler = () => {
            if (!this.isActive) return;

            if (this.state.focusLossStartTime) {
                const duration = Date.now() - this.state.focusLossStartTime;
                this.evaluateFocusLoss(duration);
                this.state.focusLossStartTime = null;
            }

            this.state.lastFocusTime = Date.now();
        };

        const visibilityHandler = () => {
            if (!this.isActive) return;

            if (document.hidden) {
                this.state.isDocumentHidden = true;
                // Monitor for prolonged hiding
                setTimeout(() => {
                    if (document.hidden && this.isActive) {
                        this.handleDetection('documentHidden', {
                            duration: this.config.focusLossGracePeriod
                        });
                    }
                }, this.config.focusLossGracePeriod);
            } else {
                this.state.isDocumentHidden = false;
            }
        };

        this.addEventListenerWithTracking(window, 'blur', blurHandler);
        this.addEventListenerWithTracking(window, 'focus', focusHandler);
        this.addEventListenerWithTracking(document, 'visibilitychange', visibilityHandler);

        console.log('👁️ Focus detection active');
    }

    /**
     * Evaluate focus loss with balanced approach
     */
    evaluateFocusLoss(duration) {
        // Ignore very short focus losses
        if (duration < this.config.shortFocusLossIgnore) {
            console.log(`👁️ Ignoring short focus loss: ${duration}ms`);
            return;
        }

        // Significant focus loss
        if (duration > this.config.focusLossMinDuration) {
            this.handleDetection('focusLoss', {
                duration: duration,
                significant: true
            });
        }
    }

    /**
     * Setup fullscreen detection
     */
    setupFullscreenDetection() {
        const fullscreenHandler = () => {
            if (!this.isActive) return;

            const isFullscreen = this.isDocumentInFullscreen();

            if (!isFullscreen && this.fullscreenMode) {
                this.handleDetection('fullscreenExit', {
                    timestamp: Date.now()
                });
            }
        };

        // Listen for all fullscreen events
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
            .forEach(eventName => {
                this.addEventListenerWithTracking(document, eventName, fullscreenHandler);
            });

        console.log('🖥️ Fullscreen detection active');
    }

    /**
     * Setup clipboard detection
     */
    setupClipboardDetection() {
        const clipboardHandler = (e) => {
            if (!this.isActive) return;

            // Allow in code editor areas
            if (this.isCodeEditorArea(e.target)) {
                return; // Allow clipboard in editor
            }

            e.preventDefault();
            this.handleDetection('clipboardAttempt', {
                type: e.type,
                blocked: true
            });
            return false;
        };

        ['copy', 'cut', 'paste'].forEach(eventType => {
            this.addEventListenerWithTracking(
                document,
                eventType,
                clipboardHandler,
                { capture: true, passive: false }
            );
        });

        console.log('📋 Clipboard detection active');
    }

    /**
     * Setup context menu detection
     */
    setupContextMenuDetection() {
        const contextMenuHandler = (e) => {
            if (!this.isActive) return;

            // Allow in code editor areas
            if (this.isCodeEditorArea(e.target)) {
                return; // Allow right-click in editor
            }

            e.preventDefault();
            this.handleDetection('rightClick', {
                target: e.target.tagName,
                blocked: true
            });
            return false;
        };

        this.addEventListenerWithTracking(
            document,
            'contextmenu',
            contextMenuHandler,
            { capture: true, passive: false }
        );

        console.log('🖱️ Context menu detection active');
    }

    /**
     * Handle detection event
     */
    handleDetection(type, data = {}) {
        console.log(`🚨 Detection: ${type}`, data);

        // Add violation through tracker
        const result = this.violationTracker.addViolation(type, data);

        // Log detection with result
        console.log(`📊 Violation result:`, result);

        return result;
    }

    /**
     * Helper methods
     */
    matchesShortcut(event, shortcut) {
        return Object.keys(shortcut).every(key => {
            if (key === 'code') return event.code === shortcut[key];
            if (key === 'ctrl') return event.ctrlKey === shortcut[key];
            if (key === 'alt') return event.altKey === shortcut[key];
            if (key === 'shift') return event.shiftKey === shortcut[key];
            return true;
        });
    }

    getKeyComboName(e) {
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Win');
        parts.push(e.code);
        return parts.join('+');
    }

    isDocumentInFullscreen() {
        return !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement);
    }

    isCodeEditorArea(element) {
        return element.closest('#code-editor, textarea, input[type="text"], .code-output');
    }

    addEventListenerWithTracking(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        this.state.eventListeners.push({ element, event, handler, options });
    }

    /**
     * Set fullscreen mode
     */
    setFullscreenMode(enabled) {
        this.fullscreenMode = enabled;
        console.log(`🖥️ Fullscreen mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ DetectionEngine configuration updated');
    }

    /**
     * Get detection statistics
     */
    getStatistics() {
        return {
            isActive: this.isActive,
            fullscreenMode: this.fullscreenMode,
            config: { ...this.config },
            state: {
                lastFocusTime: this.state.lastFocusTime,
                isDocumentHidden: this.state.isDocumentHidden,
                eventListenersCount: this.state.eventListeners.length
            }
        };
    }
}