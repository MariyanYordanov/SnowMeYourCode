import { expect } from 'chai';
import { SessionManager, SESSION_STATES, LOGIN_RESULTS } from '../modules/SessionManager.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SessionManager', () => {
    let sessionManager;
    let testDir;

    beforeEach(async () => {
        // Create temporary test directory
        testDir = path.join(__dirname, 'temp-test-data');
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

        sessionManager = new SessionManager(testDir);

        // Wait a bit for initialization
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            console.warn('Cleanup warning:', error.message);
        }
    });

    describe('Student Login', () => {
        it('should successfully create new session for valid student', async () => {
            const result = await sessionManager.handleStudentLogin('Иван Иванов', '11А');

            expect(result.success).to.be.true;
            expect(result.type).to.equal(LOGIN_RESULTS.SUCCESS);
            expect(result.sessionId).to.be.a('string');
            expect(result.timeLeft).to.equal(3 * 60 * 60 * 1000); // 3 hours
            expect(result.message).to.contain('Изпитът започна');
        });

        it('should reject invalid student name', async () => {
            const result = await sessionManager.handleStudentLogin('Invalid Name', '11А');

            expect(result.success).to.be.false;
            expect(result.type).to.equal('student_not_in_class');
            expect(result.message).to.contain('не е записан в клас');
        });

        it('should reject invalid class', async () => {
            const result = await sessionManager.handleStudentLogin('Иван Иванов', '13А');

            expect(result.success).to.be.false;
            expect(result.type).to.equal('invalid_class');
            expect(result.message).to.contain('не е валиден');
        });

        it('should reject empty input', async () => {
            const result = await sessionManager.handleStudentLogin('', '');

            expect(result.success).to.be.false;
            expect(result.type).to.equal(LOGIN_RESULTS.INVALID_STUDENT);
            expect(result.message).to.contain('задължителни');
        });

        it('should reject student from wrong class', async () => {
            const result = await sessionManager.handleStudentLogin('Иван Иванов', '11Б');

            expect(result.success).to.be.false;
            expect(result.type).to.equal('student_not_in_class');
        });
    });

    describe('Session Recovery', () => {
        it('should allow student to continue existing session', async () => {
            // Create initial session
            const firstLogin = await sessionManager.handleStudentLogin('Иван Иванов', '11А');
            expect(firstLogin.success).to.be.true;

            // Simulate disconnection
            await sessionManager.markSessionDisconnected(firstLogin.sessionId);

            // Try to login again
            const secondLogin = await sessionManager.handleStudentLogin('Иван Иванов', '11А');

            expect(secondLogin.success).to.be.true;
            expect(secondLogin.type).to.equal(LOGIN_RESULTS.CONTINUE_SESSION);
            expect(secondLogin.sessionId).to.equal(firstLogin.sessionId);
            expect(secondLogin.message).to.contain('Добре дошли обратно');
        });

        it('should reject login when exam time expired', async () => {
            // Create session
            const login = await sessionManager.handleStudentLogin('Иван Иванов', '11А');
            const session = sessionManager.sessions.get(login.sessionId);

            // Manually set exam end time to past
            session.examEndTime = new Date(Date.now() - 1000).toISOString();

            // Try to login again
            const secondLogin = await sessionManager.handleStudentLogin('Иван Иванов', '11А');

            expect(secondLogin.success).to.be.false;
            expect(secondLogin.type).to.equal(LOGIN_RESULTS.EXAM_EXPIRED);
            expect(secondLogin.message).to.contain('изтекло');
        });

        it('should prevent duplicate active sessions', async () => {
            // Create first session
            const firstLogin = await sessionManager.handleStudentLogin('Иван Иванов', '11А');
            expect(firstLogin.success).to.be.true;

            // Try to create another session for same student (simulate different browser)
            const secondLogin = await sessionManager.handleStudentLogin('Иван Иванов', '11А');

            expect(secondLogin.success).to.be.true;
            expect(secondLogin.type).to.equal(LOGIN_RESULTS.CONTINUE_SESSION);
            expect(secondLogin.sessionId).to.equal(firstLogin.sessionId);
        });
    });

    describe('Session Management', () => {
        it('should update session activity', async () => {
            const login = await sessionManager.handleStudentLogin('Иван Иванов', '11А');

            const updateResult = await sessionManager.updateSessionActivity(login.sessionId, {
                code: 'console.log("Hello World");',
                filename: 'main.js'
            });

            expect(updateResult).to.be.true;

            const session = sessionManager.sessions.get(login.sessionId);
            expect(session.lastCode).to.equal('console.log("Hello World");');
        });

        it('should log suspicious activities', async () => {
            const login = await sessionManager.handleStudentLogin('Иван Иванов', '11А');

            await sessionManager.updateSessionActivity(login.sessionId, {
                suspicious: 'Опит за копиране'
            });

            const session = sessionManager.sessions.get(login.sessionId);
            expect(session.suspiciousActivities).to.have.length(1);
            expect(session.suspiciousActivities[0].type).to.equal('Опит за копиране');
        });

        it('should complete session gracefully', async () => {
            const login = await sessionManager.handleStudentLogin('Иван Иванов', '11А');

            const result = await sessionManager.completeSession(login.sessionId, 'graceful');
            expect(result).to.be.true;

            const session = sessionManager.sessions.get(login.sessionId);
            expect(session.status).to.equal(SESSION_STATES.COMPLETED);
            expect(session.terminationType).to.equal('graceful');
            expect(session.endTime).to.be.a('string');
        });

        it('should mark session as disconnected', async () => {
            const login = await sessionManager.handleStudentLogin('Иван Иванов', '11А');

            await sessionManager.markSessionDisconnected(login.sessionId);

            const session = sessionManager.sessions.get(login.sessionId);
            expect(session.status).to.equal(SESSION_STATES.DISCONNECTED);
        });
    });

    describe('Time Management', () => {
        it('should calculate remaining time correctly', async () => {
            const login = await sessionManager.handleStudentLogin('Иван Иванов', '11А');
            const session = sessionManager.sessions.get(login.sessionId);

            const remainingTime = sessionManager.calculateRemainingTime(session);

            expect(remainingTime).to.be.at.least(3 * 60 * 60 * 1000 - 1000); // Allow 1 second tolerance
            expect(remainingTime).to.be.at.most(3 * 60 * 60 * 1000);
        });

        it('should format time correctly', () => {
            const timeInMs = 2 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45 * 1000; // 2:30:45
            const formatted = sessionManager.formatTimeLeft(timeInMs);

            expect(formatted).to.equal('02:30:45');
        });

        it('should handle zero time', () => {
            const formatted = sessionManager.formatTimeLeft(0);
            expect(formatted).to.equal('00:00:00');
        });
    });

    describe('Student Name Cleaning', () => {
        it('should clean student names properly', () => {
            const cleaned = sessionManager.cleanStudentName('  иван   иванов  ');
            expect(cleaned).to.equal('Иван Иванов');
        });

        it('should handle single names', () => {
            const cleaned = sessionManager.cleanStudentName('иван');
            expect(cleaned).to.equal('Иван');
        });

        it('should preserve proper capitalization', () => {
            const cleaned = sessionManager.cleanStudentName('ИВАН ИВАНОВ');
            expect(cleaned).to.equal('Иван Иванов');
        });
    });

    describe('Session Recovery after Server Restart', () => {
        it('should load existing sessions on startup', async () => {
            // Create and save a session
            const login = await sessionManager.handleStudentLogin('Иван Иванов', '11А');
            const originalSessionId = login.sessionId;

            // Create new SessionManager (simulating restart)
            const newSessionManager = new SessionManager(testDir);
            await new Promise(resolve => setTimeout(resolve, 200)); // Wait for loading

            // Check if session was loaded
            const loadedSession = newSessionManager.sessions.get(originalSessionId);
            expect(loadedSession).to.not.be.undefined;
            expect(loadedSession.studentName).to.equal('Иван Иванов');
            expect(loadedSession.studentClass).to.equal('11А');
        });
    });

    describe('Active Sessions', () => {
        it('should return active sessions for teacher dashboard', async () => {
            await sessionManager.handleStudentLogin('Иван Иванов', '11А');
            await sessionManager.handleStudentLogin('Петър Петров', '11А');

            const activeSessions = sessionManager.getActiveSessions();

            expect(activeSessions).to.have.length(2);
            expect(activeSessions[0]).to.have.property('timeLeft');
            expect(activeSessions[0]).to.have.property('formattedTimeLeft');
        });

        it('should exclude completed sessions from active list', async () => {
            const login = await sessionManager.handleStudentLogin('Иван Иванов', '11А');
            await sessionManager.completeSession(login.sessionId);

            const activeSessions = sessionManager.getActiveSessions();
            expect(activeSessions).to.have.length(0);
        });
    });
});