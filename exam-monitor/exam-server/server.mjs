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
const io = new Server(server, {
    // Добавяме session middleware за Socket.IO
    allowRequest: (req, callback) => {
        // Това позволява на Socket.IO да има достъп до session
        sessionMiddleware(req, req.res || {}, callback);
    }
});

const PORT = 8080;
const PRACTICE_SERVER_PORT = 3030;

// Session middleware - изнасяме го в променлива за да го използваме и в Socket.IO
const sessionMiddleware = session({
    secret: 'exam-monitor-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
});

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.use(sessionMiddleware);

// Storage за upload
const upload = multer({ dest: 'uploads/' });

// Proxy middleware за JSONStore 
app.use('/jsonstore', (req, res, next) => {
    // Логваме за debug
    console.log('Proxy request:', req.method, req.url);
    console.log('Session ID:', req.session?.studentId);

    if (req.session && req.session.studentId) {
        req.headers['x-student-id'] = req.session.studentId;
    }
    next();
}, createProxyMiddleware({
    target: `http://localhost:${PRACTICE_SERVER_PORT}`,
    changeOrigin: true,
    logLevel: 'debug',
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(504).send('Error occurred while proxying to practice server');
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

// Middleware за Socket.IO да има достъп до session
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});

// WebSocket handling 
io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('student-join', (data) => {
        socket.studentInfo = data;
        socket.studentId = `${data.name}-${data.class}`.replace(/\s+/g, '-').toLowerCase();
        socket.join('students');

        // Запазваме в session
        if (socket.request.session) {
            socket.request.session.studentId = socket.studentId;
            socket.request.session.save((err) => {
                if (err) console.error('Session save error:', err);
                else console.log('Session saved with studentId:', socket.studentId);
            });
        }

        io.to('teachers').emit('student-connected', {
            socketId: socket.id,
            studentId: socket.studentId,
            ...data
        });
    });

    socket.on('teacher-join', () => {
        socket.join('teachers');
        socket.emit('all-students', getConnectedStudents());
    });

    socket.on('code-update', (data) => {
        io.to('teachers').emit('student-code-update', {
            socketId: socket.id,
            ...data
        });
        saveStudentCode(socket.studentInfo, data);
    });

    socket.on('disconnect', () => {
        io.to('teachers').emit('student-disconnected', socket.id);
    });
});

// Helper функции
function getConnectedStudents() {
    const students = [];
    for (let [id, socket] of io.sockets.sockets) {
        if (socket.studentInfo) {
            students.push({
                socketId: id,
                studentId: socket.studentId,
                ...socket.studentInfo
            });
        }
    }
    return students;
}

async function saveStudentCode(studentInfo, codeData) {
    if (!studentInfo) return;

    const examDate = new Date().toISOString().split('T')[0];
    const studentDir = `student-data/${examDate}/${studentInfo.name}-${studentInfo.class}`;

    try {
        await fs.mkdir(studentDir, { recursive: true });
        await fs.writeFile(
            join(studentDir, `${codeData.filename}`),
            codeData.code
        );
    } catch (error) {
        console.error('Error saving code:', error);
    }
}

server.listen(PORT, () => {
    console.log(`Exam monitor running on http://localhost:${PORT}`);
    console.log(`Teacher dashboard: http://localhost:${PORT}/teacher`);
    console.log(`Student workspace: http://localhost:${PORT}/student`);
});