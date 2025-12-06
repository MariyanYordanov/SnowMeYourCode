/**
 * Server-Side Anti-Cheat Validation System
 * Cannot be bypassed by client-side manipulation
 */

export class ServerSideAntiCheat {
    constructor() {
        this.studentProfiles = new Map(); // Keystroke patterns
        this.suspiciousActivities = new Map(); // Activity tracking
        this.heartbeatExpected = new Map(); // Expected heartbeat intervals
        this.lastHeartbeat = new Map(); // Last heartbeat timestamp
        this.violationThresholds = {
            focusViolations: 0, // Instant termination for focus loss
            keystrokeAnomalies: 3,
            heartbeatMissed: 3, // Track app switching via missed heartbeats (ignores warning screen)
            codeInjection: 1,
            timeManipulation: 1
        };
        
        this.heartbeatInterval = 30000; // 30 seconds
        this.heartbeatTolerance = 10000; // 10 seconds tolerance
        
        this.startHeartbeatMonitoring();
    }

    /**
     * Initialize student profile for behavioral analysis
     */
    initializeStudentProfile(studentId, initialData = {}) {
        const profile = {
            studentId,
            sessionStart: Date.now(),
            keystrokePattern: {
                averageSpeed: 0,
                intervals: [],
                rhythm: [],
                samples: 0
            },
            codeSubmissions: [],
            violations: {
                focusLoss: 0,
                keystrokeAnomaly: 0,
                heartbeatMissed: 0,
                codeInjection: 0,
                timeManipulation: 0,
                totalScore: 0
            },
            lastActivity: Date.now(),
            examState: 'active',
            ipAddress: initialData.ipAddress || 'unknown',
            userAgent: initialData.userAgent || 'unknown'
        };

        this.studentProfiles.set(studentId, profile);
        this.heartbeatExpected.set(studentId, Date.now() + this.heartbeatInterval);
        
        console.log(`Student profile initialized: ${studentId}`);
        return profile;
    }

    /**
     * Validate client heartbeat and detect anomalies
     */
    validateHeartbeat(studentId, heartbeatData) {
        const profile = this.studentProfiles.get(studentId);
        if (!profile) {
            return this.createViolationResponse('invalid_session', 1.0);
        }

        const now = Date.now();
        const lastHeartbeat = this.lastHeartbeat.get(studentId) || profile.sessionStart;
        const timeSinceLastHeartbeat = now - lastHeartbeat;

        // Store warning screen status
        profile.isOnWarningScreen = heartbeatData.isOnWarningScreen || false;

        // Update last heartbeat
        this.lastHeartbeat.set(studentId, now);
        this.heartbeatExpected.set(studentId, now + this.heartbeatInterval);

        // Validate heartbeat timing (SKIP if student is on warning screen)
        if (timeSinceLastHeartbeat > this.heartbeatInterval + this.heartbeatTolerance) {
            if (!heartbeatData.isOnWarningScreen) {
                this.recordViolation(studentId, 'heartbeatMissed', 0.6);
            } else {
                console.log(`INFO: Heartbeat late but student on warning screen: ${studentId}`);
            }
        }

        // Validate client claims about focus
        const focusValidation = this.validateFocusHistory(studentId, heartbeatData.focusHistory);
        if (!focusValidation.valid) {
            return this.createViolationResponse('focus_manipulation', focusValidation.suspicion);
        }

        // Validate keystroke patterns
        if (heartbeatData.keystrokeEvents) {
            const keystrokeValidation = this.validateKeystrokePattern(studentId, heartbeatData.keystrokeEvents);
            if (!keystrokeValidation.valid) {
                this.recordViolation(studentId, 'keystrokeAnomaly', keystrokeValidation.suspicion);
            }
        }

        // Validate screen/window properties
        const screenValidation = this.validateScreenProperties(studentId, heartbeatData.screenInfo);
        if (!screenValidation.valid) {
            this.recordViolation(studentId, 'timeManipulation', screenValidation.suspicion);
        }

        // Update profile
        profile.lastActivity = now;

        return {
            valid: true,
            warnings: this.getActiveWarnings(studentId),
            suspicionScore: this.calculateSuspicionScore(studentId)
        };
    }

