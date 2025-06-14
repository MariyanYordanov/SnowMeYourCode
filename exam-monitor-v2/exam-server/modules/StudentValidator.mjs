import { JSONDataStore } from './JSONDataStore.mjs';

export const VALIDATION_RESULTS = {
    VALID: 'valid',
    INVALID_CLASS: 'invalid_class',
    INVALID_STUDENT: 'invalid_student',
    STUDENT_NOT_IN_CLASS: 'student_not_in_class'
};

export class StudentValidator {
    constructor(baseDir) {
        this.dataStore = new JSONDataStore(baseDir);
        this.classes = null;
        this.loadClasses();
    }

    /**
     * Load classes configuration
     */
    async loadClasses() {
        try {
            this.classes = await this.dataStore.loadClasses();
            console.log(`📚 Loaded classes: ${this.classes.validClasses.join(', ')}`);
        } catch (error) {
            console.error('Error loading classes:', error);
            this.classes = null;
        }
    }

    /**
     * Validate student name and class
     */
    async validateStudent(studentName, studentClass) {
        // Ensure classes are loaded
        if (!this.classes) {
            await this.loadClasses();
        }

        if (!this.classes) {
            return {
                valid: false,
                type: 'error',
                message: 'Грешка при зареждане на конфигурацията на класовете'
            };
        }

        // Validate class
        if (!this.isValidClass(studentClass)) {
            return {
                valid: false,
                type: VALIDATION_RESULTS.INVALID_CLASS,
                message: `Клас "${studentClass}" не е валиден. Валидни класове: ${this.classes.validClasses.join(', ')}`
            };
        }

        // Validate student name format
        if (!this.isValidStudentName(studentName)) {
            return {
                valid: false,
                type: VALIDATION_RESULTS.INVALID_STUDENT,
                message: 'Името трябва да съдържа само български букви и интервали'
            };
        }

        // Check if student is in the specified class
        if (!this.isStudentInClass(studentName, studentClass)) {
            const classStudents = this.classes.students[studentClass] || [];
            return {
                valid: false,
                type: VALIDATION_RESULTS.STUDENT_NOT_IN_CLASS,
                message: `Студент "${studentName}" не е записан в клас "${studentClass}". Студенти в този клас: ${classStudents.join(', ')}`
            };
        }

        return {
            valid: true,
            type: VALIDATION_RESULTS.VALID,
            message: 'Валиден студент'
        };
    }

    /**
     * Check if class is valid
     */
    isValidClass(className) {
        return this.classes && this.classes.validClasses.includes(className);
    }

