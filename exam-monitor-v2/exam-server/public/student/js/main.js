/**
 * Main Student Workspace Controller - Modal Exam System
 */
class ExamSystem {
    constructor() {
        this.socket = null;
        this.examModal = null;
        this.sessionId = null;
        this.studentInfo = null;
        this.isExamActive = false;

        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize the exam system
     */
    initialize() {
        console.log('🚀 Initializing Modal Exam System...');

        // Initialize Socket.IO connection
        this.initializeSocket();

        // Initialize Modal Exam System
        this.initializeModalExam();

        // Setup UI event listeners
        this.setupUIListeners();

        console.log('✅ Modal Exam System initialized');
    }

    /**
     * Initialize Socket.IO connection
     */
    initializeSocket() {
        this.socket = io();

        // Connection events
        this.socket.on('connect', () => {
            console.log('🔗 Connected to server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from server');
            this.updateConnectionStatus(false);
        });

        // Login response events
        this.socket.on('student-id-assigned', (data) => {
            this.handleLoginSuccess(data, 'new');
        });

        this.socket.on('session-restored', (data) => {
            this.handleLoginSuccess(data, 'restored');
        });

        this.socket.on('login-error', (data) => {
            this.handleLoginError(data);
        });

        // Exam events
        this.socket.on('exam-expired', (data) => {
            this.handleExamExpired(data);
        });

        this.socket.on('force-disconnect', (data) => {
            this.handleForceDisconnect(data);
        });
    }

    /**
     * Initialize Modal Exam System
     */
    initializeModalExam() {
        if (window.ExamModalSystem) {
            this.examModal = new window.ExamModalSystem(this.socket);
            window.examModal = this.examModal; // Global access
            console.log('🏢 Modal Exam System ready');
        } else {
            console.error('❌ ExamModalSystem class not found');
        }
    }

    /**
     * Setup UI event listeners for login form
     */
    setupUIListeners() {
        // Login form
        const loginBtn = document.getElementById('login-btn');
        const nameInput = document.getElementById('student-name');
        const classInput = document.getElementById('student-class');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }

        // Enter key in login form
        [nameInput, classInput].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleLogin();
                    }
                });
            }
        });
    }

    /**
     * Handle login attempt
     */
    handleLogin() {
        const nameInput = document.getElementById('student-name');
        const classInput = document.getElementById('student-class');
        const loginBtn = document.getElementById('login-btn');

        if (!nameInput || !classInput) return;

        const studentName = nameInput.value.trim();
        const studentClass = classInput.value.trim();

        if (!studentName || !studentClass) {
            this.showLoginStatus('Моля въведете име и клас!', 'error');
            return;
        }

        // Disable login button and show loading
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Влизане...';
        }

        this.showLoginStatus('Влизане в изпита...', 'loading');

        // Send login request
        this.socket.emit('student-join', {
            studentName: studentName,
            studentClass: studentClass
        });

        console.log(`🎓 Login attempt: "${studentName}" from "${studentClass}"`);
    }

    /**
     * Handle successful login
     */
    handleLoginSuccess(data, type) {
        console.log(`✅ Login successful (${type}):`, data);

        this.sessionId = data.sessionId;
        this.studentInfo = {
            name: document.getElementById('student-name').value.trim(),
            class: document.getElementById('student-class').value.trim()
        };

        // Show success message
        const message = type === 'restored' ?
            `${data.message}` :
            `Изпитът започва! Session ID: ${data.sessionId}`;
        this.showLoginStatus(message, 'success');

        // Start exam in modal after short delay
        setTimeout(() => {
            this.startExamInModal(data);
        }, 2000);
    }

    /**
     * Handle login error
     */
    handleLoginError(data) {
        console.error('❌ Login error:', data);

        this.showLoginStatus(data.message, 'error');

        // Re-enable login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Влез в изпита';
        }
    }

    /**
     * Start the exam in modal window
     */
    startExamInModal(data) {
        console.log('🏢 Starting exam in modal window...');

        // Prepare exam data for modal
        const examData = {
            sessionId: data.sessionId,
            studentName: this.studentInfo.name,
            studentClass: this.studentInfo.class,
            timeLeft: data.timeLeft,
            lastCode: data.lastCode || ''
        };

        // Start exam in modal
        if (this.examModal) {
            this.examModal.startExamInModal(examData);

            // Start timer
            this.examModal.startTimer(data.timeLeft);

            // Mark exam as active
            this.isExamActive = true;

            console.log('🎯 Exam started in modal with COMPLETE protection');
        } else {
            console.error('❌ Modal exam system not available');
            this.showLoginStatus('Грешка при стартиране на изпита', 'error');
        }
    }

    /**
     * Handle exam expiration
     */
    handleExamExpired(data) {
        console.log('⏰ Exam time expired:', data);

        if (this.examModal) {
            this.examModal.handleTimeExpired();
        }

        this.isExamActive = false;
    }

    /**
     * Handle force disconnect
     */
    handleForceDisconnect(data) {
        console.log('🚫 Force disconnect:', data);

        if (this.examModal) {
            this.examModal.endExam();
        }

        this.isExamActive = false;

        // Show error message
        alert(data.message || 'Изпитът беше прекратен от преподавателя');
    }

    /**
     * Show login status message
     */
    showLoginStatus(message, type) {
        const statusEl = document.getElementById('login-status');
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.className = `login-status ${type}`;
        statusEl.style.display = 'block';

        // Apply styles based on type
        switch (type) {
            case 'success':
                statusEl.style.background = '#d4edda';
                statusEl.style.color = '#155724';
                statusEl.style.border = '1px solid #c3e6cb';
                break;
            case 'error':
                statusEl.style.background = '#f8d7da';
                statusEl.style.color = '#721c24';
                statusEl.style.border = '1px solid #f5c6cb';
                break;
            case 'loading':
                statusEl.style.background = '#d1ecf1';
                statusEl.style.color = '#0c5460';
                statusEl.style.border = '1px solid #bee5eb';
                break;
        }

        // Hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(connected) {
        const status = connected ? '🟢 Online' : '🔴 Offline';
        console.log(status);

        // Could add visual indicator to login form
        const loginForm = document.getElementById('login-form');
        if (loginForm && !this.isExamActive) {
            let statusIndicator = document.getElementById('connection-status');
            if (!statusIndicator) {
                statusIndicator = document.createElement('div');
                statusIndicator.id = 'connection-status';
                statusIndicator.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    padding: 5px 10px;
                    border-radius: 5px;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 1000;
                `;
                document.body.appendChild(statusIndicator);
            }

            statusIndicator.textContent = status;
            statusIndicator.style.background = connected ? '#28a745' : '#dc3545';
            statusIndicator.style.color = 'white';
        }
    }

    /**
     * Get system stats
     */
    getStats() {
        return {
            isExamActive: this.isExamActive,
            sessionId: this.sessionId,
            studentInfo: this.studentInfo,
            modalStats: this.examModal ? this.examModal.getStats() : null
        };
    }
}

// Initialize exam system when page loads
const examSystem = new ExamSystem();

// Make it globally available
window.examSystem = examSystem;

// Global function for HTML onclick handlers
function joinExam() {
    if (window.examSystem) {
        window.examSystem.handleLogin();
    }
}