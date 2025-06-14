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
const io = new Server(server);

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

// Routes
app.get('/', (req, res) => {
    res.send(`
        <h1>Exam Monitor System v2</h1>
        <p><a href="/teacher">Teacher Dashboard</a></p>
        <p><a href="/student">Student Workspace</a></p>
    `);
});

app.get('/teacher', (req, res) => {
    res.sendFile(join(__dirname, 'public/teacher/index.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(join(__dirname, 'public/student/index.html'));
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
        }

        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error during login' });
    }
});

app.get('/api/session-status', (req, res) => {
    res.json({
        valid: Boolean(req.session?.studentId),
        studentId: req.session?.studentId,
        studentName: req.session?.studentName,
        studentClass: req.session?.studentClass
    });
});

// Proxy middleware for JSONStore with rate limiting and security
app.use('/jsonstore',
    proxyHandler.createRateLimitHandler(50, 60000), // 50 requests per minute
    proxyHandler.createBlockedEndpointHandler(['/admin', '/system']), // Block admin endpoints
    ...proxyHandler.middleware
);

// WebSocket handling
webSocketHandler.initialize();

// Start server
server.listen(PORT, async () => {
    console.log(`🚀 Exam Monitor v2 running on http://localhost:${PORT}`);
    console.log(`📊 Teacher dashboard: http://localhost:${PORT}/teacher`);
    console.log(`👨‍🎓 Student workspace: http://localhost:${PORT}/student`);
    console.log(`🌐 Network: ExamNet hotspot on port ${PORT}`);

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