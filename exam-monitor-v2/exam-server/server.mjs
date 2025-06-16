import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import session from 'express-session';

// Import our modules
import { SessionManager } from './modules/SessionManager.mjs';
import { WebSocketHandler } from './modules/WebSocketHandler.mjs';
import { ProxyHandler } from './modules/ProxyHandler.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

const io = new Server(server, {
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

const PORT = 8080;
const PRACTICE_SERVER_PORT = 3030;

// Initialize modules
const sessionManager = new SessionManager(__dirname);
await sessionManager.loadExistingSessions(); // Ensure sessions are loaded
const webSocketHandler = new WebSocketHandler(io, sessionManager);
const proxyHandler = new ProxyHandler(PRACTICE_SERVER_PORT, sessionManager);

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: 'exam-monitor-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 4 // 4 hours
    }
}));

// CORS headers for cross-window communication
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    next();
});

// Routes
app.get('/', (req, res) => {
    res.send(`
        <h1>Exam Monitor System v2 - Popup Mode</h1>
        <p><a href="/teacher">Teacher Dashboard</a></p>
        <p><a href="/student">Student Login & Launcher</a></p>
        <p><a href="/test-popup">Test Popup (Debug)</a></p>
        <hr>
        <h3>🚀 New Popup Architecture:</h3>
        <ul>
            <li><strong>/student</strong> - Login form + popup launcher</li>
            <li><strong>/student-exam-window</strong> - Isolated exam environment</li>
            <li><strong>Cross-window communication</strong> - Enhanced security</li>
            <li><strong>Anti-cheat isolation</strong> - Maximum protection</li>
        </ul>
    `);
});

app.get('/teacher', (req, res) => {
    res.sendFile(join(__dirname, 'public/teacher/index.html'));
});

// Main student page - login and popup launcher
app.get('/student', (req, res) => {
    res.sendFile(join(__dirname, 'public/student/index.html'));
});

// NEW: Student exam window - popup mode
app.get('/student-exam-window', (req, res) => {
    // Validate required URL parameters for security
    const { sessionId, studentName, studentClass } = req.query;

    if (!sessionId || !studentName || !studentClass) {
        return res.status(400).send(`
            <html>
                <head><title>Exam Error</title></head>
                <body style="font-family: Arial; padding: 40px; text-align: center;">
                    <h2>❌ Invalid Exam Parameters</h2>
                    <p>Missing required session information.</p>
                    <p><strong>Required:</strong> sessionId, studentName, studentClass</p>
                    <button onclick="window.close()">Close Window</button>
                </body>
            </html>
        `);
    }

    // Optional: Validate session exists in SessionManager
    const session = sessionManager.sessions.get(sessionId);
    if (!session) {
        console.warn(`⚠️ Exam window opened with invalid sessionId: ${sessionId}`);
        return res.status(404).send(`
            <html>
                <head><title>Session Not Found</title></head>
                <body style="font-family: Arial; padding: 40px; text-align: center;">
                    <h2>❌ Session Not Found</h2>
                    <p>The exam session <code>${sessionId}</code> could not be found.</p>
                    <p>The session may have expired or been terminated.</p>
                    <button onclick="window.close()">Close Window</button>
                </body>
            </html>
        `);
    }

    // Validate session belongs to the student
    if (session.studentName !== studentName || session.studentClass !== studentClass) {
        console.warn(`⚠️ Session mismatch: ${sessionId} - Expected: ${session.studentName} (${session.studentClass}), Got: ${studentName} (${studentClass})`);
        return res.status(403).send(`
            <html>
                <head><title>Access Denied</title></head>
                <body style="font-family: Arial; padding: 40px; text-align: center;">
                    <h2>❌ Access Denied</h2>
                    <p>This exam session does not belong to the specified student.</p>
                    <button onclick="window.close()">Close Window</button>
                </body>
            </html>
        `);
    }

    // Check if session is still active
    const timeLeft = sessionManager.calculateRemainingTime(session);
    if (timeLeft <= 0) {
        console.warn(`⏰ Expired session accessed: ${sessionId}`);
        return res.status(410).send(`
            <html>
                <head><title>Exam Expired</title></head>
                <body style="font-family: Arial; padding: 40px; text-align: center;">
                    <h2>⏰ Exam Time Expired</h2>
                    <p>The exam time has ended for session <code>${sessionId}</code>.</p>
                    <p>Exam ended at: <strong>${session.examEndTime}</strong></p>
                    <button onclick="window.close()">Close Window</button>
                </body>
            </html>
        `);
    }

    // Log exam window access
    console.log(`🪟 Exam window opened: ${studentName} (${studentClass}) - Session: ${sessionId}`);
    console.log(`⏱️ Time remaining: ${sessionManager.formatTimeLeft(timeLeft)}`);

    // Serve the exam window
    res.sendFile(join(__dirname, 'public/student-exam-window.html'));
});

