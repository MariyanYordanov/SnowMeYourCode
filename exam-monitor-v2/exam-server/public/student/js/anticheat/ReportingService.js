/**
 * ReportingService - Handles anti-cheat server communication
 * Reports violations, sends heartbeats, and manages server sync
 */
export class ReportingService {
    constructor(socket, sessionId) {
        this.socket = socket;
        this.sessionId = sessionId;
        this.isConnected = false;
        this.heartbeatInterval = null;
        this.reportQueue = [];
        this.config = {
            heartbeatInterval: 30000, // 30 seconds
            maxQueueSize: 50,
            retryAttempts: 3,
            retryDelay: 1000
        };

        this.setupSocketListeners();
        this.startHeartbeat();

        console.log('📡 ReportingService initialized');
    }

    /**
     * Setup WebSocket event listeners
     */
    setupSocketListeners() {
        if (!this.socket) {
            console.warn('⚠️ No socket provided to ReportingService');
            return;
        }

        // Connection events
        this.socket.on('connect', () => {
            console.log('🔗 ReportingService connected to server');
            this.isConnected = true;
            this.flushReportQueue();
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 ReportingService disconnected from server');
            this.isConnected = false;
        });

        // Anti-cheat responses
        this.socket.on('anti-cheat-warning', (data) => {
            this.handleServerWarning(data);
        });

        this.socket.on('anti-cheat-action', (data) => {
            this.handleServerAction(data);
        });
    }

    /**
     * Report violation to server
     */
    async reportViolation(type, data = {}, severity = 'medium') {
        const report = {
            type: 'violation',
            violationType: type,
            severity: severity,
            data: data,
            sessionId: this.sessionId,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        };

        console.log(`📊 Reporting violation: ${type} (${severity})`, data);

        return this.sendReport('suspicious-activity', report);
    }

    /**
     * Report critical violation (immediate termination)
     */
    async reportCriticalViolation(type, data = {}) {
        const report = {
            type: 'critical_violation',
            violationType: type,
            severity: 'critical',
            data: data,
            sessionId: this.sessionId,
            timestamp: Date.now(),
            immediate: true
        };

        console.error(`🚨 Reporting CRITICAL violation: ${type}`, data);

        return this.sendReport('critical-violation', report);
    }

    /**
     * Send heartbeat with current state
     */
    sendHeartbeat(antiCheatState = {}) {
        const heartbeat = {
            sessionId: this.sessionId,
            timestamp: Date.now(),
            state: {
                isActive: antiCheatState.isActive || false,
                violations: antiCheatState.totalViolations || 0,
                warningLevel: antiCheatState.warningLevel || 0,
                isInFocus: document.hasFocus(),
                isVisible: !document.hidden,
                isFullscreen: this.isDocumentInFullscreen(),
                ...antiCheatState
            }
        };

        return this.sendReport('anticheat-heartbeat', heartbeat);
    }

    /**
     * Report exam event (start, complete, etc.)
     */
    async reportExamEvent(eventType, data = {}) {
        const report = {
            type: 'exam_event',
            eventType: eventType,
            data: data,
            sessionId: this.sessionId,
            timestamp: Date.now()
        };

        console.log(`📋 Reporting exam event: ${eventType}`, data);

        return this.sendReport('exam-event', report);
    }

    /**
     * Send report to server with retry logic
     */
    async sendReport(eventName, data) {
        if (!this.socket) {
            console.warn('⚠️ No socket available for reporting');
            return false;
        }

        // If not connected, queue the report
        if (!this.isConnected) {
            this.queueReport(eventName, data);
            return false;
        }

        try {
            // Send immediately if connected
            this.socket.emit(eventName, data);
            return true;

        } catch (error) {
            console.error('❌ Error sending report:', error);
            this.queueReport(eventName, data);
            return false;
        }
    }

    /**
     * Queue report for later sending
     */
    queueReport(eventName, data) {
        const queueItem = {
            eventName,
            data,
            timestamp: Date.now(),
            attempts: 0
        };

        this.reportQueue.push(queueItem);

        // Limit queue size
        if (this.reportQueue.length > this.config.maxQueueSize) {
            this.reportQueue.shift(); // Remove oldest
        }

        console.log(`📦 Queued report: ${eventName} (queue size: ${this.reportQueue.length})`);
    }

    /**
     * Flush queued reports when connection restored
     */
    async flushReportQueue() {
        if (this.reportQueue.length === 0) return;

        console.log(`📤 Flushing ${this.reportQueue.length} queued reports`);

        const reports = [...this.reportQueue];
        this.reportQueue = [];

        for (const report of reports) {
            // Add retry attempt
            report.attempts = (report.attempts || 0) + 1;
            report.data.queued = true;
            report.data.queuedAt = report.timestamp;

            try {
                await this.sendReport(report.eventName, report.data);
                console.log(`✅ Sent queued report: ${report.eventName}`);

            } catch (error) {
                console.error(`❌ Failed to send queued report: ${report.eventName}`, error);

                // Re-queue if not exceeded retry attempts
                if (report.attempts < this.config.retryAttempts) {
                    this.reportQueue.push(report);
                }
            }

            // Small delay between reports
            await this.delay(100);
        }
    }

    /**
     * Handle server warning response
     */
    handleServerWarning(data) {
        console.log('⚠️ Server warning received:', data);

        // Could trigger UI update or additional logging
        this.notifyCallback('serverWarning', data);
    }

    /**
     * Handle server action response
     */
    handleServerAction(data) {
        console.log('🔧 Server action received:', data);

        // Could trigger force disconnect, warning, etc.
        this.notifyCallback('serverAction', data);
    }

    /**
     * Start heartbeat interval
     */
    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, this.config.heartbeatInterval);

        console.log(`💓 Heartbeat started (${this.config.heartbeatInterval}ms interval)`);
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('💓 Heartbeat stopped');
        }
    }

    /**
     * Update session ID
     */
    updateSessionId(newSessionId) {
        this.sessionId = newSessionId;
        console.log(`🔐 Session ID updated: ${newSessionId}`);
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Restart heartbeat if interval changed
        if (newConfig.heartbeatInterval) {
            this.startHeartbeat();
        }

        console.log('⚙️ ReportingService configuration updated');
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            sessionId: this.sessionId,
            queueSize: this.reportQueue.length,
            hasHeartbeat: !!this.heartbeatInterval,
            config: { ...this.config }
        };
    }

    /**
     * Helper methods
     */
    isDocumentInFullscreen() {
        return !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Callback system for external notification
     */
    setCallback(eventType, callback) {
        if (!this.callbacks) {
            this.callbacks = {};
        }
        this.callbacks[eventType] = callback;
    }

    notifyCallback(eventType, data) {
        if (this.callbacks && this.callbacks[eventType]) {
            try {
                this.callbacks[eventType](data);
            } catch (error) {
                console.error(`❌ Callback error for ${eventType}:`, error);
            }
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.stopHeartbeat();
        this.reportQueue = [];
        this.callbacks = {};

        if (this.socket) {
            this.socket.off('connect');
            this.socket.off('disconnect');
            this.socket.off('anti-cheat-warning');
            this.socket.off('anti-cheat-action');
        }

        console.log('🧹 ReportingService destroyed');
    }
}