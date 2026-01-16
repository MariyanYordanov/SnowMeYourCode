#!/usr/bin/env python3
"""
Automated test script to simulate 15 students connecting to the exam server.
Each student will login, write some code, and simulate activity.
"""

import socketio
import time
import random
import threading

SERVER_URL = "http://127.0.0.1:8080"

# Bulgarian first names and last names for realistic test data
FIRST_NAMES = ["Иван", "Петър", "Георги", "Мария", "Елена", "Николай", "Димитър", "Стефан", "Христо", "Калоян", "Виктория", "Александра", "Борислав", "Теодор", "Мартин"]
LAST_NAMES = ["Иванов", "Петров", "Георгиев", "Димитров", "Николов", "Стефанов", "Тодоров", "Христов", "Костов", "Попов", "Василев", "Атанасов", "Митев", "Радев", "Йорданов"]
CLASSES = ["10А", "10Б", "11А", "11Б", "12А"]

# Sample code snippets that students might write
CODE_SNIPPETS = [
    '''function add(a, b) {
    return a + b;
}

console.log(add(5, 3));''',
    '''const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log(doubled);''',
    '''class Calculator {
    add(a, b) { return a + b; }
    subtract(a, b) { return a - b; }
    multiply(a, b) { return a * b; }
}''',
    '''async function fetchData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}''',
    '''const fibonacci = (n) => {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
};''',
    '''function isPrime(num) {
    if (num < 2) return false;
    for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) return false;
    }
    return true;
}''',
    '''const sortArray = (arr) => {
    return [...arr].sort((a, b) => a - b);
};

console.log(sortArray([5, 2, 8, 1, 9]));''',
    '''function reverseString(str) {
    return str.split('').reverse().join('');
}

console.log(reverseString("hello"));''',
]

class StudentSimulator:
    def __init__(self, student_id, name, student_class):
        self.student_id = student_id
        self.name = name
        self.student_class = student_class
        self.sio = socketio.Client()
        self.session_id = None
        self.connected = False

        # Setup event handlers
        self.sio.on('connect', self.on_connect)
        self.sio.on('disconnect', self.on_disconnect)
        self.sio.on('session-created', self.on_session_created)
        self.sio.on('project-loaded', self.on_project_loaded)

    def on_connect(self):
        self.connected = True
        print(f"[{self.name}] Connected to server")

    def on_disconnect(self):
        self.connected = False
        print(f"[{self.name}] Disconnected from server")

    def on_session_created(self, data):
        self.session_id = data.get('sessionId')
        print(f"[{self.name}] Session created: {self.session_id[:8]}...")

    def on_project_loaded(self, data):
        print(f"[{self.name}] Project loaded with {len(data.get('files', {}))} files")

    def connect(self):
        try:
            self.sio.connect(SERVER_URL, transports=['websocket'])
            time.sleep(0.5)
            return True
        except Exception as e:
            print(f"[{self.name}] Connection failed: {e}")
            return False

    def join_exam(self):
        if not self.connected:
            return False

        self.sio.emit('student-join', {
            'studentName': self.name,
            'studentClass': self.student_class,
            'examCode': ''
        })
        time.sleep(0.5)
        return True

    def send_code_update(self, filename, code):
        if not self.session_id:
            return False

        self.sio.emit('code-update', {
            'sessionId': self.session_id,
            'filename': filename,
            'code': code
        })
        return True

    def simulate_typing(self, duration=30):
        """Simulate a student typing code over time"""
        if not self.session_id:
            return

        code_snippet = random.choice(CODE_SNIPPETS)
        filename = random.choice(['main.js', 'solution.js', 'app.js', 'index.js'])

        # Simulate typing character by character
        current_code = ""
        for char in code_snippet:
            current_code += char
            self.send_code_update(filename, current_code)
            # Random typing speed (50-150ms per character)
            time.sleep(random.uniform(0.05, 0.15))

        print(f"[{self.name}] Finished typing {len(code_snippet)} characters in {filename}")

    def disconnect(self):
        if self.connected:
            self.sio.disconnect()


def run_student(student_id):
    """Run a single student simulation"""
    name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    student_class = random.choice(CLASSES)

    student = StudentSimulator(student_id, name, student_class)

    if student.connect():
        student.join_exam()
        time.sleep(1)  # Wait for session to be created

        # Simulate typing for 20-40 seconds
        student.simulate_typing(random.randint(20, 40))

        # Keep connection alive for a bit
        time.sleep(5)

        student.disconnect()


def main():
    print("=" * 50)
    print("Starting automated student simulation")
    print(f"Simulating 15 students connecting to {SERVER_URL}")
    print("=" * 50)

    threads = []

    # Start 15 student simulations with slight delays
    for i in range(15):
        thread = threading.Thread(target=run_student, args=(i+1,))
        threads.append(thread)
        thread.start()
        time.sleep(0.3)  # Stagger connections

    # Wait for all threads to complete
    for thread in threads:
        thread.join()

    print("=" * 50)
    print("All student simulations completed")
    print("=" * 50)


if __name__ == "__main__":
    main()
