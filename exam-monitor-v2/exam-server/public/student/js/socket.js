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

    // CRITICAL SECURITY: Session restore is DISABLED for kiosk mode security
    // Students MUST login again after any disconnection
    // This prevents bypassing kiosk isolation

    // Clear any stored session data
    localStorage.removeItem('examSession');

    console.log('WARNING: Session restore disabled - student must login again');
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
    console.log('WARNING: Session restore attempt blocked for security');

    // CRITICAL SECURITY: Disable session restore in kiosk mode
    // Student MUST login again to open new kiosk window
    // This prevents bypassing kiosk isolation via refresh

    // Clear localStorage to force new login
    localStorage.removeItem('examSession');

    // Show warning message
    showSessionRestoreBlocked();
}

function showSessionRestoreBlocked() {
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
            color: #212529;
            text-align: center;
            padding: 20px;
            font-family: Arial, sans-serif;
        ">
            <div style="
                background: rgba(255,255,255,0.95);
                padding: 40px;
                border-radius: 10px;
                max-width: 600px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            ">
                <h1 style="font-size: 64px; margin-bottom: 20px;">⚠</h1>
                <h2 style="margin-bottom: 20px; font-size: 28px; color: #dc3545;">
                    Сесията е прекъсната
                </h2>
                <p style="font-size: 18px; line-height: 1.6; margin-bottom: 30px; color: #495057;">
                    От съображения за сигурност, <strong>не можете да възстановите сесия</strong> след refresh на прозореца.
                </p>

                <div style="
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 20px;
                    margin-bottom: 30px;
                    text-align: left;
                ">
                    <p style="margin: 0; font-size: 16px; color: #856404;">
                        <strong>Причина:</strong> Изпитът се провежда в защитен kiosk режим.
                        При опит за излизане или refresh, изпитът автоматично се прекратява.
                    </p>
                </div>

                <p style="font-size: 16px; color: #6c757d; margin-bottom: 30px;">
                    Моля, <strong>влезте наново</strong> за да започнете изпита отначало.
                </p>

                <button
                    onclick="window.location.reload()"
                    style="
                        padding: 15px 40px;
                        font-size: 18px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        transition: all 0.3s;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    "
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.6)'"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.4)'"
                >
                    Презареди и влез отново
                </button>

                <p style="margin-top: 30px; opacity: 0.7; font-size: 14px; color: #6c757d;">
                    При влизане ще се отвори нов защитен прозорец
                </p>
            </div>
        </div>
    `;
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
    const userConfirmed = await showViolationExitDialog(message);

    if (userConfirmed && window.exitExam) {
        window.exitExam(data.reason || 'force_disconnect');
    } else {
        console.log('User chose to continue despite violation warning');
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