import fs from 'fs/promises';
import path from 'path';

export class JSONDataStore {
    constructor(baseDir) {
        this.baseDir = baseDir;
        this.dataDir = path.join(baseDir, 'data');
        this.classesDir = path.join(this.dataDir, 'classes');

        this.ensureDirectories();
    }

    /**
     * Ensure all required directories exist
     */
    async ensureDirectories() {
        const dirs = [
            this.dataDir,
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
     * Check if a date is today
     */
    isToday(dateString) {
        const today = new Date().toISOString().split('T')[0];
        const checkDate = new Date(dateString).toISOString().split('T')[0];
        return today === checkDate;
    }

    /**
     * Save session to student directory
     */
    async saveSession(session) {
        try {
            const studentDir = await this.findStudentDirectoryBySession(session.sessionId);
            if (!studentDir) {
                throw new Error(`Student directory not found for session: ${session.sessionId}`);
            }

            const filePath = path.join(studentDir, 'session.json');
            await fs.writeFile(filePath, JSON.stringify(session, null, 2));
            console.log(`Session saved: ${session.sessionId}`);

        } catch (error) {
            console.error('Error saving session:', error);
            throw error;
        }
    }

    /**
     * Load session by ID from student directory
     */
    async loadSession(sessionId) {
        try {
            const studentDir = await this.findStudentDirectoryBySession(sessionId);
            if (!studentDir) {
                return null;
            }

            const filePath = path.join(studentDir, 'session.json');
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
     * Load all sessions for today by scanning student directories
     */
    async loadTodaysSessions() {
        try {
            const sessions = [];

            // Check if classes directory exists
            try {
                await fs.access(this.classesDir);
            } catch {
                return []; // Directory doesn't exist yet
            }

            // Scan all class directories
            const classes = await fs.readdir(this.classesDir);

            for (const className of classes) {
                const classPath = path.join(this.classesDir, className);

                // Check if it's a directory
                const classStat = await fs.stat(classPath);
                if (!classStat.isDirectory()) continue;

                // Scan all student directories in this class
                const students = await fs.readdir(classPath);

                for (const studentFolder of students) {
                    const studentPath = path.join(classPath, studentFolder);
                    const sessionPath = path.join(studentPath, 'session.json');

                    try {
                        const data = await fs.readFile(sessionPath, 'utf8');
                        const session = JSON.parse(data);

                        // Only include today's sessions
                        if (this.isToday(session.startTime)) {
                            sessions.push(session);
                        }
                    } catch (error) {
                        // Skip if session.json doesn't exist or is invalid
                        continue;
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

            // Create only necessary directories
            await fs.mkdir(path.join(studentDir, 'data'), { recursive: true });

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
     * Find student directory by session ID with proper case handling
     * SIMPLIFIED: Direct path construction from sessionId
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

            // Construct direct path: data/classes/{CLASS}/{sessionId}/
            const studentPath = path.join(this.classesDir, sessionClass, sessionId);

            // Check if directory exists
            try {
                await fs.access(studentPath);
                console.log(`Found student directory: ${studentPath}`);
                return studentPath;
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.warn(`Student directory not found: ${studentPath}`);
                } else {
                    console.error(`Error accessing student directory ${studentPath}:`, error);
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
     * Save student code file
     */
    async saveStudentCode(sessionId, codeData) {
        try {
            const studentDir = await this.findStudentDirectoryBySession(sessionId);
            if (!studentDir) {
                console.warn(`Student directory not found for session ${sessionId}`);
                return;
            }

            const codeDir = path.join(studentDir, 'code');
            await fs.mkdir(codeDir, { recursive: true });

            const filename = codeData.filename || 'main.js';
            const codePath = path.join(codeDir, filename);
            await fs.writeFile(codePath, codeData.code);

        } catch (error) {
            console.error(`Error saving student code:`, error);
        }
    }

    /**
     * Log suspicious activity for a student
     */
    async logSuspiciousActivity(sessionId, activityData) {
        try {
            const studentDir = await this.findStudentDirectoryBySession(sessionId);
            if (!studentDir) {
                console.warn(`Student directory not found for session ${sessionId}`);
                return;
            }

            const logPath = path.join(studentDir, 'activity-log.json');

            let activities = [];
            try {
                const existingData = await fs.readFile(logPath, 'utf8');
                activities = JSON.parse(existingData);
            } catch (e) {
                // File doesn't exist yet, start with empty array
            }

            activities.push(activityData);
            await fs.writeFile(logPath, JSON.stringify(activities, null, 2));

        } catch (error) {
            console.error(`Error logging suspicious activity:`, error);
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