import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SessionManager } from './modules/SessionManager.mjs';
import { WebSocketHandler } from './modules/WebSocketHandler.mjs';
import { ProxyHandler } from './modules/ProxyHandler.mjs';
// Project routes will be added later
// import projectRoutes from './routes/project-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

const io = new Server(server, {
    serveClient: true,
    path: '/socket.io',
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// Server configuration
const PORT = process.env.PORT || 8080;
const PRACTICE_SERVER_PORT = 3030;

// Initialize modules like the original
const sessionManager = new SessionManager(__dirname);
await sessionManager.loadExistingSessions();
const webSocketHandler = new WebSocketHandler(io, sessionManager);
const proxyHandler = new ProxyHandler(PRACTICE_SERVER_PORT, sessionManager);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
        <h1>Exam Monitor System v2.0</h1>
        <h3>Enhanced Anti-Cheat Architecture:</h3>
        <ul>
            <li><strong>/student</strong> - Single page with fullscreen protection</li>
            <li><strong>Fullscreen API</strong> - Mandatory fullscreen exam mode</li>
            <li><strong>Focus Lock</strong> - Aggressive window focus control</li>
            <li><strong>Enhanced Security</strong> - Maximum anti-cheat protection</li>
            <li><strong>Project Files</strong> - Multi-file project support</li>
            <li><strong>Templates</strong> - Express & Vanilla JS starters</li>
        </ul>
    `);
});

app.get('/teacher', (req, res) => {
    res.sendFile(join(__dirname, 'public/teacher/index.html'));
});

// Main student page - login and popup launcher
app.get('/student', (req, res) => {
    res.sendFile(join(__dirname, 'public/student/html/index.html'));
});

// Legacy popup endpoint - redirect to main student page
app.get('/student-exam-window', (req, res) => {
    console.log('Legacy popup endpoint accessed - redirecting to fullscreen mode');
    res.redirect('/student?legacy=popup');
});

// Project files API routes - temporarily disabled
// app.use('/api/project', projectRoutes);

// Authentication API endpoints
app.post('/api/student-login', async (req, res) => {
    try {
        const { studentName, studentClass } = req.body;
        const result = await sessionManager.handleStudentLogin(studentName, studentClass);

        if (result.success) {
            req.session.studentId = result.sessionId;
            req.session.studentName = studentName;
            req.session.studentClass = studentClass;

            console.log(`Student login successful: ${studentName} (${studentClass}) - Session: ${result.sessionId}`);
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
            sessionData.examStatus = session.status;
            sessionData.violations = session.violations || [];
        }
    }

    res.json(sessionData);
});

// Simplified endpoints using SessionManager methods
app.post('/api/submit-code', async (req, res) => {
    try {
        const studentId = req.session?.studentId;
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const { code, language, timestamp } = req.body;

        // Use SessionManager to record code
        const session = sessionManager.sessions.get(studentId);
        if (session) {
            await sessionManager.recordCodeSubmission(session, {
                code,
                language,
                timestamp: timestamp || Date.now()
            });
        }

        console.log(`Code submission from ${studentId}: ${code?.length || 0} characters`);
        res.json({ success: true, message: 'Code submitted successfully' });

    } catch (error) {
        console.error('Code submission error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit code' });
    }
});

app.post('/api/finish-exam', async (req, res) => {
    try {
        const studentId = req.session?.studentId;
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const session = sessionManager.sessions.get(studentId);
        if (session) {
            await sessionManager.completeSession(session, 'graceful');
        }

        req.session.destroy();
        res.json({ success: true, message: 'Exam finished' });

    } catch (error) {
        console.error('Finish exam error:', error);
        res.status(500).json({ success: false, error: 'Failed to finish exam' });
    }
});

app.post('/api/report-violation', async (req, res) => {
    try {
        const studentId = req.session?.studentId;
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const { violationType, details } = req.body;

        const session = sessionManager.sessions.get(studentId);
        if (session) {
            await sessionManager.recordViolation(session, {
                type: violationType,
                details,
                timestamp: Date.now()
            });
        }

        console.log(`Violation reported for ${studentId}: ${violationType}`);
        res.json({ success: true, message: 'Violation recorded' });

    } catch (error) {
        console.error('Violation report error:', error);
        res.status(500).json({ success: false, error: 'Failed to report violation' });
    }
});

// Teacher dashboard API
app.get('/api/teacher/sessions', (req, res) => {
    try {
        const sessions = sessionManager.getAllSessionsData();
        res.json({ success: true, sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ success: false, error: 'Failed to get sessions' });
    }
});

app.post('/api/teacher/session/:sessionId/action', (req, res) => {
    try {
        const { sessionId } = req.params;
        const { action, data } = req.body;

        let result;
        switch (action) {
            case 'warning':
                result = sessionManager.sendWarning(sessionId, data.message);
                break;
            case 'terminate':
                result = sessionManager.terminateSession(sessionId, data.reason);
                break;
            case 'extend-time':
                result = sessionManager.extendTime(sessionId, data.minutes);
                break;
            default:
                return res.status(400).json({ success: false, error: 'Invalid action' });
        }

        res.json(result);

    } catch (error) {
        console.error('Teacher action error:', error);
        res.status(500).json({ success: false, error: 'Failed to execute action' });
    }
});

// Initialize WebSocket handlers
webSocketHandler.initialize();

// Use proxy for practice server - correct usage
app.use('/jsonstore', ...proxyHandler.middleware);

// Start cleanup timer
sessionManager.startCleanupTimer();

// Periodic cleanup - SessionManager handles expired sessions
setInterval(() => {
    // SessionManager already has startCleanupTimer() running
    // but this provides additional safety cleanup
    let expiredCount = 0;

    for (const session of sessionManager.sessions.values()) {
        const timeLeft = sessionManager.calculateRemainingTime(session);
        if (timeLeft <= 0 && session.status === 'active') {
            sessionManager.expireSession(session.sessionId);
            expiredCount++;
        }
    }

    if (expiredCount > 0) {
        console.log(`Manual cleanup: expired ${expiredCount} sessions`);
    }
}, 30000); // Every 30 seconds

// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        sessionManager.saveAllSessions().then(() => {
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        sessionManager.saveAllSessions().then(() => {
            process.exit(0);
        });
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Exam Monitor Server v2.0 running on port ${PORT}`);
    console.log(`Student interface: http://localhost:${PORT}/student`);
    console.log(`Teacher dashboard: http://localhost:${PORT}/teacher`);
    console.log(`Enhanced anti-cheat system active`);
});