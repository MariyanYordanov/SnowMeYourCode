/**
 * WebSocket Service - Pure communication wrapper
 * Handles WebSocket connection and message routing
 */
import { SOCKET_EVENTS } from '../../shared/js/constants.js';

export class WebSocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageQueue = [];
        this.eventHandlers = new Map();

        console.log('🌐 WebSocket Service initialized');
    }

    /**
     * Connect to server
     */
    connect() {
        try {
            this.socket = io({
                transports: ['websocket', 'polling'],
                timeout: 10000,
                forceNew: true
            });

            this.setupEventHandlers();
            console.log('🔗 Connecting to server...');

        } catch (error) {
            console.error('❌ Connection error:', error);
            this.handleConnectionError(error);
        }
    }

    /**
     * Setup socket event handlers
     */
    setupEventHandlers() {
        // Connection events
        this.socket.on('connect', () => this.handleConnect());
        this.socket.on('disconnect', (reason) => this.handleDisconnect(reason));
        this.socket.on('connect_error', (error) => this.handleConnectionError(error));

        // Student events
        this.socket.on(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, (data) =>
            this.emit('studentIdAssigned', data));
        this.socket.on(SOCKET_EVENTS.SESSION_RESTORED, (data) =>
            this.emit('sessionRestored', data));
        this.socket.on(SOCKET_EVENTS.LOGIN_ERROR, (data) =>
            this.emit('loginError', data));
        this.socket.on(SOCKET_EVENTS.EXAM_EXPIRED, (data) =>
            this.emit('examExpired', data));
        this.socket.on(SOCKET_EVENTS.TIME_WARNING, (data) =>
            this.emit('timeWarning', data));

        // Anti-cheat events
        this.socket.on('anti-cheat-warning', (data) =>
            this.emit('antiCheatWarning', data));
        this.socket.on('force-disconnect', (data) =>
            this.emit('forceDisconnect', data));
    }

    /**
     * Handle successful connection
     */
    handleConnect() {
        console.log('✅ Connected to server');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        this.flushMessageQueue();
        this.emit('connected');
    }

    /**
     * Handle disconnection
     */
    handleDisconnect(reason) {
        console.warn('🔌 Disconnected:', reason);
        this.isConnected = false;
        this.emit('disconnected', { reason });

        if (reason !== 'io server disconnect') {
            this.attemptReconnect();
        }
    }

    /**
     * Handle connection errors
     */
    handleConnectionError(error) {
        console.error('❌ Connection error:', error);
        this.emit('connectionError', { error });
        this.attemptReconnect();
    }

    /**
     * Attempt reconnection with exponential backoff
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.emit('reconnectFailed');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        this.emit('reconnecting', { attempt: this.reconnectAttempts });

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Send message (with queuing if disconnected)
     */
    send(event, data = {}) {
        const message = { event, data, timestamp: Date.now() };

        if (this.isConnected && this.socket) {
            this.socket.emit(event, data);
            console.log(`📤 Sent: ${event}`, data);
        } else {
            this.messageQueue.push(message);
            console.log(`📦 Queued: ${event}`, data);
        }
    }

    /**
     * Flush queued messages
     */
    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.socket.emit(message.event, message.data);
            console.log(`📤 Flushed: ${message.event}`, message.data);
        }
    }

    /**
     * Student login
     */
    studentLogin(studentName, studentClass) {
        this.send(SOCKET_EVENTS.STUDENT_JOIN, {
            studentName,
            studentClass
        });
    }

    /**
     * Send code update
     */
    sendCodeUpdate(sessionId, code, filename = 'main.js') {
        this.send(SOCKET_EVENTS.CODE_UPDATE, {
            sessionId,
            code,
            filename,
            timestamp: Date.now()
        });
    }

    /**
     * Report suspicious activity
     */
    reportSuspiciousActivity(sessionId, activity, severity = 'medium') {
        this.send(SOCKET_EVENTS.SUSPICIOUS_ACTIVITY, {
            sessionId,
            activity,
            severity,
            timestamp: Date.now()
        });
    }

    /**
     * Complete exam
     */
    completeExam(sessionId) {
        this.send(SOCKET_EVENTS.EXAM_COMPLETE, {
            sessionId,
            completedAt: Date.now()
        });
    }

    /**
     * Send heartbeat
     */
    sendHeartbeat(sessionId) {
        this.send(SOCKET_EVENTS.HEARTBEAT, {
            sessionId,
            timestamp: Date.now()
        });
    }

    /**
     * Event subscription
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * Remove event handler
     */
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to handlers
     */
    emit(event, data = {}) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`❌ Event handler error for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length
        };
    }

    /**
     * Disconnect
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        console.log('🔌 Disconnected');
    }
}