/**
 * WebSocket Communication Module
 * Handles Socket.io connection, events, and reconnection logic
 */

// Import login handlers
import {
    handleLoginSuccess,
    handleSessionRestore,
    handleLoginError
} from './login.js';

// Socket connection state
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 1000;

/**
 * Setup Socket.io connection
 */
export function setupSocket() {
    try {
        // Simple wait for Socket.io to be available
        let socketIO = null;

        // Check for io in different contexts
        if (typeof io !== 'undefined') {
            socketIO = io;
        } else if (typeof window.io !== 'undefined') {
            socketIO = window.io;
        } else if (typeof globalThis.io !== 'undefined') {
            socketIO = globalThis.io;
        }

        if (!socketIO || typeof socketIO !== 'function') {
            setTimeout(setupSocket, 300);
            return;
        }

        // Initialize socket
        const socket = socketIO({
            transports: ['websocket', 'polling'],
            timeout: 10000,
            forceNew: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        // Store socket in global state
        window.ExamApp.socket = socket;

        // Setup event handlers
        setupSocketEventHandlers(socket);

        console.log('✅ Socket.io connected');
        return true;
    } catch (error) {
        console.error('❌ Socket setup failed:', error);
        setTimeout(setupSocket, 1000);
        return false;
    }
}

/**
 * Setup all socket event handlers
 */
function setupSocketEventHandlers(socket) {
    try {
        // Connection events
        socket.on('connect', () => handleSocketConnect(socket));
        socket.on('disconnect', (reason) => handleSocketDisconnect(socket, reason));
        socket.on('connect_error', (error) => handleSocketError(socket, error));

        // Login responses  
        socket.on('student-id-assigned', handleLoginSuccess);
        socket.on('session-restored', handleSessionRestore);
        socket.on('login-error', handleLoginError);

        // Exam events
        socket.on('time-warning', handleTimeWarning);
        socket.on('exam-expired', handleExamExpired);
        socket.on('force-disconnect', handleForceDisconnect);

        // Anti-cheat events
        socket.on('anti-cheat-warning', handleAntiCheatWarning);

    } catch (error) {
        console.error('❌ Failed to setup socket handlers:', error);
    }
}

/**
 * Handle successful socket connection
 */
export function handleSocketConnect(socket) {
    try {
        // Update global state
        window.ExamApp.isConnected = true;
        reconnectAttempts = 0;

        // Update UI
        updateConnectionStatus(true);

        // Show success notification if reconnected
        if (reconnectAttempts > 0) {
            if (window.ExamApp.showNotification) {
                window.ExamApp.showNotification('Връзката е възстановена', 'success');
            }
        }
    } catch (error) {
        console.error('❌ Error handling socket connect:', error);
    }
}

/**
 * Handle socket disconnection
 */
export function handleSocketDisconnect(socket, reason) {
    try {
        console.warn('❌ Disconnected from server:', reason);

        // Update global state
        window.ExamApp.isConnected = false;

        // Update UI
        updateConnectionStatus(false);

        // Show reconnection message if in exam
        if (window.ExamApp.isLoggedIn) {
            if (window.ExamApp.showError) {
                window.ExamApp.showError('Връзката със сървъра е прекъсната. Опитваме да се свържем отново...');
            }
        }

        // Don't auto-reconnect for intentional disconnects
        if (reason === 'io server disconnect' || reason === 'client namespace disconnect') {
            return;
        }

        // Auto-reconnect for network issues
        attemptReconnection();
    } catch (error) {
        console.error('❌ Error handling socket disconnect:', error);
    }
}

/**
 * Handle socket connection error
 */
export function handleSocketError(socket, error) {
    try {
        console.error('❌ Socket connection error:', error);

        // Update UI
        updateConnectionStatus(false);

        // Attempt reconnection
        attemptReconnection();
    } catch (err) {
        console.error('❌ Error handling socket error:', err);
    }
}

/**
 * Attempt smart reconnection with exponential backoff
 */
function attemptReconnection() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        if (window.ExamApp.showNotification) {
            window.ExamApp.showNotification('Неуспешно свързване. Моля рефрешнете страницата.', 'error');
        }
        return;
    }

    reconnectAttempts++;
    const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1); // Exponential backoff

    setTimeout(() => {
        if (window.ExamApp.socket) {
            window.ExamApp.socket.connect();
        } else {
            setupSocket();
        }
    }, delay);
}

/**
 * Update connection status UI
 */
export function updateConnectionStatus(connected) {
    try {
        const statusEl = document.getElementById('connection-status');

        if (!statusEl) {
            return; // Element might not exist yet
        }

        if (connected) {
            statusEl.className = 'status-connected';
            statusEl.textContent = '● Свързан';
        } else {
            statusEl.className = 'status-disconnected';
            statusEl.textContent = '● Изключен';
        }
    } catch (error) {
        console.error('❌ Failed to update connection status:', error);
    }
}

/**
 * Handle time warning from server
 */
function handleTimeWarning(data) {
    try {
        // Show time warning notification
        if (window.ExamApp.showNotification) {
            const message = `⚠️ Внимание! Остават ${data.minutesLeft} минути до края на изпита!`;
            window.ExamApp.showNotification(message, 'warning');
        }
    } catch (error) {
        console.error('❌ Error handling time warning:', error);
    }
}

