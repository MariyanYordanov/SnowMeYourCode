export const SUSPICIOUS_ACTIVITIES = {
    // Navigation attempts
    TAB_SWITCH: 'tab_switch',
    WINDOW_BLUR: 'window_blur',
    NEW_WINDOW: 'new_window_opened',
    VISIBILITY_CHANGE: 'visibility_change',

    // Copy/paste attempts
    COPY_ATTEMPT: 'copy_attempt',
    PASTE_ATTEMPT: 'paste_attempt',
    CUT_ATTEMPT: 'cut_attempt',

    // Developer tools
    DEV_TOOLS_ATTEMPT: 'dev_tools_attempt',
    CONTEXT_MENU_ATTEMPT: 'context_menu_attempt',

    // Keyboard shortcuts
    FORBIDDEN_SHORTCUT: 'forbidden_shortcut',

    // Mouse behavior
    RIGHT_CLICK: 'right_click',
    TEXT_SELECTION: 'text_selection',

    // Network behavior
    MULTIPLE_SESSIONS: 'multiple_sessions',
    RAPID_REQUESTS: 'rapid_requests',

    // Time-based
    INACTIVE_TOO_LONG: 'inactive_too_long',
    RAPID_CODE_CHANGES: 'rapid_code_changes'
};

export const SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

export const ACTIONS = {
    LOG_ONLY: 'log_only',
    WARN_STUDENT: 'warn_student',
    NOTIFY_TEACHER: 'notify_teacher',
    FORCE_DISCONNECT: 'force_disconnect'
};

export class AntiCheatMonitor {
    constructor(sessionManager, webSocketHandler) {
        this.sessionManager = sessionManager;
        this.webSocketHandler = webSocketHandler;

        // Activity tracking
        this.studentActivity = new Map(); // sessionId -> activity data
        this.suspicionScores = new Map(); // sessionId -> score
        this.activityTimelines = new Map(); // sessionId -> activity timeline

        // Configuration
        this.config = {
            // Thresholds
            maxSuspicionScore: 100,
            warningThreshold: 30,
            criticalThreshold: 70,

            // Time limits (milliseconds)
            maxInactiveTime: 10 * 60 * 1000, // 10 minutes
            rapidChangeThreshold: 5000, // 5 seconds

            // Counters
            maxTabSwitches: 5,
            maxDevToolsAttempts: 3,
            maxCopyAttempts: 3,

            // Actions
            autoDisconnectScore: 80,
            enableAutoWarnings: true,
            enableTeacherNotifications: true
        };

        this.setupMonitoring();
        console.log('Anti-cheat monitor initialized');
    }

    /**
     * Setup monitoring and periodic checks
     */
    setupMonitoring() {
        // Check for inactive students every minute
        setInterval(() => {
            this.checkInactiveStudents();
        }, 60000);

        // Decay suspicion scores over time
        setInterval(() => {
            this.decaySuspicionScores();
        }, 5 * 60000); // Every 5 minutes

        // Generate activity reports
        setInterval(() => {
            this.generateActivityReport();
        }, 15 * 60000); // Every 15 minutes
    }

    /**
     * Track suspicious activity
     */
    async trackActivity(sessionId, activityType, data = {}) {
        try {
            if (!sessionId) return;

            const session = this.sessionManager.sessions.get(sessionId);
            if (!session) return;

            const activity = {
                type: activityType,
                timestamp: Date.now(),
                severity: this.calculateSeverity(activityType, data),
                data: data,
                sessionId: sessionId,
                studentName: session.studentName,
                studentClass: session.studentClass
            };

            // Store activity
            this.addToTimeline(sessionId, activity);

            // Update suspicion score
            const scoreIncrease = this.calculateScoreIncrease(activityType, data);
            this.updateSuspicionScore(sessionId, scoreIncrease);

            // Determine action
            const action = this.determineAction(sessionId, activity);
            await this.executeAction(sessionId, action, activity);

            // Log activity
            console.log(`Suspicious activity: ${session.studentName} - ${activityType} (severity: ${activity.severity})`);

        } catch (error) {
            console.error('Error tracking suspicious activity:', error);
        }
    }

