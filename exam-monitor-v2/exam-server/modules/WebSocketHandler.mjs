import { SESSION_STATES } from './SessionManager.mjs';
import { ServerSideAntiCheat } from './ServerSideAntiCheat.mjs';

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
        
        // Initialize server-side anti-cheat
        this.antiCheat = new ServerSideAntiCheat();
        this.setupAntiCheatEvents();

        this.setupHeartbeat();
        this.setupTimeWarnings();
    }

    /**
     * Initialize WebSocket event handlers
     */
    initialize() {
        this.io.on('connection', (socket) => {
            console.log(`New connection: ${socket.id} (IP: ${socket.handshake.address})`);

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

        console.log('WebSocket handler initialized');
    }

    /**
     * Setup common event handlers
     */
    setupCommonHandlers(socket) {
        // Enhanced heartbeat with anti-cheat validation
        socket.on(SOCKET_EVENTS.HEARTBEAT, (data) => {
            this.handleHeartbeat(socket, data);
        });
    }

    /**
     * Handle enhanced heartbeat with anti-cheat validation
     */
    async handleHeartbeat(socket, data) {
        const timestamp = Date.now();
        
        // Send basic heartbeat response
        socket.emit(SOCKET_EVENTS.HEARTBEAT, { timestamp });

        // Validate with anti-cheat if student session exists
        if (socket.studentInfo && socket.studentInfo.sessionId) {
            const studentId = socket.studentInfo.sessionId;
            
            try {
                const validation = this.antiCheat.validateHeartbeat(studentId, data || {});
                
                if (!validation.valid) {
                    // Handle violation
                    console.log(`ALERT: Heartbeat validation failed: ${studentId} - ${validation.reason}`);
                    
                    if (validation.action === 'terminate') {
                        // Will be handled by anti-cheat termination event
                        return;
                    }
                }

                // Send warnings to student if any
                if (validation.warnings && validation.warnings.length > 0) {
                    socket.emit('anti-cheat-warning', {
                        warnings: validation.warnings,
                        suspicionScore: validation.suspicionScore
                    });
                }

                // Update teacher dashboard with suspicion score
                if (validation.suspicionScore > 30) {
                    this.broadcastToTeachers(SOCKET_EVENTS.STUDENT_SUSPICIOUS, {
                        sessionId: studentId,
                        type: 'suspicion_increase',
                        suspicionScore: validation.suspicionScore,
                        warnings: validation.warnings,
                        timestamp: timestamp
                    });
                }

            } catch (error) {
                console.error('Heartbeat validation error:', error);
            }
        }
    }

    /**
     * Setup anti-cheat event handlers
     */
    setupAntiCheatEvents() {
        // Handle student termination from anti-cheat
        this.antiCheat.emit = (event, data) => {
            if (event === 'student-terminated') {
                this.handleAntiCheatTermination(data);
            }
        };
    }

    /**
     * Handle anti-cheat student termination
     */
    async handleAntiCheatTermination(data) {
        const { studentId, reason, violations, suspicionScore } = data;
        
        try {
            // Complete session as terminated
            await this.sessionManager.completeSession(studentId, 'terminated', {
                reason: reason,
                violations: violations,
                suspicionScore: suspicionScore,
                timestamp: Date.now()
            });

            // Force disconnect student - FIX: Get socket object first
            const socket = this.studentSockets.get(studentId);
            if (socket) {
                this.forceDisconnectStudent(socket, `Exam terminated: ${reason}`);
            } else {
                console.warn(`Socket not found for student: ${studentId} - cannot force disconnect`);
            }

            // Notify teachers
            this.broadcastToTeachers(SOCKET_EVENTS.STUDENT_SUSPICIOUS, {
                sessionId: studentId,
                type: 'terminated',
                reason: reason,
                violations: violations,
                suspicionScore: suspicionScore,
                timestamp: Date.now()
            });

            console.log(`STOP: Anti-cheat termination: ${studentId} - ${reason}`);

        } catch (error) {
            console.error('Error handling anti-cheat termination:', error);
        }
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

        // Help chat events
        socket.on('help-request', async (data) => {
            await this.handleHelpRequest(socket, data);
        });

        socket.on('student-typing', (data) => {
            this.handleStudentTyping(socket, data);
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

        // Teacher help chat events
        socket.on('help-response', async (data) => {
            await this.handleHelpResponse(socket, data);
        });

        socket.on('teacher-message', async (data) => {
            await this.handleTeacherMessage(socket, data);
        });

        socket.on('teacher-typing', (data) => {
            this.handleTeacherTyping(socket, data);
        });

        // Teacher session management
        socket.on('teacher-restart-session', async (data) => {
            await this.handleTeacherRestartSession(socket, data);
        });

        // Teacher warning and termination
        socket.on('send-warning', async (data) => {
            await this.handleSendWarning(socket, data);
        });

        socket.on('terminate-student', async (data) => {
            await this.handleTerminateStudent(socket, data);
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
                    message: 'Name and class are required'
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

            // Initialize anti-cheat profile
            this.antiCheat.initializeStudentProfile(loginResult.sessionId, {
                ipAddress: socket.handshake.address,
                userAgent: socket.handshake.headers['user-agent'],
                sessionType: loginResult.type
            });

            // CRITICAL SECURITY: Session restore is DISABLED for kiosk mode
            // Always treat as NEW session to force kiosk popup
            // This prevents bypassing kiosk isolation via session restore

            // Send success response - ALWAYS as new session
            socket.emit(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, {
                sessionId: loginResult.sessionId,
                timeLeft: loginResult.timeLeft,
                message: loginResult.type === 'continue_session'
                    ? 'Продължаване на сесия (kiosk mode ще се стартира отново)'
                    : loginResult.message
            });

            // Notify teachers
            this.notifyTeachers(SOCKET_EVENTS.STUDENT_CONNECTED, {
                sessionId: loginResult.sessionId,
                studentName: socket.studentInfo.name,
                studentClass: socket.studentInfo.class,
                socketId: socket.id,
                joinType: loginResult.type,
                timeLeft: loginResult.timeLeft
            });

            console.log(`Student joined: ${studentName} (${studentClass}) - ${loginResult.sessionId} (Socket ID: ${socket.id})`);

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

            // Validate code submission with anti-cheat
            const codeValidation = this.antiCheat.validateCodeSubmission(
                sessionId, 
                data.code || '', 
                {
                    filename: data.filename,
                    typingDuration: data.typingDuration,
                    lastModified: data.lastModified
                }
            );

            if (!codeValidation.valid) {
                console.log(`ALERT: Code validation failed: ${sessionId} - ${codeValidation.reason}`);
                
                // Notify teacher of suspicious code
                this.broadcastToTeachers(SOCKET_EVENTS.STUDENT_SUSPICIOUS, {
                    sessionId,
                    type: 'suspicious_code',
                    reason: codeValidation.reason,
                    patterns: codeValidation.patterns,
                    suspicion: codeValidation.suspicion,
                    timestamp: Date.now()
                });

                // Will be handled by anti-cheat termination if severe enough
                if (codeValidation.suspicion >= 0.7) {
                    return;
                }
            }

            // Update session with code
            const success = await this.sessionManager.updateSessionActivity(sessionId, {
                code: data.code,
                filename: data.filename || 'main.js',
                suspicious: data.suspicious || (codeValidation.suspicion > 0.3)
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

            // Notify teachers (include fullscreen exit attempts and heartbeat data)
            this.notifyTeachers(SOCKET_EVENTS.STUDENT_SUSPICIOUS, {
                sessionId,
                studentName: socket.studentInfo.name,
                studentClass: socket.studentInfo.class,
                socketId: socket.id,
                activity: data.activity,
                activityType: data.activityType,
                timestamp: Date.now(),
                severity: data.severity || 'medium',
                // Pass violation-specific details for teacher dashboard visibility
                fullscreenExitAttempts: data.details?.attemptNumber,
                heartbeatMissed: data.activityType === 'heartbeat_missed' ? (data.details?.count || 1) : undefined
            });

            console.log(`Suspicious activity: ${socket.studentInfo.name} - ${data.activityType || data.activity}`);

            // Enhanced activity type handling
            const activityType = data.activityType || data.activity;
            const severity = this.assessSeverity(activityType, data.details);

            // Only force disconnect for critical violations
            if (severity === 'critical' || this.isCriticalViolation(activityType)) {
                await this.sessionManager.completeSession(sessionId, 'forced_violations');
                this.forceDisconnectStudent(socket, 'suspicious_activity');
            }

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

            console.log(`Exam completed: ${socket.studentInfo.name}`);

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
            socketId: this.getSocketIdBySession(session.sessionId),
            files: session.files || {}
        }));

        socket.emit(SOCKET_EVENTS.ALL_STUDENTS, studentsData);

        // Send exam statistics
        this.sendExamStatistics(socket);

        console.log(`Teacher joined dashboard: ${socket.id}`);
    }

    /**
     * Handle disconnection
     */
    async handleDisconnection(socket, reason) {
        console.log(`Disconnection: ${socket.id} - ${reason}. Student Info: ${socket.studentInfo ? JSON.stringify(socket.studentInfo) : 'N/A'}`);

        // Handle student disconnection
        if (socket.studentInfo) {
            const { sessionId, name, class: studentClass } = socket.studentInfo;

            // Clean up anti-cheat data
            this.antiCheat.cleanupStudent(sessionId);

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

            console.log(`Student disconnected: ${name} (${studentClass}) - ${reason}`);
        }

        // Handle teacher disconnection
        if (this.teacherSockets.has(socket)) {
            this.teacherSockets.delete(socket);
            console.log(`Teacher disconnected: ${socket.id}`);
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
                return 'Засечено е нарушение на правилата. Искате ли да напуснете изпита сега или да продължите (с риск от прекратяване при следващо нарушение)?';
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
                    console.log(`Time warning sent: ${socket.studentInfo?.name} - ${minutesLeft}min left`);

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
        console.log('Emergency disconnect all students');

        for (const socket of this.studentSockets.values()) {
            this.forceDisconnectStudent(socket, reason);
        }

        this.notifyTeachers('emergency-disconnect', {
            reason,
            disconnectedCount: this.studentSockets.size,
            timestamp: Date.now()
        });
    }

    /**
     * Get anti-cheat statistics for teacher dashboard
     */
    getAntiCheatStats() {
        const generalStats = this.antiCheat.getAllStats();
        const detailedStats = [];

        // Get detailed stats for each student
        for (const [sessionId] of this.studentSockets.entries()) {
            const studentStats = this.antiCheat.getStudentStats(sessionId);
            if (studentStats) {
                detailedStats.push(studentStats);
            }
        }

        return {
            ...generalStats,
            detailedStats: detailedStats
        };
    }

    /**
     * Get anti-cheat statistics for specific student
     */
    getStudentAntiCheatStats(sessionId) {
        return this.antiCheat.getStudentStats(sessionId);
    }

    /**
     * Assess the severity of suspicious activity
     */
    assessSeverity(activityType, details = {}) {
        // Only instant termination activities are critical
        const criticalActivities = [
            'focus_loss',
            'tab_hidden',
            'document_hidden_violation'
        ];

        if (criticalActivities.includes(activityType)) {
            return 'critical';
        } else {
            return 'medium';
        }
    }

    /**
     * Check if activity requires immediate termination
     */
    isCriticalViolation(activityType) {
        const instantTermination = [
            'focus_loss',
            'tab_hidden',
            'document_hidden_violation'
        ];

        return instantTermination.includes(activityType);
    }

    /**
     * Handle help request from student
     */
    async handleHelpRequest(socket, data) {
        if (!socket.studentInfo) {
            console.log('[CHAT ERROR] Help request received but no student info on socket');
            return;
        }

        try {
            const { sessionId, name, class: studentClass } = socket.studentInfo;

            console.log(`[CHAT] Help request from ${name} (${sessionId}): ${data.message}`);

            // Store help request in session (optional)
            await this.sessionManager.updateSessionActivity(sessionId, {
                helpRequest: {
                    message: data.message,
                    timestamp: data.timestamp,
                    id: data.id
                }
            });

            // Send confirmation to student
            socket.emit('help-message-received', {
                messageId: data.id,
                timestamp: Date.now()
            });

            const notificationData = {
                sessionId: sessionId,
                studentName: name,
                studentClass: studentClass,
                message: data.message,
                timestamp: data.timestamp,
                messageId: data.id,
                socketId: socket.id
            };

            console.log('[CHAT] Notifying teachers of help request:', notificationData);

            // Notify all teachers about help request (for badge/notification)
            this.notifyTeachers('student-help-request', notificationData);

            // Also send as a regular message for inline chat
            this.notifyTeachers('student-message', {
                sessionId: sessionId,
                message: data.message,
                timestamp: data.timestamp,
                sender: 'student'
            });

            console.log('[CHAT] Teachers notified - count:', this.teacherSockets.size);

        } catch (error) {
            console.error('[CHAT ERROR] Error handling help request:', error);
        }
    }

    /**
     * Handle help response from teacher
     */
    async handleHelpResponse(socket, data) {
        try {
            const { studentId, message, messageId } = data;

            console.log('[CHAT] Teacher sending help response:', {
                studentId,
                messageLength: message?.length,
                messageId
            });

            // Find student socket
            const studentSocket = this.studentSockets.get(studentId);
            if (!studentSocket) {
                console.log('[CHAT ERROR] Student not found:', studentId);
                console.log('[CHAT] Available students:', Array.from(this.studentSockets.keys()));
                socket.emit('help-response-error', {
                    messageId: messageId,
                    error: 'Student not connected'
                });
                return;
            }

            const responseData = {
                id: messageId || Date.now(),
                message: message,
                timestamp: Date.now(),
                teacherName: data.teacherName || 'Учител',
                type: 'response'
            };

            console.log('[CHAT] Sending response to student:', studentSocket.studentInfo?.name);

            // Send response to student
            studentSocket.emit('help-response', responseData);

            // Confirm to teacher
            socket.emit('help-response-sent', {
                messageId: messageId,
                studentId: studentId,
                timestamp: Date.now()
            });

            console.log(`[CHAT] Help response sent to ${studentSocket.studentInfo?.name}: ${message.substring(0, 50)}...`);

        } catch (error) {
            console.error('[CHAT ERROR] Error handling help response:', error);
            socket.emit('help-response-error', {
                messageId: data.messageId,
                error: 'Failed to send response'
            });
        }
    }

    /**
     * Handle teacher message (for inline chat)
     */
    async handleTeacherMessage(socket, data) {
        try {
            const { sessionId, message, timestamp } = data;

            console.log('[CHAT] Teacher sending message to student:', {
                sessionId,
                messageLength: message?.length,
                timestamp
            });

            // Find student socket by sessionId
            const studentSocket = this.studentSockets.get(sessionId);
            if (!studentSocket) {
                console.log('[CHAT ERROR] Student not found for sessionId:', sessionId);
                console.log('[CHAT] Available students:', Array.from(this.studentSockets.keys()));
                return;
            }

            // Send message to student
            const messageData = {
                message: message,
                timestamp: timestamp || Date.now(),
                sender: 'teacher'
            };

            console.log('[CHAT] Sending message to student:', studentSocket.studentInfo?.name);
            studentSocket.emit('teacher-message', messageData);

            console.log(`[CHAT] Message sent to ${studentSocket.studentInfo?.name}: ${message.substring(0, 50)}...`);

        } catch (error) {
            console.error('[CHAT ERROR] Error handling teacher message:', error);
        }
    }

    /**
     * Handle student typing indicator
     */
    handleStudentTyping(socket, data) {
        if (!socket.studentInfo) return;

        // Notify teachers about student typing
        this.notifyTeachers('student-typing', {
            sessionId: socket.studentInfo.sessionId,
            studentName: socket.studentInfo.name,
            isTyping: data.isTyping,
            timestamp: Date.now()
        });
    }

    /**
     * Handle teacher typing indicator
     */
    handleTeacherTyping(socket, data) {
        const { studentId, isTyping } = data;
        
        // Find student socket and notify
        const studentSocket = this.studentSockets.get(studentId);
        if (studentSocket) {
            studentSocket.emit('teacher-typing', {
                isTyping: isTyping,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Handle teacher restarting a student session
     */
    async handleTeacherRestartSession(socket, data) {
        try {
            const { sessionId } = data;

            if (!sessionId) {
                socket.emit('session-restart-error', {
                    success: false,
                    message: 'Session ID required'
                });
                return;
            }

            console.log(`Teacher requesting session restart for: ${sessionId}`);

            // Clear session from SessionManager
            const cleared = await this.sessionManager.clearSession(sessionId);

            if (cleared) {
                // Disconnect student socket if still connected
                const studentSocket = this.studentSockets.get(sessionId);
                if (studentSocket && studentSocket.connected) {
                    studentSocket.emit('session-restarted', {
                        message: 'Your session was restarted by the teacher. Please log in again.'
                    });
                    studentSocket.disconnect(true);
                }

                // Remove from local tracking
                this.studentSockets.delete(sessionId);
                this.antiCheat.cleanupStudent(sessionId);

                // Notify all teachers
                this.broadcastToTeachers('session-restarted', {
                    sessionId: sessionId,
                    timestamp: Date.now()
                });

                // Confirm to requesting teacher
                socket.emit('session-restart-success', {
                    success: true,
                    sessionId: sessionId,
                    message: 'Session restarted successfully. Student can now log in again.'
                });

                console.log(`OK: Session restarted: ${sessionId}`);
            } else {
                socket.emit('session-restart-error', {
                    success: false,
                    message: 'Failed to clear session. Session may not exist.'
                });
            }

        } catch (error) {
            console.error('Error restarting session:', error);
            socket.emit('session-restart-error', {
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Handle send warning from teacher to student
     */
    async handleSendWarning(socket, data) {
        try {
            const { sessionId, message } = data;

            if (!sessionId) {
                console.log('[WARNING] No sessionId provided for warning');
                return;
            }

            console.log(`[WARNING] Teacher sending warning to: ${sessionId}`);

            // Find student socket
            const studentSocket = this.studentSockets.get(sessionId);
            if (!studentSocket) {
                console.log('[WARNING] Student not connected:', sessionId);
                socket.emit('warning-error', {
                    sessionId: sessionId,
                    error: 'Student not connected'
                });
                return;
            }

            // Send warning to student
            studentSocket.emit('teacher-warning', {
                message: message || 'Please follow exam rules',
                timestamp: Date.now(),
                type: 'warning'
            });

            // Log suspicious activity
            await this.sessionManager.updateSessionActivity(sessionId, {
                suspicious: 'teacher_warning_received',
                description: message || 'Warning from teacher',
                severity: 'medium'
            });

            // Confirm to teacher
            socket.emit('warning-sent', {
                sessionId: sessionId,
                timestamp: Date.now()
            });

            console.log(`[WARNING] Warning sent to ${studentSocket.studentInfo?.name}: ${message}`);

        } catch (error) {
            console.error('[WARNING ERROR] Failed to send warning:', error);
        }
    }

    /**
     * Handle terminate student from teacher
     */
    async handleTerminateStudent(socket, data) {
        try {
            const { sessionId, reason } = data;

            if (!sessionId) {
                console.log('[TERMINATE] No sessionId provided');
                return;
            }

            console.log(`[TERMINATE] Teacher terminating student: ${sessionId} - Reason: ${reason}`);

            // Find student socket
            const studentSocket = this.studentSockets.get(sessionId);

            // Complete session as terminated
            await this.sessionManager.completeSession(sessionId, reason || 'instructor_action');

            if (studentSocket) {
                // Send termination notice to student
                studentSocket.emit('exam-terminated', {
                    reason: reason || 'instructor_action',
                    message: 'Your exam has been terminated by your teacher!',
                    timestamp: Date.now()
                });

                // Force disconnect after short delay
                setTimeout(() => {
                    this.forceDisconnectStudent(studentSocket, 'admin_action');
                }, 1000);

                console.log(`[TERMINATE] Student ${studentSocket.studentInfo?.name} terminated by teacher`);
            }

            // Notify all teachers about termination
            this.notifyTeachers('student-terminated', {
                sessionId: sessionId,
                reason: reason || 'instructor_action',
                timestamp: Date.now()
            });

            // Confirm to requesting teacher
            socket.emit('terminate-success', {
                sessionId: sessionId,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('[TERMINATE ERROR] Failed to terminate student:', error);
            socket.emit('terminate-error', {
                sessionId: data.sessionId,
                error: 'Failed to terminate student'
            });
        }
    }

    /**
     * Broadcast to teachers (alias for notifyTeachers)
     */
    broadcastToTeachers(event, data) {
        this.notifyTeachers(event, data);
    }
}