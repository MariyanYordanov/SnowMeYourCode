let socket;
let studentInfo = {};
let currentCode = '';

window.socket = null;
window.sendCodeUpdate = sendCodeUpdate;

// Anti-cheat: Block copy/paste
document.addEventListener('copy', (e) => {
    e.preventDefault();
    logSuspiciousActivity('Опит за копиране');
    return false;
});

document.addEventListener('paste', (e) => {
    e.preventDefault();
    logSuspiciousActivity('Опит за поставяне');
    return false;
});

document.addEventListener('cut', (e) => {
    e.preventDefault();
    logSuspiciousActivity('Опит за изрязване');
    return false;
});

// Anti-cheat: Block right click
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// Anti-cheat: Detect tab switch
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        logSuspiciousActivity('Превключване на таб');
        showWarning('Върнете се към изпита!');
    }
});

window.joinExam = function () {
    const name = document.getElementById('student-name').value.trim();
    const classValue = document.getElementById('student-class').value.trim().toUpperCase();

    if (!name || !classValue) {
        alert('Моля въведете име и клас!');
        return;
    }

    studentInfo = { name, class: classValue };

    // Connect to server
    socket = io();
    window.socket = socket; // Debgging

    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('student-join', studentInfo);
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('workspace').style.display = 'grid';
        initWorkspace();
    });

    // Receive student ID from server
    socket.on('student-id-assigned', (id) => {
        window.studentId = id;
        console.log('Received student ID:', id);

        // Save student ID to session
        fetch('/api/save-student-id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: id })
        }).then(r => r.json())
            .then(data => console.log('Session saved:', data))
            .catch(err => console.error('Session save error:', err));
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showWarning('Връзката със сървъра е прекъсната!');
    });
}

function initWorkspace() {
    // Hide login form and show workspace
    document.getElementById('workspace').innerHTML = `
        <div class="header">
            <div>Изпит - ${studentInfo.name} (${studentInfo.class})</div>
            <div class="timer" id="timer">03:00:00</div>
        </div>
        <div class="files-panel">
            <div style="color: #999; padding: 10px;">Файлове</div>
            <div style="color: #fff; padding: 5px 10px; cursor: pointer;">📄 main.js</div>
        </div>
        <div class="editor-panel">
            <textarea id="code-editor" 
                style="width: 100%; height: 100%; background: #1e1e1e; 
                       color: #d4d4d4; font-family: 'Consolas', 'Courier New', monospace; 
                       font-size: 14px; padding: 20px; border: none; resize: none; 
                       outline: none; line-height: 1.5;"
                placeholder="// Започнете да пишете вашия код тук..."></textarea>
        </div>
        <div class="preview-panel">
            <iframe class="preview-iframe" id="preview" style="background: white;"></iframe>
            <div class="console-output" id="console">
                <div style="color: #666;">Console output</div>
            </div>
        </div>
        <div class="footer">
            <span>Ready</span>
            <span style="margin-left: 20px;">JavaScript</span>
            <span style="margin-left: 20px;">UTF-8</span>
        </div>
    `;

    // Track code changes
    const editor = document.getElementById('code-editor');
    if (editor) {
        console.log('Editor initialized successfully');
        currentCode = '';

        editor.addEventListener('input', debounce(() => {
            currentCode = editor.value;
            sendCodeUpdate(currentCode);
            updatePreview(currentCode);
        }, 1000));

        // Focus на editor
        editor.focus();
    } else {
        console.error('Failed to initialize editor');
    }

    startTimer();
}

function sendCodeUpdate(code) {
    if (socket && socket.connected) {
        console.log('Sending code update:', code.substring(0, 50) + '...');
        socket.emit('code-update', {
            code: code,
            filename: 'main.js',
            timestamp: Date.now()
        });
    } else {
        console.error('Socket not connected');
    }
}

function updatePreview(code) {
    const preview = document.getElementById('preview');
    const consoleOutput = document.getElementById('console');

    if (!preview || !consoleOutput) return;
    consoleOutput.innerHTML = '';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
            </style>
        </head>
        <body>
            <h3>Preview</h3>
            <div id="output"></div>
            <script>
                // Override console.log
                const originalLog = console.log;
                console.log = function(...args) {
                    originalLog.apply(console, args);
                    window.parent.postMessage({
                        type: 'console',
                        data: args.map(arg => String(arg)).join(' ')
                    }, '*');
                };
                
                try {
                    ${code}
                } catch (error) {
                    window.parent.postMessage({
                        type: 'error',
                        data: error.toString()
                    }, '*');
                }
            </script>
        </body>
        </html>
    `;

    preview.srcdoc = html;
}

// Listen for console messages from preview
window.addEventListener('message', (event) => {
    const consoleOutput = document.getElementById('console');
    if (!consoleOutput) return;

    if (event.data.type === 'console') {
        const line = document.createElement('div');
        line.style.color = '#4CAF50';
        line.textContent = '> ' + event.data.data;
        consoleOutput.appendChild(line);
    } else if (event.data.type === 'error') {
        const line = document.createElement('div');
        line.style.color = '#F44336';
        line.textContent = '❌ ' + event.data.data;
        consoleOutput.appendChild(line);
    }
});

function logSuspiciousActivity(activity) {
    if (socket && socket.connected) {
        socket.emit('code-update', {
            code: currentCode,
            filename: 'main.js',
            suspicious: activity,
            timestamp: Date.now()
        });
    }
}

function showWarning(message) {
    const overlay = document.createElement('div');
    overlay.className = 'warning-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `<div class="warning-message">${message}</div>`;
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.remove();
    }, 3000);
}

function startTimer() {
    let timeLeft = 180 * 60;

    setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = timeLeft % 60;

            const timerElement = document.getElementById('timer');
            if (timerElement) {
                timerElement.textContent =
                    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }
    }, 1000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Override fetch за автоматично добавяне на studentId
window.fetchWithStudentId = function (url, options = {}) {
    if (window.studentId && url.startsWith('/jsonstore')) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}studentId=${window.studentId}`;
    }
    return fetch(url, options);
};