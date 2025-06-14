// Prevent auto-connection on page load
if (typeof io !== 'undefined') {
    io.autoConnect = false;
}

// Clear any existing connections
if (window.socket) {
    window.socket.disconnect();
    window.socket = null;
}

const socket = io();
const studentsGrid = document.getElementById('students-grid');
const students = new Map();

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('teacher-join');
});

socket.on('all-students', (studentsList) => {
    studentsGrid.innerHTML = '';
    students.clear();
    studentsList.forEach(student => {
        addStudentCard(student);
    });
});

socket.on('student-connected', (student) => {
    addStudentCard(student);
});

socket.on('student-code-update', (data) => {
    updateStudentCode(data.socketId, data);
});

socket.on('student-disconnected', (socketId) => {
    const card = document.getElementById(`student-${socketId}`);
    if (card) {
        card.querySelector('.status-indicator').classList.add('inactive');
    }
});

function addStudentCard(student) {
    // Check by studentId, not socketId
    const existingCard = document.querySelector(`[data-student-id="${student.studentId}"]`);
    if (existingCard) {
        // Update existing card instead of creating new
        existingCard.id = `student-${student.socketId}`;
        const statusIndicator = existingCard.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.classList.remove('inactive');
        }
        return;
    }

    const card = document.createElement('div');
    card.className = 'student-card';
    card.id = `student-${student.socketId}`;
    card.setAttribute('data-student-id', student.studentId); // Add this for tracking

    card.innerHTML = `
        <div class="student-header">
            <div>
                <div class="student-name">${student.name}</div>
                <div class="student-class">${student.class}</div>
            </div>
            <div class="status-indicator"></div>
        </div>
        <div class="code-preview" id="code-${student.socketId}">
            // Чака се код...
        </div>
        <div class="activity-log" id="activity-${student.socketId}"></div>
    `;

    studentsGrid.appendChild(card);

    students.set(student.socketId, student);
}

function updateStudentCode(socketId, data) {
    const codeElement = document.getElementById(`code-${socketId}`);
    if (codeElement) {
        codeElement.textContent = data.code || '// Празен файл';
    }

    // Update activity if suspicious
    if (data.suspicious) {
        const activityElement = document.getElementById(`activity-${socketId}`);
        const card = document.getElementById(`student-${socketId}`);

        if (activityElement && card) {
            const time = new Date().toLocaleTimeString();
            activityElement.innerHTML = `<span class="warning">⚠️ ${data.suspicious} - ${time}</span>`;
            card.querySelector('.status-indicator').classList.add('suspicious');
        }
    }
}