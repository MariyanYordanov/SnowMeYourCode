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

// Function to generate student ID
function generateStudentId(studentInfo) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `student-${timestamp}-${random}`;
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
        valid: !!req.session?.studentId,
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
            socket.studentId = generateStudentId(data);
            socket.join('students');

            socketToStudentId.set(socket.id, socket.studentId);

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
        console.log('Code update from:', socket.id);

        io.to('teachers').emit('student-code-update', {
            socketId: socket.id,
            studentId: socket.studentId,
            ...data
        });
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

server.listen(PORT, () => {
    console.log(`Exam monitor running on http://localhost:${PORT}`);
    console.log(`Teacher dashboard: http://localhost:${PORT}/teacher`);
    console.log(`Student workspace: http://localhost:${PORT}/student`);
});