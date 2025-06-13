let socket;
let studentInfo = {};
let currentCode = '';

// Clear any existing connections on page load
if (window.socket) {
    window.socket.disconnect();
    window.socket = null;
}

// Join exam function
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

    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('student-join', studentInfo);
    });

    socket.on('student-id-assigned', (id) => {
        console.log('Received student ID:', id);
        window.studentId = id;

        // Hide login and show workspace
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('workspace').style.display = 'grid';
        initWorkspace();

        // Save to session
        fetch('/api/save-student-id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: id,
                studentName: studentInfo.name,
                studentClass: studentInfo.class
            })
        }).then(r => r.json())
            .then(data => console.log('Session saved:', data))
            .catch(err => console.error('Session error:', err));
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        alert(error.message || 'Възникна грешка');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showWarning('Връзката със сървъра е прекъсната!');
    });
}

function initWorkspace() {
    document.getElementById('workspace').innerHTML = `
        <div class="header">
            <div>Изпит - ${studentInfo.name} (${studentInfo.class})</div>
            <div class="timer" id="timer">03:00:00</div>
        </div>
        <div class="files-panel">
            <div style="color: #999; padding: 10px;">Файлове</div>
            <div style="color: #fff; padding: 5px 10px;">📄 main.js</div>
        </div>
        <div class="editor-panel">
            <textarea id="code-editor" 
                style="width: 100%; height: 100%; background: #1e1e1e; 
                       color: #d4d4d4; font-family: monospace; 
                       font-size: 14px; padding: 20px; border: none; resize: none;"
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
        </div>
    `;

    const editor = document.getElementById('code-editor');
    if (editor) {
        editor.addEventListener('input', () => {
            currentCode = editor.value;
            if (socket && socket.connected) {
                socket.emit('code-update', {
                    code: currentCode,
                    filename: 'main.js'
                });
            }
            updatePreview(currentCode);
        });
    }

    startTimer();
}

function updatePreview(code) {
    const preview = document.getElementById('preview');
    const consoleOutput = document.getElementById('console');

    if (!preview || !consoleOutput) return;

    // Clear console only, keep the header
    const existingLines = consoleOutput.querySelectorAll('div:not(:first-child)');
    existingLines.forEach(line => line.remove());

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
            </style>
        </head>
        <body>
            <div id="output"></div>
            <script>
                // Override console.log
                const originalLog = console.log;
                console.log = function(...args) {
                    originalLog.apply(console, args);
                    // Filter out empty logs
                    if (args.length === 0) return;
                    
                    const message = args.map(arg => {
                        if (arg === undefined) return 'undefined';
                        if (arg === null) return 'null';
                        if (typeof arg === 'object') {
                            try {
                                return JSON.stringify(arg);
                            } catch (e) {
                                return String(arg);
                            }
                        }
                        return String(arg);
                    }).join(' ');
                    
                    window.parent.postMessage({
                        type: 'console',
                        data: message
                    }, '*');
                };
                
                // Override console.error
                console.error = function(...args) {
                    const message = args.map(arg => String(arg)).join(' ');
                    window.parent.postMessage({
                        type: 'error',
                        data: message
                    }, '*');
                };
                
                // Clear any previous errors
                window.onerror = function(msg, url, line) {
                    window.parent.postMessage({
                        type: 'error',
                        data: msg + ' at line ' + line
                    }, '*');
                    return true;
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

window.addEventListener('message', (event) => {
    const consoleOutput = document.getElementById('console');
    if (!consoleOutput) return;

    const line = document.createElement('div');
    if (event.data.type === 'console') {
        line.style.color = '#4CAF50';
        line.textContent = '> ' + event.data.data;
    } else {
        line.style.color = '#F44336';
        line.textContent = '❌ ' + event.data.data;
    }
    consoleOutput.appendChild(line);
});

function showWarning(message) {
    const overlay = document.createElement('div');
    overlay.className = 'warning-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(244,67,54,0.95);color:white;display:flex;justify-content:center;align-items:center;z-index:9999;';
    overlay.innerHTML = `<div style="text-align:center;font-size:24px;">${message}</div>`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 3000);
}

function startTimer() {
    let timeLeft = 180 * 60;
    setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = timeLeft % 60;
            const timer = document.getElementById('timer');
            if (timer) {
                timer.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }
    }, 1000);
}