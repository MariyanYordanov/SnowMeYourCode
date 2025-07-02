export function setupSocket() {
    try {
        const socket = io('/', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        window.ExamApp.socket = socket;

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
    console.log('Socket.io connected');

    if (window.ExamApp.isLoggedIn && window.ExamApp.sessionId) {
        window.ExamApp.socket.emit('session-restore', {
            sessionId: window.ExamApp.sessionId,
            studentName: window.ExamApp.studentName,
            studentClass: window.ExamApp.studentClass
        });
    }
}

function handleSocketDisconnect(reason) {
    console.log('Disconnected from server:', reason);
}

function handleNewSession(data) {
    console.log('New session created:', data);

    window.ExamApp.sessionId = data.sessionId;
    window.ExamApp.examStartTime = Date.now();
    window.ExamApp.examDuration = data.examDuration || (3 * 60 * 60 * 1000);
    window.ExamApp.examEndTime = new Date(window.ExamApp.examStartTime + window.ExamApp.examDuration);

    if (window.startExam) {
        window.startExam({
            sessionId: data.sessionId,
            examStartTime: window.ExamApp.examStartTime,
            examDuration: window.ExamApp.examDuration,
            examEndTime: window.ExamApp.examEndTime,
            timeLeft: window.ExamApp.examDuration,
            isNewSession: true
        });
    }
}

function handleSessionRestored(data) {
    console.log('Session restored:', data);

    window.ExamApp.sessionId = data.sessionId;
    window.ExamApp.examStartTime = new Date(data.examStartTime).getTime();
    window.ExamApp.examDuration = data.examDuration || (3 * 60 * 60 * 1000);
    window.ExamApp.examEndTime = new Date(data.examEndTime).getTime();

    const timeLeft = data.timeLeft || (window.ExamApp.examEndTime - Date.now());

    if (timeLeft <= 0) {
        handleExamExpired();
        return;
    }

    if (window.startExam) {
        window.startExam({
            sessionId: data.sessionId,
            examStartTime: window.ExamApp.examStartTime,
            examDuration: window.ExamApp.examDuration,
            examEndTime: window.ExamApp.examEndTime,
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

function handleForceDisconnect(data) {
    console.error('Force disconnect:', data);

    if (window.ExamApp?.showViolationScreen) {
        window.ExamApp.showViolationScreen(data.message || 'Изпитът е прекратен');
    }

    setTimeout(() => {
        if (window.exitExam) {
            window.exitExam(data.reason || 'force_disconnect');
        }
    }, 5000);
}

function handleAntiCheatWarning(data) {
    console.warn('Anti-cheat warning:', data);

    if (window.ExamApp?.showNotification) {
        window.ExamApp.showNotification(data.message, 'warning');
    }
}

function handleServerMessage(data) {
    console.log('Server message:', data);

    if (window.ExamApp?.showNotification) {
        window.ExamApp.showNotification(data.message, data.type || 'info');
    }
}

function handleReconnect(attemptNumber) {
    console.log('Reconnected after', attemptNumber, 'attempts');

    if (window.ExamApp?.showNotification) {
        window.ExamApp.showNotification('Връзката е възстановена', 'success');
    }
}

function handleReconnectError(error) {
    console.error('Reconnection failed:', error);
}

export function sendCodeUpdate(code, filename = 'main.js') {
    try {
        if (!window.ExamApp.socket?.connected) {
            console.warn('Socket not connected');
            return false;
        }

        window.ExamApp.socket.emit('code-update', {
            sessionId: window.ExamApp.sessionId,
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
        if (window.ExamApp.socket?.connected) {
            window.ExamApp.socket.emit('suspicious-activity', {
                sessionId: window.ExamApp.sessionId,
                activity: activity,
                details: details,
                timestamp: Date.now()
            });
        }
    } catch (error) {
        console.error('Failed to report activity:', error);
    }
}