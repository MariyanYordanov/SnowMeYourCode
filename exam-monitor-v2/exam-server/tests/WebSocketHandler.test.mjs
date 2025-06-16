import { expect } from 'chai';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as ioClient } from 'socket.io-client'; // ← FIXED: Правилен import
import { WebSocketHandler, SOCKET_EVENTS } from '../modules/WebSocketHandler.mjs';
import { SessionManager } from '../modules/SessionManager.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('WebSocketHandler', () => {
    let server;
    let io;
    let webSocketHandler;
    let sessionManager;
    let clientSocket;
    let teacherSocket;
    let testDir;
    let port;

    beforeEach(async () => {
        // Create test directory and setup
        testDir = path.join(__dirname, 'temp-websocket-test');
        await fs.mkdir(testDir, { recursive: true });

        // Create test classes.json
        const classesData = {
            validClasses: ["11А", "11Б"],
            students: {
                "11А": ["Иван Иванов", "Петър Петров"],
                "11Б": ["Мария Иванова", "Георги Стоянов"]
            }
        };

        const dataDir = path.join(testDir, 'data');
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(
            path.join(dataDir, 'classes.json'),
            JSON.stringify(classesData, null, 2)
        );

        // Setup server
        const httpServer = createServer();
        io = new Server(httpServer);

        // Initialize managers
        sessionManager = new SessionManager(testDir);
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization

        webSocketHandler = new WebSocketHandler(io, sessionManager);
        webSocketHandler.initialize();

        // Start server on random port
        await new Promise((resolve) => {
            httpServer.listen(() => {
                port = httpServer.address().port;
                resolve();
            });
        });

        server = httpServer;
    });

    afterEach(async () => {
        // Cleanup
        if (clientSocket) {
            clientSocket.disconnect();
        }
        if (teacherSocket) {
            teacherSocket.disconnect();
        }
        if (server) {
            server.close();
        }

        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            console.warn('Cleanup warning:', error.message);
        }
    });

    describe('Student Connection', () => {
        it('should handle valid student login', (done) => {
            clientSocket = ioClient(`http://localhost:${port}`);

            clientSocket.on(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, (data) => {
                expect(data.sessionId).to.be.a('string');
                expect(data.timeLeft).to.be.a('number');
                expect(data.message).to.contain('Изпитът започна');
                done();
            });

            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                    studentName: 'Иван Иванов',
                    studentClass: '11А'
                });
            });
        });

        it('should reject invalid student', (done) => {
            clientSocket = ioClient(`http://localhost:${port}`);

            clientSocket.on(SOCKET_EVENTS.LOGIN_ERROR, (data) => {
                expect(data.message).to.contain('не е записан');
                done();
            });

            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                    studentName: 'Невалиден Студент',
                    studentClass: '11А'
                });
            });
        });

        it('should handle session recovery', (done) => {
            let sessionId;

            // First connection
            clientSocket = ioClient(`http://localhost:${port}`);

            clientSocket.on(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, (data) => {
                sessionId = data.sessionId;
                clientSocket.disconnect();

                // Wait a bit then reconnect
                setTimeout(() => {
                    const newClient = ioClient(`http://localhost:${port}`);

                    newClient.on(SOCKET_EVENTS.SESSION_RESTORED, (restoreData) => {
                        expect(restoreData.sessionId).to.equal(sessionId);
                        expect(restoreData.message).to.contain('Добре дошли обратно');
                        newClient.disconnect();
                        done();
                    });

                    newClient.on('connect', () => {
                        newClient.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                            studentName: 'Иван Иванов',
                            studentClass: '11А'
                        });
                    });
                }, 100);
            });

            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                    studentName: 'Иван Иванов',
                    studentClass: '11А'
                });
            });
        });
    });

    describe('Teacher Connection', () => {
        it('should handle teacher join and send student list', (done) => {
            // First, create a student session
            clientSocket = ioClient(`http://localhost:${port}`);

            clientSocket.on(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, () => {
                // Now connect teacher
                teacherSocket = ioClient(`http://localhost:${port}`);

                teacherSocket.on(SOCKET_EVENTS.ALL_STUDENTS, (students) => {
                    expect(students).to.be.an('array');
                    expect(students).to.have.length(1);
                    expect(students[0].studentName).to.equal('Иван Иванов');
                    done();
                });

                teacherSocket.on('connect', () => {
                    teacherSocket.emit(SOCKET_EVENTS.TEACHER_JOIN);
                });
            });

            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                    studentName: 'Иван Иванов',
                    studentClass: '11А'
                });
            });
        });

        it('should notify teacher of new student connections', (done) => {
            // Connect teacher first
            teacherSocket = ioClient(`http://localhost:${port}`);

            teacherSocket.on(SOCKET_EVENTS.STUDENT_CONNECTED, (data) => {
                expect(data.studentName).to.equal('Иван Иванов');
                expect(data.studentClass).to.equal('11А');
                expect(data.sessionId).to.be.a('string');
                done();
            });

            teacherSocket.on('connect', () => {
                teacherSocket.emit(SOCKET_EVENTS.TEACHER_JOIN);

                // Now connect student
                clientSocket = ioClient(`http://localhost:${port}`);

                clientSocket.on('connect', () => {
                    clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                        studentName: 'Иван Иванов',
                        studentClass: '11А'
                    });
                });
            });
        });
    });

    describe('Code Updates', () => {
        it('should handle code updates from student', (done) => {
            let studentConnected = false;
            let teacherConnected = false;

            // Connect teacher
            teacherSocket = ioClient(`http://localhost:${port}`);

            teacherSocket.on(SOCKET_EVENTS.STUDENT_CODE_UPDATE, (data) => {
                expect(data.studentName).to.equal('Иван Иванов');
                expect(data.code).to.equal('console.log("Hello World");');
                expect(data.filename).to.equal('main.js');
                done();
            });

            teacherSocket.on('connect', () => {
                teacherSocket.emit(SOCKET_EVENTS.TEACHER_JOIN);
                teacherConnected = true;
                tryConnectStudent();
            });

            // Connect student
            clientSocket = ioClient(`http://localhost:${port}`);

            clientSocket.on(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, () => {
                studentConnected = true;
                tryConnectStudent();
            });

            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                    studentName: 'Иван Иванов',
                    studentClass: '11А'
                });
            });

            function tryConnectStudent() {
                if (studentConnected && teacherConnected) {
                    // Send code update
                    clientSocket.emit(SOCKET_EVENTS.CODE_UPDATE, {
                        code: 'console.log("Hello World");',
                        filename: 'main.js'
                    });
                }
            }
        });

        it('should handle suspicious activity reporting', (done) => {
            let studentConnected = false;
            let teacherConnected = false;

            // Connect teacher
            teacherSocket = ioClient(`http://localhost:${port}`);

            teacherSocket.on(SOCKET_EVENTS.STUDENT_SUSPICIOUS, (data) => {
                expect(data.studentName).to.equal('Иван Иванов');
                expect(data.activity).to.equal('Опит за копиране');
                expect(data.severity).to.be.a('string');
                done();
            });

            teacherSocket.on('connect', () => {
                teacherSocket.emit(SOCKET_EVENTS.TEACHER_JOIN);
                teacherConnected = true;
                tryReportActivity();
            });

            // Connect student
            clientSocket = ioClient(`http://localhost:${port}`);

            clientSocket.on(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, () => {
                studentConnected = true;
                tryReportActivity();
            });

            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                    studentName: 'Иван Иванов',
                    studentClass: '11А'
                });
            });

            function tryReportActivity() {
                if (studentConnected && teacherConnected) {
                    // Report suspicious activity
                    clientSocket.emit(SOCKET_EVENTS.SUSPICIOUS_ACTIVITY, {
                        activity: 'Опит за копиране',
                        severity: 'high'
                    });
                }
            }
        });
    });

    describe('Exam Completion', () => {
        it('should handle graceful exam completion', (done) => {
            let studentConnected = false;
            let teacherConnected = false;

            // Connect teacher
            teacherSocket = ioClient(`http://localhost:${port}`);

            teacherSocket.on(SOCKET_EVENTS.STUDENT_DISCONNECTED, (data) => {
                expect(data.studentName).to.equal('Иван Иванов');
                expect(data.reason).to.equal('completed');
                done();
            });

            teacherSocket.on('connect', () => {
                teacherSocket.emit(SOCKET_EVENTS.TEACHER_JOIN);
                teacherConnected = true;
                tryCompleteExam();
            });

            // Connect student
            clientSocket = ioClient(`http://localhost:${port}`);

            clientSocket.on('exam-completed', (data) => {
                expect(data.message).to.contain('успешно');
            });

            clientSocket.on(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, () => {
                studentConnected = true;
                tryCompleteExam();
            });

            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                    studentName: 'Иван Иванов',
                    studentClass: '11А'
                });
            });

            function tryCompleteExam() {
                if (studentConnected && teacherConnected) {
                    // Complete exam
                    setTimeout(() => {
                        clientSocket.emit(SOCKET_EVENTS.EXAM_COMPLETE, {
                            completedAt: Date.now()
                        });
                    }, 100);
                }
            }
        });
    });

    describe('Heartbeat and Monitoring', () => {
        it('should respond to heartbeat', (done) => {
            clientSocket = ioClient(`http://localhost:${port}`);

            clientSocket.on(SOCKET_EVENTS.HEARTBEAT, (data) => {
                expect(data.timestamp).to.be.a('number');
                done();
            });

            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.HEARTBEAT);
            });
        });

        it('should handle time warnings', (done) => {
            clientSocket = ioClient(`http://localhost:${port}`);

            clientSocket.on(SOCKET_EVENTS.TIME_WARNING, (data) => {
                // Success! Test passes
                expect(data.minutesLeft).to.be.a('number');
                expect(data.message).to.contain('Внимание');
                done();
            });

            clientSocket.on(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, async (data) => {
                try {
                    // Get session and modify it to trigger warning
                    const session = sessionManager.sessions.get(data.sessionId);

                    // Set to expire in EXACTLY 5 minutes (matches timeWarnings array)
                    session.examEndTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

                    // Give time for socket registration
                    setTimeout(() => {
                        // Manually call checkTimeWarnings - this WILL trigger the event
                        webSocketHandler.checkTimeWarnings();
                    }, 500);

                } catch (error) {
                    done(error);
                }
            });

            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                    studentName: 'Иван Иванов',
                    studentClass: '11А'
                });
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle empty student data', (done) => {
            clientSocket = ioClient(`http://localhost:${port}`);

            clientSocket.on(SOCKET_EVENTS.LOGIN_ERROR, (data) => {
                expect(data.message).to.contain('задължителни');
                done();
            });

            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                    studentName: '',
                    studentClass: ''
                });
            });
        });

        it('should handle invalid class', (done) => {
            clientSocket = ioClient(`http://localhost:${port}`);

            clientSocket.on(SOCKET_EVENTS.LOGIN_ERROR, (data) => {
                expect(data.message).to.contain('не е валиден');
                done();
            });

            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                    studentName: 'Иван Иванов',
                    studentClass: '13А'
                });
            });
        });

        it('should handle code update without valid session', (done) => {
            clientSocket = ioClient(`http://localhost:${port}`);

            // Try to send code update without joining
            clientSocket.on('connect', () => {
                clientSocket.emit(SOCKET_EVENTS.CODE_UPDATE, {
                    code: 'console.log("test");'
                });

                // If no error occurs within 500ms, test passes
                setTimeout(done, 500);
            });
        });
    });

    describe('Session Management', () => {
        it('should track student disconnections', (done) => {
            let sessionId;

            // Connect teacher first
            teacherSocket = ioClient(`http://localhost:${port}`);

            teacherSocket.on(SOCKET_EVENTS.STUDENT_DISCONNECTED, (data) => {
                expect(data.sessionId).to.equal(sessionId);
                expect(data.reason).to.be.a('string');
                done();
            });

            teacherSocket.on('connect', () => {
                teacherSocket.emit(SOCKET_EVENTS.TEACHER_JOIN);

                // Connect student
                clientSocket = ioClient(`http://localhost:${port}`);

                clientSocket.on(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, (data) => {
                    sessionId = data.sessionId;

                    // Disconnect student after short delay
                    setTimeout(() => {
                        clientSocket.disconnect();
                    }, 100);
                });

                clientSocket.on('connect', () => {
                    clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                        studentName: 'Иван Иванов',
                        studentClass: '11А'
                    });
                });
            });
        });

        it('should provide connection statistics', () => {
            const stats = webSocketHandler.getConnectionStats();

            expect(stats).to.have.property('totalConnections');
            expect(stats).to.have.property('studentConnections');
            expect(stats).to.have.property('teacherConnections');
            expect(stats).to.have.property('rooms');
            expect(stats.rooms).to.be.an('array');
        });
    });

    describe('Utility Functions', () => {
        it('should find socket by session ID', async () => {
            clientSocket = ioClient(`http://localhost:${port}`);

            await new Promise((resolve) => {
                clientSocket.on(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, (data) => {
                    const socketId = webSocketHandler.getSocketIdBySession(data.sessionId);
                    expect(socketId).to.be.a('string');
                    resolve();
                });

                clientSocket.on('connect', () => {
                    clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                        studentName: 'Иван Иванов',
                        studentClass: '11А'
                    });
                });
            });
        });

        it('should find session by socket ID', async () => {
            clientSocket = ioClient(`http://localhost:${port}`);

            await new Promise((resolve) => {
                clientSocket.on(SOCKET_EVENTS.STUDENT_ID_ASSIGNED, (data) => {
                    const socketId = webSocketHandler.getSocketIdBySession(data.sessionId);
                    const foundSessionId = webSocketHandler.getSessionIdBySocket(socketId);
                    expect(foundSessionId).to.equal(data.sessionId);
                    resolve();
                });

                clientSocket.on('connect', () => {
                    clientSocket.emit(SOCKET_EVENTS.STUDENT_JOIN, {
                        studentName: 'Иван Иванов',
                        studentClass: '11А'
                    });
                });
            });
        });
    });
});