    /**
     * Calculate severity of activity
     */
    calculateSeverity(activityType, data) {
        const severityMap = {
            [SUSPICIOUS_ACTIVITIES.TAB_SWITCH]: SEVERITY_LEVELS.MEDIUM,
            [SUSPICIOUS_ACTIVITIES.WINDOW_BLUR]: SEVERITY_LEVELS.MEDIUM,
            [SUSPICIOUS_ACTIVITIES.VISIBILITY_CHANGE]: SEVERITY_LEVELS.LOW,
            [SUSPICIOUS_ACTIVITIES.COPY_ATTEMPT]: SEVERITY_LEVELS.HIGH,
            [SUSPICIOUS_ACTIVITIES.PASTE_ATTEMPT]: SEVERITY_LEVELS.HIGH,
            [SUSPICIOUS_ACTIVITIES.DEV_TOOLS_ATTEMPT]: SEVERITY_LEVELS.CRITICAL,
            [SUSPICIOUS_ACTIVITIES.CONTEXT_MENU_ATTEMPT]: SEVERITY_LEVELS.LOW,
            [SUSPICIOUS_ACTIVITIES.MULTIPLE_SESSIONS]: SEVERITY_LEVELS.CRITICAL,
            [SUSPICIOUS_ACTIVITIES.RAPID_REQUESTS]: SEVERITY_LEVELS.MEDIUM,
            [SUSPICIOUS_ACTIVITIES.INACTIVE_TOO_LONG]: SEVERITY_LEVELS.LOW
        };

        let baseSeverity = severityMap[activityType] || SEVERITY_LEVELS.LOW;

        // Adjust severity based on frequency
        if (data.frequency && data.frequency > 3) {
            baseSeverity = this.escalateSeverity(baseSeverity);
        }

        return baseSeverity;
    }

    /**
     * Escalate severity level
     */
    escalateSeverity(currentSeverity) {
        const escalationMap = {
            [SEVERITY_LEVELS.LOW]: SEVERITY_LEVELS.MEDIUM,
            [SEVERITY_LEVELS.MEDIUM]: SEVERITY_LEVELS.HIGH,
            [SEVERITY_LEVELS.HIGH]: SEVERITY_LEVELS.CRITICAL,
            [SEVERITY_LEVELS.CRITICAL]: SEVERITY_LEVELS.CRITICAL
        };

        return escalationMap[currentSeverity] || SEVERITY_LEVELS.MEDIUM;
    }

    /**
     * Calculate score increase based on activity
     */
    calculateScoreIncrease(activityType, data) {
        const scoreMap = {
            [SUSPICIOUS_ACTIVITIES.TAB_SWITCH]: 15,
            [SUSPICIOUS_ACTIVITIES.WINDOW_BLUR]: 10,
            [SUSPICIOUS_ACTIVITIES.VISIBILITY_CHANGE]: 5,
            [SUSPICIOUS_ACTIVITIES.COPY_ATTEMPT]: 25,
            [SUSPICIOUS_ACTIVITIES.PASTE_ATTEMPT]: 25,
            [SUSPICIOUS_ACTIVITIES.CUT_ATTEMPT]: 20,
            [SUSPICIOUS_ACTIVITIES.DEV_TOOLS_ATTEMPT]: 35,
            [SUSPICIOUS_ACTIVITIES.CONTEXT_MENU_ATTEMPT]: 5,
            [SUSPICIOUS_ACTIVITIES.FORBIDDEN_SHORTCUT]: 15,
            [SUSPICIOUS_ACTIVITIES.RIGHT_CLICK]: 3,
            [SUSPICIOUS_ACTIVITIES.MULTIPLE_SESSIONS]: 40,
            [SUSPICIOUS_ACTIVITIES.RAPID_REQUESTS]: 20,
            [SUSPICIOUS_ACTIVITIES.INACTIVE_TOO_LONG]: 8,
            [SUSPICIOUS_ACTIVITIES.RAPID_CODE_CHANGES]: 10
        };

        let baseScore = scoreMap[activityType] || 5;

        // Multiply for repeated offenses
        if (data.frequency) {
            baseScore *= Math.min(data.frequency, 3);
        }

        return baseScore;
    }

    /**
     * Update suspicion score for student
     */
    updateSuspicionScore(sessionId, increase) {
        const currentScore = this.suspicionScores.get(sessionId) || 0;
        const newScore = Math.min(currentScore + increase, this.config.maxSuspicionScore);

        this.suspicionScores.set(sessionId, newScore);

        // Update student activity tracking
        const activity = this.studentActivity.get(sessionId) || this.createActivityRecord(sessionId);
        activity.suspicionScore = newScore;
        activity.lastActivity = Date.now();
        this.studentActivity.set(sessionId, activity);
    }

    /**
     * Determine action based on activity and score
     */
    determineAction(sessionId, activity) {
        const score = this.suspicionScores.get(sessionId) || 0;
        const activityCount = this.getActivityCount(sessionId, activity.type);

        // Critical activities
        if (activity.severity === SEVERITY_LEVELS.CRITICAL) {
            if (activity.type === SUSPICIOUS_ACTIVITIES.MULTIPLE_SESSIONS) {
                return ACTIONS.FORCE_DISCONNECT;
            }
            if (activityCount >= this.config.maxDevToolsAttempts) {
                return ACTIONS.FORCE_DISCONNECT;
            }
        }

        // Score-based actions
        if (score >= this.config.autoDisconnectScore) {
            return ACTIONS.FORCE_DISCONNECT;
        }

        if (score >= this.config.criticalThreshold) {
            return ACTIONS.NOTIFY_TEACHER;
        }

        if (score >= this.config.warningThreshold) {
            return ACTIONS.WARN_STUDENT;
        }

        return ACTIONS.LOG_ONLY;
    }

