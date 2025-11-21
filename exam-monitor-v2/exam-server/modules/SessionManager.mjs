import { JSONDataStore } from './JSONDataStore.mjs';
import { StudentValidator } from './StudentValidator.mjs';
import fs from 'fs/promises';
import path from 'path';

// Session states
export const SESSION_STATES = {
    ACTIVE: 'active',
    DISCONNECTED: 'disconnected',
    COMPLETED: 'completed',
    EXPIRED: 'expired'
};

// Login result types
export const LOGIN_RESULTS = {
    SUCCESS: 'success',
    CONTINUE_SESSION: 'continue_session',
    EXAM_EXPIRED: 'exam_expired',
    STUDENT_EXISTS: 'student_exists',
    INVALID_STUDENT: 'invalid_student',
    INVALID_CLASS: 'invalid_class'
};

export class SessionManager {
    constructor(baseDir) {
        this.dataStore = new JSONDataStore(baseDir);
        this.validator = new StudentValidator(baseDir);
        this.sessions = new Map(); // In-memory cache
        this.baseDir = baseDir;
        this.EXAM_DURATION = 3 * 60 * 60 * 1000; // Default: 3 hours in milliseconds
        this.GRACE_PERIOD = 3 * 60 * 1000; // Default: 3 minutes in milliseconds

        this.loadConfig().then(() => {
            // Load existing sessions on startup after config is loaded
            this.loadExistingSessions();
        });
    }

