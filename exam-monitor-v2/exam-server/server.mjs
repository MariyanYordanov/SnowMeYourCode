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
        <h1>Exam Monitor System v2 - Fullscreen Mode</h1>
        <p><a href="/teacher">Teacher Dashboard</a></p>
        <p><a href="/student">Student Login & Fullscreen Exam</a></p>
        <p><a href="/test-fullscreen">Test Fullscreen (Debug)</a></p>
        <hr>
        <h3>🔒 New Fullscreen Architecture:</h3>
        <ul>
            <li><strong>/student</strong> - Single page with fullscreen protection</li>
            <li><strong>Fullscreen API</strong> - Mandatory fullscreen exam mode</li>
            <li><strong>Focus Lock</strong> - Aggressive window focus control</li>
            <li><strong>Enhanced Security</strong> - Maximum anti-cheat protection</li>
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

// Legacy popup endpoint - redirect to main student page
app.get('/student-exam-window', (req, res) => {
    console.log('⚠️ Legacy popup endpoint accessed - redirecting to fullscreen mode');
    res.redirect('/student?legacy=popup');
});

// Debug route for testing fullscreen functionality
app.get('/test-fullscreen', (req, res) => {
    res.send(`
        <html>
            <head><title>Fullscreen Test</title></head>
            <body style="font-family: Arial; padding: 40px;">
                <h2>🔒 Fullscreen API Test</h2>
                <p>Test the fullscreen functionality:</p>
                
                <button onclick="testFullscreen()">Test Enter Fullscreen</button>
                <button onclick="testExitFullscreen()">Test Exit Fullscreen</button>
                <button onclick="testFullscreenSupport()">Test API Support</button>
                <button onclick="testFocusLock()">Test Focus Lock</button>
                
                <div id="results" style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 5px;"></div>
                
                <script>
                    function log(message) {
                        document.getElementById('results').innerHTML += '<div>' + new Date().toLocaleTimeString() + ': ' + message + '</div>';
                    }
                    
                    function testFullscreen() {
                        log('Testing fullscreen entry...');
                        const element = document.documentElement;
                        
                        if (element.requestFullscreen) {
                            element.requestFullscreen().then(() => {
                                log('✅ Fullscreen entered successfully');
                            }).catch(err => {
                                log('❌ Fullscreen failed: ' + err.message);
                            });
                        } else {
                            log('❌ Fullscreen API not supported');
                        }
                    }
                    
                    function testExitFullscreen() {
                        log('Testing fullscreen exit...');
                        if (document.exitFullscreen) {
                            document.exitFullscreen().then(() => {
                                log('✅ Exited fullscreen successfully');
                            }).catch(err => {
                                log('❌ Exit fullscreen failed: ' + err.message);
                            });
                        } else {
                            log('❌ Exit fullscreen not supported');
                        }
                    }
                    
                    function testFullscreenSupport() {
                        log('Testing API support...');
                        const supported = !!(document.fullscreenEnabled || 
                                           document.webkitFullscreenEnabled || 
                                           document.mozFullScreenEnabled ||
                                           document.msFullscreenEnabled);
                        
                        if (supported) {
                            log('✅ Fullscreen API is supported');
                        } else {
                            log('❌ Fullscreen API is not supported');
                        }
                    }
                    
                    function testFocusLock() {
                        log('Testing focus lock...');
                        let focusCount = 0;
                        const focusInterval = setInterval(() => {
                            window.focus();
                            focusCount++;
                            
                            if (focusCount >= 10) {
                                clearInterval(focusInterval);
                                log('✅ Focus lock test completed (10 focus attempts)');
                            }
                        }, 100);
                        
                        log('🎯 Focus lock running for 1 second...');
                    }
                    
                    // Monitor fullscreen changes
                    document.addEventListener('fullscreenchange', () => {
                        const isFullscreen = !!document.fullscreenElement;
                        log(isFullscreen ? '🔒 Entered fullscreen' : '🔓 Exited fullscreen');
                    });
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

            console.log(`✅ Student login successful: ${studentName} (${studentClass}) - Session: ${result.sessionId}`);
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

// Enhanced WebSocket events for fullscreen support
io.on('connection', (socket) => {
    // Track fullscreen connections
    socket.on('fullscreen-connection', (data) => {
        socket.isFullscreenConnection = true;
        socket.sessionId = data.sessionId;
        console.log(`🔒 Fullscreen WebSocket connected: ${data.sessionId}`);
    });

    // Handle fullscreen-specific events
    socket.on('fullscreen-entered', (data) => {
        console.log(`✅ Fullscreen entered: ${data.sessionId}`);
        // Notify teacher dashboard of fullscreen status
        io.to('teachers').emit('student-fullscreen-status', {
            sessionId: data.sessionId,
            status: 'entered',
            timestamp: Date.now()
        });
    });

    socket.on('fullscreen-exited', (data) => {
        console.log(`⚠️ Fullscreen exited: ${data.sessionId} - Attempt #${data.attempt}`);
        // Notify teacher dashboard of security violation
        io.to('teachers').emit('student-fullscreen-violation', {
            sessionId: data.sessionId,
            attempt: data.attempt,
            reason: data.reason,
            timestamp: Date.now()
        });
    });

    socket.on('fullscreen-terminated', (data) => {
        console.log(`🚫 Exam terminated for fullscreen violations: ${data.sessionId}`);
        // Notify teacher dashboard of termination
        io.to('teachers').emit('student-terminated', {
            sessionId: data.sessionId,
            reason: 'fullscreen_violations',
            details: data.details,
            timestamp: Date.now()
        });
    });
});

// Start server
server.listen(PORT, async () => {
    console.log(`🚀 Exam Monitor v2 - Fullscreen Mode running on http://localhost:${PORT}`);
    console.log(`📊 Teacher dashboard: http://localhost:${PORT}/teacher`);
    console.log(`👨‍🎓 Student fullscreen exam: http://localhost:${PORT}/student`);
    console.log(`🔒 Test fullscreen: http://localhost:${PORT}/test-fullscreen`);
    console.log(`🌐 Network: ExamNet hotspot on port ${PORT}`);

    console.log('\n🔒 New Fullscreen Architecture Features:');
    console.log('  ✅ Mandatory fullscreen exam environment');
    console.log('  ✅ Aggressive focus lock protection');
    console.log('  ✅ Fullscreen violation detection');
    console.log('  ✅ Automatic exam termination for violations');
    console.log('  ✅ Single-page architecture for maximum security');

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