/**
 * Handle exam expiration
 */
function handleExamExpired(data) {
    try {
        // Show expiration message
        if (window.ExamApp.showViolationScreen) {
            window.ExamApp.showViolationScreen('Времето за изпита изтече!');
        }

        // Auto-close after 10 seconds
        setTimeout(() => {
            window.close();
        }, 10000);
    } catch (error) {
        console.error('❌ Error handling exam expiration:', error);
    }
}

/**
 * Handle force disconnect from server
 */
function handleForceDisconnect(data) {
    try {
        // Show termination message
        if (window.ExamApp.showViolationScreen) {
            window.ExamApp.showViolationScreen(`Изпитът е прекратен: ${data.message}`);
        }

        // Auto-close after 5 seconds
        setTimeout(() => {
            window.close();
        }, 5000);
    } catch (error) {
        console.error('❌ Error handling force disconnect:', error);
    }
}

/**
 * Handle anti-cheat warning
 */
function handleAntiCheatWarning(data) {
    try {
        // Show warning notification
        if (window.ExamApp.showNotification) {
            window.ExamApp.showNotification(data.message, 'warning');
        }
    } catch (error) {
        console.error('❌ Error handling anti-cheat warning:', error);
    }
}

/**
 * Send code update to server
 */
export function sendCodeUpdate(code, filename = 'main.js') {
    try {
        if (!window.ExamApp.socket || !window.ExamApp.socket.connected) {
            return false;
        }

        window.ExamApp.socket.emit('code-update', {
            code: code,
            filename: filename,
            timestamp: Date.now()
        });

        return true;
    } catch (error) {
        console.error('❌ Error sending code update:', error);
        return false;
    }
}

/**
 * Report suspicious activity to server
 */
export function reportSuspiciousActivity(activity, data = {}) {
    try {
        if (!window.ExamApp.socket || !window.ExamApp.socket.connected) {
            return false;
        }

        window.ExamApp.socket.emit('suspicious-activity', {
            activity: activity,
            data: data,
            sessionId: window.ExamApp.sessionId,
            timestamp: Date.now()
        });

        console.log(`📤 Reported suspicious activity: ${activity}`);
        return true;
    } catch (error) {
        console.error('❌ Error reporting suspicious activity:', error);
        return false;
    }
}

/**
 * Send exam completion to server
 */
export function sendExamCompletion(reason = 'completed') {
    try {
        if (!window.ExamApp.socket || !window.ExamApp.socket.connected) {
            return false;
        }

        window.ExamApp.socket.emit('exam-complete', {
            sessionId: window.ExamApp.sessionId,
            reason: reason,
            completed: reason === 'completed',
            timestamp: Date.now()
        });

        return true;
    } catch (error) {
        console.error('❌ Error sending exam completion:', error);
        return false;
    }
}

/**
 * Send heartbeat to server
 */
export function sendHeartbeat() {
    try {
        if (window.ExamApp.socket && window.ExamApp.socket.connected) {
            window.ExamApp.socket.emit('heartbeat', {
                sessionId: window.ExamApp.sessionId,
                timestamp: Date.now()
            });
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error sending heartbeat:', error);
        return false;
    }
}

/**
 * Check if socket is connected
 */
export function isSocketConnected() {
    return window.ExamApp.socket && window.ExamApp.socket.connected;
}

/**
 * Get socket connection info
 */
export function getSocketInfo() {
    if (!window.ExamApp.socket) {
        return { connected: false, id: null };
    }

    return {
        connected: window.ExamApp.socket.connected,
        id: window.ExamApp.socket.id,
        reconnectAttempts: reconnectAttempts,
        maxReconnectAttempts: maxReconnectAttempts
    };
}

/**
 * Manually reconnect socket
 */
export function manualReconnect() {
    try {
        if (window.ExamApp.socket) {
            window.ExamApp.socket.disconnect();
            setTimeout(() => {
                window.ExamApp.socket.connect();
            }, 1000);
        } else {
            setupSocket();
        }
    } catch (error) {
        console.error('❌ Error during manual reconnect:', error);
    }
}

/**
 * Disconnect socket gracefully
 */
export function disconnectSocket() {
    try {
        if (window.ExamApp.socket) {
            window.ExamApp.socket.disconnect();
            window.ExamApp.socket = null;
        }

        window.ExamApp.isConnected = false;
        updateConnectionStatus(false);

    } catch (error) {
        console.error('❌ Error disconnecting socket:', error);
    }
}

/**
 * Setup periodic heartbeat
 */
export function setupHeartbeat(interval = 30000) {
    try {
        // Clear existing heartbeat
        if (window.ExamApp.heartbeatInterval) {
            clearInterval(window.ExamApp.heartbeatInterval);
        }

        // Setup new heartbeat
        window.ExamApp.heartbeatInterval = setInterval(() => {
            sendHeartbeat();
        }, interval);

    } catch (error) {
        console.error('❌ Error setting up heartbeat:', error);
    }
}

/**
 * Clear heartbeat interval
 */
export function clearHeartbeat() {
    try {
        if (window.ExamApp.heartbeatInterval) {
            clearInterval(window.ExamApp.heartbeatInterval);
            window.ExamApp.heartbeatInterval = null;
        }
    } catch (error) {
        console.error('❌ Error clearing heartbeat:', error);
    }
}