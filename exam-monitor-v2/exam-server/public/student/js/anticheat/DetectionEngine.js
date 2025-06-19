/**
 * DetectionEngine - NUCLEAR DETECTION SYSTEM
 * Aggressive detection for all escape attempts
 * ZERO TOLERANCE - IMMEDIATE DETECTION AND TERMINATION
 */
export class DetectionEngine {
    constructor(violationTracker, config = {}) {
        this.violationTracker = violationTracker;
        this.isActive = false;
        this.fullscreenMode = false;

        // NUCLEAR: Critical violation callback
        this.onCriticalViolation = null;

        this.config = {
            // NUCLEAR Detection settings - ALL ENABLED
            enableKeyboardDetection: true,
            enableFocusDetection: true,
            enableFullscreenDetection: true,
            enableClipboardDetection: true,
            enableContextMenuDetection: true,
            enableMouseDetection: true,          // ← НОВО
            enableAdvancedDetection: true,       // ← НОВО

            // ZERO tolerance settings
            focusLossGracePeriod: 0,            // ← NO grace period
            focusLossMinDuration: 500,          // ← Very sensitive
            shortFocusLossIgnore: 0,            // ← Detect everything

            // Override with provided config
            ...config
        };

        // Detection state
        this.state = {
            lastFocusTime: Date.now(),
            focusLossStartTime: null,
            isDocumentHidden: false,
            eventListeners: [], // Track for cleanup
            mouseInDangerZone: false,
            consecutiveDangerZoneEvents: 0
        };

        console.log('💀 DetectionEngine initialized - NUCLEAR DETECTION MODE');
    }

    /**
     * Set callback for critical violations
     */
    setCriticalViolationCallback(callback) {
        this.onCriticalViolation = callback;
    }

    /**
     * Activate NUCLEAR detection systems
     */
    activate() {
        if (this.isActive) return;

        console.log('💀 ACTIVATING NUCLEAR DETECTION SYSTEMS...');
        this.isActive = true;

        // Setup ALL detection systems immediately
        this.setupNuclearKeyboardDetection();
        this.setupNuclearMouseDetection();
        this.setupAggressiveFocusDetection();
        this.setupFullscreenDetection();
        this.setupClipboardDetection();
        this.setupContextMenuDetection();
        this.setupAdvancedThreatDetection();

        console.log('💀💀💀 NUCLEAR DETECTION SYSTEMS ACTIVE - ZERO TOLERANCE');
    }

    /**
     * NUCLEAR: Keyboard detection - IMMEDIATE TERMINATION
     */
    setupNuclearKeyboardDetection() {
        console.log('⌨️ NUCLEAR Keyboard detection active');

        const nuclearKeyboardHandler = (e) => {
            if (!this.isActive) return;

            // Check for NUCLEAR-level violations FIRST
            const nuclearKeyType = this.getNuclearKeyType(e);
            if (nuclearKeyType) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                // IMMEDIATE TERMINATION for nuclear keys
                this.handleNuclearDetection(nuclearKeyType, {
                    key: e.key,
                    code: e.code,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    shiftKey: e.shiftKey,
                    metaKey: e.metaKey,
                    target: e.target.id || 'unknown',
                    timestamp: Date.now()
                });

                return false;
            }

            // Check for dangerous shortcuts (also immediate termination)
            if (this.isDangerousShortcut(e)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                this.handleNuclearDetection('dangerous_shortcut', {
                    key: e.key,
                    code: e.code,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    shiftKey: e.shiftKey,
                    metaKey: e.metaKey,
                    shortcut: this.getShortcutName(e),
                    target: e.target.id || 'unknown'
                });

                return false;
            }

            // Block clipboard outside code editor
            const isCodeEditor = e.target && (
                e.target.id === 'code-editor' ||
                e.target.closest('#code-editor')
            );

            if (!isCodeEditor && this.isClipboardOperation(e)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                this.handleNuclearDetection('unauthorized_clipboard', {
                    key: e.key,
                    target: e.target.id || 'unknown',
                    isCodeEditor: false
                });

                return false;
            }
        };