// Debug route for testing popup functionality
app.get('/test-popup', (req, res) => {
    res.send(`
        <html>
            <head><title>Popup Test</title></head>
            <body style="font-family: Arial; padding: 40px;">
                <h2>🧪 Popup Window Test</h2>
                <p>Test the popup window functionality:</p>
                
                <button onclick="testBasicPopup()">Test Basic Popup</button>
                <button onclick="testExamPopup()">Test Exam Window</button>
                <button onclick="testPopupBlocking()">Test Popup Blocking</button>
                
                <div id="results" style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 5px;"></div>
                
                <script>
                    function log(message) {
                        document.getElementById('results').innerHTML += '<div>' + new Date().toLocaleTimeString() + ': ' + message + '</div>';
                    }
                    
                    function testBasicPopup() {
                        log('Testing basic popup...');
                        const popup = window.open('about:blank', 'test', 'width=800,height=600');
                        if (popup) {
                            popup.document.write('<h1>Popup Test Successful!</h1><button onclick="window.close()">Close</button>');
                            log('✅ Basic popup opened successfully');
                        } else {
                            log('❌ Popup blocked by browser');
                        }
                    }
                    
                    function testExamPopup() {
                        log('Testing exam window popup...');
                        const examUrl = '/student-exam-window?sessionId=test-session&studentName=Test Student&studentClass=11А&timeLeft=10800000';
                        const popup = window.open(examUrl, 'examTest', 'width=1400,height=900,resizable=no');
                        if (popup) {
                            log('✅ Exam popup opened (may show error due to invalid session)');
                        } else {
                            log('❌ Exam popup blocked by browser');
                        }
                    }
                    
                    function testPopupBlocking() {
                        log('Testing popup blocker detection...');
                        const popup = window.open('', 'blockTest', 'width=1,height=1');
                        if (popup) {
                            popup.close();
                            log('✅ Popups are allowed');
                        } else {
                            log('❌ Popups are blocked - please allow popups for this site');
                        }
                    }
                </script>
            </body>
        </html>
    `);
});

// API endpoints
app.post('/api/student-login', async (req, res) => {
    try {
        const { studentName, studentClass } = req.body;
        const result = await sessionManager.handleStudentLogin(studentName, studentClass);

        if (result.success) {
            req.session.studentId = result.sessionId;
            req.session.studentName = studentName;
            req.session.studentClass = studentClass;

            // Add popup-specific data to response
            result.popupUrl = `/student-exam-window?sessionId=${result.sessionId}&studentName=${encodeURIComponent(studentName)}&studentClass=${encodeURIComponent(studentClass)}&timeLeft=${result.timeLeft}`;

            if (result.lastCode) {
                result.popupUrl += `&lastCode=${encodeURIComponent(result.lastCode)}`;
            }
        }

        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error during login' });
    }
});

app.get('/api/session-status', (req, res) => {
    const sessionData = {
        valid: Boolean(req.session?.studentId),
        studentId: req.session?.studentId,
        studentName: req.session?.studentName,
        studentClass: req.session?.studentClass
    };

    // Add session details if valid
    if (sessionData.valid) {
        const session = sessionManager.sessions.get(sessionData.studentId);
        if (session) {
            sessionData.timeLeft = sessionManager.calculateRemainingTime(session);
            sessionData.formattedTimeLeft = sessionManager.formatTimeLeft(sessionData.timeLeft);
            sessionData.status = session.status;
            sessionData.examEndTime = session.examEndTime;
        }
    }

    res.json(sessionData);
});

// NEW: API endpoint for popup window session validation
app.get('/api/validate-popup-session', (req, res) => {
    const { sessionId, studentName, studentClass } = req.query;

    if (!sessionId || !studentName || !studentClass) {
        return res.status(400).json({
            valid: false,
            error: 'Missing required parameters'
        });
    }

    const session = sessionManager.sessions.get(sessionId);

    if (!session) {
        return res.status(404).json({
            valid: false,
            error: 'Session not found'
        });
    }

    if (session.studentName !== studentName || session.studentClass !== studentClass) {
        return res.status(403).json({
            valid: false,
            error: 'Session does not belong to specified student'
        });
    }

    const timeLeft = sessionManager.calculateRemainingTime(session);
    if (timeLeft <= 0) {
        return res.status(410).json({
            valid: false,
            error: 'Session expired'
        });
    }

    res.json({
        valid: true,
        sessionId: session.sessionId,
        timeLeft: timeLeft,
        formattedTimeLeft: sessionManager.formatTimeLeft(timeLeft),
        status: session.status,
        lastCode: session.lastCode || ''
    });
});

