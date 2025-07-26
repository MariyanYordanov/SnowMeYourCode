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
import teacherAuthRoutes, { requireTeacherAuth, redirectToLogin } from './routes/teacher-auth.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Initialize Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY;
let generativeModel;

if (geminiApiKey) {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    generativeModel = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("Gemini API initialized successfully.");
} else {
    console.warn("GEMINI_API_KEY not found in environment variables. Gemini API will not be available.");
}

// TODO: Pass generativeModel to SessionManager or WebSocketHandler if they need to use it.

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

// Protected teacher dashboard (requires authentication)
app.get('/teacher', redirectToLogin, (req, res) => {
    res.sendFile(join(__dirname, 'public/teacher/index.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(join(__dirname, 'public/student/index.html'));
});

app.use('/api/project', projectRoutes);

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

    const projectPath = join(__dirname, 'data', 'student-data', 'classes', sessionId.split('-')[0].toUpperCase(), sessionId);
    
    // Serve static files from the student's project directory
    express.static(projectPath)(req, res, next);
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