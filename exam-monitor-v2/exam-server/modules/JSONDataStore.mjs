import fs from 'fs/promises';
import path from 'path';

export class JSONDataStore {
    constructor(baseDir) {
        this.baseDir = baseDir;
        this.dataDir = path.join(baseDir, 'data');
        this.sessionsDir = path.join(this.dataDir, 'sessions');
        this.studentDataDir = path.join(this.dataDir, 'student-data');
        this.classesDir = path.join(this.studentDataDir, 'classes');

        this.ensureDirectories();
    }

    /**
     * Ensure all required directories exist
     */
    async ensureDirectories() {
        const dirs = [
            this.dataDir,
            this.sessionsDir,
            this.studentDataDir,
            this.classesDir
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.error(`Error creating directory ${dir}:`, error);
            }
        }
    }

    /**
     * Get today's session directory
     */
    getTodaysSessionDir() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return path.join(this.sessionsDir, today);
    }

    /**
     * Save session to file with human-readable name
     */
    async saveSession(session) {
        try {
            const sessionDir = this.getTodaysSessionDir();
            await fs.mkdir(sessionDir, { recursive: true });

            // Use human-readable session ID as filename
            const filename = `${session.sessionId}.json`;
            const filePath = path.join(sessionDir, filename);

            await fs.writeFile(filePath, JSON.stringify(session, null, 2));
            console.log(`Session saved: ${filename}`);

        } catch (error) {
            console.error('Error saving session:', error);
            throw error;
        }
    }

    /**
     * Load session by ID
     */
    async loadSession(sessionId) {
        try {
            const sessionDir = this.getTodaysSessionDir();
            const filePath = path.join(sessionDir, `${sessionId}.json`);

            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);

        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error loading session:', error);
            }
            return null;
        }
    }

    /**
     * Load all sessions for today
     */
    async loadTodaysSessions() {
        try {
            const sessionDir = this.getTodaysSessionDir();

            // Check if directory exists
            try {
                await fs.access(sessionDir);
            } catch {
                return []; // Directory doesn't exist yet
            }

            const files = await fs.readdir(sessionDir);
            const sessions = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(sessionDir, file);
                        const data = await fs.readFile(filePath, 'utf8');
                        const session = JSON.parse(data);
                        sessions.push(session);
                    } catch (error) {
                        console.error(`Error loading session file ${file}:`, error);
                    }
                }
            }

            return sessions;

        } catch (error) {
            console.error('Error loading today\'s sessions:', error);
            return [];
        }
    }

    /**
     * Initialize student directory structure with normalized class names
     */
    async initializeStudentDirectory(sessionId, studentInfo) {
        try {
            // Normalize class name to uppercase for directory structure
            const normalizedClass = studentInfo.class.toUpperCase();

            // Create directory name from session ID (already human-readable)
            const studentDirName = sessionId; // e.g., "11а-ivan-ivanov"
            const studentDir = path.join(this.classesDir, normalizedClass, studentDirName);

            // Create directories
            await fs.mkdir(path.join(studentDir, 'code'), { recursive: true });
            await fs.mkdir(path.join(studentDir, 'code', 'backups'), { recursive: true });
            await fs.mkdir(path.join(studentDir, 'data'), { recursive: true });
            await fs.mkdir(path.join(studentDir, 'activities'), { recursive: true });

            // Save session info
            const sessionInfoPath = path.join(studentDir, 'session-info.json');
            const sessionInfo = {
                sessionId,
                studentName: studentInfo.name,
                studentClass: normalizedClass, // Store normalized class
                originalClass: studentInfo.class, // Keep original for reference
                createdAt: new Date().toISOString(),
                directoryPath: studentDir
            };

            await fs.writeFile(sessionInfoPath, JSON.stringify(sessionInfo, null, 2));

            // Copy practice server data for this student
            await this.copyPracticeData(studentDir);

            console.log(`Initialized directory: ${normalizedClass}/${studentDirName}`);
            return studentDir;

        } catch (error) {
            console.error('Error initializing student directory:', error);
            throw error;
        }
    }

    /**
     * Copy practice server data to student directory
     */
    async copyPracticeData(studentDir) {
        try {
            const sourceDir = path.join(this.baseDir, '..', 'practice-server', 'data');
            const targetDir = path.join(studentDir, 'data');

            // Check if source directory exists
            try {
                await fs.access(sourceDir);
            } catch {
                console.warn('Practice server data directory not found');
                return;
            }

            const files = await fs.readdir(sourceDir);

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const sourcePath = path.join(sourceDir, file);
                    const targetPath = path.join(targetDir, file);

                    const data = await fs.readFile(sourcePath, 'utf8');
                    await fs.writeFile(targetPath, data);
                }
            }

            console.log(`Copied practice data to student directory`);

        } catch (error) {
            console.error('Error copying practice data:', error);
        }
    }

    /**
     * Save student code
     */
    async saveStudentCode(sessionId, codeData) {
        try {
            // Find student directory by session ID
            const studentDir = await this.findStudentDirectoryBySession(sessionId);
            if (!studentDir) {
                throw new Error(`Student directory not found for session ${sessionId}`);
            }

            const codeDir = path.join(studentDir, 'code');
            const filename = codeData.filename || 'main.js';
            const filePath = path.join(codeDir, filename);

            // Save current code
            await fs.writeFile(filePath, codeData.code || '');

            // Save timestamped backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFilename = `${filename}.${timestamp}.backup`;
            const backupPath = path.join(codeDir, 'backups', backupFilename);

            await fs.writeFile(backupPath, codeData.code || '');

            console.log(`Code saved: ${filename} for session ${sessionId}`);

        } catch (error) {
            console.error('Error saving student code:', error);
            throw error;
        }
    }

    /**
     * Save suspicious activity log
     */
    async logSuspiciousActivity(sessionId, activity) {
        try {
            const studentDir = await this.findStudentDirectoryBySession(sessionId);
            if (!studentDir) return;

            const activitiesDir = path.join(studentDir, 'activities');
            const logFile = path.join(activitiesDir, 'suspicious.log');

            const logEntry = `${new Date().toISOString()} - ${activity.type} - ${activity.description || ''}\n`;

            // Append to log file
            await fs.appendFile(logFile, logEntry);

        } catch (error) {
            console.error('Error logging suspicious activity:', error);
        }
    }

    /**
     * Find student directory by session ID with proper case handling
     */
    async findStudentDirectoryBySession(sessionId) {
        try {
            // Extract class from session ID format: "11а-ivan-ivanov" or "11а-ivan-ivanov-1"
            const parts = sessionId.split('-');
            if (parts.length < 3) {
                console.error(`Invalid session ID format: ${sessionId}`);
                return null;
            }

            // First part is class, normalize to uppercase for directory lookup
            const sessionClass = parts[0].toUpperCase(); // "11А"

            // Look in the specific class directory
            const classPath = path.join(this.classesDir, sessionClass);

            try {
                const students = await fs.readdir(classPath);

                for (const studentDir of students) {
                    const studentPath = path.join(classPath, studentDir);
                    const sessionInfoPath = path.join(studentPath, 'session-info.json');

                    try {
                        const data = await fs.readFile(sessionInfoPath, 'utf8');
                        const sessionInfo = JSON.parse(data);

                        if (sessionInfo.sessionId === sessionId) {
                            console.log(`Found student directory: ${studentPath}`);
                            return studentPath;
                        }
                    } catch {
                        // Skip if session-info.json doesn't exist or is invalid
                        continue;
                    }
                }

                console.warn(`Student directory not found for session ${sessionId} in class ${sessionClass}`);
                return null;

            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.warn(`Class directory doesn't exist: ${classPath}`);
                } else {
                    console.error(`Error reading class directory ${classPath}:`, error);
                }
                return null;
            }

        } catch (error) {
            console.error('Error finding student directory:', error);
            return null;
        }
    }

    /**
     * Load classes configuration
     */
    async loadClasses() {
        try {
            const classesFile = path.join(this.dataDir, 'classes.json');
            const data = await fs.readFile(classesFile, 'utf8');
            return JSON.parse(data);

        } catch (error) {
            if (error.code === 'ENOENT') {
                // Create default classes file
                const defaultClasses = {
                    validClasses: ["11А", "11Б", "12А", "12Б"],
                    students: {
                        "11А": ["Петър Петров", "Мария Иванова"],
                        "11Б": ["Иван Иванов", "Георги Стоянов"],
                        "12А": ["Анна Димитрова", "Стефан Николов"],
                        "12Б": ["Елена Стоянова", "Димитър Петков"]
                    }
                };

                await this.saveClasses(defaultClasses);
                return defaultClasses;
            }

            console.error('Error loading classes:', error);
            throw error;
        }
    }

    /**
     * Save classes configuration
     */
    async saveClasses(classesData) {
        try {
            const classesFile = path.join(this.dataDir, 'classes.json');
            await fs.writeFile(classesFile, JSON.stringify(classesData, null, 2));

        } catch (error) {
            console.error('Error saving classes:', error);
            throw error;
        }
    }

    /**
     * Get student data for practice server
     */
    async getStudentData(sessionId, filename) {
        try {
            const studentDir = await this.findStudentDirectoryBySession(sessionId);
            if (!studentDir) return null;

            const dataPath = path.join(studentDir, 'data', filename);
            const data = await fs.readFile(dataPath, 'utf8');
            return JSON.parse(data);

        } catch (error) {
            console.error(`Error loading student data ${filename}:`, error);
            return null;
        }
    }

    /**
     * Save student data for practice server
     */
    async saveStudentData(sessionId, filename, data) {
        try {
            const studentDir = await this.findStudentDirectoryBySession(sessionId);
            if (!studentDir) {
                throw new Error(`Student directory not found for session ${sessionId}`);
            }

            const dataPath = path.join(studentDir, 'data', filename);
            await fs.writeFile(dataPath, JSON.stringify(data, null, 2));

        } catch (error) {
            console.error(`Error saving student data ${filename}:`, error);
            throw error;
        }
    }

    /**
     * Get exam statistics
     */
    async getExamStatistics() {
        try {
            const sessions = await this.loadTodaysSessions();

            const stats = {
                total: sessions.length,
                active: 0,
                disconnected: 0,
                completed: 0,
                expired: 0,
                averageTime: 0
            };

            const now = new Date();
            let totalTimeSpent = 0;

            for (const session of sessions) {
                switch (session.status) {
                    case 'active':
                        stats.active++;
                        break;
                    case 'disconnected':
                        stats.disconnected++;
                        break;
                    case 'completed':
                        stats.completed++;
                        break;
                    case 'expired':
                        stats.expired++;
                        break;
                }

                // Calculate time spent
                const startTime = new Date(session.startTime);
                const endTime = session.endTime ? new Date(session.endTime) : now;
                totalTimeSpent += endTime.getTime() - startTime.getTime();
            }

            if (sessions.length > 0) {
                stats.averageTime = Math.floor(totalTimeSpent / sessions.length / 1000 / 60); // minutes
            }

            return stats;

        } catch (error) {
            console.error('Error getting exam statistics:', error);
            return null;
        }
    }
}