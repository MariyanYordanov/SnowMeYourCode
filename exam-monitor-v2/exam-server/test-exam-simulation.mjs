#!/usr/bin/env node
/**
 * Realistic exam simulation - students solving actual exam tasks
 * Each student writes a solution to the Subtraction task with different coding styles
 */

import { io } from 'socket.io-client';

const SERVER_URL = 'http://127.0.0.1:8080';

// Real students from classes.json
const STUDENTS = [
    { name: 'Петър Петров', class: '11А' },
    { name: 'Мария Иванова', class: '11А' },
    { name: 'Стефан Георгиев', class: '11А' },
    { name: 'Анна Димитрова', class: '11А' },
    { name: 'Николай Стоянов', class: '11А' },
    { name: 'Иван Иванов', class: '11Б' },
    { name: 'Георги Стоянов', class: '11Б' },
    { name: 'Елена Петкова', class: '11Б' },
    { name: 'Димитър Николов', class: '11Б' },
    { name: 'Йорданка Христова', class: '11Б' },
    { name: 'Стефан Николов', class: '12А' },
    { name: 'Мариана Тодорова', class: '12А' },
    { name: 'Владимир Иванов', class: '12А' },
    { name: 'Росица Георгиева', class: '12А' },
    { name: 'Елена Стоянова', class: '12Б' },
];