// NEW: API endpoint for cross-window communication
app.post('/api/window-event', (req, res) => {
    const { sessionId, event, data } = req.body;

    if (!sessionId || !event) {
        return res.status(400).json({ error: 'Missing sessionId or event' });
    }

    console.log(`📡 Cross-window event: ${event} for session ${sessionId}`, data);

    // Handle different window events
    switch (event) {
        case 'popup-opened':
            console.log(`🪟 Popup opened for session ${sessionId}`);
            break;
        case 'popup-closed':
            console.log(`🚫 Popup closed for session ${sessionId}`);
            // Could trigger session cleanup or notification
            break;
        case 'focus-lost':
            console.log(`👁️ Focus lost in popup for session ${sessionId}`);
            // Could trigger anti-cheat logging
            break;
        default:
            console.log(`❓ Unknown window event: ${event}`);
    }

    res.json({ acknowledged: true });
});

// Proxy middleware for JSONStore with enhanced popup support
app.use('/jsonstore',
    // Custom middleware for popup session validation
    (req, res, next) => {
        // Check if request is from popup window
        const referer = req.get('Referer');
        const isFromPopup = referer && referer.includes('/student-exam-window');

        if (isFromPopup) {
            console.log(`📡 JSONStore request from popup: ${req.method} ${req.url}`);
            // Could add additional popup-specific validation here
        }

        next();
    },
    proxyHandler.createRateLimitHandler(50, 60000), // 50 requests per minute
    proxyHandler.createBlockedEndpointHandler(['/admin', '/system']), // Block admin endpoints
    ...proxyHandler.middleware
);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Express error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <html>
            <head><title>404 - Not Found</title></head>
            <body style="font-family: Arial; padding: 40px; text-align: center;">
                <h2>404 - Page Not Found</h2>
                <p>The requested URL <code>${req.url}</code> was not found on this server.</p>
                <p><a href="/">Go to Home Page</a></p>
            </body>
        </html>
    `);
});

// WebSocket handling
webSocketHandler.initialize();

// Enhanced WebSocket events for popup support
io.on('connection', (socket) => {
    // Track if connection is from popup window
    socket.on('popup-connection', (data) => {
        socket.isPopupConnection = true;
        socket.sessionId = data.sessionId;
        console.log(`🪟 Popup WebSocket connected: ${data.sessionId}`);
    });

    // Handle popup-specific events
    socket.on('popup-ready', (data) => {
        console.log(`✅ Popup ready: ${data.sessionId}`);
        // Could notify parent window or teacher dashboard
    });

    socket.on('popup-closing', (data) => {
        console.log(`🚫 Popup closing: ${data.sessionId}`);
        // Could trigger exam completion or cleanup
    });
});

// Start server
server.listen(PORT, async () => {
    console.log(`🚀 Exam Monitor v2 - Popup Mode running on http://localhost:${PORT}`);
    console.log(`📊 Teacher dashboard: http://localhost:${PORT}/teacher`);
    console.log(`👨‍🎓 Student login: http://localhost:${PORT}/student`);
    console.log(`🪟 Exam window: http://localhost:${PORT}/student-exam-window`);
    console.log(`🧪 Test popup: http://localhost:${PORT}/test-popup`);
    console.log(`🌐 Network: ExamNet hotspot on port ${PORT}`);

    console.log('\n🔧 New Popup Architecture Features:');
    console.log('  ✅ Isolated exam environment in popup window');
    console.log('  ✅ Enhanced anti-cheat protection');
    console.log('  ✅ Cross-window communication');
    console.log('  ✅ Session validation and security');
    console.log('  ✅ Popup blocker detection');

    // Start cleanup timer for expired sessions
    sessionManager.startCleanupTimer();

    // Check practice server health
    const health = await proxyHandler.healthCheck();
    if (health.healthy) {
        console.log(`✅ Practice server is healthy`);
    } else {
        console.warn(`⚠️ Practice server health check failed: ${health.error}`);
    }
});

export default app;