    /**
     * Execute determined action
     */
    async executeAction(sessionId, action, activity) {
        const session = this.sessionManager.sessions.get(sessionId);
        if (!session) return;

        switch (action) {
            case ACTIONS.WARN_STUDENT:
                if (this.config.enableAutoWarnings) {
                    await this.warnStudent(sessionId, activity);
                }
                break;

            case ACTIONS.NOTIFY_TEACHER:
                if (this.config.enableTeacherNotifications) {
                    await this.notifyTeacher(sessionId, activity);
                }
                break;

            case ACTIONS.FORCE_DISCONNECT:
                await this.forceDisconnectStudent(sessionId, activity);
                break;

            case ACTIONS.LOG_ONLY:
            default:
                // Already logged, no additional action
                break;
        }

        // Always log to session
        await this.sessionManager.updateSessionActivity(sessionId, {
            suspicious: `${activity.type}: ${this.getActivityDescription(activity.type)}`,
            severity: activity.severity,
            action: action
        });
    }

    /**
     * Warn student about suspicious activity
     */
    async warnStudent(sessionId, activity) {
        const message = this.getWarningMessage(activity.type);
        const score = this.suspicionScores.get(sessionId) || 0;

        this.webSocketHandler.sendToStudent(sessionId, 'anti-cheat-warning', {
            type: activity.type,
            message: message,
            severity: activity.severity,
            suspicionScore: score,
            maxScore: this.config.maxSuspicionScore,
            timestamp: Date.now()
        });
    }

    /**
     * Notify teacher about suspicious activity
     */
    async notifyTeacher(sessionId, activity) {
        const session = this.sessionManager.sessions.get(sessionId);
        const score = this.suspicionScores.get(sessionId) || 0;
        const timeline = this.getRecentActivities(sessionId, 10);

        this.webSocketHandler.notifyTeachers('student-high-suspicion', {
            sessionId,
            studentName: session.studentName,
            studentClass: session.studentClass,
            activity: activity,
            suspicionScore: score,
            recentActivities: timeline,
            timestamp: Date.now()
        });
    }

    /**
     * Force disconnect student
     */
    async forceDisconnectStudent(sessionId, activity) {
        const session = this.sessionManager.sessions.get(sessionId);

        // Mark session as terminated due to violations
        await this.sessionManager.completeSession(sessionId, 'forced_violations');

        // Disconnect from WebSocket
        const reason = 'suspicious_activity';
        const socket = this.webSocketHandler.studentSockets.get(sessionId);
        if (socket) {
            this.webSocketHandler.forceDisconnectStudent(socket, reason);
        }

        // Notify teachers
        this.webSocketHandler.notifyTeachers('student-force-disconnected', {
            sessionId,
            studentName: session.studentName,
            studentClass: session.studentClass,
            reason: activity.type,
            finalScore: this.suspicionScores.get(sessionId),
            timestamp: Date.now()
        });

        console.log(`Force disconnected: ${session.studentName} - ${activity.type}`);
    }

    /**
     * Get activity count for specific type
     */
    getActivityCount(sessionId, activityType) {
        const timeline = this.activityTimelines.get(sessionId) || [];
        return timeline.filter(activity => activity.type === activityType).length;
    }

    /**
     * Add activity to timeline
     */
    addToTimeline(sessionId, activity) {
        const timeline = this.activityTimelines.get(sessionId) || [];
        timeline.push(activity);

        // Keep only last 100 activities per student
        if (timeline.length > 100) {
            timeline.splice(0, timeline.length - 100);
        }

        this.activityTimelines.set(sessionId, timeline);
    }

    /**
     * Get recent activities for student
     */
    getRecentActivities(sessionId, count = 10) {
        const timeline = this.activityTimelines.get(sessionId) || [];
        return timeline.slice(-count);
    }

    /**
     * Create activity record for new student
     */
    createActivityRecord(sessionId) {
        return {
            sessionId,
            suspicionScore: 0,
            lastActivity: Date.now(),
            startTime: Date.now(),
            activityCount: 0,
            warningsSent: 0
        };
    }

