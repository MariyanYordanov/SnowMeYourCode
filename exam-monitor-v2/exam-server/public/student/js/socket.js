import { showViolationExitDialog } from './dialogs.js';

export function setupSocket() {
    try {
        const socket = io('/', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        const examApp = window.ExamApp;
        examApp.socket = socket;

        socket.on('connect', handleSocketConnect);
        socket.on('disconnect', handleSocketDisconnect);
        socket.on('student-id-assigned', handleNewSession);
        socket.on('session-restored', handleSessionRestored);
        socket.on('login-error', handleLoginError);
        socket.on('time-warning', handleTimeWarning);
        socket.on('exam-expired', handleExamExpired);
        socket.on('force-disconnect', handleForceDisconnect);
        socket.on('anti-cheat-warning', handleAntiCheatWarning);
        socket.on('server-message', handleServerMessage);
        socket.on('reconnect', handleReconnect);
        socket.on('reconnect_error', handleReconnectError);

        console.log('Socket setup completed');
        return socket;

    } catch (error) {
        console.error('Failed to setup socket:', error);
        return null;
    }
}

function handleSocketConnect() {
    console.log(`Socket.io connected. isLoggedIn: ${window.ExamApp.isLoggedIn}, sessionId: ${window.ExamApp.sessionId}`);
    const examApp = window.ExamApp;

    if (examApp.isLoggedIn && examApp.sessionId) {
        console.log('Emitting session-restore from handleSocketConnect.');
        examApp.socket.emit('session-restore', {
            sessionId: examApp.sessionId,
            studentName: examApp.studentName,
            studentClass: examApp.studentClass
        });
    }
}

function handleSocketDisconnect(reason) {
    console.log('Disconnected from server:', reason);
}

function handleNewSession(data) {
    console.log('New session created:', data);
    const examApp = window.ExamApp;

    examApp.sessionId = data.sessionId;
    examApp.examStartTime = Date.now();
    examApp.examDuration = data.examDuration || (3 * 60 * 60 * 1000);
    examApp.examEndTime = new Date(examApp.examStartTime + examApp.examDuration);

    if (window.startExam) {
        window.startExam({
            sessionId: data.sessionId,
            examStartTime: examApp.examStartTime,
            examDuration: examApp.examDuration,
            examEndTime: examApp.examEndTime,
            timeLeft: examApp.examDuration,
            isNewSession: true
        });
    }
}

function handleSessionRestored(data) {
    console.log('Session restored:', data);
    const examApp = window.ExamApp;

    examApp.sessionId = data.sessionId;
    examApp.examStartTime = new Date(data.examStartTime).getTime();
    examApp.examDuration = data.examDuration || (3 * 60 * 60 * 1000);
    examApp.examEndTime = new Date(data.examEndTime).getTime();

    const timeLeft = data.timeLeft || (examApp.examEndTime - Date.now());

    if (timeLeft <= 0) {
        handleExamExpired();
        return;
    }

    if (window.startExam) {
        window.startExam({
            sessionId: data.sessionId,
            examStartTime: examApp.examStartTime,
            examDuration: examApp.examDuration,
            examEndTime: examApp.examEndTime,
            timeLeft: timeLeft,
            lastCode: data.lastCode || '',
            isNewSession: false
        });
    }
}

function handleLoginError(error) {
    console.error('Login error from server:', error);

    if (window.handleLoginError) {
        window.handleLoginError(error);
    }
}

function handleTimeWarning(data) {
    console.warn('Time warning:', data);

    if (window.handleTimeWarning) {
        window.handleTimeWarning(data);
    }
}

function handleExamExpired() {
    console.error('Exam time expired!');

    if (window.handleExamExpired) {
        window.handleExamExpired();
    }
}

async function handleForceDisconnect(data) {
    console.error('Force disconnect:', data);

    const message = data.message || 'Изпитът е прекратен поради нарушение на правилата.';
    await showViolationExitDialog(message);

    if (window.exitExam) {
        window.exitExam(data.reason || 'force_disconnect');
    }
}

function handleAntiCheatWarning(data) {
    console.warn('Anti-cheat warning:', data);
    const examApp = window.ExamApp;

    if (examApp?.showNotification) {
        examApp.showNotification(data.message, 'warning');
    }
}

function handleServerMessage(data) {
    console.log('Server message:', data);
    const examApp = window.ExamApp;

    if (examApp?.showNotification) {
        examApp.showNotification(data.message, data.type || 'info');
    }
}

function handleReconnect(attemptNumber) {
    console.log('Reconnected after', attemptNumber, 'attempts');
    const examApp = window.ExamApp;

    if (examApp?.showNotification) {
        examApp.showNotification('Връзката е възстановена', 'success');
    }
}

function handleReconnectError(error) {
    console.error('Reconnection failed:', error);
}

export function sendCodeUpdate(code, filename = 'main.js') {
    try {
        const examApp = window.ExamApp;
        if (!examApp.socket?.connected) {
            console.warn('Socket not connected');
            return false;
        }

        examApp.socket.emit('code-update', {
            sessionId: examApp.sessionId,
            code: code,
            filename: filename,
            timestamp: Date.now()
        });

        return true;

    } catch (error) {
        console.error('Failed to send code update:', error);
        return false;
    }
}

export function reportSuspiciousActivity(activity, details = {}) {
    try {
        const examApp = window.ExamApp;
        if (examApp.socket?.connected) {
            examApp.socket.emit('suspicious-activity', {
                sessionId: examApp.sessionId,
                activity: activity,
                details: details,
                timestamp: Date.now()
            });
        }
    } catch (error) {
        console.error('Failed to report activity:', error);
    }
}