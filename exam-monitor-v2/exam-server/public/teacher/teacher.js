class SmartTeacherDashboard {
    constructor() {
        this.socket = null;
        this.students = new Map();
        this.connectionState = 'disconnected';
        this.lastDataUpdate = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.dataRefreshInterval = null;
        this.heartbeatInterval = null;
        this.isInitialized = false;
        this.teacherInfo = null;

        this.stats = {
            active: 0,
            disconnected: 0,
            violations: 0,
            completed: 0
        };

        // Check if already authenticated
        this.checkAuthentication();
    }

    /**
     * Check if teacher is authenticated, show login form if not
     */
    async checkAuthentication() {
        try {
            const response = await fetch('/api/teacher/verify-session', {
                credentials: 'include'
            });

            const data = await response.json();

            if (data.authenticated) {
                // Already logged in, show dashboard
                this.teacherInfo = data.teacher;
                this.showDashboard();
            } else {
                // Not logged in, show login form
                this.showLoginForm();
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.showLoginForm();
        }
    }

    /**
     * Show login form
     */
    showLoginForm() {
        const loginOverlay = document.getElementById('login-overlay');
        const dashboardContent = document.getElementById('dashboard-content');

        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (dashboardContent) dashboardContent.style.display = 'none';

        // Setup login form handler
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    /**
     * Handle login form submission
     */
    async handleLogin(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('login-btn');
        const loginError = document.getElementById('login-error');

        // Disable button during login
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        loginError.style.display = 'none';

        try {
            const response = await fetch('/api/teacher/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                this.teacherInfo = data.teacher;
                this.showDashboard();
            } else {
                loginError.textContent = data.message || 'Invalid credentials';
                loginError.style.display = 'block';
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'Login failed. Please try again.';
            loginError.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }

    /**
     * Show dashboard after successful login
     */
    showDashboard() {
        const loginOverlay = document.getElementById('login-overlay');
        const dashboardContent = document.getElementById('dashboard-content');

        if (loginOverlay) loginOverlay.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';

        // Update teacher info in header
        this.updateTeacherInfo();

        // Initialize dashboard
        this.initializeUI();
        this.connectToServer();
    }

    /**
     * Update teacher info in header
     */
    updateTeacherInfo() {
        if (!this.teacherInfo) return;

        const teacherNameEl = document.getElementById('teacher-name');
        const sessionInfoEl = document.getElementById('session-info');

        if (teacherNameEl) {
            teacherNameEl.textContent = this.teacherInfo.displayName || this.teacherInfo.username;
        }

        if (sessionInfoEl) {
            const loginTime = new Date(this.teacherInfo.loginTime);
            const duration = Math.floor((Date.now() - this.teacherInfo.loginTime) / 1000 / 60);
            sessionInfoEl.textContent = `Logged in ${duration} min ago`;
        }
    }

    /**
     * Handle teacher logout
     */
    async handleLogout() {
        try {
            const response = await fetch('/api/teacher/logout', {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                // Disconnect socket
                if (this.socket) {
                    this.socket.disconnect();
                }

                // Clear any intervals
                if (this.dataRefreshInterval) {
                    clearInterval(this.dataRefreshInterval);
                }
                if (this.heartbeatInterval) {
                    clearInterval(this.heartbeatInterval);
                }

                // Clear teacher info
                this.teacherInfo = null;

                // Show login form again
                this.showLoginForm();

                // Clear form fields
                const usernameField = document.getElementById('username');
                const passwordField = document.getElementById('password');
                if (usernameField) usernameField.value = '';
                if (passwordField) passwordField.value = '';
            } else {
                this.showNotification('Logout failed', 'error');
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Logout error', 'error');
        }
    }

    /**
     * Initialize UI event handlers
     */
    initializeUI() {
        // Control buttons
        document.getElementById('new-session-btn').addEventListener('click', () => {
            this.startNewSession();
        });

        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.manualRefresh();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('emergency-stop-btn').addEventListener('click', () => {
            this.emergencyStop();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                this.handleLogout();
            }
        });

        // Update teacher info every minute
        setInterval(() => {
            this.updateTeacherInfo();
        }, 60000);

        // Initialize chat UI
        this.initializeChatUI();

        // Initialize exam settings
        this.initializeExamSettings();

        console.log('OK: Smart Teacher Dashboard UI initialized');
    }

    /**
     * Initialize chat UI handlers
     */
    initializeChatUI() {
        const input = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-response-btn');
        const minimizeButton = document.getElementById('minimize-chat-btn');
        const closeButton = document.getElementById('close-chat-btn');

        if (input) {
            input.addEventListener('input', () => {
                this.updateCharCounter();
                this.updateSendButton();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendHelpResponse();
                }
            });
        }

        if (sendButton) {
            sendButton.addEventListener('click', () => {
                this.sendHelpResponse();
            });
        }

        if (minimizeButton) {
            minimizeButton.addEventListener('click', () => {
                document.getElementById('help-chat-section').style.display = 'none';
            });
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                document.getElementById('help-chat-section').style.display = 'none';
                this.currentChatStudentId = null;
                this.currentChatStudent = null;
            });
        }
    }

    /**
     * Initialize exam settings display (read-only)
     */
    initializeExamSettings() {
        console.log('Exam settings are read-only - edit config/exam-config.json to change');
    }

    // Exam settings loading removed - now static display

    // Exam duration, development mode, and start exam methods removed
    // Settings are now configured via config/exam-config.json

    /**
     * Connect to server with smart reconnection
     */
    connectToServer() {
        this.updateConnectionStatus('connecting');

        // Disconnect existing socket if any
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
        }

        this.socket = io({
            transports: ['websocket', 'polling'],
            timeout: 10000,
            forceNew: true
        });

        this.setupSocketHandlers();
    }

    /**
     * Setup socket event handlers
     */
    setupSocketHandlers() {
        // Connection events
        this.socket.on('connect', () => {
            this.handleConnection();
        });

        this.socket.on('disconnect', (reason) => {
            this.handleDisconnection(reason);
        });

        this.socket.on('connect_error', (error) => {
            this.handleConnectionError(error);
        });

        // Teacher-specific events
        this.socket.on('all-students', (students) => {
            this.updateAllStudents(students);
        });

        this.socket.on('student-connected', (data) => {
            this.addStudent(data);
        });

        this.socket.on('student-disconnected', (data) => {
            // Determine status based on reason
            let status = 'disconnected';
            if (data.reason === 'completed') {
                status = 'completed';
            } else if (data.reason === 'forced_violations' || data.reason === 'terminated') {
                status = 'terminated';
            }
            this.updateStudentStatus(data.sessionId, status, data);
        });

        this.socket.on('student-code-update', (data) => {
            this.updateStudentCode(data);
        });

        this.socket.on('student-suspicious', (data) => {
            this.addSuspiciousActivity(data);
        });

        this.socket.on('student-fullscreen-status', (data) => {
            this.updateFullscreenStatus(data);
        });

        this.socket.on('student-terminated', (data) => {
            this.handleStudentTermination(data);
        });

        // Help chat events - WITH DEBUG LOGGING
        this.socket.on('student-help-request', (data) => {
            console.log('[CHAT] Received help request:', data);
            this.handleHelpRequest(data);
        });

        this.socket.on('student-message', (data) => {
            console.log('[CHAT] Received student message:', data);
            this.handleStudentMessage(data);
        });

        this.socket.on('student-typing', (data) => {
            console.log('[CHAT] Student typing:', data);
            this.handleStudentTyping(data);
        });

        this.socket.on('help-response-sent', (data) => {
            console.log('[CHAT] Help response sent confirmation:', data);
            this.handleResponseSent(data);
        });

        this.socket.on('help-response-error', (data) => {
            console.log('[CHAT ERROR] Help response failed:', data);
            this.handleResponseError(data);
        });

        // Session restart events
        this.socket.on('session-restart-success', (data) => {
            this.handleSessionRestartSuccess(data);
        });

        this.socket.on('session-restart-error', (data) => {
            this.handleSessionRestartError(data);
        });

        this.socket.on('session-restarted', (data) => {
            // Another teacher restarted a session - refresh display
            this.showNotification(`Session restarted: ${data.sessionId}`, 'info');
            this.manualRefresh();
        });

        console.log('OK: Socket handlers configured (including chat with debug logging)');
    }

    /**
     * Handle successful connection
     */
    handleConnection() {
        console.log('OK: Connected to server');
        this.updateConnectionStatus('connected');
        this.reconnectAttempts = 0;

        // Send teacher join only once on connect
        if (!this.isInitialized) {
            this.socket.emit('teacher-join');
            this.isInitialized = true;
            this.showNotification('Connected to exam server', 'success');
        }

        // Setup smart data refresh (only when needed)
        this.setupSmartRefresh();
        this.setupHeartbeat();
    }

    /**
     * Handle disconnection
     */
    handleDisconnection(reason) {
        console.warn('Disconnected:', reason);
        this.updateConnectionStatus('disconnected');
        this.clearIntervals();

        // Don't auto-reconnect for intentional disconnects
        if (reason === 'io server disconnect' || reason === 'client namespace disconnect') {
            this.showNotification('Disconnected from server', 'warning');
            return;
        }

        // Auto-reconnect for network issues
        this.attemptReconnection();
    }

    /**
     * Handle connection errors
     */
    handleConnectionError(error) {
        console.error('ERROR: Connection error:', error);
        this.updateConnectionStatus('error');
        this.attemptReconnection();
    }

    /**
     * Attempt smart reconnection
     */
    attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.showNotification('Failed to reconnect. Please refresh the page.', 'error');
            return;
        }

        this.reconnectAttempts++;
        this.updateConnectionStatus('reconnecting');

        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connectToServer();
        }, delay);
    }

    /**
     * Setup smart data refresh (only when tab is visible and data is stale)
     */
    setupSmartRefresh() {
        // Clear existing interval
        if (this.dataRefreshInterval) {
            clearInterval(this.dataRefreshInterval);
        }

        // Only refresh when page is visible and data is older than 10 seconds
        this.dataRefreshInterval = setInterval(() => {
            if (document.hidden) return; // Don't refresh when tab is not visible

            const now = Date.now();
            if (!this.lastDataUpdate || (now - this.lastDataUpdate) > 10000) {
                this.requestDataUpdate();
            }
        }, 15000); // Check every 15 seconds
    }

    /**
     * Setup heartbeat to detect connection issues
     */
    setupHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            if (this.socket?.connected) {
                this.socket.emit('heartbeat');
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Request data update (smart refresh)
     */
    requestDataUpdate() {
        if (this.socket?.connected) {
            console.log('Requesting data update');
            this.socket.emit('teacher-join'); // This will trigger 'all-students' response
        }
    }

    /**
     * Manual refresh triggered by user
     */
    manualRefresh() {
        if (!this.socket?.connected) {
            this.showNotification('Not connected to server', 'warning');
            return;
        }

        this.showNotification('Refreshing data...', 'info');
        this.socket.emit('teacher-join');

        // Add loading state
        document.body.classList.add('loading');
        setTimeout(() => {
            document.body.classList.remove('loading');
        }, 1000);
    }

    /**
     * Start new exam session
     */
    startNewSession() {
        if (confirm('Start a new exam session? This will clear current session data.')) {
            // Implementation for starting new session
            this.showNotification('New session started', 'success');
            this.socket.emit('new-exam-session');
        }
    }

    /**
     * Export exam data
     */
    exportData() {
        // Implementation for exporting data
        this.showNotification('Exporting data...', 'info');
        // Create and download export file
        const data = {
            timestamp: new Date().toISOString(),
            students: Array.from(this.students.values()),
            stats: this.stats
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exam-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Emergency stop all exams
     */
    emergencyStop() {
        if (confirm('EMERGENCY STOP: This will terminate all active exams. Are you sure?')) {
            this.socket.emit('emergency-stop-all');
            this.showNotification('Emergency stop initiated', 'warning');
        }
    }

    /**
     * Update connection status UI
     */
    updateConnectionStatus(status) {
        this.connectionState = status;
        const indicator = document.getElementById('connection-indicator');
        const text = document.getElementById('connection-text');

        // Check if elements exist (may be null if DOM was replaced due to auth failure)
        if (!indicator || !text) {
            console.warn('Connection status elements not found - likely unauthenticated');
            return;
        }

        indicator.className = 'connection-indicator';

        switch (status) {
            case 'connected':
                indicator.classList.add('connected');
                text.textContent = 'Connected';
                break;
            case 'connecting':
                text.textContent = 'Connecting...';
                break;
            case 'reconnecting':
                indicator.classList.add('reconnecting');
                text.textContent = `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`;
                break;
            case 'disconnected':
                text.textContent = 'Disconnected';
                break;
            case 'error':
                text.textContent = 'Connection Error';
                break;
        }

        // Update control buttons state
        const buttons = document.querySelectorAll('.control-btn');
        buttons.forEach(btn => {
            btn.disabled = status !== 'connected';
        });
    }

    /**
     * Update all students data
     */
    updateAllStudents(students) {
        students.forEach(student => {
            const existingStudent = this.students.get(student.sessionId);

            // Preserve chat-related and violation fields if they exist
            const preservedFields = existingStudent ? {
                chatMessages: existingStudent.chatMessages || [],
                chatOpen: existingStudent.chatOpen || false,
                hasHelpRequest: existingStudent.hasHelpRequest || false,
                violationCount: existingStudent.violationCount || 0,
                fullscreenExitAttempts: existingStudent.fullscreenExitAttempts,
                heartbeatMissed: existingStudent.heartbeatMissed,
                activities: existingStudent.activities || []
            } : {
                chatMessages: [],
                chatOpen: false,
                hasHelpRequest: false,
                violationCount: 0,
                activities: []
            };

            this.students.set(student.sessionId, {
                ...student,
                fullscreenStatus: existingStudent ? existingStudent.fullscreenStatus : 'unknown',
                ...preservedFields  // Keep chat state and violation data
            });
        });
        this.renderStudents();
        this.updateStats();
        this.lastDataUpdate = Date.now();
        this.updateLastUpdateTime();
    }

    /**
     * Add new student
     */
    addStudent(data) {
        this.students.set(data.sessionId, {
            ...data,
            status: 'active',
            fullscreenStatus: 'entering',
            violationCount: 0,
            activities: [],
            code: '',
            lastActivity: Date.now(),
            chatMessages: [],
            chatOpen: false,
            hasHelpRequest: false
        });
        this.renderStudents();
        this.updateStats();
        this.showNotification(`Student joined: ${data.studentName}`, 'info');
    }

    /**
     * Update student status
     */
    updateStudentStatus(sessionId, status, data = {}) {
        const student = this.students.get(sessionId);
        if (student) {
            student.status = status;
            student.lastActivity = Date.now();
            if (data.reason) {
                student.disconnectReason = data.reason;
            }
            this.renderStudents();
            this.updateStats();
        }
    }

    /**
     * Update student code
     */
    updateStudentCode(data) {
        const student = this.students.get(data.sessionId);
        if (student) {
            student.code = data.code;
            student.lastActivity = Date.now();
            this.renderStudent(student);
        }
    }

    /**
     * Add suspicious activity
     */
    addSuspiciousActivity(data) {
        const student = this.students.get(data.sessionId);
        if (student) {
            if (!student.activities) student.activities = [];
            student.activities.unshift({
                type: 'suspicious',
                activity: data.activity,
                severity: data.severity,
                timestamp: Date.now()
            });

            // Increment violation count
            student.violationCount = (student.violationCount || 0) + 1;

            // Update specific counters if provided
            if (data.fullscreenExitAttempts) {
                student.fullscreenExitAttempts = data.fullscreenExitAttempts;
            }
            if (data.heartbeatMissed) {
                student.heartbeatMissed = data.heartbeatMissed;
            }

            // Keep only last 10 activities
            if (student.activities.length > 10) {
                student.activities = student.activities.slice(0, 10);
            }

            this.renderStudent(student);
            this.updateStats();

            if (data.severity === 'high' || data.severity === 'critical') {
                this.showNotification(`WARNING: ${data.activity}: ${student.studentName}`, 'warning');
            }
        }
    }

    /**
     * Update fullscreen status
     */
    updateFullscreenStatus(data) {
        const student = this.students.get(data.sessionId);
        if (student) {
            student.fullscreenStatus = data.status;
            student.lastActivity = Date.now();

            if (!student.activities) student.activities = [];
            student.activities.unshift({
                type: 'fullscreen',
                activity: data.status === 'entered' ? 'Entered fullscreen' : 'Exited fullscreen',
                timestamp: data.timestamp
            });

            this.renderStudent(student);
        }
    }

    /**
     * Handle student termination
     */
    handleStudentTermination(data) {
        const student = this.students.get(data.sessionId);
        if (student) {
            student.status = 'terminated';
            student.terminationReason = data.reason;

            this.renderStudent(student);
            this.updateStats();
            this.showNotification(`Exam terminated: ${student.studentName}`, 'error');
        }
    }

    /**
     * Render all students
     */
    renderStudents() {
        const container = document.getElementById('students-container');

        // Check if container exists (may be null if DOM was replaced due to auth failure)
        if (!container) {
            console.warn('Students container not found - likely unauthenticated');
            return;
        }

        if (this.students.size === 0) {
            container.innerHTML = `
                <div class="no-students">
                    <h3>No Active Students</h3>
                    <p>Students will appear here when they join the exam</p>
                </div>
            `;
            return;
        }

        // Show all students (no filtering)
        const studentsArray = Array.from(this.students.values());
        studentsArray.sort((a, b) => b.lastActivity - a.lastActivity);

        container.innerHTML = `
            <div class="students-grid">
                ${studentsArray.map(student => this.renderStudentCard(student)).join('')}
            </div>
        `;
    }

    /**
     * Render individual student
     */
    renderStudent(student) {
        const studentCard = document.querySelector(`[data-session-id="${student.sessionId}"]`);
        if (studentCard) {
            studentCard.outerHTML = this.renderStudentCard(student);
        }
    }

    /**
     * Render student card HTML
     */
    renderStudentCard(student) {
        const timeAgo = this.formatTimeAgo(student.lastActivity);
        const codePreview = student.code ? student.code.substring(0, 200) + (student.code.length > 200 ? '...' : '') : 'No code yet';
        const chatOpen = student.chatOpen || false;

        return `
            <div class="student-card" data-session-id="${student.sessionId}">
                <div class="student-header">
                    <div>
                        <div class="student-name">${student.studentName}</div>
                        <div class="student-class">${student.studentClass} • ${student.sessionId}</div>
                    </div>
                    <div class="student-status">
                        <div class="status-indicator ${student.status}"></div>
                        <span>${this.getStatusText(student.status)}</span>
                    </div>
                </div>

                ${this.renderViolationAlert(student)}
                ${this.renderFullscreenStatus(student)}

                <div class="student-info">
                    <div class="info-row">
                        <span class="info-label">Time Left:</span>
                        <span class="info-value">${student.formattedTimeLeft || 'Unknown'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Last Activity:</span>
                        <span class="info-value">${timeAgo}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Violations:</span>
                        <span class="info-value ${student.violationCount > 0 ? 'warning' : ''}">${student.violationCount || 0}</span>
                    </div>
                    ${student.fullscreenExitAttempts ? `
                    <div class="info-row">
                        <span class="info-label">Fullscreen Exits:</span>
                        <span class="info-value warning">${student.fullscreenExitAttempts}/3</span>
                    </div>
                    ` : ''}
                    ${student.heartbeatMissed ? `
                    <div class="info-row">
                        <span class="info-label">Heartbeat Missed:</span>
                        <span class="info-value warning">${student.heartbeatMissed}/2</span>
                    </div>
                    ` : ''}
                </div>

                <div class="code-preview">${codePreview}</div>

                ${this.renderActivityLog(student)}
                ${this.renderInlineChat(student, chatOpen)}
                ${this.renderControls(student)}
            </div>
        `;
    }

    /**
     * Render violation alert
     */
    renderViolationAlert(student) {
        if (student.violationCount > 0 && student.status !== 'terminated') {
            return `
                <div class="violation-alert">
                    [!] ${student.violationCount} security violation${student.violationCount > 1 ? 's' : ''} detected
                    ${student.lastViolation ? `• ${student.lastViolation}` : ''}
                </div>
            `;
        }
        return '';
    }

    /**
     * Render fullscreen status
     */
    renderFullscreenStatus(student) {
        const statusConfig = {
            'entered': { class: 'active', icon: '[OK]', text: 'Fullscreen Active' },
            'entering': { class: 'inactive', icon: '[...]', text: 'Entering Fullscreen' },
            'unknown': { class: 'inactive', icon: '[?]', text: 'Fullscreen Unknown' }
        };

        const config = statusConfig[student.fullscreenStatus] || statusConfig.unknown;

        return `
            <div class="info-row">
                <span class="info-label">Fullscreen:</span>
                <span class="fullscreen-status ${config.class}">
                    ${config.icon} ${config.text}
                </span>
            </div>
        `;
    }

    /**
     * Render activity log
     */
    renderActivityLog(student) {
        if (!student.activities || student.activities.length === 0) {
            return '<div class="activity-log">No recent activity</div>';
        }

        const activities = student.activities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="${activity.type === 'violation' || activity.type === 'termination' ? 'warning' : ''}">
                    ${activity.activity}
                </div>
                <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
            </div>
        `).join('');

        return `
            <div class="activity-log">
                <strong>Recent Activity:</strong>
                ${activities}
            </div>
        `;
    }

    /**
     * Render inline chat section within student card
     */
    renderInlineChat(student, chatOpen) {
        if (!chatOpen) {
            return '';
        }

        const messages = student.chatMessages || [];
        const messagesHTML = messages.length > 0
            ? messages.map(msg => `
                <div class="inline-chat-message ${msg.sender}">
                    <div class="inline-msg-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
                    <div class="inline-msg-text">${this.escapeHtml(msg.message)}</div>
                </div>
            `).join('')
            : '<div class="inline-chat-empty">No messages yet</div>';

        return `
            <div class="inline-chat-section">
                <div class="inline-chat-header">
                    <span>Chat</span>
                    <button class="inline-chat-close" onclick="teacherDashboard.toggleStudentChat('${student.sessionId}')">X</button>
                </div>
                <div class="inline-chat-messages" id="inline-chat-${student.sessionId}">
                    ${messagesHTML}
                </div>
                <div class="inline-chat-input">
                    <input type="text"
                        placeholder="Type message..."
                        id="inline-input-${student.sessionId}"
                        onkeypress="if(event.key==='Enter') teacherDashboard.sendInlineMessage('${student.sessionId}')"
                    />
                    <button onclick="teacherDashboard.sendInlineMessage('${student.sessionId}')">Send</button>
                </div>
            </div>
        `;
    }

    /**
     * Render student controls
     */
    renderControls(student) {
        // Terminated/completed students can only be restarted
        if (student.status === 'terminated' || student.status === 'completed') {
            return `
                <div class="controls">
                    <button class="btn btn-success" onclick="teacherDashboard.restartStudentSession('${student.sessionId}', '${student.studentName}')">
                        [R] Restart Session
                    </button>
                </div>
            `;
        }

        const hasHelpRequest = student.hasHelpRequest || false;
        const chatButtonClass = hasHelpRequest ? 'btn-primary pulse' : 'btn-secondary';
        const chatButtonText = student.chatOpen ? '[CHAT] Close' : (hasHelpRequest ? '[CHAT] Reply' : '[CHAT] Open');

        return `
            <div class="controls">
                <button class="btn ${chatButtonClass}" onclick="teacherDashboard.toggleStudentChat('${student.sessionId}')">
                    ${chatButtonText}
                </button>
                <button class="btn btn-warning" onclick="teacherDashboard.warnStudent('${student.sessionId}')">
                    [!] Send Warning
                </button>
                <button class="btn btn-success" onclick="teacherDashboard.restartStudentSession('${student.sessionId}', '${student.studentName}')">
                    [R] Restart Session
                </button>
                <button class="btn btn-danger" onclick="teacherDashboard.terminateStudent('${student.sessionId}')">
                    [X] Terminate Exam
                </button>
            </div>
        `;
    }

    /**
     * Update statistics
     */
    updateStats() {
        const stats = { active: 0, disconnected: 0, violations: 0, completed: 0 };

        for (const student of this.students.values()) {
            switch (student.status) {
                case 'active':
                    stats.active++;
                    break;
                case 'disconnected':
                    stats.disconnected++;
                    break;
                case 'completed':
                case 'terminated':
                    stats.completed++;
                    break;
            }

            if (student.violationCount > 0) {
                stats.violations += student.violationCount;
            }
        }

        this.stats = stats;

        document.getElementById('active-count').textContent = stats.active;
        document.getElementById('disconnected-count').textContent = stats.disconnected;
        document.getElementById('violations-count').textContent = stats.violations;
        document.getElementById('completed-count').textContent = stats.completed;
    }

    /**
     * Update last update time display
     */
    updateLastUpdateTime() {
        const lastUpdateEl = document.getElementById('last-update');
        if (this.lastDataUpdate) {
            lastUpdateEl.textContent = `• Updated ${this.formatTimeAgo(this.lastDataUpdate)}`;
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Hide notification after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    /**
     * Clear all intervals
     */
    clearIntervals() {
        if (this.dataRefreshInterval) {
            clearInterval(this.dataRefreshInterval);
            this.dataRefreshInterval = null;
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Utility methods
     */
    getStatusText(status) {
        const statusMap = {
            'active': 'Active',
            'disconnected': 'Disconnected',
            'completed': 'Completed',
            'terminated': 'Terminated',
            'suspicious': 'Suspicious'
        };
        return statusMap[status] || status;
    }

    formatTimeAgo(timestamp) {
        // Handle invalid/missing timestamps
        if (!timestamp || isNaN(timestamp)) {
            return 'Unknown';
        }

        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return `${seconds}s ago`;
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    }

    /**
     * Student action methods
     */
    warnStudent(sessionId) {
        const student = this.students.get(sessionId);
        if (student && confirm(`Send warning to ${student.studentName}?`)) {
            this.socket.emit('send-warning', { sessionId, message: 'Please follow exam rules' });
            this.showNotification(`Warning sent to ${student.studentName}`, 'warning');
        }
    }

    terminateStudent(sessionId) {
        const student = this.students.get(sessionId);
        if (student && confirm(`Terminate exam for ${student.studentName}?`)) {
            this.socket.emit('terminate-student', { sessionId, reason: 'instructor_action' });
            this.showNotification(`Terminating exam for ${student.studentName}`, 'error');
        }
    }

    restartStudentSession(sessionId, studentName) {
        if (confirm(`Restart session for ${studentName}?\n\nThis will allow the student to log in again with the same credentials.\nTheir previous session data will be cleared.`)) {
            this.socket.emit('teacher-restart-session', { sessionId });
            this.showNotification(`Restarting session for ${studentName}...`, 'info');
        }
    }

    handleSessionRestartSuccess(data) {
        this.showNotification(data.message || 'Session restarted successfully', 'success');
        // Refresh student list to remove the restarted student
        this.manualRefresh();
    }

    handleSessionRestartError(data) {
        this.showNotification(data.message || 'Failed to restart session', 'error');
    }

    /**
     * Toggle inline chat for student
     */
    toggleStudentChat(sessionId) {
        const student = this.students.get(sessionId);
        if (!student) return;

        student.chatOpen = !student.chatOpen;

        // Mark help request as addressed when opening chat
        if (student.chatOpen && student.hasHelpRequest) {
            student.hasHelpRequest = false;
        }

        // Initialize chat messages array if needed
        if (!student.chatMessages) {
            student.chatMessages = [];
        }

        this.renderStudent(student);

        // Auto-scroll to chat messages if opened
        if (student.chatOpen) {
            setTimeout(() => {
                const chatMessages = document.getElementById(`inline-chat-${sessionId}`);
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }, 100);
        }
    }

    /**
     * Send inline message to student
     */
    sendInlineMessage(sessionId) {
        const input = document.getElementById(`inline-input-${sessionId}`);
        if (!input || !input.value.trim()) return;

        const message = input.value.trim();
        const student = this.students.get(sessionId);
        if (!student) return;

        // Add message to local array
        if (!student.chatMessages) {
            student.chatMessages = [];
        }

        student.chatMessages.push({
            sender: 'teacher',
            message: message,
            timestamp: Date.now()
        });

        // Send via socket
        this.socket.emit('teacher-message', {
            sessionId: sessionId,
            message: message,
            timestamp: Date.now()
        });

        // Clear input and re-render
        input.value = '';
        this.renderStudent(student);

        // Auto-scroll
        setTimeout(() => {
            const chatMessages = document.getElementById(`inline-chat-${sessionId}`);
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }, 100);
    }

    /**
     * Open chat with specific student (legacy - redirects to toggle)
     */
    openStudentChat(sessionId, studentName, studentClass) {
        // Just toggle the inline chat instead
        this.toggleStudentChat(sessionId);
    }

    /**
     * Handle help request from student
     */
    handleHelpRequest(data) {
        console.log('[CHAT] Processing help request from student:', data);

        // Mark student as having help request
        const student = this.students.get(data.sessionId);
        if (student) {
            student.hasHelpRequest = true;
            student.chatOpen = true;  // Auto-open chat for help requests

            console.log('[CHAT] Student marked with help request:', data.studentName);

            // Note: Message will be added by handleStudentMessage which is also triggered
            // No need to add it here to avoid duplicates
        } else {
            console.log('[CHAT WARNING] Student not found in students map:', data.sessionId);
        }

        this.showHelpNotification(data);
    }

    /**
     * Handle incoming student message for inline chat
     */
    handleStudentMessage(data) {
        console.log('[CHAT] Processing student message:', data);

        const student = this.students.get(data.sessionId);
        if (!student) {
            console.log('[CHAT WARNING] Student not found:', data.sessionId);
            return;
        }

        // Initialize chat messages array if needed
        if (!student.chatMessages) {
            student.chatMessages = [];
        }

        // Add message to student's chat history
        student.chatMessages.push({
            sender: 'student',
            message: data.message,
            timestamp: data.timestamp || Date.now()
        });

        // Auto-open chat if it's not open yet (first message from student)
        if (!student.chatOpen) {
            student.chatOpen = true;
            console.log('[CHAT] Auto-opening chat for first student message');
        }

        // Re-render student card to show new message
        this.renderStudent(student);

        // Auto-scroll to latest message
        setTimeout(() => {
            const chatMessages = document.getElementById(`inline-chat-${data.sessionId}`);
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }, 100);
    }

    /**
     * Handle student typing indicator
     */
    handleStudentTyping(data) {
        if (data.isTyping) {
            this.showTypingIndicator();
        } else {
            this.hideTypingIndicator();
        }
    }

    /**
     * Handle response sent confirmation
     */
    handleResponseSent(data) {
        this.showNotification('Response sent successfully', 'success');
        this.addChatMessage({
            message: this.lastSentMessage,
            timestamp: data.timestamp,
            teacherName: this.teacherInfo?.name || 'Teacher'
        }, 'teacher');
    }

    /**
     * Handle response error
     */
    handleResponseError(data) {
        this.showNotification('Failed to send response: ' + data.error, 'error');
    }

    /**
     * Show help notification
     */
    showHelpNotification(data) {
        const notification = document.createElement('div');
        notification.className = 'help-notification';
        notification.innerHTML = `
            <strong>Help Request from ${data.studentName}</strong><br>
            <small>${data.studentClass}</small><br>
            ${data.message.length > 100 ? data.message.substring(0, 100) + '...' : data.message}
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);

        this.playNotificationSound();
    }

    /**
     * Open help chat window
     */
    openHelpChat(data) {
        const chatSection = document.getElementById('help-chat-section');
        const studentName = document.getElementById('chat-student-name');
        const studentClass = document.getElementById('chat-student-class');

        if (chatSection && studentName && studentClass) {
            chatSection.style.display = 'block';
            studentName.textContent = data.studentName;
            studentClass.textContent = data.studentClass;

            this.currentChatStudentId = data.sessionId;
            this.currentChatStudent = {
                name: data.studentName,
                class: data.studentClass,
                sessionId: data.sessionId
            };

            this.scrollChatToBottom();
        }
    }

    /**
     * Add message to chat
     */
    addChatMessage(data, sender) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;

        const timestamp = new Date(data.timestamp).toLocaleTimeString('bg-BG', {
            hour: '2-digit',
            minute: '2-digit'
        });

        if (sender === 'student') {
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">${data.studentName}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-content">${this.escapeHtml(data.message)}</div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">${data.teacherName || 'Teacher'}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-content">${this.escapeHtml(data.message)}</div>
            `;
        }

        chatMessages.appendChild(messageElement);
        this.scrollChatToBottom();
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) {
            indicator.style.display = 'flex';
            this.scrollChatToBottom();
        }
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    /**
     * Scroll chat to bottom
     */
    scrollChatToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 50);
        }
    }

    /**
     * Send help response
     */
    sendHelpResponse() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message || !this.currentChatStudentId) {
            console.log('[CHAT ERROR] Cannot send - missing message or studentId:', {
                hasMessage: !!message,
                studentId: this.currentChatStudentId
            });
            return;
        }

        this.lastSentMessage = message;

        const responseData = {
            studentId: this.currentChatStudentId,
            message: message,
            messageId: Date.now(),
            teacherName: this.teacherInfo?.displayName || this.teacherInfo?.username || 'Teacher'
        };

        console.log('[CHAT] Sending help response:', responseData);

        this.socket.emit('help-response', responseData);

        input.value = '';
        this.updateCharCounter();
        this.updateSendButton();
    }

    /**
     * Update character counter
     */
    updateCharCounter() {
        const input = document.getElementById('chat-input');
        const counter = document.getElementById('chat-char-counter');

        if (input && counter) {
            const length = input.value.length;
            counter.textContent = `${length}/1000`;
            counter.className = length > 900 ? 'char-counter warning' : 'char-counter';
        }
    }

    /**
     * Update send button state
     */
    updateSendButton() {
        const input = document.getElementById('chat-input');
        const button = document.getElementById('send-response-btn');

        if (input && button) {
            button.disabled = input.value.trim().length === 0;
        }
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(900, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(700, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(900, audioContext.currentTime + 0.2);

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // Fallback - no sound
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize smart dashboard
const teacherDashboard = new SmartTeacherDashboard();

// Update last update time every minute
setInterval(() => {
    teacherDashboard.updateLastUpdateTime();
}, 60000);

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

console.log('Smart Teacher Dashboard loaded and ready');