    /**
     * Check for inactive students
     */
    checkInactiveStudents() {
        const now = Date.now();

        for (const [sessionId, activityRecord] of this.studentActivity.entries()) {
            const inactiveTime = now - activityRecord.lastActivity;

            if (inactiveTime > this.config.maxInactiveTime) {
                this.trackActivity(sessionId, SUSPICIOUS_ACTIVITIES.INACTIVE_TOO_LONG, {
                    inactiveTime: inactiveTime
                });
            }
        }
    }

    /**
     * Decay suspicion scores over time
     */
    decaySuspicionScores() {
        const decayAmount = 5; // Reduce by 5 points every 5 minutes

        for (const [sessionId, score] of this.suspicionScores.entries()) {
            const newScore = Math.max(0, score - decayAmount);
            this.suspicionScores.set(sessionId, newScore);

            // Update activity record
            const activity = this.studentActivity.get(sessionId);
            if (activity) {
                activity.suspicionScore = newScore;
            }
        }
    }

    /**
     * Get warning message for activity type
     */
    getWarningMessage(activityType) {
        const messages = {
            [SUSPICIOUS_ACTIVITIES.TAB_SWITCH]: 'Възникна подозрение за превключване между приложения. Останете фокусирани върху изпита.',
            [SUSPICIOUS_ACTIVITIES.COPY_ATTEMPT]: 'Опитът за копиране е забранен по време на изпита.',
            [SUSPICIOUS_ACTIVITIES.PASTE_ATTEMPT]: 'Опитът за поставяне е забранен по време на изпита.',
            [SUSPICIOUS_ACTIVITIES.DEV_TOOLS_ATTEMPT]: 'Опитът за отваряне на Developer Tools е строго забранен.',
            [SUSPICIOUS_ACTIVITIES.CONTEXT_MENU_ATTEMPT]: 'Десният клик е ограничен по време на изпита.'
        };

        return messages[activityType] || 'Засечена е подозрителна активност. Моля, следвайте правилата на изпита.';
    }

    /**
     * Get activity description
     */
    getActivityDescription(activityType) {
        const descriptions = {
            [SUSPICIOUS_ACTIVITIES.TAB_SWITCH]: 'Превключване на табове/приложения',
            [SUSPICIOUS_ACTIVITIES.WINDOW_BLUR]: 'Излизане от прозореца на изпита',
            [SUSPICIOUS_ACTIVITIES.COPY_ATTEMPT]: 'Опит за копиране на текст',
            [SUSPICIOUS_ACTIVITIES.PASTE_ATTEMPT]: 'Опит за поставяне на текст',
            [SUSPICIOUS_ACTIVITIES.DEV_TOOLS_ATTEMPT]: 'Опит за отваряне на Developer Tools',
            [SUSPICIOUS_ACTIVITIES.CONTEXT_MENU_ATTEMPT]: 'Опит за десен клик',
            [SUSPICIOUS_ACTIVITIES.MULTIPLE_SESSIONS]: 'Множество активни сесии'
        };

        return descriptions[activityType] || 'Неизвестна подозрителна активност';
    }

    /**
     * Generate activity report
     */
    generateActivityReport() {
        const report = {
            timestamp: Date.now(),
            totalStudents: this.studentActivity.size,
            suspiciousStudents: 0,
            highRiskStudents: 0,
            totalActivities: 0,
            activityBreakdown: {}
        };

        // Analyze student activities
        for (const [sessionId, activity] of this.studentActivity.entries()) {
            if (activity.suspicionScore > this.config.warningThreshold) {
                report.suspiciousStudents++;
            }
            if (activity.suspicionScore > this.config.criticalThreshold) {
                report.highRiskStudents++;
            }
        }

        // Count activities by type
        for (const timeline of this.activityTimelines.values()) {
            report.totalActivities += timeline.length;

            for (const activity of timeline) {
                report.activityBreakdown[activity.type] =
                    (report.activityBreakdown[activity.type] || 0) + 1;
            }
        }

        // Send to teachers
        this.webSocketHandler.notifyTeachers('activity-report', report);

        console.log(`Activity report: ${report.suspiciousStudents}/${report.totalStudents} students flagged`);
    }

    /**
     * Get student suspicion data
     */
    getStudentSuspicionData(sessionId) {
        return {
            score: this.suspicionScores.get(sessionId) || 0,
            activities: this.getRecentActivities(sessionId),
            activityRecord: this.studentActivity.get(sessionId)
        };
    }

    /**
     * Reset student suspicion score (admin function)
     */
    resetStudentScore(sessionId) {
        this.suspicionScores.set(sessionId, 0);
        const activity = this.studentActivity.get(sessionId);
        if (activity) {
            activity.suspicionScore = 0;
        }
        console.log(`Reset suspicion score for session ${sessionId}`);
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('Anti-cheat configuration updated');
    }
}