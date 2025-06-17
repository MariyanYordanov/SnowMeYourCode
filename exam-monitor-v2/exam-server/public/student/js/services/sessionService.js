/**
 * Session Service - Session state management
 * Handles login state, session persistence, and recovery
 */
import { Storage } from '../../shared/js/utils.js';
import { EventEmitter } from '../../shared/js/events.js';

export class SessionService extends EventEmitter {
    constructor() {
        super();

        this.state = {
            isAuthenticated: false,
            sessionId: null,
            studentName: null,
            studentClass: null,
            loginTime: null,
            lastActivity: null
        };

        this.storageKey = 'exam_session';
        this.activityTimeout = 5 * 60 * 1000; // 5 minutes
        this.activityTimer = null;

        console.log('🔐 Session Service initialized');
    }

    /**
     * Initialize service
     */
    async initialize() {
        // Try to restore session from storage
        const restored = this.restoreSession();

        if (restored) {
            this.emit('sessionRestored', this.state);
            this.startActivityTracking();
        }

        // Setup activity tracking
        this.setupActivityListeners();

        console.log('📝 Session service ready');
    }

    /**
     * Login user
     */
    login(sessionData) {
        this.state = {
            isAuthenticated: true,
            sessionId: sessionData.sessionId,
            studentName: sessionData.studentName,
            studentClass: sessionData.studentClass,
            loginTime: Date.now(),
            lastActivity: Date.now()
        };

        // Save to storage
        this.saveSession();

        // Start tracking
        this.startActivityTracking();

        // Emit event
        this.emit('login', this.state);

        console.log(`✅ Logged in: ${this.state.studentName}`);
        return true;
    }

    /**
     * Logout user
     */
    logout() {
        const wasAuthenticated = this.state.isAuthenticated;

        // Clear state
        this.state = {
            isAuthenticated: false,
            sessionId: null,
            studentName: null,
            studentClass: null,
            loginTime: null,
            lastActivity: null
        };

        // Clear storage
        Storage.remove(this.storageKey);

        // Stop tracking
        this.stopActivityTracking();

        if (wasAuthenticated) {
            this.emit('logout');
        }

        console.log('👋 Logged out');
        return true;
    }

    /**
     * Update session
     */
    updateSession(updates) {
        Object.assign(this.state, updates);
        this.state.lastActivity = Date.now();
        this.saveSession();
        this.emit('sessionUpdated', this.state);
    }

    /**
     * Save session to storage
     */
    saveSession() {
        if (!this.state.isAuthenticated) return;

        Storage.set(this.storageKey, {
            ...this.state,
            savedAt: Date.now()
        });
    }

    /**
     * Restore session from storage
     */
    restoreSession() {
        const saved = Storage.get(this.storageKey);

        if (!saved || !saved.isAuthenticated) {
            return false;
        }

        // Check if session is too old
        const age = Date.now() - saved.savedAt;
        if (age > 24 * 60 * 60 * 1000) { // 24 hours
            console.log('Session too old, clearing');
            Storage.remove(this.storageKey);
            return false;
        }

        // Restore state
        this.state = saved;
        console.log(`♻️ Session restored: ${saved.studentName}`);
        return true;
    }

    /**
     * Setup activity tracking
     */
    setupActivityListeners() {
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

        events.forEach(event => {
            document.addEventListener(event, () => this.updateActivity(), {
                passive: true,
                capture: true
            });
        });
    }

    /**
     * Update last activity
     */
    updateActivity() {
        if (!this.state.isAuthenticated) return;

        this.state.lastActivity = Date.now();

        // Reset inactivity timer
        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
        }

        this.activityTimer = setTimeout(() => {
            this.handleInactivity();
        }, this.activityTimeout);
    }

    /**
     * Handle inactivity
     */
    handleInactivity() {
        console.warn('⏰ Session inactive for too long');
        this.emit('inactivity', {
            lastActivity: this.state.lastActivity,
            duration: Date.now() - this.state.lastActivity
        });
    }

    /**
     * Start activity tracking
     */
    startActivityTracking() {
        this.updateActivity();
    }

    /**
     * Stop activity tracking
     */
    stopActivityTracking() {
        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
            this.activityTimer = null;
        }
    }

    /**
     * Get session state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return this.state.isAuthenticated;
    }

    /**
     * Get session duration
     */
    getSessionDuration() {
        if (!this.state.loginTime) return 0;
        return Date.now() - this.state.loginTime;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopActivityTracking();
        this.removeAllListeners();
        console.log('🧹 Session Service destroyed');
    }
}

// Export singleton instance
export const sessionService = new SessionService();