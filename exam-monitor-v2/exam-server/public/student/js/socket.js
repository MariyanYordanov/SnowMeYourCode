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
        socket.on('teacher-warning', handleTeacherWarning);
        socket.on('exam-terminated', handleExamTerminated);

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
                <h1 style="font-size: 64px; margin-bottom: 20px;">!</h1>
                <h2 style="margin-bottom: 20px; font-size: 28px; color: #dc3545;">
                    Session Interrupted
                </h2>
                <p style="font-size: 18px; line-height: 1.6; margin-bottom: 30px; color: #495057;">
                    For security reasons, <strong>you cannot restore a session</strong> after refreshing the window.
                </p>

                <div style="
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 20px;
                    margin-bottom: 30px;
                    text-align: left;
                ">
                    <p style="margin: 0; font-size: 16px; color: #856404;">
                        <strong>Reason:</strong> The exam is conducted in secure kiosk mode.
                        Any attempt to exit or refresh will automatically terminate the exam.
                    </p>
                </div>

                <p style="font-size: 16px; color: #6c757d; margin-bottom: 30px;">
                    Please <strong>log in again</strong> to start the exam from the beginning.
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
                    Reload and Login Again
                </button>

                <p style="margin-top: 30px; opacity: 0.7; font-size: 14px; color: #6c757d;">
                    A new secure window will open when you login
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

    // CRITICAL: Hide red screen IMMEDIATELY (before anything else)
    const warningOverlay = document.querySelector('.fullscreen-warning-overlay');
    if (warningOverlay) {
        warningOverlay.style.display = 'none';
        warningOverlay.remove();
        console.log('Red screen hidden immediately on force disconnect');
    }

    // Remove fullscreen-exited class from body
    document.body.classList.remove('fullscreen-exited');

    // Exit fullscreen immediately
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }

    // NO DIALOG - Just exit immediately
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
        examApp.showNotification('Connection restored', 'success');
    }
}

function handleReconnectError(error) {
    console.error('Reconnection failed:', error);
}

function handleTeacherWarning(data) {
    console.warn('Teacher warning received:', data);

    // Show warning modal to student
    showTeacherWarningModal(data.message || 'Please follow exam rules');
}

function showTeacherWarningModal(message) {
    // Remove any existing warning modal
    const existingModal = document.getElementById('teacher-warning-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create warning modal
    const modal = document.createElement('div');
    modal.id = 'teacher-warning-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        ">
            <div style="
                width: 80px;
                height: 80px;
                background: #fef3c7;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
            ">
                <span style="font-size: 40px; color: #f59e0b;">!</span>
            </div>

            <h2 style="
                color: #dc2626;
                font-size: 24px;
                margin-bottom: 16px;
                font-weight: 700;
            ">WARNING FROM TEACHER</h2>

            <p style="
                color: #4b5563;
                font-size: 18px;
                line-height: 1.6;
                margin-bottom: 30px;
            ">${message}</p>

            <button id="warning-acknowledge-btn" style="
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                border: none;
                padding: 14px 40px;
                font-size: 16px;
                font-weight: 600;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            ">I Understand</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Add click handler to close
    document.getElementById('warning-acknowledge-btn').addEventListener('click', () => {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    });

    // Also close on clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => modal.remove(), 300);
        }
    });
}

function handleExamTerminated(data) {
    console.error('Exam terminated by teacher:', data);

    // Show termination screen
    showTerminationScreen(data.message || 'Your exam has been terminated by the instructor');
}

function showTerminationScreen(message) {
    // FIRST: Exit fullscreen immediately
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }

    // Hide any warning overlays
    const warningOverlay = document.querySelector('.fullscreen-warning-overlay');
    if (warningOverlay) {
        warningOverlay.style.display = 'none';
        warningOverlay.remove();
    }

    // Remove fullscreen-exited class
    document.body.classList.remove('fullscreen-exited');

    // Replace entire body with termination message
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            text-align: center;
            padding: 20px;
            font-family: Arial, sans-serif;
        ">
            <div style="
                background: rgba(255,255,255,0.1);
                padding: 60px;
                border-radius: 20px;
                max-width: 600px;
                backdrop-filter: blur(10px);
            ">
                <div style="
                    width: 100px;
                    height: 100px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 30px;
                ">
                    <span style="font-size: 50px;">X</span>
                </div>

                <h1 style="
                    font-size: 36px;
                    margin-bottom: 20px;
                    font-weight: 700;
                ">EXAM TERMINATED</h1>

                <p style="
                    font-size: 20px;
                    line-height: 1.6;
                    margin-bottom: 30px;
                    opacity: 0.9;
                ">${message}</p>

                <p style="font-size: 16px; opacity: 0.7; margin: 0;">
                    The exam has ended.
                </p>
            </div>
        </div>
    `;

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