    async loadConfig() {
        try {
            const configPath = path.join(this.baseDir, 'config', 'exam-config.json');
            const configData = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configData);

            if (config.exam && config.exam.duration && config.exam.durationUnit === 'minutes') {
                this.EXAM_DURATION = config.exam.duration * 60 * 1000;
                console.log(`Exam duration set to ${config.exam.duration} minutes from config.`);
            }

            if (config.security && config.security.sessionSecurity && config.security.sessionSecurity.gracePeriod && config.security.sessionSecurity.gracePeriodUnit === 'minutes') {
                this.GRACE_PERIOD = config.security.sessionSecurity.gracePeriod * 60 * 1000;
                console.log(`Grace period set to ${config.security.sessionSecurity.gracePeriod} minutes from config.`);
            }

        } catch (error) {
            console.error('Error loading exam-config.json, using default values:', error);
        }
    }

    /**
     * Handle student login attempt
     */
    async handleStudentLogin(studentName, studentClass) {
        try {
            // Validate input
            if (!studentName?.trim() || !studentClass?.trim()) {
                return {
                    success: false,
                    type: LOGIN_RESULTS.INVALID_STUDENT,
                    message: 'Име и клас са задължителни'
                };
            }

            const cleanName = this.cleanStudentName(studentName.trim());
            const cleanClass = studentClass.trim().toUpperCase();

            // Validate student and class
            const validationResult = await this.validator.validateStudent(cleanName, cleanClass);
            if (!validationResult.valid) {
                return {
                    success: false,
                    type: validationResult.type,
                    message: validationResult.message
                };
            }

            // Check for existing session
            const existingSession = this.findStudentSession(cleanName, cleanClass);

            if (existingSession) {
                return this.handleExistingSession(existingSession);
            }

            // Check if student is already active in different session
            const conflictSession = this.findActiveStudentInAnySession(cleanName, cleanClass);
            if (conflictSession) {
                return {
                    success: false,
                    type: LOGIN_RESULTS.STUDENT_EXISTS,
                    message: 'Студент вече участва в изпита'
                };
            }

            // Create new session
            return await this.createNewSession(cleanName, cleanClass);

        } catch (error) {
            console.error('Session login error:', error);
            return {
                success: false,
                type: 'error',
                message: 'Възникна грешка при влизане в изпита'
            };
        }
    }

    /**
     * Handle existing session logic
     */
    handleExistingSession(session) {
        // CRITICAL: Check if session was terminated/completed
        if (session.status === SESSION_STATES.COMPLETED ||
            session.status === SESSION_STATES.EXPIRED ||
            session.terminationType) {

            const terminationReason = this.getTerminationMessage(session.terminationType);

            return {
                success: false,
                type: LOGIN_RESULTS.EXAM_EXPIRED,
                message: `Изпитът е приключен: ${terminationReason}. Няма възможност за връщане.`,
                examEndedAt: session.endTime || session.examEndTime,
                terminationType: session.terminationType
            };
        }

        const timeLeft = this.calculateRemainingTime(session);

        if (timeLeft <= 0) {
            // Exam time expired
            this.expireSession(session.sessionId);
            return {
                success: false,
                type: LOGIN_RESULTS.EXAM_EXPIRED,
                message: 'Времето за изпита е изтекло',
                examEndedAt: session.examEndTime
            };
        }

        // Continue existing session
        session.status = SESSION_STATES.ACTIVE;
        session.lastActivity = new Date().toISOString();
        this.updateSession(session);

        console.log(`Session restored: ${session.studentName} - ${this.formatTimeLeft(timeLeft)} remaining`);

        return {
            success: true,
            type: LOGIN_RESULTS.CONTINUE_SESSION,
            message: `Добре дошли обратно! Имате ${this.formatTimeLeft(timeLeft)} оставащо време`,
            sessionId: session.sessionId,
            timeLeft: timeLeft,
            lastCode: session.lastCode || ''
        };
    }

    /**
     * Get human-readable termination message
     */
    getTerminationMessage(terminationType) {
        const messages = {
            'graceful': 'Нормално приключване',
            'timeout': 'Изтекло време',
            'forced_violations': 'Нарушения на правилата',
            'violation': 'Нарушение на правилата',
            'fullscreen_violation': 'Излизане от fullscreen режим',
            'document_hidden_violation': 'Скриване на прозореца',
            'admin_action': 'Прекратен от преподавател'
        };

        return messages[terminationType] || 'Неизвестна причина';
    }

    /**
     * Generate human-readable session ID with collision handling
     */
    async generateSessionId(studentName, studentClass) {
        // Clean name for file system
        const cleanName = this.cleanStudentName(studentName)
            .toLowerCase()
            .replace(/\s+/g, '-');

        // Use normalized class (already uppercase) and convert to lowercase for session ID
        // Format: 11а-ivan-ivanov (lowercase for consistency in session ID)
        const baseSessionId = `${studentClass.toLowerCase()}-${cleanName}`;

        // Check for existing sessions to handle collisions
        let sessionId = baseSessionId;
        let counter = 0;

        while (await this.sessionExists(sessionId)) {
            counter++;
            sessionId = `${baseSessionId}-${counter}`;
        }

        return sessionId;
    }

    /**
     * Check if session ID already exists
     */
    async sessionExists(sessionId) {
        try {
            const session = await this.dataStore.loadSession(sessionId);
            return session !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Create new session
     */
    async createNewSession(studentName, studentClass) {
        const sessionId = await this.generateSessionId(studentName, studentClass);
        const now = new Date();
        const examEndTime = new Date(now.getTime() + this.EXAM_DURATION);

        const session = {
            sessionId,
            studentName,
            studentClass,
            status: SESSION_STATES.ACTIVE,
            startTime: now.toISOString(),
            examEndTime: examEndTime.toISOString(),
            lastActivity: now.toISOString(),
            lastCode: '',
            suspiciousActivities: [],
            terminationType: null
        };

        // Save to storage and cache
        await this.dataStore.saveSession(session);
        this.sessions.set(sessionId, session);

        // Initialize student data directory
        await this.dataStore.initializeStudentDirectory(sessionId, {
            name: studentName,
            class: studentClass
        });

        console.log(`New session created: ${sessionId} for ${studentName} (${studentClass})`);

        return {
            success: true,
            type: LOGIN_RESULTS.SUCCESS,
            message: `Изпитът започна! Имате 3 часа за решаване`,
            sessionId: sessionId,
            timeLeft: this.EXAM_DURATION
        };
    }

    /**
     * Update session with code and activity - CLEANED
     */
    async updateSessionActivity(sessionId, data) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        const timeLeft = this.calculateRemainingTime(session);
        if (timeLeft <= 0) {
            this.expireSession(sessionId);
            return false;
        }

        // Update session data
        session.lastActivity = new Date().toISOString();
        session.status = SESSION_STATES.ACTIVE;

        if (data.code !== undefined) {
            session.lastCode = data.code;
        }

        if (data.suspicious) {
            session.suspiciousActivities.push({
                type: data.suspicious,
                timestamp: new Date().toISOString(),
                severity: data.severity || 'medium'
            });
        }

        // Save updates
        await this.dataStore.saveSession(session);

        // Save code if provided (no logging - too frequent)
        if (data.code !== undefined) {
            await this.dataStore.saveStudentCode(sessionId, {
                filename: data.filename || 'main.js',
                code: data.code
            });
        }

        // Log suspicious activity if provided (keep this logging)
        if (data.suspicious) {
            await this.dataStore.logSuspiciousActivity(sessionId, {
                type: data.suspicious,
                description: data.description || '',
                severity: data.severity || 'medium',
                timestamp: new Date().toISOString()
            });
        }

        return true;
    }

    /**
     * Mark session as disconnected
     */
    async markSessionDisconnected(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.status = SESSION_STATES.DISCONNECTED;
        session.lastActivity = new Date().toISOString();

        await this.dataStore.saveSession(session);
        console.log(`Session disconnected: ${sessionId}`);
    }

    /**
     * Complete session gracefully
     */
    async completeSession(sessionId, terminationType = 'graceful') {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        session.status = SESSION_STATES.COMPLETED;
        session.terminationType = terminationType;
        session.endTime = new Date().toISOString();

        await this.dataStore.saveSession(session);
        console.log(`Session completed: ${sessionId} (${terminationType})`);
        return true;
    }

    /**
     * Expire session due to time limit
     */
    async expireSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.status = SESSION_STATES.EXPIRED;
        session.endTime = new Date().toISOString();
        session.terminationType = 'timeout';

        await this.dataStore.saveSession(session);
        console.log(`Session expired: ${sessionId}`);
    }

    /**
     * Clear session (teacher restart)
     * Removes session from memory and marks as cleared in DB
     */
    async clearSession(sessionId) {
        try {
            const session = this.sessions.get(sessionId);

            if (session) {
                // Mark as cleared and save final state
                session.status = 'CLEARED';
                session.clearedAt = new Date().toISOString();
                session.clearedBy = 'teacher';

                await this.dataStore.saveSession(session);

                // Remove from active sessions
                this.sessions.delete(sessionId);

                console.log(`🧹 Session cleared by teacher: ${sessionId}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error(`Error clearing session ${sessionId}:`, error);
            return false;
        }
    }

    /**
     * Get all active sessions for teacher dashboard
     */
    getActiveSessions() {
        const active = [];
        for (const session of this.sessions.values()) {
            if (session.status === SESSION_STATES.ACTIVE ||
                session.status === SESSION_STATES.DISCONNECTED) {

                const timeLeft = this.calculateRemainingTime(session);
                if (timeLeft > 0) {
                    active.push({
                        ...session,
                        timeLeft: timeLeft,
                        formattedTimeLeft: this.formatTimeLeft(timeLeft)
                    });
                } else {
                    // Auto-expire if time is up
                    this.expireSession(session.sessionId);
                }
            }
        }
        return active;
    }

    /**
     * Find session by student name and class
     */
    findStudentSession(studentName, studentClass) {
        for (const session of this.sessions.values()) {
            if (session.studentName === studentName &&
                session.studentClass === studentClass &&
                (session.status === SESSION_STATES.ACTIVE ||
                    session.status === SESSION_STATES.DISCONNECTED)) {
                return session;
            }
        }
        return null;
    }

    /**
     * Find if student is active in any session (conflict detection)
     */
    findActiveStudentInAnySession(studentName, studentClass) {
        for (const session of this.sessions.values()) {
            if (session.studentName === studentName &&
                session.studentClass === studentClass &&
                session.status === SESSION_STATES.ACTIVE) {
                return session;
            }
        }
        return null;
    }

    /**
     * Calculate remaining exam time
     */
    calculateRemainingTime(session) {
        const now = new Date();
        const examEnd = new Date(session.examEndTime);
        return Math.max(0, examEnd.getTime() - now.getTime());
    }

    /**
     * Format time left for display
     */
    formatTimeLeft(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Clean student name for file system
     */
    cleanStudentName(name) {
        return name
            .replace(/\s+/g, ' ') // Multiple spaces to single
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Load existing sessions from storage on startup - CLEANED
     */
    async loadExistingSessions() {
        try {
            const sessions = await this.dataStore.loadTodaysSessions();
            for (const session of sessions) {
                this.sessions.set(session.sessionId, session);
            }
            console.log(`Loaded ${sessions.length} existing sessions`);
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    }

    /**
     * Update session in storage
     */
    async updateSession(session) {
        this.sessions.set(session.sessionId, session);
        await this.dataStore.saveSession(session);
    }

    /**
     * Cleanup expired sessions periodically - CLEANED
     */
    startCleanupTimer() {
        setInterval(() => {
            let expiredCount = 0;

            for (const session of this.sessions.values()) {
                if (this.calculateRemainingTime(session) <= 0 &&
                    session.status !== SESSION_STATES.EXPIRED) {
                    this.expireSession(session.sessionId);
                    expiredCount++;
                }
            }

            // Only log if sessions were actually expired
            if (expiredCount > 0) {
                console.log(`🧹 Expired ${expiredCount} sessions`);
            }
        }, 60000); // Check every minute

        console.log('Session cleanup timer started');
    }

    /**
     * Get current exam configuration
     */
    getExamConfig() {
        return {
            duration: Math.floor(this.EXAM_DURATION / (60 * 1000)), // Convert to minutes
            gracePeriod: Math.floor(this.GRACE_PERIOD / (60 * 1000)),
            developmentMode: this.developmentMode !== false
        };
    }

    // Exam settings methods removed - duration is now configured in exam-config.json
}