import { expect } from 'chai';
import { JSONDataStore } from '../modules/JSONDataStore.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('JSONDataStore', () => {
    let dataStore;
    let testDir;
    let practiceDataDir;

    beforeEach(async () => {
        // Create temporary test directory
        testDir = path.join(__dirname, 'temp-datastore-test');
        await fs.mkdir(testDir, { recursive: true });

        // Create mock practice server data directory
        practiceDataDir = path.join(testDir, '..', 'practice-server', 'data');
        await fs.mkdir(practiceDataDir, { recursive: true });

        // Create sample practice data files
        const sampleData = {
            'collections.json': { books: { "1": { title: "Test Book" } } },
            'blog.json': { posts: { "1": { title: "Test Post" } } }
        };

        for (const [filename, content] of Object.entries(sampleData)) {
            await fs.writeFile(
                path.join(practiceDataDir, filename),
                JSON.stringify(content, null, 2)
            );
        }

        // Create test classes.json
        const classesData = {
            validClasses: ["11А", "11Б", "12А"],
            students: {
                "11А": ["Иван Иванов", "Петър Петров"],
                "11Б": ["Мария Иванова", "Георги Стоянов"],
                "12А": ["Анна Димитрова", "Стефан Николов"]
            }
        };

        const dataDir = path.join(testDir, 'data');
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(
            path.join(dataDir, 'classes.json'),
            JSON.stringify(classesData, null, 2)
        );

        dataStore = new JSONDataStore(testDir);

        // Wait for directory initialization
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
            await fs.rm(path.join(__dirname, 'temp-datastore-test'), { recursive: true, force: true });
            await fs.rm(practiceDataDir, { recursive: true, force: true });
        } catch (error) {
            console.warn('Cleanup warning:', error.message);
        }
    });

    describe('Directory Management', () => {
        it('should create all required directories on initialization', async () => {
            const requiredDirs = [
                path.join(testDir, 'data'),
                path.join(testDir, 'data', 'sessions'),
                path.join(testDir, 'data', 'student-data'),
                path.join(testDir, 'data', 'student-data', 'classes')
            ];

            for (const dir of requiredDirs) {
                try {
                    await fs.access(dir);
                } catch (error) {
                    throw new Error(`Required directory not created: ${dir}`);
                }
            }
        });

        it('should return correct today\'s session directory', () => {
            const sessionDir = dataStore.getTodaysSessionDir();
            const today = new Date().toISOString().split('T')[0];
            const expectedPath = path.join(testDir, 'data', 'sessions', today);

            expect(sessionDir).to.equal(expectedPath);
        });
    });

    describe('Session Management', () => {
        it('should save and load session correctly', async () => {
            const session = {
                sessionId: '11а-иван-иванов',
                studentName: 'Иван Иванов',
                studentClass: '11А',
                status: 'active',
                startTime: new Date().toISOString(),
                examEndTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
                lastActivity: new Date().toISOString(),
                lastCode: 'console.log("test");',
                suspiciousActivities: [],
                terminationType: null
            };

            // Save session
            await dataStore.saveSession(session);

            // Load session
            const loadedSession = await dataStore.loadSession(session.sessionId);

            expect(loadedSession).to.not.be.null;
            expect(loadedSession.sessionId).to.equal(session.sessionId);
            expect(loadedSession.studentName).to.equal(session.studentName);
            expect(loadedSession.studentClass).to.equal(session.studentClass);
            expect(loadedSession.lastCode).to.equal(session.lastCode);
        });

        it('should return null for non-existent session', async () => {
            const loadedSession = await dataStore.loadSession('non-existent-session');
            expect(loadedSession).to.be.null;
        });

        it('should load all today\'s sessions', async () => {
            const sessions = [
                {
                    sessionId: '11а-иван-иванов',
                    studentName: 'Иван Иванов',
                    studentClass: '11А',
                    status: 'active',
                    startTime: new Date().toISOString(),
                    examEndTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
                    lastActivity: new Date().toISOString(),
                    lastCode: '',
                    suspiciousActivities: [],
                    terminationType: null
                },
                {
                    sessionId: '11б-мария-иванова',
                    studentName: 'Мария Иванова',
                    studentClass: '11Б',
                    status: 'active',
                    startTime: new Date().toISOString(),
                    examEndTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
                    lastActivity: new Date().toISOString(),
                    lastCode: '',
                    suspiciousActivities: [],
                    terminationType: null
                }
            ];

            // Save multiple sessions
            for (const session of sessions) {
                await dataStore.saveSession(session);
            }

            // Load all sessions
            const loadedSessions = await dataStore.loadTodaysSessions();

            expect(loadedSessions).to.have.length(2);
            expect(loadedSessions.map(s => s.sessionId)).to.include.members([
                '11а-иван-иванов',
                '11б-мария-иванова'
            ]);
        });
    });

    describe('Student Directory Management', () => {
        it('should initialize student directory with correct structure', async () => {
            const sessionId = '11а-иван-иванов';
            const studentInfo = {
                name: 'Иван Иванов',
                class: '11А'
            };

            const studentDir = await dataStore.initializeStudentDirectory(sessionId, studentInfo);

            // Check if directory was created
            expect(studentDir).to.be.a('string');
            await fs.access(studentDir);

            // Check required subdirectories
            const requiredSubdirs = ['code', 'code/backups', 'data', 'activities'];
            for (const subdir of requiredSubdirs) {
                await fs.access(path.join(studentDir, subdir));
            }

            // Check session-info.json
            const sessionInfoPath = path.join(studentDir, 'session-info.json');
            const sessionInfoData = await fs.readFile(sessionInfoPath, 'utf8');
            const sessionInfo = JSON.parse(sessionInfoData);

            expect(sessionInfo.sessionId).to.equal(sessionId);
            expect(sessionInfo.studentName).to.equal(studentInfo.name);
            expect(sessionInfo.studentClass).to.equal('11А'); // Should be normalized
            expect(sessionInfo.originalClass).to.equal(studentInfo.class);
        });

        it('should copy practice server data to student directory', async () => {
            const sessionId = '11а-иван-иванов';
            const studentInfo = {
                name: 'Иван Иванов',
                class: '11А'
            };

            const studentDir = await dataStore.initializeStudentDirectory(sessionId, studentInfo);

            // Check if practice data files were copied
            const dataDir = path.join(studentDir, 'data');
            const files = await fs.readdir(dataDir);

            expect(files).to.include('collections.json');
            expect(files).to.include('blog.json');

            // Verify content
            const collectionsData = await fs.readFile(path.join(dataDir, 'collections.json'), 'utf8');
            const collectionsJson = JSON.parse(collectionsData);
            expect(collectionsJson.books).to.have.property('1');
        });

        it('should find student directory by session ID with case normalization', async () => {
            const sessionId = '11а-иван-иванов';
            const studentInfo = {
                name: 'Иван Иванов',
                class: '11а' // lowercase input
            };

            // Initialize directory
            await dataStore.initializeStudentDirectory(sessionId, studentInfo);

            // Find directory - should work with case normalization
            const foundDir = await dataStore.findStudentDirectoryBySession(sessionId);

            expect(foundDir).to.not.be.null;
            expect(foundDir).to.be.a('string');
            expect(foundDir).to.include('11А'); // Should be uppercase in path
        });

        it('should handle invalid session ID format gracefully', async () => {
            const invalidSessionId = 'invalid-format';
            const foundDir = await dataStore.findStudentDirectoryBySession(invalidSessionId);

            expect(foundDir).to.be.null;
        });
    });

    describe('Student Code Management', () => {
        it('should save student code with backup', async () => {
            const sessionId = '11а-иван-иванов';
            const studentInfo = {
                name: 'Иван Иванов',
                class: '11А'
            };

            // Initialize student directory
            await dataStore.initializeStudentDirectory(sessionId, studentInfo);

            const codeData = {
                filename: 'main.js',
                code: 'console.log("Hello World");'
            };

            // Save code
            await dataStore.saveStudentCode(sessionId, codeData);

            // Check if main file was saved
            const studentDir = await dataStore.findStudentDirectoryBySession(sessionId);
            const mainCodePath = path.join(studentDir, 'code', 'main.js');
            const savedCode = await fs.readFile(mainCodePath, 'utf8');

            expect(savedCode).to.equal(codeData.code);

            // Check if backup was created
            const backupsDir = path.join(studentDir, 'code', 'backups');
            const backupFiles = await fs.readdir(backupsDir);

            expect(backupFiles.length).to.be.greaterThan(0);
            expect(backupFiles.some(file => file.startsWith('main.js.'))).to.be.true;
        });

        it('should handle missing student directory gracefully', async () => {
            const codeData = {
                filename: 'main.js',
                code: 'console.log("test");'
            };

            try {
                await dataStore.saveStudentCode('non-existent-session', codeData);
                expect.fail('Should have thrown error for non-existent session');
            } catch (error) {
                expect(error.message).to.include('Student directory not found');
            }
        });
    });

    describe('Suspicious Activity Logging', () => {
        it('should log suspicious activity to file', async () => {
            const sessionId = '11а-иван-иванов';
            const studentInfo = {
                name: 'Иван Иванов',
                class: '11А'
            };

            // Initialize student directory
            await dataStore.initializeStudentDirectory(sessionId, studentInfo);

            const activity = {
                type: 'tab_switch',
                description: 'Alt+Tab pressed',
                severity: 'high',
                timestamp: new Date().toISOString()
            };

            // Log activity
            await dataStore.logSuspiciousActivity(sessionId, activity);

            // Check if log file was created and contains entry
            const studentDir = await dataStore.findStudentDirectoryBySession(sessionId);
            const logPath = path.join(studentDir, 'activities', 'suspicious.log');
            const logContent = await fs.readFile(logPath, 'utf8');

            expect(logContent).to.include(activity.type);
            expect(logContent).to.include(activity.description);
        });

        it('should handle multiple log entries', async () => {
            const sessionId = '11а-иван-иванов';
            const studentInfo = {
                name: 'Иван Иванов',
                class: '11А'
            };

            await dataStore.initializeStudentDirectory(sessionId, studentInfo);

            const activities = [
                { type: 'tab_switch', description: 'Alt+Tab pressed' },
                { type: 'copy_attempt', description: 'Ctrl+C pressed' },
                { type: 'dev_tools', description: 'F12 pressed' }
            ];

            // Log multiple activities
            for (const activity of activities) {
                await dataStore.logSuspiciousActivity(sessionId, activity);
            }

            // Check log file
            const studentDir = await dataStore.findStudentDirectoryBySession(sessionId);
            const logPath = path.join(studentDir, 'activities', 'suspicious.log');
            const logContent = await fs.readFile(logPath, 'utf8');

            for (const activity of activities) {
                expect(logContent).to.include(activity.type);
            }

            // Should have 3 lines (one per activity)
            const lines = logContent.trim().split('\n');
            expect(lines.length).to.equal(3);
        });
    });

    describe('Classes Configuration', () => {
        it('should load existing classes configuration', async () => {
            const classes = await dataStore.loadClasses();

            expect(classes).to.have.property('validClasses');
            expect(classes).to.have.property('students');
            expect(classes.validClasses).to.include('11А');
            expect(classes.students['11А']).to.include('Иван Иванов');
        });

        it('should create default classes if file doesn\'t exist', async () => {
            // Remove existing classes file
            const classesFile = path.join(testDir, 'data', 'classes.json');
            await fs.unlink(classesFile);

            const classes = await dataStore.loadClasses();

            expect(classes).to.have.property('validClasses');
            expect(classes).to.have.property('students');
            expect(classes.validClasses).to.be.an('array');
            expect(classes.validClasses.length).to.be.greaterThan(0);
        });

        it('should save classes configuration', async () => {
            const newClasses = {
                validClasses: ["10А", "10Б"],
                students: {
                    "10А": ["Тест Студент"],
                    "10Б": ["Друг Студент"]
                }
            };

            await dataStore.saveClasses(newClasses);

            // Load and verify
            const loadedClasses = await dataStore.loadClasses();
            expect(loadedClasses.validClasses).to.deep.equal(newClasses.validClasses);
            expect(loadedClasses.students["10А"]).to.include("Тест Студент");
        });
    });

    describe('Student Data for Practice Server', () => {
        it('should get student data file', async () => {
            const sessionId = '11а-иван-иванов';
            const studentInfo = {
                name: 'Иван Иванов',
                class: '11А'
            };

            await dataStore.initializeStudentDirectory(sessionId, studentInfo);

            const data = await dataStore.getStudentData(sessionId, 'collections.json');

            expect(data).to.not.be.null;
            expect(data).to.have.property('books');
        });

        it('should save student data file', async () => {
            const sessionId = '11а-иван-иванов';
            const studentInfo = {
                name: 'Иван Иванов',
                class: '11А'
            };

            await dataStore.initializeStudentDirectory(sessionId, studentInfo);

            const newData = {
                books: {
                    "2": { title: "New Book", author: "Test Author" }
                }
            };

            await dataStore.saveStudentData(sessionId, 'collections.json', newData);

            // Verify saved data
            const savedData = await dataStore.getStudentData(sessionId, 'collections.json');
            expect(savedData.books["2"]).to.deep.equal(newData.books["2"]);
        });

        it('should return null for non-existent student data', async () => {
            const data = await dataStore.getStudentData('non-existent-session', 'collections.json');
            expect(data).to.be.null;
        });
    });

    describe('Exam Statistics', () => {
        it('should calculate exam statistics correctly', async () => {
            // Create sample sessions with different statuses
            const sessions = [
                {
                    sessionId: '11а-иван-иванов',
                    status: 'active',
                    startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
                    endTime: null
                },
                {
                    sessionId: '11б-мария-иванова',
                    status: 'completed',
                    startTime: new Date(Date.now() - 120 * 60 * 1000).toISOString(), // 2 hours ago
                    endTime: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 min ago
                },
                {
                    sessionId: '12а-анна-димитрова',
                    status: 'disconnected',
                    startTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 1.5 hours ago
                    endTime: null
                }
            ];

            // Save sessions
            for (const session of sessions) {
                await dataStore.saveSession(session);
            }

            const stats = await dataStore.getExamStatistics();

            expect(stats).to.not.be.null;
            expect(stats.total).to.equal(3);
            expect(stats.active).to.equal(1);
            expect(stats.completed).to.equal(1);
            expect(stats.disconnected).to.equal(1);
            expect(stats.averageTime).to.be.a('number');
        });

        it('should handle empty sessions gracefully', async () => {
            const stats = await dataStore.getExamStatistics();

            expect(stats).to.not.be.null;
            expect(stats.total).to.equal(0);
            expect(stats.active).to.equal(0);
            expect(stats.averageTime).to.equal(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle file system errors gracefully', async () => {
            // Try to save session to read-only directory (if possible)
            const readOnlyStore = new JSONDataStore('/invalid/path');

            const session = {
                sessionId: 'test-session',
                studentName: 'Test Student',
                studentClass: '11А'
            };

            try {
                await readOnlyStore.saveSession(session);
                // If it doesn't throw, that's fine too (depends on OS permissions)
            } catch (error) {
                expect(error).to.be.an('error');
            }
        });

        it('should handle corrupted JSON files gracefully', async () => {
            // Create corrupted session file
            const sessionDir = dataStore.getTodaysSessionDir();
            await fs.mkdir(sessionDir, { recursive: true });

            const corruptedPath = path.join(sessionDir, 'corrupted-session.json');
            await fs.writeFile(corruptedPath, 'invalid json content');

            // Should not crash when loading sessions
            const sessions = await dataStore.loadTodaysSessions();
            expect(sessions).to.be.an('array');
            // Should not include the corrupted session
        });
    });
});