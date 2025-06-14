// Prevent auto-connection on page load
if (typeof io !== 'undefined') {
    io.autoConnect = false;
}

// Global variables
let socket = null;
let studentInfo = {};
let currentCode = '';
let isJoining = false; // Prevent multiple joins

// Ensure clean state on page load
window.addEventListener('DOMContentLoaded', () => {
    // Reset UI to login state
    const loginForm = document.getElementById('login-form');
    const workspace = document.getElementById('workspace');

    if (loginForm) loginForm.style.display = 'block';
    if (workspace) workspace.style.display = 'none';

    // Clear form inputs
    const nameInput = document.getElementById('student-name');
    const classInput = document.getElementById('student-class');
    if (nameInput) nameInput.value = '';
    if (classInput) classInput.value = '';
});

// Join exam function
window.joinExam = function () {
    // Prevent multiple joins
    if (isJoining) {
        console.log('Already joining...');
        return;
    }

    const name = document.getElementById('student-name').value.trim();
    const classValue = document.getElementById('student-class').value.trim().toUpperCase();

    if (!name || !classValue) {
        alert('Моля въведете име и клас!');
        return;
    }

    isJoining = true;
    studentInfo = { name, class: classValue };

    // Disconnect any existing socket
    if (socket) {
        socket.disconnect();
        socket = null;
    }

    // Create new connection
    socket = io({
        autoConnect: false,
        reconnection: false,
        transports: ['websocket', 'polling']
    });

    socket.connect();

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
            .then(data => {
                console.log('Session saved:', data);
                isJoining = false; // Reset flag
            })
            .catch(err => {
                console.error('Session error:', err);
                isJoining = false;
            });
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        alert(error.message || 'Възникна грешка');
        isJoining = false;
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showWarning('Връзката със сървъра е прекъсната!');
        isJoining = false;
    });
};

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

    // Initialize anti-cheat after workspace is ready
    initAntiCheat();
}

function updatePreview(code) {
    const preview = document.getElementById('preview');
    const consoleOutput = document.getElementById('console');

    if (!preview || !consoleOutput) return;

    // Clear only the log entries, keep the header
    const header = consoleOutput.querySelector('div');
    consoleOutput.innerHTML = '';
    if (header) consoleOutput.appendChild(header.cloneNode(true));

    // Don't execute empty code
    if (!code || code.trim() === '') {
        preview.srcdoc = '<html><body><h3>Preview</h3><p>Започнете да пишете код...</p></body></html>';
        return;
    }

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
                (function() {
                    const originalLog = console.log;
                    const originalError = console.error;
                    
                    console.log = function(...args) {
                        if (args.length === 0) return;
                        originalLog.apply(console, args);
                        
                        try {
                            const message = args.map(arg => {
                                if (arg === undefined) return 'undefined';
                                if (arg === null) return 'null';
                                if (typeof arg === 'object') {
                                    return JSON.stringify(arg, null, 2);
                                }
                                return String(arg);
                            }).join(' ');
                            
                            parent.postMessage({
                                type: 'console',
                                data: message
                            }, '*');
                        } catch (e) {
                            parent.postMessage({
                                type: 'error',
                                data: 'Error logging: ' + e.message
                            }, '*');
                        }
                    };
                    
                    console.error = function(...args) {
                        originalError.apply(console, args);
                        if (args.length === 0) return;
                        
                        parent.postMessage({
                            type: 'error',
                            data: args.join(' ')
                        }, '*');
                    };
                    
                    window.onerror = function(msg, url, line, col, error) {
                        parent.postMessage({
                            type: 'error',
                            data: msg + ' (line ' + line + ')'
                        }, '*');
                        return true;
                    };
                })();
                
                try {
                    ${code}
                } catch (error) {
                    console.error(error.toString());
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
    } else if (event.data.type === 'error') {
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

// Anti-cheat functions
function initAntiCheat() {
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
        logSuspiciousActivity('Десен бутон на мишката');
        return false;
    });

    // Anti-cheat: Detect tab switch
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            logSuspiciousActivity('Превключване на таб');
            showWarning('Върнете се към изпита!');
        }
    });

    // Anti-cheat: Detect window blur (when window loses focus)
    window.addEventListener('blur', () => {
        logSuspiciousActivity('Напускане на прозореца');
        showWarning('Върнете се към изпита!');
    });

    // Anti-cheat: Block developer tools
    document.addEventListener('keydown', (e) => {
        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
        if (e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
            (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
            logSuspiciousActivity('Опит за отваряне на Developer Tools');
            showWarning('Developer Tools са забранени!');
            return false;
        }
    });

    // Disable text selection
    document.addEventListener('selectstart', (e) => {
        if (e.target.id !== 'code-editor') {
            e.preventDefault();
        }
    });
}

// Function to log suspicious activity
function logSuspiciousActivity(activity) {
    console.log('Suspicious activity:', activity);
    if (socket && socket.connected) {
        socket.emit('code-update', {
            code: currentCode,
            filename: 'main.js',
            suspicious: activity,
            timestamp: Date.now()
        });
    }
}