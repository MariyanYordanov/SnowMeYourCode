/**
 * Application Constants
 * Centralized constants for the exam system
 */

// Exam configuration
export const EXAM_CONFIG = {
    DEFAULT_DURATION: 3 * 60 * 60 * 1000, // 3 hours
    AUTO_SAVE_INTERVAL: 10000, // 10 seconds
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    MAX_CODE_LENGTH: 50000,
    GRACE_PERIOD: 3 * 60 * 1000 // 3 minutes
};

// UI constants
export const UI_CONFIG = {
    NOTIFICATION_DURATION: 3000,
    WARNING_DURATION: 8000,
    LOADING_DELAY: 1000,
    ANIMATION_DURATION: 300
};

// WebSocket events
export const SOCKET_EVENTS = {
    // Student events
    STUDENT_JOIN: 'student-join',
    CODE_UPDATE: 'code-update',
    SUSPICIOUS_ACTIVITY: 'suspicious-activity',
    EXAM_COMPLETE: 'exam-complete',
    HEARTBEAT: 'heartbeat',

    // Teacher events  
    TEACHER_JOIN: 'teacher-join',

    // Server responses
    STUDENT_ID_ASSIGNED: 'student-id-assigned',
    SESSION_RESTORED: 'session-restored',
    LOGIN_ERROR: 'login-error',
    EXAM_EXPIRED: 'exam-expired',
    TIME_WARNING: 'time-warning'
};

// Exit reasons
export const EXIT_REASONS = {
    STUDENT_FINISH: 'student_finish',
    TIME_EXPIRED: 'time_expired',
    INSTRUCTOR_TERMINATED: 'instructor_terminated',
    ANTI_CHEAT_VIOLATION: 'anti_cheat_violation',
    FULLSCREEN_VIOLATION: 'fullscreen_violation',
    NETWORK_ERROR: 'network_error',
    BROWSER_CLOSE: 'browser_close'
};

// Anti-cheat constants
export const VIOLATION_TYPES = {
    WINDOWS_KEY: 'windowsKey',
    FOCUS_LOSS: 'focusLoss',
    FULLSCREEN_EXIT: 'fullscreenExit',
    CLIPBOARD_ATTEMPT: 'clipboardAttempt',
    RIGHT_CLICK: 'rightClick',
    DEV_TOOLS: 'devTools'
};

// Session states
export const SESSION_STATES = {
    ACTIVE: 'active',
    DISCONNECTED: 'disconnected',
    COMPLETED: 'completed',
    EXPIRED: 'expired'
};

// File paths
export const PATHS = {
    TEMPLATES: '/student/templates/',
    SHARED_CSS: '../shared/css/',
    ANTICHEAT_CSS: 'css/anticheat/'
};

console.log('📋 Constants loaded');