    /**
     * Validate focus history claims from client
     */
    validateFocusHistory(studentId, focusHistory) {
        if (!focusHistory || !Array.isArray(focusHistory)) {
            return { valid: false, suspicion: 0.8, reason: 'missing_focus_data' };
        }

        const profile = this.studentProfiles.get(studentId);
        const now = Date.now();

        // Check for suspicious focus patterns
        let totalFocusTime = 0;
        let focusLossEvents = 0;
        let suspiciousGaps = 0;

        for (let i = 0; i < focusHistory.length; i++) {
            const event = focusHistory[i];
            
            if (!event.timestamp || !event.type) {
                return { valid: false, suspicion: 0.9, reason: 'invalid_focus_event' };
            }

            // Check if timestamps are reasonable
            if (event.timestamp > now || event.timestamp < profile.sessionStart) {
                return { valid: false, suspicion: 1.0, reason: 'timestamp_manipulation' };
            }

            if (event.type === 'blur') {
                focusLossEvents++;
                
                // Any focus loss is a critical violation
                this.recordViolation(studentId, 'focusLoss', 1.0);
                return { valid: false, suspicion: 1.0, reason: 'focus_loss_detected' };
            }

            if (event.type === 'focus') {
                const prevEvent = focusHistory[i - 1];
                if (prevEvent && prevEvent.type === 'blur') {
                    const gapDuration = event.timestamp - prevEvent.timestamp;
                    
                    // Any gap > 1 second is suspicious
                    if (gapDuration > 1000) {
                        suspiciousGaps++;
                    }
                }
            }
        }

        // Multiple suspicious gaps
        if (suspiciousGaps >= 3) {
            return { valid: false, suspicion: 0.8, reason: 'multiple_focus_gaps' };
        }

        return { valid: true, suspicion: 0 };
    }

