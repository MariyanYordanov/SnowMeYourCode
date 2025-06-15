const socket = io();

function joinExam() {
    const studentName = document.getElementById('student-name').value.trim();
    const studentClass = document.getElementById('student-class').value.trim();

    if (!studentName || !studentClass) {
        alert('Моля въведете име и клас!');
        return;
    }

    console.log('Joining exam:', studentName, studentClass);

    // Send login request to server
    socket.emit('student-join', {
        studentName: studentName,
        studentClass: studentClass
    });
}

// Handle server responses
socket.on('student-id-assigned', (data) => {
    console.log('Login successful:', data);
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('workspace').style.display = 'block';

    alert(`Успешен вход! Session ID: ${data.sessionId}`);
    startTimer(data.timeLeft);
});

socket.on('session-restored', (data) => {
    console.log('Session restored:', data);
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('workspace').style.display = 'block';

    alert(`Добре дошли обратно! ${data.message}`);
    startTimer(data.timeLeft);
});

socket.on('login-error', (data) => {
    console.error('Login error:', data);
    alert(`Грешка при влизане: ${data.message}`);
});

function startTimer(timeLeft) {
    const timerElement = document.getElementById('timer');

    setInterval(() => {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        timerElement.textContent = `Остава време: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        timeLeft -= 1000;

        if (timeLeft <= 0) {
            alert('Времето за изпита изтече!');
        }
    }, 1000);
}