    /**
     * Check if student name format is valid
     */
    isValidStudentName(name) {
        if (!name || typeof name !== 'string') {
            return false;
        }

        const trimmedName = name.trim();

        // Must have at least first and last name
        const nameParts = trimmedName.split(/\s+/);
        if (nameParts.length < 2) {
            return false;
        }

        // Check for valid Bulgarian characters only
        const cyrillicPattern = /^[А-Яа-я\s]+$/;
        if (!cyrillicPattern.test(trimmedName)) {
            return false;
        }

        // Each name part must be at least 2 characters
        for (const part of nameParts) {
            if (part.length < 2) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if student is registered in the specified class
     */
    isStudentInClass(studentName, className) {
        if (!this.classes || !this.classes.students[className]) {
            return false;
        }

        const classStudents = this.classes.students[className];

        // Normalize names for comparison
        const normalizedInputName = this.normalizeName(studentName);

        return classStudents.some(student => {
            const normalizedStudentName = this.normalizeName(student);
            return normalizedStudentName === normalizedInputName;
        });
    }

    /**
     * Normalize name for comparison (handle case differences and spacing)
     */
    normalizeName(name) {
        return name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' '); // Multiple spaces to single space
    }

    /**
     * Get all students in a class
     */
    getClassStudents(className) {
        if (!this.classes || !this.classes.students[className]) {
            return [];
        }
        return [...this.classes.students[className]];
    }

    /**
     * Get all valid classes
     */
    getValidClasses() {
        if (!this.classes) {
            return [];
        }
        return [...this.classes.validClasses];
    }

    /**
     * Add new student to class (admin function)
     */
    async addStudentToClass(studentName, className) {
        if (!this.classes) {
            await this.loadClasses();
        }

        if (!this.isValidClass(className)) {
            throw new Error(`Invalid class: ${className}`);
        }

        if (!this.isValidStudentName(studentName)) {
            throw new Error(`Invalid student name format: ${studentName}`);
        }

        if (!this.classes.students[className]) {
            this.classes.students[className] = [];
        }

        const normalizedName = this.cleanStudentName(studentName);

        // Check if student already exists
        if (this.isStudentInClass(normalizedName, className)) {
            throw new Error(`Student ${normalizedName} already exists in class ${className}`);
        }

        this.classes.students[className].push(normalizedName);
        await this.dataStore.saveClasses(this.classes);

        console.log(`✅ Added student ${normalizedName} to class ${className}`);
        return true;
    }

    /**
     * Remove student from class (admin function)
     */
    async removeStudentFromClass(studentName, className) {
        if (!this.classes) {
            await this.loadClasses();
        }

        if (!this.classes.students[className]) {
            throw new Error(`Class ${className} not found`);
        }

        const normalizedName = this.normalizeName(studentName);
        const studentIndex = this.classes.students[className].findIndex(student =>
            this.normalizeName(student) === normalizedName
        );

        if (studentIndex === -1) {
            throw new Error(`Student ${studentName} not found in class ${className}`);
        }

        this.classes.students[className].splice(studentIndex, 1);
        await this.dataStore.saveClasses(this.classes);

        console.log(`❌ Removed student ${studentName} from class ${className}`);
        return true;
    }

    /**
     * Add new class (admin function)
     */
    async addClass(className) {
        if (!this.classes) {
            await this.loadClasses();
        }

        if (this.isValidClass(className)) {
            throw new Error(`Class ${className} already exists`);
        }

        this.classes.validClasses.push(className);
        this.classes.students[className] = [];

        await this.dataStore.saveClasses(this.classes);

        console.log(`➕ Added new class: ${className}`);
        return true;
    }

    /**
     * Remove class (admin function)
     */
    async removeClass(className) {
        if (!this.classes) {
            await this.loadClasses();
        }

        if (!this.isValidClass(className)) {
            throw new Error(`Class ${className} does not exist`);
        }

        // Remove from valid classes
        const classIndex = this.classes.validClasses.indexOf(className);
        this.classes.validClasses.splice(classIndex, 1);

        // Remove students data
        delete this.classes.students[className];

        await this.dataStore.saveClasses(this.classes);

        console.log(`🗑️ Removed class: ${className}`);
        return true;
    }

    /**
     * Clean student name for consistent formatting
     */
    cleanStudentName(name) {
        return name
            .trim()
            .replace(/\s+/g, ' ') // Multiple spaces to single
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Get class statistics
     */
    getClassStatistics() {
        if (!this.classes) {
            return null;
        }

        const stats = {
            totalClasses: this.classes.validClasses.length,
            totalStudents: 0,
            classSizes: {}
        };

        for (const className of this.classes.validClasses) {
            const studentCount = this.classes.students[className]?.length || 0;
            stats.classSizes[className] = studentCount;
            stats.totalStudents += studentCount;
        }

        return stats;
    }

    /**
     * Validate bulk student import data
     */
    validateBulkImport(importData) {
        const errors = [];
        const warnings = [];

        if (!importData.validClasses || !Array.isArray(importData.validClasses)) {
            errors.push('Missing or invalid validClasses array');
        }

        if (!importData.students || typeof importData.students !== 'object') {
            errors.push('Missing or invalid students object');
        }

        if (errors.length > 0) {
            return { valid: false, errors, warnings };
        }

        // Validate each class
        for (const className of importData.validClasses) {
            if (typeof className !== 'string' || className.trim() === '') {
                errors.push(`Invalid class name: ${className}`);
                continue;
            }

            const students = importData.students[className];
            if (!students || !Array.isArray(students)) {
                warnings.push(`Class ${className} has no students array`);
                continue;
            }

            // Validate each student in class
            for (const studentName of students) {
                if (!this.isValidStudentName(studentName)) {
                    errors.push(`Invalid student name "${studentName}" in class ${className}`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Import bulk class data (admin function)
     */
    async importClassData(importData) {
        const validation = this.validateBulkImport(importData);

        if (!validation.valid) {
            throw new Error(`Import validation failed: ${validation.errors.join(', ')}`);
        }

        // Backup current data
        const backup = { ...this.classes };

        try {
            this.classes = importData;
            await this.dataStore.saveClasses(this.classes);

            console.log('📥 Successfully imported class data');
            console.log(`📊 Classes: ${this.classes.validClasses.length}`);
            console.log(`👥 Total students: ${Object.values(this.classes.students).flat().length}`);

            if (validation.warnings.length > 0) {
                console.warn('⚠️ Import warnings:', validation.warnings);
            }

            return {
                success: true,
                warnings: validation.warnings
            };

        } catch (error) {
            // Restore backup on error
            this.classes = backup;
            console.error('❌ Import failed, restored backup');
            throw error;
        }
    }
}