        this.addEventListenerWithTracking(
            document,
            'keydown',
            nuclearKeyboardHandler,
            { capture: true, passive: false }
        );

        console.log('💀 NUCLEAR keyboard protection: ACTIVE');
    }

    /**
     * Get nuclear-level key violations
     */
    getNuclearKeyType(e) {
        // Direct Windows/Meta key detection
        if (['MetaLeft', 'MetaRight', 'OSLeft', 'OSRight'].includes(e.code) ||
            ['Meta', 'OS'].includes(e.key) || e.metaKey) {
            return 'windowsKey';
        }

        // Escape key (NUCLEAR)
        if (e.code === 'Escape' || e.key === 'Escape') {
            return 'escapeKey';
        }

        // Alt+F4 (NUCLEAR)
        if (e.altKey && e.code === 'F4') {
            return 'altF4Key';
        }

        // Alt+Tab (NUCLEAR)
        if (e.altKey && e.code === 'Tab') {
            return 'altTabKey';
        }

        // Ctrl+Alt+Del (NUCLEAR)
        if (e.ctrlKey && e.altKey && e.code === 'Delete') {
            return 'ctrlAltDelKey';
        }

        // Ctrl+Shift+Esc (Task Manager) (NUCLEAR)
        if (e.ctrlKey && e.shiftKey && e.code === 'Escape') {
            return 'taskManagerKey';
        }

        return null;
    }

    /**
     * Check for dangerous shortcuts
     */
    isDangerousShortcut(e) {
        return (
            // Browser controls
            (e.ctrlKey && ['KeyW', 'KeyT', 'KeyN', 'KeyR'].includes(e.code)) ||
            (e.ctrlKey && e.shiftKey && ['KeyT', 'KeyN'].includes(e.code)) ||

            // Developer tools
            (e.code === 'F12') ||
            (e.ctrlKey && e.shiftKey && ['KeyI', 'KeyJ', 'KeyC'].includes(e.code)) ||

            // Address bar
            (e.ctrlKey && e.code === 'KeyL') ||

            // Other dangerous F-keys
            (['F1', 'F5', 'F6', 'F11'].includes(e.code))
        );
    }

    /**
     * Get shortcut name for reporting
     */
    getShortcutName(e) {
        if (e.ctrlKey && e.code === 'KeyW') return 'Ctrl+W';
        if (e.ctrlKey && e.code === 'KeyT') return 'Ctrl+T';
        if (e.ctrlKey && e.code === 'KeyR') return 'Ctrl+R';
        if (e.ctrlKey && e.code === 'KeyL') return 'Ctrl+L';
        if (e.code === 'F12') return 'F12';
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyI') return 'Ctrl+Shift+I';
        return `${e.ctrlKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
    }

    /**
     * Check for clipboard operations
     */
    isClipboardOperation(e) {
        return e.ctrlKey && ['KeyC', 'KeyV', 'KeyX'].includes(e.code);
    }

    /**
     * NUCLEAR: Mouse detection for browser chrome areas
     */
    setupNuclearMouseDetection() {
        console.log('🖱️ NUCLEAR Mouse detection active');

        // Define danger zones (browser chrome areas)
        const dangerZones = {
            topChrome: { x: 0, y: 0, width: window.innerWidth, height: 100 },
            rightEdge: { x: window.innerWidth - 50, y: 0, width: 50, height: window.innerHeight },
            xButtonArea: { x: window.innerWidth - 80, y: 0, width: 80, height: 50 }
        };

        const nuclearMouseHandler = (e) => {
            if (!this.isActive) return;

            const mousePos = { x: e.clientX, y: e.clientY };

            // Check if mouse is in any danger zone
            for (const [zoneName, zone] of Object.entries(dangerZones)) {
                if (this.isPointInZone(mousePos, zone)) {
                    this.handleMouseDangerZone(zoneName, mousePos, e.type);
                    break;
                }
            }
        };

        const nuclearClickHandler = (e) => {
            if (!this.isActive) return;

            const mousePos = { x: e.clientX, y: e.clientY };

            // IMMEDIATE TERMINATION for clicks in danger zones
            for (const [zoneName, zone] of Object.entries(dangerZones)) {
                if (this.isPointInZone(mousePos, zone)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    this.handleNuclearDetection('browser_chrome_click', {
                        zone: zoneName,
                        x: mousePos.x,
                        y: mousePos.y,
                        button: e.button,
                        timestamp: Date.now()
                    });

                    return false;
                }
            }
        };

        // Track mouse movements and clicks
        this.addEventListenerWithTracking(document, 'mousemove', nuclearMouseHandler, { passive: true });
        this.addEventListenerWithTracking(document, 'click', nuclearClickHandler, { capture: true, passive: false });
        this.addEventListenerWithTracking(document, 'mousedown', nuclearClickHandler, { capture: true, passive: false });

        console.log('💀 NUCLEAR mouse protection: ACTIVE');
    }

    /**
     * Check if point is in danger zone
     */
    isPointInZone(point, zone) {
        return point.x >= zone.x &&
            point.x <= zone.x + zone.width &&
            point.y >= zone.y &&
            point.y <= zone.y + zone.height;
    }

    /**
     * Handle mouse in danger zone
     */
    handleMouseDangerZone(zoneName, mousePos, eventType) {
        if (eventType === 'mousemove') {
            this.state.consecutiveDangerZoneEvents++;

            // If mouse stays in danger zone too long, trigger warning
            if (this.state.consecutiveDangerZoneEvents > 10) {
                this.handleDetection('mouseDangerZone', {
                    zone: zoneName,
                    x: mousePos.x,
                    y: mousePos.y,
                    consecutiveEvents: this.state.consecutiveDangerZoneEvents
                });

                this.state.consecutiveDangerZoneEvents = 0; // Reset counter
            }
        }
    }

    /**
     * NUCLEAR: Aggressive focus detection
     */
    setupAggressiveFocusDetection() {
        console.log('👁️ NUCLEAR Focus detection active');

        const blurHandler = () => {
            if (!this.isActive) return;

            this.state.focusLossStartTime = Date.now();
            console.warn('⚠️ FOCUS LOST - MONITORING...');

            // Start monitoring for focus return
            setTimeout(() => {
                if (this.state.focusLossStartTime &&
                    Date.now() - this.state.focusLossStartTime > this.config.focusLossMinDuration) {

                    this.handleNuclearDetection('focusLoss', {
                        duration: Date.now() - this.state.focusLossStartTime,
                        timestamp: Date.now()
                    });
                }
            }, this.config.focusLossMinDuration);
        };

        const focusHandler = () => {
            if (!this.isActive) return;

            if (this.state.focusLossStartTime) {
                const duration = Date.now() - this.state.focusLossStartTime;
                console.log(`✅ Focus restored after ${duration}ms`);
                this.state.focusLossStartTime = null;
            }

            this.state.lastFocusTime = Date.now();
        };

        // Page Visibility API for tab switching detection
        const visibilityHandler = () => {
            if (!this.isActive) return;

            if (document.hidden) {
                this.handleNuclearDetection('tab_switch', {
                    hidden: true,
                    timestamp: Date.now()
                });
            }
        };

        this.addEventListenerWithTracking(window, 'blur', blurHandler, { passive: true });
        this.addEventListenerWithTracking(window, 'focus', focusHandler, { passive: true });
        this.addEventListenerWithTracking(document, 'visibilitychange', visibilityHandler, { passive: true });

        console.log('💀 NUCLEAR focus detection: ACTIVE');
    }

    /**
     * Setup fullscreen detection
     */
    setupFullscreenDetection() {
        const fullscreenHandler = () => {
            if (!this.isActive) return;

            const isFullscreen = !!(document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement);

            if (this.fullscreenMode && !isFullscreen) {
                this.handleNuclearDetection('fullscreenExit', {
                    timestamp: Date.now(),
                    previousState: this.fullscreenMode
                });
            }

            this.fullscreenMode = isFullscreen;
        };

        this.addEventListenerWithTracking(document, 'fullscreenchange', fullscreenHandler, { passive: true });
        this.addEventListenerWithTracking(document, 'webkitfullscreenchange', fullscreenHandler, { passive: true });
        this.addEventListenerWithTracking(document, 'mozfullscreenchange', fullscreenHandler, { passive: true });

        console.log('🖥️ Fullscreen detection active');
    }

    /**
     * Setup clipboard detection
     */
    setupClipboardDetection() {
        const clipboardEvents = ['copy', 'cut', 'paste'];

        clipboardEvents.forEach(eventType => {
            const handler = (e) => {
                if (!this.isActive) return;

                const isCodeEditor = e.target && (
                    e.target.id === 'code-editor' ||
                    e.target.closest('#code-editor')
                );

                if (!isCodeEditor) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    this.handleNuclearDetection('unauthorized_clipboard', {
                        type: eventType,
                        target: e.target.id || 'unknown',
                        timestamp: Date.now()
                    });

                    return false;
                }
            };

            this.addEventListenerWithTracking(document, eventType, handler, { capture: true, passive: false });
        });

        console.log('📋 Clipboard detection active');
    }

    /**
     * Setup context menu detection
     */
    setupContextMenuDetection() {
        const contextHandler = (e) => {
            if (!this.isActive) return;

            const isCodeEditor = e.target && (
                e.target.id === 'code-editor' ||
                e.target.closest('#code-editor')
            );

            if (!isCodeEditor) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                this.handleNuclearDetection('unauthorized_context_menu', {
                    x: e.clientX,
                    y: e.clientY,
                    target: e.target.id || 'unknown',
                    timestamp: Date.now()
                });

                return false;
            }
        };

        this.addEventListenerWithTracking(document, 'contextmenu', contextHandler, { capture: true, passive: false });
        console.log('🖱️ Context menu detection active');
    }

    /**
     * Setup advanced threat detection
     */
    setupAdvancedThreatDetection() {
        // Detect attempts to open new windows/tabs
        const openHandler = (e) => {
            this.handleNuclearDetection('window_open_attempt', {
                url: e.target?.href || 'unknown',
                timestamp: Date.now()
            });
        };

        // Override window.open
        const originalOpen = window.open;
        window.open = (...args) => {
            this.handleNuclearDetection('window_open_blocked', {
                arguments: args,
                timestamp: Date.now()
            });
            return null; // Block the operation
        };

        console.log('🔍 Advanced threat detection active');
    }

    /**
     * NUCLEAR: Handle nuclear-level detection (immediate termination)
     */
    handleNuclearDetection(type, data = {}) {
        console.error(`💀💀💀 NUCLEAR DETECTION: ${type}`, data);

        // Add violation through tracker
        const result = this.violationTracker.addViolation(type, data);

        // IMMEDIATE callback to AntiCheatCore for termination
        if (this.onCriticalViolation && typeof this.onCriticalViolation === 'function') {
            this.onCriticalViolation(type, data, result);
        }

        console.error(`💀 NUCLEAR VIOLATION LOGGED:`, result);
        return result;
    }

    /**
     * Handle regular detection event (now also nuclear)
     */
    handleDetection(type, data = {}) {
        console.warn(`🚨 Detection: ${type}`, data);

        // In nuclear mode, even regular detections become critical
        return this.handleNuclearDetection(type, data);
    }

    /**
     * Add event listener with tracking for cleanup
     */
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
     * Deactivate detection systems
     */
    deactivate() {
        if (!this.isActive) return;

        console.log('🔓 Deactivating nuclear detection systems...');

        // Remove all event listeners
        this.state.eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });

        this.state.eventListeners = [];
        this.isActive = false;

        console.log('✅ Nuclear detection systems deactivated');
    }

    /**
     * Get detection statistics
     */
    getStatistics() {
        return {
            isActive: this.isActive,
            fullscreenMode: this.fullscreenMode,
            eventListeners: this.state.eventListeners.length,
            lastFocusTime: this.state.lastFocusTime,
            consecutiveDangerZoneEvents: this.state.consecutiveDangerZoneEvents
        };
    }
}