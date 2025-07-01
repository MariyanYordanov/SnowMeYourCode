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
        socket.on('session-created', handleSessionCreated);
        socket.on('login-success', handleLoginSuccess);
        socket.on('login-error', handleLoginError);
        socket.on('time-warning', handleTimeWarning);
        socket.on('exam-expired', handleExamExpired);
        socket.on('violation-recorded', handleViolationRecorded);
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

async function handleSessionCreated(data) {
    console.log('Session created:', data);

    window.ExamApp.sessionId = data.sessionId;

    // ВАЖНО: Задаваме сесията в cookie чрез API call
    try {
        const response = await fetch('/api/student-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                studentName: window.ExamApp.studentName,
                studentClass: window.ExamApp.studentClass
            })
        });

        if (response.ok) {
            console.log('Session cookie set successfully');
        }
    } catch (error) {
        console.error('Failed to set session cookie:', error);
    }

    if (window.handleLoginSuccess) {
        window.handleLoginSuccess(data);
    }
}

function handleLoginSuccess(data) {
    console.log('Login success from server:', data);

    if (window.handleLoginSuccess) {
        window.handleLoginSuccess(data);
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
        window.handleTimeWarning(data.timeLeft);
    }
}

function handleExamExpired() {
    console.error('Exam time expired!');

    if (window.handleExamExpired) {
        window.handleExamExpired();
    }
}

function handleViolationRecorded(data) {
    console.error('Violation recorded:', data);

    const violationEl = document.getElementById('violation-overlay');
    const messageEl = violationEl?.querySelector('.violation-message');

    if (violationEl && messageEl) {
        messageEl.textContent = data.message || 'Установено е нарушение!';
        violationEl.classList.remove('d-none');
        violationEl.style.display = 'flex';
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
            filename: filename,
            code: code,
            timestamp: Date.now()
        });

        return true;

    } catch (error) {
        console.error('Failed to send code update:', error);
        return false;
    }
}

export function reportActivity(activity) {
    try {
        if (window.ExamApp.socket?.connected) {
            window.ExamApp.socket.emit('activity-report', {
                sessionId: window.ExamApp.sessionId,
                activity: activity,
                timestamp: Date.now()
            });
        }
    } catch (error) {
        console.error('Failed to report activity:', error);
    }
}