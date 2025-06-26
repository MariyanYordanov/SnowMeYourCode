import { SESSION_STATES } from './SessionManager.mjs';

export const SOCKET_EVENTS = {
    // Student events
    STUDENT_JOIN: 'student-join',
    STUDENT_DISCONNECT: 'student-disconnect',
    CODE_UPDATE: 'code-update',
    SUSPICIOUS_ACTIVITY: 'suspicious-activity',
    EXAM_COMPLETE: 'exam-complete',
    HEARTBEAT: 'heartbeat',

    // Teacher events
    TEACHER_JOIN: 'teacher-join',

    // Server responses
    STUDENT_ID_ASSIGNED: 'student-id-assigned',
    LOGIN_ERROR: 'login-error',
    SESSION_RESTORED: 'session-restored',
    EXAM_EXPIRED: 'exam-expired',
    FORCE_DISCONNECT: 'force-disconnect',
    TIME_WARNING: 'time-warning',

    // Teacher updates
    STUDENT_CONNECTED: 'student-connected',
    STUDENT_DISCONNECTED: 'student-disconnected',
    STUDENT_CODE_UPDATE: 'student-code-update',
    STUDENT_SUSPICIOUS: 'student-suspicious',
    ALL_STUDENTS: 'all-students',
    EXAM_STATISTICS: 'exam-statistics'
};

export class WebSocketHandler {
    constructor(io, sessionManager) {
        this.io = io;
        this.sessionManager = sessionManager;
        this.studentSockets = new Map(); // sessionId -> socket
        this.teacherSockets = new Set();
        this.heartbeatInterval = 15000; // 15 seconds
        this.timeWarnings = [60, 30, 15, 5]; // Minutes before exam end to warn

        this.setupHeartbeat();
        this.setupTimeWarnings();
    }

