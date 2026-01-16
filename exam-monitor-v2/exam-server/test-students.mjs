#!/usr/bin/env node
/**
 * Automated test script to simulate 15 students connecting to the exam server.
 * Each student will login, write some code, and simulate activity.
 */

import { io } from 'socket.io-client';

const SERVER_URL = 'http://127.0.0.1:8080';

// Real students from classes.json
const STUDENTS = [
    // 11А
    { name: 'Петър Петров', class: '11А' },
    { name: 'Мария Иванова', class: '11А' },
    { name: 'Стефан Георгиев', class: '11А' },
    { name: 'Анна Димитрова', class: '11А' },
    { name: 'Николай Стоянов', class: '11А' },
    // 11Б
    { name: 'Иван Иванов', class: '11Б' },
    { name: 'Георги Стоянов', class: '11Б' },
    { name: 'Елена Петкова', class: '11Б' },
    { name: 'Димитър Николов', class: '11Б' },
    { name: 'Йорданка Христова', class: '11Б' },
    // 12А
    { name: 'Стефан Николов', class: '12А' },
    { name: 'Мариана Тодорова', class: '12А' },
    { name: 'Владимир Иванов', class: '12А' },
    { name: 'Росица Георгиева', class: '12А' },
    // 12Б
    { name: 'Елена Стоянова', class: '12Б' },
];

// Sample code snippets
const CODE_SNIPPETS = [
    `function add(a, b) {
    return a + b;
}

console.log(add(5, 3));`,
    `const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log(doubled);`,
    `class Calculator {
    add(a, b) { return a + b; }
    subtract(a, b) { return a - b; }
    multiply(a, b) { return a * b; }
}`,
    `async function fetchData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}`,
    `const fibonacci = (n) => {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
};`,
    `function isPrime(num) {
    if (num < 2) return false;
    for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) return false;
    }
    return true;
}`,
    `const sortArray = (arr) => {
    return [...arr].sort((a, b) => a - b);
};

console.log(sortArray([5, 2, 8, 1, 9]));`,
    `function reverseString(str) {
    return str.split('').reverse().join('');
}

console.log(reverseString("hello"));`,
];

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class StudentSimulator {
    constructor(studentId, studentData) {
        this.studentId = studentId;
        this.name = studentData.name;
        this.studentClass = studentData.class;
        this.socket = null;
        this.sessionId = null;
        this.connected = false;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = io(SERVER_URL, {
                transports: ['websocket'],
                timeout: 5000
            });

            this.socket.on('connect', () => {
                this.connected = true;
                console.log(`[${this.name}] Connected to server`);
                resolve(true);
            });

            this.socket.on('disconnect', () => {
                this.connected = false;
                console.log(`[${this.name}] Disconnected`);
            });

            this.socket.on('student-id-assigned', (data) => {
                this.sessionId = data.sessionId;
                console.log(`[${this.name}] Session: ${this.sessionId.substring(0, 8)}...`);
            });

            this.socket.on('project-loaded', (data) => {
                const fileCount = Object.keys(data.files || {}).length;
                console.log(`[${this.name}] Project loaded: ${fileCount} files`);
            });

            this.socket.on('connect_error', (err) => {
                console.log(`[${this.name}] Connection error: ${err.message}`);
                reject(err);
            });

            this.socket.on('login-error', (data) => {
                console.log(`[${this.name}] Login error: ${data.message || JSON.stringify(data)}`);
            });

            this.socket.on('error', (err) => {
                console.log(`[${this.name}] Socket error: ${err}`);
            });

            // Timeout after 5 seconds
            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }

    joinExam() {
        if (!this.connected) return false;

        this.socket.emit('student-join', {
            studentName: this.name,
            studentClass: this.studentClass,
            examCode: ''
        });
        return true;
    }

    sendCodeUpdate(filename, code) {
        if (!this.sessionId) return false;

        this.socket.emit('code-update', {
            sessionId: this.sessionId,
            filename: filename,
            code: code
        });
        return true;
    }

    async simulateTyping() {
        if (!this.sessionId) {
            console.log(`[${this.name}] No session, skipping typing simulation`);
            return;
        }

        const codeSnippet = randomChoice(CODE_SNIPPETS);
        const filename = randomChoice(['main.js', 'solution.js', 'app.js']);

        console.log(`[${this.name}] Starting to type ${codeSnippet.length} chars in ${filename}`);

        // Simulate typing character by character
        let currentCode = '';
        for (const char of codeSnippet) {
            currentCode += char;
            this.sendCodeUpdate(filename, currentCode);
            // Random typing speed (30-100ms per character)
            await sleep(Math.random() * 70 + 30);
        }

        console.log(`[${this.name}] Finished typing in ${filename}`);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

async function runStudent(studentId, studentData) {
    const student = new StudentSimulator(studentId, studentData);

    try {
        await student.connect();
        student.joinExam();

        // Wait for session to be created
        await sleep(1000);

        // Simulate typing
        await student.simulateTyping();

        // Keep connection alive
        await sleep(3000);

    } catch (err) {
        console.log(`[Student ${studentId}] Error: ${err.message}`);
    } finally {
        student.disconnect();
    }
}

async function main() {
    console.log('='.repeat(50));
    console.log('Starting automated student simulation');
    console.log(`Simulating ${STUDENTS.length} students connecting to ${SERVER_URL}`);
    console.log('='.repeat(50));

    // Start all students with slight delays
    const promises = [];
    for (let i = 0; i < STUDENTS.length; i++) {
        promises.push(runStudent(i + 1, STUDENTS[i]));
        await sleep(200); // Stagger connections
    }

    // Wait for all to complete
    await Promise.all(promises);

    console.log('='.repeat(50));
    console.log('All student simulations completed');
    console.log('='.repeat(50));

    process.exit(0);
}

main().catch(console.error);
