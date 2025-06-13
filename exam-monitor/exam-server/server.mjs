import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import multer from 'multer';
import { createProxyMiddleware } from 'http-proxy-middleware';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = 8080;
const PRACTICE_SERVER_PORT = 3030;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Enhanced session middleware with better security
app.use(session({
    secret: process.env.SESSION_SECRET || 'exam-monitor-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false, // Changed to false for better security
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true, // Prevents XSS attacks
        sameSite: 'strict', // CSRF protection
        maxAge: 1000 * 60 * 60 * 4 // 4 hours for exam duration
    },
    name: 'exam-session' // Custom session name
}));

// Upload middleware
const upload = multer({ dest: join(__dirname, 'public/uploads/') }); // Fixed path

// Map to track socket ID to student ID relationship
const socketToStudentId = new Map();

// Enhanced proxy middleware with validation
app.use('/jsonstore', (req, res, next) => {
    console.log('Proxy request:', req.method, req.url);
    console.log('Session ID:', req.session?.studentId);

    // Get studentId from session (most secure)
    const studentId = req.session?.studentId;

    // Validate student session
    if (!studentId) {
        return res.status(401).json({
            error: 'Unauthorized: No valid exam session. Please login first.'
        });
    }

    // Add student information to headers for practice server
    req.headers['x-student-id'] = studentId;

    // Add additional student info if available
    if (req.session.studentName) {
        req.headers['x-student-name'] = req.session.studentName;
    }
    if (req.session.studentClass) {
        req.headers['x-student-class'] = req.session.studentClass;
    }

    next();
},
    createProxyMiddleware({
        target: `http://localhost:${PRACTICE_SERVER_PORT}`,
        changeOrigin: true,
        logLevel: 'debug',
        onError: (err, req, res) => {
            console.error('Proxy error:', err);
            res.status(504).json({
                error: 'Practice server unavailable. Please contact your teacher.'
            });
        }
    }));

// Routes
app.get('/', (req, res) => {
    res.send(`
        <h1>Exam Monitor System</h1>
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

// Enhanced API endpoint to save student session
app.post('/api/save-student-id', (req, res) => {
    const { studentId, studentName, studentClass } = req.body;

    if (!studentId) {
        return res.status(400).json({ error: 'Student ID required' });
    }

    // Save complete student information in session
    req.session.studentId = studentId;
    req.session.studentName = studentName || '';
    req.session.studentClass = studentClass || '';

    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            res.status(500).json({ error: 'Failed to save session' });
        } else {
            res.json({
                success: true,
                studentId,
                sessionId: req.sessionID // For debugging
            });
        }
    });
});

// WebSocket handling 
io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('student-join', async (data) => {
        // Validate student data
        if (!data.name || !data.class) {
            socket.emit('error', { message: 'Name and class are required' });
            return;
        }

        socket.studentInfo = data;
        socket.studentId = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        socket.join('students');

        // Save mapping
        socketToStudentId.set(socket.id, socket.studentId);

        // Initialize student data directory
        await initializeStudentDirectory(socket.studentId, data);

        // Send student ID back to client
        socket.emit('student-id-assigned', socket.studentId);

        // Notify teachers
        io.to('teachers').emit('student-connected', {
            socketId: socket.id,
            studentId: socket.studentId,
            ...data,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('teacher-join', () => {
        socket.join('teachers');
        socket.emit('all-students', getConnectedStudents());
    });

    socket.on('code-update', async (data) => {
        // Validate code update
        if (!socket.studentInfo || !socket.studentId) {
            socket.emit('error', { message: 'Invalid session' });
            return;
        }

        // Add metadata
        const enrichedData = {
            socketId: socket.id,
            studentId: socket.studentId,
            ...data,
            timestamp: new Date().toISOString()
        };

        // Notify teachers
        io.to('teachers').emit('student-code-update', enrichedData);

        // Save code to file
        await saveStudentCode(socket.studentId, socket.studentInfo, data);
    });

    socket.on('disconnect', () => {
        const studentId = socketToStudentId.get(socket.id);
        socketToStudentId.delete(socket.id);

        io.to('teachers').emit('student-disconnected', {
            socketId: socket.id,
            studentId: studentId,
            timestamp: new Date().toISOString()
        });
    });
});

// Get all connected students with enhanced data
function getConnectedStudents() {
    const students = [];
    for (let [id, socket] of io.sockets.sockets) {
        if (socket.studentInfo && socket.studentId) {
            students.push({
                socketId: id,
                studentId: socket.studentId,
                ...socket.studentInfo,
                connectedAt: socket.handshake.time
            });
        }
    }
    return students;
}

// Initialize student directory structure
async function initializeStudentDirectory(studentId, studentInfo) {
    const examDate = new Date().toISOString().split('T')[0];
    const studentDir = join(__dirname, 'student-data', examDate, studentId);

    try {
        // Create directories
        await fs.mkdir(join(studentDir, 'code'), { recursive: true });
        await fs.mkdir(join(studentDir, 'data'), { recursive: true });

        // Save initial student info
        await fs.writeFile(
            join(studentDir, 'info.json'),
            JSON.stringify({
                studentId,
                name: studentInfo.name,
                class: studentInfo.class,
                joinedAt: new Date().toISOString()
            }, null, 2)
        );
    } catch (error) {
        console.error('Error initializing student directory:', error);
    }
}

// Enhanced function to save student code
async function saveStudentCode(studentId, studentInfo, codeData) {
    if (!studentId || !studentInfo) {
        console.error('Missing student information for code save');
        return;
    }

    const examDate = new Date().toISOString().split('T')[0];
    const studentDir = join(__dirname, 'student-data', examDate, studentId, 'code');

    try {
        await fs.mkdir(studentDir, { recursive: true });

        // Save code with timestamp
        const filename = `${codeData.filename || 'main.js'}`;
        const filePath = join(studentDir, filename);

        await fs.writeFile(filePath, codeData.code || '');

        // Save code history/versions if needed
        if (codeData.suspicious) {
            const historyDir = join(studentDir, 'history');
            await fs.mkdir(historyDir, { recursive: true });

            const historyFile = `${Date.now()}-${codeData.suspicious}.js`;
            await fs.writeFile(
                join(historyDir, historyFile),
                JSON.stringify({
                    code: codeData.code,
                    activity: codeData.suspicious,
                    timestamp: new Date().toISOString()
                }, null, 2)
            );
        }
    } catch (error) {
        console.error('Error saving student code:', error);
    }
}

server.listen(PORT, () => {
    console.log(`Exam monitor running on http://localhost:${PORT}`);
    console.log(`Teacher dashboard: http://localhost:${PORT}/teacher`);
    console.log(`Student workspace: http://localhost:${PORT}/student`);
});