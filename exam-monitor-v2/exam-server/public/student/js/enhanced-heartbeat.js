/**
 * Enhanced Heartbeat System with Anti-Cheat Data Collection
 */

export class EnhancedHeartbeat {
    constructor(socket) {
        this.socket = socket;
        this.interval = 30000; // 30 seconds
        this.heartbeatTimer = null;
        this.focusHistory = [];
        this.keystrokeEvents = [];
        this.screenInfo = {};
        this.lastFocusTime = Date.now();
        this.isActive = false;
        
        this.initializeMonitoring();
    }

    /**
     * Initialize monitoring systems
     */
    initializeMonitoring() {
        this.collectScreenInfo();
        this.setupFocusMonitoring();
        this.setupKeystrokeMonitoring();
        this.setupPerformanceMonitoring();
    }

    /**
     * Start heartbeat system
     */
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        console.log('🔄 Enhanced heartbeat started');
        
        // Send immediate heartbeat
        this.sendHeartbeat();
        
        // Schedule regular heartbeats
        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
        }, this.interval);
    }

    /**
     * Stop heartbeat system
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        
        console.log('⏹️ Enhanced heartbeat stopped');
    }

    /**
     * Send enhanced heartbeat with collected data
     */
    sendHeartbeat() {
        if (!this.socket || !this.isActive) return;

        const heartbeatData = {
            timestamp: Date.now(),
            focusHistory: this.getRecentFocusHistory(),
            keystrokeEvents: this.getRecentKeystrokeEvents(),
            screenInfo: this.screenInfo,
            performanceInfo: this.getPerformanceInfo(),
            windowInfo: this.getWindowInfo(),
            browserInfo: this.getBrowserInfo()
        };

        this.socket.emit('heartbeat', heartbeatData);
        
        // Clean up old data to prevent memory buildup
        this.cleanupOldData();
    }

    /**
     * Collect screen and display information
     */
    collectScreenInfo() {
        try {
            this.screenInfo = {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
                screenCount: screen.availWidth !== screen.width ? 2 : 1, // Rough estimate
                devicePixelRatio: window.devicePixelRatio || 1,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                platform: navigator.platform,
                hardwareConcurrency: navigator.hardwareConcurrency || 1,
                maxTouchPoints: navigator.maxTouchPoints || 0
            };

            // Additional display detection
            if (window.screen && window.screen.orientation) {
                this.screenInfo.orientation = window.screen.orientation.type;
            }

        } catch (error) {
            console.error('Error collecting screen info:', error);
        }
    }

    /**
     * Setup focus monitoring
     */
    setupFocusMonitoring() {
        // Window focus/blur events
        window.addEventListener('focus', (e) => {
            this.recordFocusEvent('focus', e);
        });

        window.addEventListener('blur', (e) => {
            this.recordFocusEvent('blur', e);
        });

        // Document visibility changes
        document.addEventListener('visibilitychange', (e) => {
            const state = document.hidden ? 'hidden' : 'visible';
            this.recordFocusEvent('visibility', e, { state });
        });

        // Page focus
        document.addEventListener('focusin', (e) => {
            this.recordFocusEvent('focusin', e);
        });

        document.addEventListener('focusout', (e) => {
            this.recordFocusEvent('focusout', e);
        });
    }

    /**
     * Record focus events
     */
    recordFocusEvent(type, event, metadata = {}) {
        const focusEvent = {
            type: type,
            timestamp: Date.now(),
            target: event.target ? event.target.tagName : null,
            metadata: metadata
        };

        this.focusHistory.push(focusEvent);
        
        // Keep only recent focus events (last 5 minutes)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        this.focusHistory = this.focusHistory.filter(
            event => event.timestamp > fiveMinutesAgo
        );
    }

    /**
     * Setup keystroke monitoring
     */
    setupKeystrokeMonitoring() {
        // Monitor keydown events for timing analysis
        document.addEventListener('keydown', (e) => {
            this.recordKeystrokeEvent('keydown', e);
        });

        document.addEventListener('keyup', (e) => {
            this.recordKeystrokeEvent('keyup', e);
        });

        // Monitor paste events
        document.addEventListener('paste', (e) => {
            this.recordKeystrokeEvent('paste', e, {
                dataLength: e.clipboardData ? e.clipboardData.getData('text').length : 0
            });
        });

        // Monitor input events for rapid changes
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
                this.recordKeystrokeEvent('input', e, {
                    inputType: e.inputType,
                    dataLength: e.data ? e.data.length : 0
                });
            }
        });
    }

    /**
     * Record keystroke events
     */
    recordKeystrokeEvent(type, event, metadata = {}) {
        // Don't record sensitive keys
        const sensitiveKeys = ['Tab', 'Alt', 'Control', 'Meta', 'F12'];
        if (sensitiveKeys.includes(event.key)) return;

        const keystrokeEvent = {
            type: type,
            timestamp: Date.now(),
            key: event.key ? event.key.length === 1 ? 'char' : event.key : null,
            code: event.code || null,
            ctrlKey: event.ctrlKey || false,
            altKey: event.altKey || false,
            shiftKey: event.shiftKey || false,
            metaKey: event.metaKey || false,
            target: event.target ? event.target.tagName : null,
            metadata: metadata
        };

        this.keystrokeEvents.push(keystrokeEvent);
        
        // Keep only recent keystrokes (last 2 minutes)
        const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
        this.keystrokeEvents = this.keystrokeEvents.filter(
            event => event.timestamp > twoMinutesAgo
        );
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor for unusual performance drops
        if ('performance' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 100) { // Long tasks
                        this.recordPerformanceEvent('long-task', entry);
                    }
                }
            });

            try {
                this.performanceObserver.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                // Longtask API not supported
            }
        }
    }

    /**
     * Record performance events
     */
    recordPerformanceEvent(type, data) {
        this.performanceEvents = this.performanceEvents || [];
        
        this.performanceEvents.push({
            type: type,
            timestamp: Date.now(),
            duration: data.duration,
            startTime: data.startTime
        });

        // Keep only recent events
        const oneMinuteAgo = Date.now() - (60 * 1000);
        this.performanceEvents = this.performanceEvents.filter(
            event => event.timestamp > oneMinuteAgo
        );
    }

    /**
     * Get recent focus history for heartbeat
     */
    getRecentFocusHistory() {
        const oneMinuteAgo = Date.now() - (60 * 1000);
        return this.focusHistory.filter(event => event.timestamp > oneMinuteAgo);
    }

    /**
     * Get recent keystroke events for heartbeat
     */
    getRecentKeystrokeEvents() {
        const thirtySecondsAgo = Date.now() - (30 * 1000);
        const recentEvents = this.keystrokeEvents.filter(
            event => event.timestamp > thirtySecondsAgo
        );

        // Anonymize and summarize keystroke data
        return recentEvents.map(event => ({
            type: event.type,
            timestamp: event.timestamp,
            isChar: event.key === 'char',
            hasModifiers: event.ctrlKey || event.altKey || event.metaKey,
            target: event.target,
            metadata: event.metadata
        }));
    }

    /**
     * Get current performance information
     */
    getPerformanceInfo() {
        const info = {
            timestamp: Date.now()
        };

        try {
            if (performance.memory) {
                info.memory = {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
            }

            if (performance.now) {
                info.performanceNow = performance.now();
            }

            // Check for unusual timing
            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                Math.random();
            }
            const end = performance.now();
            info.computationTime = end - start;

        } catch (error) {
            info.error = 'performance_api_error';
        }

        return info;
    }

    /**
     * Get window information
     */
    getWindowInfo() {
        return {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight,
            screenX: window.screenX,
            screenY: window.screenY,
            devicePixelRatio: window.devicePixelRatio,
            isFullscreen: document.fullscreenElement !== null,
            documentHidden: document.hidden,
            documentVisibilityState: document.visibilityState,
            windowFocused: document.hasFocus()
        };
    }

    /**
     * Get browser information
     */
    getBrowserInfo() {
        return {
            userAgent: navigator.userAgent,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            language: navigator.language,
            languages: navigator.languages,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            maxTouchPoints: navigator.maxTouchPoints,
            webdriver: navigator.webdriver,
            plugins: Array.from(navigator.plugins).map(p => p.name),
            mimeTypes: Array.from(navigator.mimeTypes).map(m => m.type)
        };
    }

    /**
     * Clean up old data to prevent memory leaks
     */
    cleanupOldData() {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        
        this.focusHistory = this.focusHistory.filter(
            event => event.timestamp > fiveMinutesAgo
        );
        
        this.keystrokeEvents = this.keystrokeEvents.filter(
            event => event.timestamp > fiveMinutesAgo
        );
        
        if (this.performanceEvents) {
            this.performanceEvents = this.performanceEvents.filter(
                event => event.timestamp > fiveMinutesAgo
            );
        }
    }

    /**
     * Get current monitoring status
     */
    getStatus() {
        return {
            isActive: this.isActive,
            focusHistoryLength: this.focusHistory.length,
            keystrokeEventsLength: this.keystrokeEvents.length,
            lastHeartbeat: this.lastHeartbeatTime,
            interval: this.interval
        };
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.stop();
        
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Clean up event listeners would require storing references
        console.log('🧹 Enhanced heartbeat destroyed');
    }
}

export default EnhancedHeartbeat;