// Different solutions to the Subtraction task - various coding styles
const SOLUTIONS = [
    // Solution 1: Simple and clean
    {
        filename: 'subtract.js',
        code: `function subtract() {
    let firstNumber = document.getElementById('firstNumber').value;
    let secondNumber = document.getElementById('secondNumber').value;

    let result = Number(firstNumber) - Number(secondNumber);

    document.getElementById('result').textContent = result;
}`,
        typingSpeed: { min: 40, max: 80 }  // Fast typer
    },

    // Solution 2: With comments
    {
        filename: 'subtract.js',
        code: `function subtract() {
    // Get the input values
    const num1 = document.getElementById('firstNumber').value;
    const num2 = document.getElementById('secondNumber').value;

    // Convert to numbers and calculate
    const difference = parseFloat(num1) - parseFloat(num2);

    // Display the result
    document.getElementById('result').innerHTML = difference;
}`,
        typingSpeed: { min: 60, max: 120 }  // Medium typer
    },

    // Solution 3: Verbose with variables
    {
        filename: 'subtract.js',
        code: `function subtract() {
    var firstInput = document.getElementById('firstNumber');
    var secondInput = document.getElementById('secondNumber');
    var resultDiv = document.getElementById('result');

    var firstValue = firstInput.value;
    var secondValue = secondInput.value;

    var firstNum = Number(firstValue);
    var secondNum = Number(secondValue);

    var result = firstNum - secondNum;

    resultDiv.textContent = result;
}`,
        typingSpeed: { min: 80, max: 150 }  // Slower typer
    },

    // Solution 4: One-liner style
    {
        filename: 'subtract.js',
        code: `function subtract() {
    document.getElementById('result').textContent =
        parseFloat(document.getElementById('firstNumber').value) -
        parseFloat(document.getElementById('secondNumber').value);
}`,
        typingSpeed: { min: 50, max: 100 }
    },

    // Solution 5: Arrow function lover (but keeps function keyword as required)
    {
        filename: 'subtract.js',
        code: `function subtract() {
    const getValue = id => parseFloat(document.getElementById(id).value);
    const setResult = val => document.getElementById('result').innerText = val;

    setResult(getValue('firstNumber') - getValue('secondNumber'));
}`,
        typingSpeed: { min: 70, max: 130 }
    },

    // Solution 6: With error handling
    {
        filename: 'subtract.js',
        code: `function subtract() {
    try {
        let a = document.getElementById('firstNumber').value;
        let b = document.getElementById('secondNumber').value;

        if (isNaN(a) || isNaN(b)) {
            throw new Error('Invalid input');
        }

        let result = Number(a) - Number(b);
        document.getElementById('result').textContent = result;
    } catch (e) {
        document.getElementById('result').textContent = 'Error';
    }
}`,
        typingSpeed: { min: 90, max: 160 }  // Careful typer
    },

    // Solution 7: querySelector style
    {
        filename: 'subtract.js',
        code: `function subtract() {
    const first = document.querySelector('#firstNumber').value;
    const second = document.querySelector('#secondNumber').value;

    const result = +first - +second;

    document.querySelector('#result').textContent = result;
}`,
        typingSpeed: { min: 55, max: 95 }
    },

    // Solution 8: Beginner style with console.log
    {
        filename: 'subtract.js',
        code: `function subtract() {
    console.log('Starting subtract function...');

    var num1 = document.getElementById('firstNumber').value;
    var num2 = document.getElementById('secondNumber').value;

    console.log('num1:', num1);
    console.log('num2:', num2);

    var answer = Number(num1) - Number(num2);

    console.log('answer:', answer);

    document.getElementById('result').textContent = answer;
}`,
        typingSpeed: { min: 100, max: 180 }  // Very slow/careful
    },

    // Solution 9: Modern destructuring
    {
        filename: 'subtract.js',
        code: `function subtract() {
    const { value: v1 } = document.getElementById('firstNumber');
    const { value: v2 } = document.getElementById('secondNumber');

    document.getElementById('result').textContent = Number(v1) - Number(v2);
}`,
        typingSpeed: { min: 65, max: 110 }
    },

    // Solution 10: Functional approach
    {
        filename: 'subtract.js',
        code: `function subtract() {
    const getEl = document.getElementById.bind(document);

    const a = Number(getEl('firstNumber').value);
    const b = Number(getEl('secondNumber').value);

    getEl('result').textContent = a - b;
}`,
        typingSpeed: { min: 75, max: 125 }
    },

    // Solution 11: With toFixed
    {
        filename: 'subtract.js',
        code: `function subtract() {
    let first = parseFloat(document.getElementById('firstNumber').value);
    let second = parseFloat(document.getElementById('secondNumber').value);

    let difference = (first - second).toFixed(2);

    document.getElementById('result').innerHTML = difference;
}`,
        typingSpeed: { min: 60, max: 100 }
    },

    // Solution 12: Template literal result
    {
        filename: 'subtract.js',
        code: `function subtract() {
    const n1 = +document.getElementById('firstNumber').value;
    const n2 = +document.getElementById('secondNumber').value;

    document.getElementById('result').innerHTML = \`\${n1 - n2}\`;
}`,
        typingSpeed: { min: 50, max: 90 }
    },

    // Solution 13: With Math.round
    {
        filename: 'subtract.js',
        code: `function subtract() {
    var x = document.getElementById('firstNumber').value;
    var y = document.getElementById('secondNumber').value;

    var res = Number(x) - Number(y);
    res = Math.round(res * 100) / 100;

    document.getElementById('result').textContent = res;
}`,
        typingSpeed: { min: 85, max: 140 }
    },

    // Solution 14: Minimal
    {
        filename: 'subtract.js',
        code: `function subtract() {
    let a = +firstNumber.value;
    let b = +secondNumber.value;
    result.textContent = a - b;
}`,
        typingSpeed: { min: 35, max: 70 }  // Very fast
    },

    // Solution 15: With validation
    {
        filename: 'subtract.js',
        code: `function subtract() {
    const input1 = document.getElementById('firstNumber');
    const input2 = document.getElementById('secondNumber');
    const output = document.getElementById('result');

    const val1 = parseFloat(input1.value) || 0;
    const val2 = parseFloat(input2.value) || 0;

    output.textContent = val1 - val2;
}`,
        typingSpeed: { min: 70, max: 120 }
    }
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class StudentSimulator {
    constructor(studentId, studentData, solution) {
        this.studentId = studentId;
        this.name = studentData.name;
        this.studentClass = studentData.class;
        this.solution = solution;
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
                console.log(`[${this.name}] Connected`);
                resolve(true);
            });

            this.socket.on('disconnect', () => {
                this.connected = false;
            });

            this.socket.on('student-id-assigned', (data) => {
                this.sessionId = data.sessionId;
                console.log(`[${this.name}] Session started`);
            });

            this.socket.on('login-error', (data) => {
                console.log(`[${this.name}] Login error: ${data.message}`);
            });

            this.socket.on('connect_error', (err) => {
                reject(err);
            });

            setTimeout(() => {
                if (!this.connected) reject(new Error('Timeout'));
            }, 5000);
        });
    }

    joinExam() {
        this.socket.emit('student-join', {
            studentName: this.name,
            studentClass: this.studentClass,
            examCode: ''
        });
    }

    sendCodeUpdate(filename, code) {
        if (!this.sessionId) return;
        this.socket.emit('code-update', {
            sessionId: this.sessionId,
            filename: filename,
            code: code
        });
    }

    async simulateTyping() {
        if (!this.sessionId) {
            console.log(`[${this.name}] No session, skipping`);
            return;
        }

        const { filename, code, typingSpeed } = this.solution;
        console.log(`[${this.name}] Starting to solve the task...`);

        let currentCode = '';
        let charIndex = 0;

        while (charIndex < code.length) {
            // Simulate realistic typing with occasional pauses
            const char = code[charIndex];
            currentCode += char;

            // Send update every few characters or on newlines
            if (charIndex % 3 === 0 || char === '\n' || char === ';' || char === '}') {
                this.sendCodeUpdate(filename, currentCode);
            }

            // Random typing delay
            const delay = Math.random() * (typingSpeed.max - typingSpeed.min) + typingSpeed.min;
            await sleep(delay);

            // Occasionally pause longer (thinking)
            if (Math.random() < 0.02) {
                await sleep(Math.random() * 2000 + 500);
            }

            // Simulate occasional typo and correction (5% chance)
            if (Math.random() < 0.05 && charIndex < code.length - 5) {
                // Type wrong character
                currentCode += 'x';
                this.sendCodeUpdate(filename, currentCode);
                await sleep(200);
                // Backspace
                currentCode = currentCode.slice(0, -1);
                this.sendCodeUpdate(filename, currentCode);
                await sleep(150);
            }

            charIndex++;
        }

        // Final update
        this.sendCodeUpdate(filename, currentCode);
        console.log(`[${this.name}] Finished solution (${code.length} chars)`);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

async function runStudent(studentId, studentData) {
    // Each student gets a different solution style
    const solution = SOLUTIONS[studentId % SOLUTIONS.length];
    const student = new StudentSimulator(studentId, studentData, solution);

    try {
        await student.connect();
        student.joinExam();
        await sleep(1500); // Wait for session

        await student.simulateTyping();

        // Keep connection for a bit after finishing
        await sleep(5000);
    } catch (err) {
        console.log(`[${studentData.name}] Error: ${err.message}`);
    } finally {
        student.disconnect();
        console.log(`[${studentData.name}] Disconnected`);
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('  EXAM SIMULATION - Subtraction Task');
    console.log('  15 students solving the same task with different styles');
    console.log('='.repeat(60));
    console.log('');

    const promises = [];

    // Start students with staggered delays (like real exam)
    for (let i = 0; i < STUDENTS.length; i++) {
        // Random delay 0-3 seconds between students starting
        await sleep(Math.random() * 3000);
        console.log(`Starting: ${STUDENTS[i].name} (${STUDENTS[i].class})`);
        promises.push(runStudent(i, STUDENTS[i]));
    }

    await Promise.all(promises);

    console.log('');
    console.log('='.repeat(60));
    console.log('  EXAM SIMULATION COMPLETED');
    console.log('='.repeat(60));

    process.exit(0);
}

main().catch(console.error);