    /**
     * Validate keystroke patterns for bot detection
     */
    validateKeystrokePattern(studentId, keystrokeEvents) {
        if (!keystrokeEvents || keystrokeEvents.length === 0) {
            return { valid: true, suspicion: 0 };
        }

        const profile = this.studentProfiles.get(studentId);
        const intervals = [];
        
        // Calculate intervals between keystrokes
        for (let i = 1; i < keystrokeEvents.length; i++) {
            const interval = keystrokeEvents[i].timestamp - keystrokeEvents[i - 1].timestamp;
            if (interval > 0 && interval < 5000) { // Ignore very long pauses
                intervals.push(interval);
            }
        }

        if (intervals.length < 10) {
            return { valid: true, suspicion: 0 }; // Not enough data
        }

        // Calculate statistics
        const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
        const variance = intervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - avgInterval, 2);
        }, 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / avgInterval;

        // Update profile with new data
        if (profile.keystrokePattern.samples < 100) { // Learning phase
            profile.keystrokePattern.intervals.push(...intervals);
            profile.keystrokePattern.samples += intervals.length;
            
            if (profile.keystrokePattern.samples >= 20) {
                profile.keystrokePattern.averageSpeed = 
                    profile.keystrokePattern.intervals.reduce((a, b) => a + b) / 
                    profile.keystrokePattern.intervals.length;
            }
            
            return { valid: true, suspicion: 0 }; // Still learning
        }

        // Detect anomalies
        const expectedSpeed = profile.keystrokePattern.averageSpeed;
        const speedDeviation = Math.abs(avgInterval - expectedSpeed) / expectedSpeed;

        // Bot-like behavior: too consistent (low variation)
        if (coefficientOfVariation < 0.15 && intervals.length > 50) {
            return { 
                valid: false, 
                suspicion: 0.9, 
                reason: 'bot_like_consistency' 
            };
        }

        // Unusual speed change
        if (speedDeviation > 0.5 && intervals.length > 30) {
            return { 
                valid: false, 
                suspicion: 0.7, 
                reason: 'speed_change_anomaly' 
            };
        }

        return { valid: true, suspicion: 0 };
    }

    /**
     * Validate screen properties for VM/multiple monitor detection
     */
    validateScreenProperties(studentId, screenInfo) {
        if (!screenInfo) {
            return { valid: true, suspicion: 0 };
        }

        const profile = this.studentProfiles.get(studentId);
        let suspicion = 0;

        // Check for suspicious screen dimensions
        if (screenInfo.width && screenInfo.height) {
            const aspectRatio = screenInfo.width / screenInfo.height;
            
            // Common VM resolutions
            const vmResolutions = [
                { w: 1024, h: 768 },
                { w: 1280, h: 1024 },
                { w: 1366, h: 768 }
            ];

            for (const vmRes of vmResolutions) {
                if (screenInfo.width === vmRes.w && screenInfo.height === vmRes.h) {
                    suspicion += 0.3;
                    break;
                }
            }

            // Unusual aspect ratios
            if (aspectRatio < 1.2 || aspectRatio > 2.0) {
                suspicion += 0.2;
            }
        }

        // Check for multiple monitors
        if (screenInfo.screenCount && screenInfo.screenCount > 1) {
            suspicion += 0.4;
        }

        // Time zone manipulation
        if (screenInfo.timezone) {
            const expectedTimezone = 'Europe/Sofia'; // Bulgaria
            if (screenInfo.timezone !== expectedTimezone) {
                suspicion += 0.3;
            }
        }

        return { 
            valid: suspicion < 0.7, 
            suspicion: Math.min(suspicion, 1.0) 
        };
    }

    /**
     * Validate code submission for injection patterns
     */
    validateCodeSubmission(studentId, code, metadata = {}) {
        const profile = this.studentProfiles.get(studentId);
        if (!profile) {
            return { valid: false, reason: 'invalid_session' };
        }

        // Check for suspicious code patterns
        const suspiciousPatterns = [
            /window\.ExamApp/gi,
            /socket\.emit/gi,
            /terminateExam/gi,
            /violationCount/gi,
            /antiCheatActive/gi,
            /eval\s*\(/gi,
            /Function\s*\(/gi,
            /new\s+Function/gi,
            /document\./gi,
            /location\./gi,
            /navigator\./gi,
            /debugger/gi,
            /console\.(?!log|error|warn|info)/gi,
            /setInterval\(.*[,\s]*1\d{1,2}[,\s]*\)/gi, // Very fast intervals
            /setTimeout\(.*[,\s]*[0-9]{1,2}[,\s]*\)/gi // Very short timeouts
        ];

        let suspicion = 0;
        const detectedPatterns = [];

        for (const pattern of suspiciousPatterns) {
            const matches = code.match(pattern);
            if (matches) {
                suspicion += 0.3;
                detectedPatterns.push(pattern.source);
            }
        }

        // Check code complexity vs typing speed
        if (profile.keystrokePattern.averageSpeed > 0) {
            const codeComplexity = this.analyzeCodeComplexity(code);
            const expectedTypingTime = code.length * profile.keystrokePattern.averageSpeed;
            const actualTypingTime = metadata.typingDuration || 0;

            if (actualTypingTime > 0 && expectedTypingTime > actualTypingTime * 3) {
                suspicion += 0.5; // Code appeared too fast
                detectedPatterns.push('rapid_code_appearance');
            }
        }

        // Perfect code without errors (suspiciously clean)
        if (this.isPerfectCode(code) && code.length > 100) {
            suspicion += 0.4;
            detectedPatterns.push('suspiciously_perfect_code');
        }

        // Record submission
        profile.codeSubmissions.push({
            timestamp: Date.now(),
            codeLength: code.length,
            suspicion: suspicion,
            patterns: detectedPatterns
        });

        if (suspicion >= 0.7) {
            this.recordViolation(studentId, 'codeInjection', suspicion);
            return { 
                valid: false, 
                reason: 'suspicious_code_patterns',
                patterns: detectedPatterns,
                suspicion: suspicion
            };
        }

        return { valid: true, suspicion: suspicion };
    }

    /**
     * Analyze code complexity
     */
    analyzeCodeComplexity(code) {
        const metrics = {
            lines: code.split('\n').length,
            functions: (code.match(/function\s+\w+/g) || []).length,
            loops: (code.match(/\b(for|while|do)\s*\(/g) || []).length,
            conditionals: (code.match(/\b(if|switch)\s*\(/g) || []).length,
            variables: (code.match(/\b(let|const|var)\s+\w+/g) || []).length
        };

        return metrics.functions + metrics.loops * 2 + metrics.conditionals + metrics.variables * 0.5;
    }

    /**
     * Check if code is suspiciously perfect
     */
    isPerfectCode(code) {
        // No syntax errors (we can't check this easily without parsing)
        // No commented code
        const commentRatio = (code.match(/\/\/|\/\*/g) || []).length / code.length;
        
        // Perfect indentation
        const lines = code.split('\n').filter(line => line.trim());
        const perfectIndentation = lines.every(line => {
            const leadingSpaces = line.match(/^\s*/)[0].length;
            return leadingSpaces % 2 === 0 || leadingSpaces % 4 === 0;
        });

        // Advanced patterns for beginner level
        const advancedPatterns = [
            /\.\s*reduce\s*\(/,
            /\.\s*filter\s*\(/,
            /\.\s*map\s*\(/,
            /async\s+function/,
            /await\s+/,
            /Promise\./,
            /try\s*{[\s\S]*catch/
        ];

        const advancedCount = advancedPatterns.reduce((count, pattern) => {
            return count + (code.match(pattern) || []).length;
        }, 0);

        return commentRatio < 0.01 && perfectIndentation && advancedCount > 3;
    }

    /**
     * Record violation and calculate response
     */
    recordViolation(studentId, violationType, suspicionLevel) {
        const profile = this.studentProfiles.get(studentId);
        if (!profile) return;

        profile.violations[violationType]++;
        profile.violations.totalScore += suspicionLevel;

        const violation = {
            type: violationType,
            timestamp: Date.now(),
            suspicion: suspicionLevel,
            count: profile.violations[violationType]
        };

        // Get or create activity log
        if (!this.suspiciousActivities.has(studentId)) {
            this.suspiciousActivities.set(studentId, []);
        }
        this.suspiciousActivities.get(studentId).push(violation);

        console.log(`ALERT: Violation recorded: ${studentId} - ${violationType} (${suspicionLevel})`);

        // Check for termination conditions
        if (this.shouldTerminateStudent(studentId)) {
            this.terminateStudent(studentId, violationType);
        }

        return violation;
    }

    /**
     * Determine if student should be terminated
     */
    shouldTerminateStudent(studentId) {
        const profile = this.studentProfiles.get(studentId);
        if (!profile || profile.examState !== 'active') return false;

        const violations = profile.violations;

        // Instant termination conditions
        if (violations.focusLoss > 0) return true;
        if (violations.codeInjection >= this.violationThresholds.codeInjection) return true;
        if (violations.timeManipulation >= this.violationThresholds.timeManipulation) return true;

        // Accumulated violations
        if (violations.keystrokeAnomaly >= this.violationThresholds.keystrokeAnomalies) return true;
        // DISABLED: Heartbeat missed should NOT terminate exam (only monitors connection health)
        // if (violations.heartbeatMissed >= this.violationThresholds.heartbeatMissed) return true;

        // Total suspicion score
        if (violations.totalScore >= 3.0) return true;

        return false;
    }

    /**
     * Terminate student exam
     */
    terminateStudent(studentId, reason) {
        const profile = this.studentProfiles.get(studentId);
        if (!profile) return;

        profile.examState = 'terminated';
        profile.terminationReason = reason;
        profile.terminationTime = Date.now();

        console.log(`STOP: Student terminated: ${studentId} - Reason: ${reason}`);

        // Emit termination event
        this.emit('student-terminated', {
            studentId,
            reason,
            violations: profile.violations,
            suspicionScore: this.calculateSuspicionScore(studentId)
        });

        return true;
    }

    /**
     * Calculate overall suspicion score
     */
    calculateSuspicionScore(studentId) {
        const profile = this.studentProfiles.get(studentId);
        if (!profile) return 0;

        const violations = profile.violations;
        let score = 0;

        // Weight different violation types
        score += violations.focusLoss * 100; // Instant high score
        score += violations.codeInjection * 50;
        score += violations.keystrokeAnomaly * 20;
        score += violations.heartbeatMissed * 15;
        score += violations.timeManipulation * 30;

        return Math.min(score, 100);
    }

    /**
     * Get active warnings for student
     */
    getActiveWarnings(studentId) {
        const profile = this.studentProfiles.get(studentId);
        if (!profile) return [];

        const warnings = [];
        const violations = profile.violations;

        if (violations.keystrokeAnomaly > 0) {
            warnings.push({
                type: 'keystroke_anomaly',
                level: violations.keystrokeAnomaly >= 2 ? 'high' : 'medium',
                message: 'Unusual typing patterns detected'
            });
        }

        if (violations.heartbeatMissed > 1) {
            warnings.push({
                type: 'connection_instability',
                level: 'medium',
                message: 'Connection instability detected'
            });
        }

        return warnings;
    }

    /**
     * Start heartbeat monitoring
     */
    startHeartbeatMonitoring() {
        setInterval(() => {
            this.checkMissedHeartbeats();
        }, this.heartbeatInterval / 2);
    }

    /**
     * Check for missed heartbeats
     */
    checkMissedHeartbeats() {
        const now = Date.now();

        for (const [studentId, expectedTime] of this.heartbeatExpected.entries()) {
            if (now > expectedTime + this.heartbeatTolerance) {
                const profile = this.studentProfiles.get(studentId);
                if (profile && profile.examState === 'active') {
                    // DON'T count as violation if student is on warning screen
                    if (!profile.isOnWarningScreen) {
                        console.log(`WARNING: Missed heartbeat: ${studentId}`);
                        this.recordViolation(studentId, 'heartbeatMissed', 0.5);
                    } else {
                        console.log(`INFO: Heartbeat missed but student on warning screen: ${studentId}`);
                    }

                    // Update expected time to prevent spam
                    this.heartbeatExpected.set(studentId, now + this.heartbeatInterval);
                }
            }
        }
    }

    /**
     * Create violation response
     */
    createViolationResponse(reason, suspicion) {
        return {
            valid: false,
            reason: reason,
            suspicion: suspicion,
            action: suspicion >= 1.0 ? 'terminate' : 'warn'
        };
    }

    /**
     * Get student statistics
     */
    getStudentStats(studentId) {
        const profile = this.studentProfiles.get(studentId);
        if (!profile) return null;

        const activities = this.suspiciousActivities.get(studentId) || [];

        return {
            studentId: profile.studentId,
            sessionDuration: Date.now() - profile.sessionStart,
            examState: profile.examState,
            violations: profile.violations,
            suspicionScore: this.calculateSuspicionScore(studentId),
            keystrokeProfile: {
                averageSpeed: profile.keystrokePattern.averageSpeed,
                samples: profile.keystrokePattern.samples
            },
            recentActivities: activities.slice(-10),
            codeSubmissions: profile.codeSubmissions.length,
            lastActivity: profile.lastActivity
        };
    }

    /**
     * Get all active students statistics
     */
    getAllStats() {
        const stats = {
            totalStudents: this.studentProfiles.size,
            activeStudents: 0,
            terminatedStudents: 0,
            totalViolations: 0,
            highRiskStudents: []
        };

        for (const [studentId, profile] of this.studentProfiles.entries()) {
            if (profile.examState === 'active') {
                stats.activeStudents++;
            } else if (profile.examState === 'terminated') {
                stats.terminatedStudents++;
            }

            const suspicionScore = this.calculateSuspicionScore(studentId);
            if (suspicionScore > 50) {
                stats.highRiskStudents.push({
                    studentId,
                    suspicionScore,
                    violations: profile.violations
                });
            }

            stats.totalViolations += Object.values(profile.violations)
                .reduce((sum, count) => sum + count, 0);
        }

        return stats;
    }

    /**
     * Event emitter functionality
     */
    emit(event, data) {
        // This would be connected to the main WebSocket handler
        // For now, just log
        console.log(`Anti-cheat event: ${event}`, data);
    }

    /**
     * Clean up student data on session end
     */
    cleanupStudent(studentId) {
        this.studentProfiles.delete(studentId);
        this.suspiciousActivities.delete(studentId);
        this.heartbeatExpected.delete(studentId);
        this.lastHeartbeat.delete(studentId);
        
        console.log(`Cleaned up student: ${studentId}`);
    }
}

export default ServerSideAntiCheat;