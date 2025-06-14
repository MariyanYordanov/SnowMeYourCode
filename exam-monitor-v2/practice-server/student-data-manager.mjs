import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class StudentDataManager {
    constructor(originalDataPath) {
        this.originalDataPath = originalDataPath;
        this.studentDataBase = path.join(__dirname, '../../exam-server/student-data');
    }

    // Initialize student data for a specific student
    async initializeStudentData(studentId) {
        const examDate = new Date().toISOString().split('T')[0];
        const studentPath = path.join(this.studentDataBase, examDate, `student-${studentId}`);
        const studentDataPath = path.join(studentPath, 'data');

        // Create the student directory if it doesn't exist
        if (!fs.existsSync(studentDataPath)) {
            fs.mkdirSync(studentDataPath, { recursive: true });

            // Copy original data files to the student's directory
            const files = fs.readdirSync(this.originalDataPath);

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const source = path.join(this.originalDataPath, file);
                    const dest = path.join(studentDataPath, file);
                    fs.copyFileSync(source, dest);
                }
            }

            console.log(`Initialized data for student ${studentId}`);
        }

        return studentDataPath;
    }

    // Retrieves the path for a student's data
    getStudentDataPath(studentId) {
        if (!studentId) {
            return this.originalDataPath; // Return original data path if no student ID is provided
        }

        const examDate = new Date().toISOString().split('T')[0];
        const studentDataPath = path.join(
            this.studentDataBase,
            examDate,
            `student-${studentId}`,
            'data'
        );

        // Ensure the student's data directory exists
        if (!fs.existsSync(studentDataPath)) {
            this.initializeStudentData(studentId);
        }

        return studentDataPath;
    }

    // Reads a JSON file for a specific student
    readJsonFile(studentId, filename) {
        const dataPath = this.getStudentDataPath(studentId);
        const filePath = path.join(dataPath, filename);

        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        return null;
    }

    // Writes data to a JSON file for a specific student
    writeJsonFile(studentId, filename, data) {
        const dataPath = this.getStudentDataPath(studentId);
        const filePath = path.join(dataPath, filename);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // Retrieves all data for a specific student
    getAllStudentData(studentId) {
        const studentData = {};
        const dataPath = this.getStudentDataPath(studentId);

        fs.readdirSync(dataPath).forEach(file => {
            if (file.endsWith('.json')) {
                const collection = file.slice(0, -5);
                studentData[collection] = this.readJsonFile(studentId, file);
            }
        });

        return studentData;
    }
}