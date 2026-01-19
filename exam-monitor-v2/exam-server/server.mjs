import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SessionManager } from './modules/SessionManager.mjs';
import { WebSocketHandler } from './modules/WebSocketHandler.mjs';
import { ProxyHandler } from './modules/ProxyHandler.mjs';
import projectRoutes from './routes/project-routes.mjs';
import teacherAuthRoutes, { requireTeacherAuth } from './routes/teacher-auth.mjs';

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

const PORT = process.env.PORT || 8080;
const PRACTICE_SERVER_PORT = 3030;

const sessionManager = new SessionManager(__dirname);
await sessionManager.loadExistingSessions();
const webSocketHandler = new WebSocketHandler(io, sessionManager);
const proxyHandler = new ProxyHandler(PRACTICE_SERVER_PORT, sessionManager);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
    secret: 'exam-monitor-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 4
    }
}));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    next();
});

app.use('/student', express.static(join(__dirname, 'public/student'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
            // CRITICAL: Disable cache for JS files during development
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

app.use(express.static(join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

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

// Teacher authentication routes
app.use('/api/teacher', teacherAuthRoutes);

// Teacher dashboard (authentication handled in client-side JS)
app.get('/teacher', (req, res) => {
    res.sendFile(join(__dirname, 'public/teacher/index.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(join(__dirname, 'public/student/index.html'));
});

// Quit exam endpoint for SEB to close
app.get('/quit-exam', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Exam Completed</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: #1a1a2e;
                    color: #fff;
                }
                .message {
                    text-align: center;
                    padding: 40px;
                    background: #16213e;
                    border-radius: 10px;
                }
                h1 { color: #4ade80; margin-bottom: 20px; }
                p { color: #94a3b8; }
            </style>
        </head>
        <body>
            <div class="message">
                <h1>Exam Completed</h1>
                <p>You can now close Safe Exam Browser.</p>
                <p>Your solution has been submitted successfully.</p>
            </div>
        </body>
        </html>
    `);
});

app.use('/api/project', projectRoutes(sessionManager));

// Exam files API
app.get('/api/exam-files', async (req, res) => {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const examFilesPath = path.join(__dirname, '../practice-server/exam-files');
        
        async function scanDirectory(dirPath, relativePath = '') {
            const files = [];
            try {
                const items = await fs.readdir(dirPath, { withFileTypes: true });
                
                for (const item of items) {
                    const fullPath = path.join(dirPath, item.name);
                    const relPath = relativePath ? `${relativePath}/${item.name}` : item.name;
                    
                    if (item.isDirectory()) {
                        // Skip node_modules and other system folders
                        if (!['node_modules', '.git', '.DS_Store'].includes(item.name)) {
                            const subFiles = await scanDirectory(fullPath, relPath);
                            files.push(...subFiles);
                        }
                    } else {
                        const stats = await fs.stat(fullPath);
                        files.push({
                            name: item.name,
                            path: relPath,
                            size: stats.size,
                            modified: stats.mtime
                        });
                    }
                }
            } catch (error) {
                console.error('Error scanning directory:', dirPath, error);
            }
            
            return files;
        }
        
        const files = await scanDirectory(examFilesPath);
        res.json({ success: true, files });
        
    } catch (error) {
        console.error('Error loading exam files:', error);
        res.status(500).json({ success: false, error: 'Failed to load exam files' });
    }
});

// Teacher settings endpoints removed - exam duration is now configured in exam-config.json

// Anti-cheat statistics endpoint (protected)
app.get('/api/anticheat/stats', requireTeacherAuth, (req, res) => {
    try {
        const stats = webSocketHandler.getAntiCheatStats();
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error getting anti-cheat stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get anti-cheat statistics'
        });
    }
});

// Individual student anti-cheat stats
app.get('/api/anticheat/student/:sessionId', requireTeacherAuth, (req, res) => {
    try {
        const { sessionId } = req.params;
        const stats = webSocketHandler.getStudentAntiCheatStats(sessionId);
        
        if (!stats) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error getting student anti-cheat stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get student statistics'
        });
    }
});

// Dynamic route to serve student project files
app.use('/api/project/run/:sessionId', (req, res, next) => {
    const { sessionId } = req.params;
    if (!sessionId) {
        return res.status(400).send('Session ID is required.');
    }

    // Basic validation for session ID format to prevent path traversal
    if (!/^[a-zA-Z0-9\-]+$/.test(sessionId)) {
        return res.status(400).send('Invalid Session ID format.');
    }

    const projectPath = join(__dirname, 'data', 'classes', sessionId.split('-')[0].toUpperCase(), sessionId);
    
    // Serve static files from the student's project directory
    express.static(projectPath)(req, res, next);
});

// Get students list by class (uses same classes.json as login validation)
app.get('/api/students/:studentClass', async (req, res) => {
    try {
        const { studentClass } = req.params;
        const fs = await import('fs/promises');
        const path = await import('path');

        // Use classes.json to ensure consistency with login validation
        const classesPath = path.join(__dirname, 'data', 'classes.json');

        try {
            const data = await fs.readFile(classesPath, 'utf8');
            const classesData = JSON.parse(data);

            const students = classesData.students?.[studentClass] || [];
            res.json({ success: true, students });
        } catch (error) {
            console.warn('Classes file not found, returning empty list');
            res.json({ success: true, students: [] });
        }
    } catch (error) {
        console.error('Error loading students:', error);
        res.status(500).json({ success: false, error: 'Failed to load students' });
    }
});

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
        console.error('Student login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// HTTP endpoint for exam completion (fallback when WebSocket not available)
app.post('/api/exam-complete', async (req, res) => {
    try {
        const { sessionId, reason, timestamp } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Session ID required' });
        }

        console.log(`Exam completed via HTTP: ${sessionId} - Reason: ${reason}`);

        // Mark session as completed
        await sessionManager.completeSession(sessionId, reason);

        res.json({ success: true, message: 'Exam completed successfully' });
    } catch (error) {
        console.error('Exam completion error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during exam completion'
        });
    }
});

app.use('/proxy', proxyHandler.middleware);

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

webSocketHandler.initialize();

server.listen(PORT, () => {
    console.log(`Exam Monitor v2.0 server running on port ${PORT}`);
    console.log(`Teacher dashboard: http://localhost:${PORT}/teacher`);
    console.log(`Student interface: http://localhost:${PORT}/student`);
    console.log(`Practice server proxy: http://localhost:${PORT}/proxy`);
    console.log(`Project API available at: http://localhost:${PORT}/api/project`);
    console.log('Ready for exam sessions!');
});