    /**
     * Initialize WebSocket event handlers
     */
    initialize() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 New connection: ${socket.id}`);

            // Set up common event handlers
            this.setupCommonHandlers(socket);
            this.setupStudentHandlers(socket);
            this.setupTeacherHandlers(socket);

            // Handle disconnection
            socket.on('disconnect', (reason) => {
                this.handleDisconnection(socket, reason);
            });

            // Handle connection errors
            socket.on('error', (error) => {
                console.error(`Socket error for ${socket.id}:`, error);
            });
        });

        console.log('🚀 WebSocket handler initialized');
    }

    /**
     * Setup common event handlers
     */
    setupCommonHandlers(socket) {
        // Heartbeat to detect disconnections
        socket.on(SOCKET_EVENTS.HEARTBEAT, () => {
            socket.emit(SOCKET_EVENTS.HEARTBEAT, { timestamp: Date.now() });
        });
    }

    /**
     * Setup student-specific event handlers
     */
    setupStudentHandlers(socket) {
        // Student joining exam
        socket.on(SOCKET_EVENTS.STUDENT_JOIN, async (data) => {
            await this.handleStudentJoin(socket, data);
        });

        // Code updates from student
        socket.on(SOCKET_EVENTS.CODE_UPDATE, async (data) => {
            await this.handleCodeUpdate(socket, data);
        });

        // Suspicious activity detection
        socket.on(SOCKET_EVENTS.SUSPICIOUS_ACTIVITY, async (data) => {
            await this.handleSuspiciousActivity(socket, data);
        });

        // Student completing exam
        socket.on(SOCKET_EVENTS.EXAM_COMPLETE, async (data) => {
            await this.handleExamComplete(socket, data);
        });
    }

    /**
     * Setup teacher-specific event handlers
     */
    setupTeacherHandlers(socket) {
        // Teacher joining dashboard
        socket.on(SOCKET_EVENTS.TEACHER_JOIN, () => {
            this.handleTeacherJoin(socket);
        });
    }

    /**
     * Handle student joining exam
     */
    async handleStudentJoin(socket, data) {
        try {
            const { studentName, studentClass } = data;

            if (!studentName || !studentClass) {
                socket.emit(SOCKET_EVENTS.LOGIN_ERROR, {
                    message: 'Име и клас са задължителни'
                });
                return;
            }

            // Process login through SessionManager
            const loginResult = await this.sessionManager.handleStudentLogin(
                studentName.trim(),
                studentClass.trim().toUpperCase()
            );

            if (!loginResult.success) {
                socket.emit(SOCKET_EVENTS.LOGIN_ERROR, {
                    type: loginResult.type,
                    message: loginResult.message
                });
                return;
            }

            // Store socket mapping
            socket.studentInfo = {
                sessionId: loginResult.sessionId,
                name: studentName.trim(),
                class: studentClass.trim().toUpperCase()
            };

            this.studentSockets.set(loginResult.sessionId, socket);
            socket.join('students');

            // Send success response
            if (loginResult.type === 'continue_session') {
                socket.emit(SOCKET_EVENTS.SESSION_RESTORED, {
                    sessionId: loginResult.sessionId,
                    timeLeft: loginResult.timeLeft,
                    message: loginResult.message,
                    lastCode: loginResult.lastCode || ''
                });
            } else {
                socket.emit(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, {
                    sessionId: loginResult.sessionId,
                    timeLeft: loginResult.timeLeft,
                    message: loginResult.message
                });
            }

            // Notify teachers
            this.notifyTeachers(SOCKET_EVENTS.STUDENT_CONNECTED, {
                sessionId: loginResult.sessionId,
                studentName: socket.studentInfo.name,
                studentClass: socket.studentInfo.class,
                socketId: socket.id,
                joinType: loginResult.type,
                timeLeft: loginResult.timeLeft
            });

            console.log(`👨‍🎓 Student joined: ${studentName} (${studentClass}) - ${loginResult.sessionId}`);

        } catch (error) {
            console.error('Error handling student join:', error);
            socket.emit(SOCKET_EVENTS.LOGIN_ERROR, {
                message: 'Възникна грешка при влизане в изпита'
            });
        }
    }

    /**
     * Handle code updates from student
     */
    async handleCodeUpdate(socket, data) {
        if (!socket.studentInfo) return;

        try {
            const { sessionId } = socket.studentInfo;

            // Update session with code
            const success = await this.sessionManager.updateSessionActivity(sessionId, {
                code: data.code,
                filename: data.filename || 'main.js',
                suspicious: data.suspicious
            });

            if (!success) {
                // Exam time expired
                socket.emit(SOCKET_EVENTS.EXAM_EXPIRED, {
                    message: 'Времето за изпита изтече'
                });
                this.forceDisconnectStudent(socket, 'time_expired');
                return;
            }

            // Notify teachers of code update
            this.notifyTeachers(SOCKET_EVENTS.STUDENT_CODE_UPDATE, {
                sessionId,
                studentName: socket.studentInfo.name,
                studentClass: socket.studentInfo.class,
                socketId: socket.id,
                code: data.code,
                filename: data.filename || 'main.js',
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error handling code update:', error);
        }
    }

    /**
     * Handle suspicious activity
     */
    async handleSuspiciousActivity(socket, data) {
        if (!socket.studentInfo) return;

        try {
            const { sessionId } = socket.studentInfo;

            // Log suspicious activity
            await this.sessionManager.updateSessionActivity(sessionId, {
                suspicious: data.activity
            });

            // Notify teachers
            this.notifyTeachers(SOCKET_EVENTS.STUDENT_SUSPICIOUS, {
                sessionId,
                studentName: socket.studentInfo.name,
                studentClass: socket.studentInfo.class,
                socketId: socket.id,
                activity: data.activity,
                timestamp: Date.now(),
                severity: data.severity || 'medium'
            });

            console.log(`⚠️ Suspicious activity: ${socket.studentInfo.name} - ${data.activity}`);

        } catch (error) {
            console.error('Error handling suspicious activity:', error);
        }
    }

    /**
     * Handle exam completion
     */
    async handleExamComplete(socket, data) {
        if (!socket.studentInfo) return;

        try {
            const { sessionId } = socket.studentInfo;

            await this.sessionManager.completeSession(sessionId, 'graceful');

            // Notify teachers
            this.notifyTeachers(SOCKET_EVENTS.STUDENT_DISCONNECTED, {
                sessionId,
                studentName: socket.studentInfo.name,
                studentClass: socket.studentInfo.class,
                socketId: socket.id,
                reason: 'completed',
                completedAt: Date.now()
            });

            // Send completion confirmation
            socket.emit('exam-completed', {
                message: 'Изпитът е приключен успешно!',
                completedAt: Date.now()
            });

            console.log(`✅ Exam completed: ${socket.studentInfo.name}`);

            // Disconnect socket after short delay
            setTimeout(() => {
                socket.disconnect(true);
            }, 2000);

        } catch (error) {
            console.error('Error handling exam completion:', error);
        }
    }

    /**
     * Handle teacher joining dashboard
     */
    handleTeacherJoin(socket) {
        socket.join('teachers');
        this.teacherSockets.add(socket);

        // Send current active students
        const activeSessions = this.sessionManager.getActiveSessions();
        const studentsData = activeSessions.map(session => ({
            sessionId: session.sessionId,
            studentName: session.studentName,
            studentClass: session.studentClass,
            status: session.status,
            timeLeft: session.timeLeft,
            formattedTimeLeft: session.formattedTimeLeft,
            lastActivity: session.lastActivity,
            suspiciousCount: session.suspiciousActivities?.length || 0,
            socketId: this.getSocketIdBySession(session.sessionId)
        }));

        socket.emit(SOCKET_EVENTS.ALL_STUDENTS, studentsData);

        // Send exam statistics
        this.sendExamStatistics(socket);

        console.log(`👨‍🏫 Teacher joined dashboard: ${socket.id}`);
    }

    /**
     * Handle disconnection
     */
    async handleDisconnection(socket, reason) {
        console.log(`🔌 Disconnection: ${socket.id} - ${reason}`);

        // Handle student disconnection
        if (socket.studentInfo) {
            const { sessionId, name, class: studentClass } = socket.studentInfo;

            // Mark session as disconnected
            await this.sessionManager.markSessionDisconnected(sessionId);

            // Remove from socket map
            this.studentSockets.delete(sessionId);

            // Notify teachers
            this.notifyTeachers(SOCKET_EVENTS.STUDENT_DISCONNECTED, {
                sessionId,
                studentName: name,
                studentClass,
                socketId: socket.id,
                reason: reason,
                disconnectedAt: Date.now()
            });

            console.log(`📴 Student disconnected: ${name} (${studentClass}) - ${reason}`);
        }

        // Handle teacher disconnection
        if (this.teacherSockets.has(socket)) {
            this.teacherSockets.delete(socket);
            console.log(`📴 Teacher disconnected: ${socket.id}`);
        }
    }

    /**
     * Force disconnect a student (admin action)
     */
    forceDisconnectStudent(socket, reason) {
        socket.emit(SOCKET_EVENTS.FORCE_DISCONNECT, {
            reason,
            message: this.getDisconnectMessage(reason)
        });

        setTimeout(() => {
            socket.disconnect(true);
        }, 1000);
    }

    /**
     * Get disconnect message based on reason
     */
    getDisconnectMessage(reason) {
        switch (reason) {
            case 'time_expired':
                return 'Времето за изпита изтече';
            case 'admin_action':
                return 'Изпитът беше прекратен от преподавателя';
            case 'suspicious_activity':
                return 'Изпитът беше прекратен поради нарушения';
            default:
                return 'Изпитът беше прекратен';
        }
    }

    /**
     * Notify all teachers
     */
    notifyTeachers(event, data) {
        this.io.to('teachers').emit(event, data);
    }

    /**
     * Send exam statistics to teacher(s)
     */
    async sendExamStatistics(socket = null) {
        try {
            const stats = await this.sessionManager.dataStore.getExamStatistics();
            const activeSessions = this.sessionManager.getActiveSessions();

            const examStats = {
                ...stats,
                currentlyActive: activeSessions.length,
                currentlyOnline: this.studentSockets.size,
                teachersOnline: this.teacherSockets.size,
                lastUpdated: Date.now()
            };

            if (socket) {
                socket.emit(SOCKET_EVENTS.EXAM_STATISTICS, examStats);
            } else {
                this.notifyTeachers(SOCKET_EVENTS.EXAM_STATISTICS, examStats);
            }

        } catch (error) {
            console.error('Error sending exam statistics:', error);
        }
    }

    /**
     * Setup heartbeat mechanism - CLEANED
     */
    setupHeartbeat() {
        setInterval(() => {
            // Send heartbeat to all connected students (no logging)
            this.io.to('students').emit(SOCKET_EVENTS.HEARTBEAT, {
                timestamp: Date.now()
            });

            // Check for expired sessions
            this.checkExpiredSessions();

        }, this.heartbeatInterval);
    }

    /**
     * Setup time warnings for students - CLEANED
     */
    setupTimeWarnings() {
        setInterval(() => {
            this.checkTimeWarnings();
        }, 60000); // Check every minute
    }

    /**
     * Check for expired sessions and disconnect students
     */
    async checkExpiredSessions() {
        for (const [sessionId, socket] of this.studentSockets.entries()) {
            try {
                const session = this.sessionManager.sessions.get(sessionId);
                if (!session) continue;

                const timeLeft = this.sessionManager.calculateRemainingTime(session);

                if (timeLeft <= 0) {
                    await this.sessionManager.expireSession(sessionId);
                    this.forceDisconnectStudent(socket, 'time_expired');
                }

            } catch (error) {
                console.error(`Error checking session ${sessionId}:`, error);
            }
        }
    }

    /**
     * Check and send time warnings - CLEANED (removed excessive logging)
     */
    checkTimeWarnings() {
        for (const [sessionId, socket] of this.studentSockets.entries()) {
            try {
                const session = this.sessionManager.sessions.get(sessionId);
                if (!session) continue;

                const timeLeft = this.sessionManager.calculateRemainingTime(session);
                const minutesLeft = Math.floor(timeLeft / (1000 * 60));

                // Check if we should send a warning
                if (this.timeWarnings.includes(minutesLeft)) {
                    socket.emit(SOCKET_EVENTS.TIME_WARNING, {
                        minutesLeft,
                        message: `Внимание! Остават ${minutesLeft} минути до края на изпита`,
                        timeLeft,
                        formattedTimeLeft: this.sessionManager.formatTimeLeft(timeLeft)
                    });

                    // Only log actual warnings sent
                    console.log(`⚠️ Time warning sent: ${socket.studentInfo?.name} - ${minutesLeft}min left`);

                    // Notify teachers about time warning
                    this.notifyTeachers('student-time-warning', {
                        sessionId,
                        studentName: socket.studentInfo?.name,
                        minutesLeft,
                        timeLeft
                    });
                }

            } catch (error) {
                console.error(`Error checking time warnings for ${sessionId}:`, error);
            }
        }
    }

    /**
     * Get socket ID by session ID
     */
    getSocketIdBySession(sessionId) {
        const socket = this.studentSockets.get(sessionId);
        return socket ? socket.id : null;
    }

    /**
     * Get session ID by socket ID
     */
    getSessionIdBySocket(socketId) {
        for (const [sessionId, socket] of this.studentSockets.entries()) {
            if (socket.id === socketId) {
                return sessionId;
            }
        }
        return null;
    }

    /**
     * Broadcast message to all students
     */
    broadcastToStudents(event, data) {
        this.io.to('students').emit(event, data);
    }

    /**
     * Send message to specific student
     */
    sendToStudent(sessionId, event, data) {
        const socket = this.studentSockets.get(sessionId);
        if (socket) {
            socket.emit(event, data);
        }
    }

    /**
     * Get connection statistics
     */
    getConnectionStats() {
        return {
            totalConnections: this.io.engine.clientsCount,
            studentConnections: this.studentSockets.size,
            teacherConnections: this.teacherSockets.size,
            rooms: Array.from(this.io.sockets.adapter.rooms.keys())
        };
    }

    /**
     * Emergency disconnect all students (admin function)
     */
    emergencyDisconnectAll(reason = 'emergency') {
        console.log('🚨 Emergency disconnect all students');

        for (const socket of this.studentSockets.values()) {
            this.forceDisconnectStudent(socket, reason);
        }

        this.notifyTeachers('emergency-disconnect', {
            reason,
            disconnectedCount: this.studentSockets.size,
            timestamp: Date.now()
        });
    }
}