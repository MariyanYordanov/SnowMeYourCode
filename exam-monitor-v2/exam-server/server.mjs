import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import session from 'express-session';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = 8080;
const PRACTICE_SERVER_PORT = 3030;

// Simple in-memory storage for now
const socketToStudentId = new Map();

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

// Function to generate secure student ID
function generateSecureStudentId(studentInfo) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    // Use student info in the hash for uniqueness
    const hash = crypto.createHash('sha256')
        .update(`${studentInfo.name}-${studentInfo.class}-${timestamp}`)
        .digest('hex')
        .substring(0, 8);

    return `student-${timestamp}-${hash}-${randomBytes}`;
}

// Proxy middleware for JSONStore
app.use('/jsonstore', (req, res, next) => {
    console.log('Proxy request:', req.method, req.url);
    console.log('Session:', req.session);

    const studentId = req.session?.studentId;

    if (!studentId) {
        return res.status(401).json({
            error: 'No valid session. Please login first.'
        });
    }

    req.headers['x-student-id'] = studentId;
    next();
},
    createProxyMiddleware({
        target: `http://localhost:${PRACTICE_SERVER_PORT}`,
        changeOrigin: true,
        onError: (err, req, res) => {
            console.error('Proxy error:', err);
            res.status(504).json({ error: 'Practice server unavailable' });
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

// API endpoint to save student session
app.post('/api/save-student-id', (req, res) => {
    const { studentId, studentName, studentClass } = req.body;

    if (!studentId) {
        return res.status(400).json({ error: 'Student ID required' });
    }

    req.session.studentId = studentId;
    req.session.studentName = studentName;
    req.session.studentClass = studentClass;

    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ error: 'Failed to save session' });
        }
        res.json({ success: true, studentId });
    });
});

// Check session status
app.get('/api/session-status', (req, res) => {
    res.json({
        valid: Boolean(req.session?.studentId),
        studentId: req.session?.studentId,
        studentName: req.session?.studentName,
        studentClass: req.session?.studentClass
    });
});

// WebSocket handling
io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('student-join', async (data) => {
        console.log('Student joining:', data);

        try {
            if (!data.name || !data.class) {
                socket.emit('error', { message: 'Name and class required' });
                return;
            }

            socket.studentInfo = data;
            socket.studentId = generateSecureStudentId(data);
            socket.join('students');

            socketToStudentId.set(socket.id, socket.studentId);

            // Initialize student directory
            await initializeStudentDirectory(socket.studentId, data);

            // Send ID back to student
            socket.emit('student-id-assigned', socket.studentId);

            // Notify teachers
            io.to('teachers').emit('student-connected', {
                socketId: socket.id,
                studentId: socket.studentId,
                ...data
            });

            console.log('Student joined successfully:', socket.studentId);
        } catch (error) {
            console.error('Error in student-join:', error);
            socket.emit('error', { message: 'Failed to join exam' });
        }
    });

    socket.on('teacher-join', () => {
        console.log('Teacher joining');
        socket.join('teachers');

        // Send current students
        const students = [];
        for (let [id, sid] of socketToStudentId.entries()) {
            const s = io.sockets.sockets.get(id);
            if (s && s.studentInfo) {
                students.push({
                    socketId: id,
                    studentId: sid,
                    ...s.studentInfo
                });
            }
        }
        socket.emit('all-students', students);
    });

    socket.on('code-update', (data) => {
        io.to('teachers').emit('student-code-update', {
            socketId: socket.id,
            studentId: socket.studentId || 'unknown',
            studentInfo: socket.studentInfo,
            ...data
        });

        // Save code with proper parameters
        if (socket.studentInfo && socket.studentId) {
            saveStudentCode(socket.studentId, socket.studentInfo, data)
                .catch(err => console.error('Failed to save code:', err));
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id);

        const studentId = socketToStudentId.get(socket.id);
        socketToStudentId.delete(socket.id);

        io.to('teachers').emit('student-disconnected', {
            socketId: socket.id,
            studentId: studentId
        });
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

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

// Function to save student code
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
        const filename = codeData.filename || 'main.js';
        const filePath = join(studentDir, filename);

        await fs.writeFile(filePath, codeData.code || '');

        // Save suspicious activity if present
        if (codeData.suspicious) {
            const activityDir = join(dirname(studentDir), 'activities');
            await fs.mkdir(activityDir, { recursive: true });

            const activityLog = join(activityDir, 'suspicious.log');
            const logEntry = `${new Date().toISOString()} - ${codeData.suspicious}\n`;
            await fs.appendFile(activityLog, logEntry);

            console.log(`Suspicious activity logged: ${codeData.suspicious}`);
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