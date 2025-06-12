import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class StudentDataManager {
    constructor(originalDataPath) {
        this.originalDataPath = originalDataPath;
        this.studentDataBase = path.join(__dirname, '../exam-server/student-data');
    }

    // Създава копие на оригиналните данни за ученик
    async initializeStudentData(studentId) {
        const examDate = new Date().toISOString().split('T')[0];
        const studentPath = path.join(this.studentDataBase, examDate, `student-${studentId}`);
        const studentDataPath = path.join(studentPath, 'data');

        // Създаваме директориите ако не съществуват
        if (!fs.existsSync(studentDataPath)) {
            fs.mkdirSync(studentDataPath, { recursive: true });

            // Копираме всички JSON файлове от оригиналната data папка
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

    // Връща пътя към данните на ученика
    getStudentDataPath(studentId) {
        if (!studentId) {
            return this.originalDataPath; // Ако няма student ID, използваме оригиналните данни
        }

        const examDate = new Date().toISOString().split('T')[0];
        const studentDataPath = path.join(
            this.studentDataBase,
            examDate,
            `student-${studentId}`,
            'data'
        );

        // Проверяваме дали съществува
        if (!fs.existsSync(studentDataPath)) {
            this.initializeStudentData(studentId);
        }

        return studentDataPath;
    }

    // Чете JSON файл за конкретен ученик
    readJsonFile(studentId, filename) {
        const dataPath = this.getStudentDataPath(studentId);
        const filePath = path.join(dataPath, filename);

        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        return null;
    }

    // Записва JSON файл за конкретен ученик
    writeJsonFile(studentId, filename, data) {
        const dataPath = this.getStudentDataPath(studentId);
        const filePath = path.join(dataPath, filename);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // Връща всички данни за ученик
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