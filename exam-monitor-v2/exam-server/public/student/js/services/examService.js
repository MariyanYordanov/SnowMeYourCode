/**
 * Exam Service - Exam state management and business logic
 * Manages exam session, timer, and state transitions
 */
import { EXAM_CONFIG, SESSION_STATES } from '/shared/js/constants.js';
import { Time } from '/shared/js/utils.js';

export class ExamService {
    constructor(websocketService) {
        this.websocketService = websocketService;
        this.state = {
            sessionId: null,
            studentName: null,
            studentClass: null,
            status: SESSION_STATES.DISCONNECTED,
            startTime: null,
            endTime: null,
            timeLeft: 0,
            lastCode: '',
            isActive: false
        };

        this.timers = {
            examTimer: null,
            autoSave: null,
            heartbeat: null
        };

        this.callbacks = new Map();
        console.log('📚 Exam Service initialized');
    }

    /**
     * Start exam session
     */
    startExam(sessionData) {
        this.state = {
            sessionId: sessionData.sessionId,
            studentName: sessionData.studentName || this.state.studentName,
            studentClass: sessionData.studentClass || this.state.studentClass,
            status: SESSION_STATES.ACTIVE,
            startTime: Date.now(),
            endTime: Date.now() + (sessionData.timeLeft || EXAM_CONFIG.DEFAULT_DURATION),
            timeLeft: sessionData.timeLeft || EXAM_CONFIG.DEFAULT_DURATION,
            lastCode: sessionData.lastCode || '',
            isActive: true
        };

        this.startTimers();
        this.emit('examStarted', this.state);
        console.log('🎯 Exam started:', this.state.sessionId);
    }

    /**
     * Update exam session (for session recovery)
     */
    updateSession(sessionData) {
        Object.assign(this.state, {
            timeLeft: sessionData.timeLeft,
            lastCode: sessionData.lastCode || this.state.lastCode,
            status: SESSION_STATES.ACTIVE,
            isActive: true
        });

        this.startTimers();
        this.emit('sessionUpdated', this.state);
        console.log('🔄 Session updated:', this.state.sessionId);
    }

    /**
     * Start exam timers
     */
    startTimers() {
        this.stopTimers();

        // Main exam timer
        this.timers.examTimer = setInterval(() => {
            this.updateExamTimer();
        }, 1000);

        // Auto-save timer
        this.timers.autoSave = setInterval(() => {
            this.autoSaveCode();
        }, EXAM_CONFIG.AUTO_SAVE_INTERVAL);

        // Heartbeat timer
        this.timers.heartbeat = setInterval(() => {
            this.sendHeartbeat();
        }, EXAM_CONFIG.HEARTBEAT_INTERVAL);

        console.log('⏰ Exam timers started');
    }

    /**
     * Update exam timer
     */
    updateExamTimer() {
        if (!this.state.isActive) return;

        const now = Date.now();
        const timeLeft = Math.max(0, this.state.endTime - now);

        this.state.timeLeft = timeLeft;

        // Check for time warnings
        this.checkTimeWarnings(timeLeft);

        // Check if time expired
        if (timeLeft <= 0) {
            this.handleTimeExpired();
            return;
        }

        this.emit('timerUpdate', {
            timeLeft,
            formattedTime: Time.formatDuration(timeLeft)
        });
    }

    /**
     * Check for time warnings
     */
    checkTimeWarnings(timeLeft) {
        const warnings = [60, 30, 15, 5]; // minutes
        const minutesLeft = Math.floor(timeLeft / (1000 * 60));

        if (warnings.includes(minutesLeft)) {
            this.emit('timeWarning', {
                minutesLeft,
                timeLeft,
                message: `Внимание! Остават ${minutesLeft} минути до края на изпита`
            });
        }
    }

    /**
     * Handle time expiration
     */
    handleTimeExpired() {
        this.state.status = SESSION_STATES.EXPIRED;
        this.state.isActive = false;
        this.stopTimers();

        this.emit('examExpired', {
            message: 'Времето за изпита изтече!'
        });

        console.log('⏰ Exam time expired');
    }

    /**
     * Update code
     */
    updateCode(code, filename = 'main.js') {
        if (!this.state.isActive) return false;

        this.state.lastCode = code;
        this.emit('codeUpdated', { code, filename });
        return true;
    }

    /**
     * Save code to server
     */
    saveCode(code, filename = 'main.js') {
        if (!this.state.isActive) return false;

        this.state.lastCode = code;
        this.websocketService.sendCodeUpdate(this.state.sessionId, code, filename);
        this.emit('codeSaved', { code, filename, timestamp: Date.now() });

        console.log('💾 Code saved');
        return true;
    }

    /**
     * Auto-save code
     */
    autoSaveCode() {
        if (this.state.lastCode && this.state.isActive) {
            this.websocketService.sendCodeUpdate(this.state.sessionId, this.state.lastCode, 'main.js');
            this.emit('autoSaved', { timestamp: Date.now() });
        }
    }

    /**
     * Send heartbeat
     */
    sendHeartbeat() {
        if (this.state.isActive) {
            this.websocketService.sendHeartbeat(this.state.sessionId);
        }
    }

    /**
     * Complete exam
     */
    completeExam() {
        if (!this.state.isActive) return false;

        this.state.status = SESSION_STATES.COMPLETED;
        this.state.isActive = false;
        this.stopTimers();

        // Save final code
        if (this.state.lastCode) {
            this.saveCode(this.state.lastCode);
        }

        this.websocketService.completeExam(this.state.sessionId);
        this.emit('examCompleted', {
            sessionId: this.state.sessionId,
            completedAt: Date.now()
        });

        console.log('✅ Exam completed');
        return true;
    }

    /**
     * Stop exam timers
     */
    stopTimers() {
        Object.values(this.timers).forEach(timer => {
            if (timer) clearInterval(timer);
        });

        this.timers = {
            examTimer: null,
            autoSave: null,
            heartbeat: null
        };

        console.log('⏹️ Exam timers stopped');
    }

    /**
     * Get exam state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get formatted time left
     */
    getFormattedTimeLeft() {
        return Time.formatDuration(this.state.timeLeft);
    }

    /**
     * Check if exam is active
     */
    isExamActive() {
        return this.state.isActive && this.state.status === SESSION_STATES.ACTIVE;
    }

    /**
     * Event subscription
     */
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    /**
     * Emit event
     */
    emit(event, data = {}) {
        if (this.callbacks.has(event)) {
            this.callbacks.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Callback error for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopTimers();
        this.state.isActive = false;
        this.callbacks.clear();
        console.log('🧹 Exam Service destroyed');
    }
}

export const examService = new ExamService();