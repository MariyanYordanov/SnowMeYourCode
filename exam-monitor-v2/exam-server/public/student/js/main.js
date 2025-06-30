import { MonacoFileManager } from './monaco-file-manager.js';
import { updateEditorIntegration, loadStarterProject } from './editor-integration.js';

import {
    setupLoginForm,
    handleLoginSuccess,
    handleSessionRestore,
    handleLoginError
} from './login.js';

import { setupSocket } from './socket.js';

import {
    initializeMonacoEditor,
    setupEditorControls,
    runCode,
    formatCode,
    clearOutput,
    changeTheme,
    saveCode
} from './editor.js';

import {
    startExamTimer,
    handleTimeWarning,
    handleExamExpired
} from './timer.js';

import {
    setupAntiCheat,
    activateAntiCheat,
    enterFullscreenMode,
    deactivateAntiCheat
} from './anticheat.js';

import {
    showCompletionDialog,
    hideCustomDialogs
} from './dialogs.js';

import { setupTabs } from './tabs.js';

window.ExamApp = {
    socket: null,
    editor: null,
    fileManager: null,

    sessionId: null,
    studentName: null,
    studentClass: null,

    examStartTime: null,
    examDuration: 3 * 60 * 60 * 1000,
    examEndTime: null,
    timeLeft: 0,
    timerInterval: null,

    isFullscreen: false,
    violationCount: 0,
    antiCheatActive: false,
    isLoggedIn: false,
    lastSaveTime: null,
    isCompletionInProgress: false,

    settings: {
        autoSave: true,
        autoSaveInterval: 30000,
        theme: 'vs-dark',
        fontSize: 14,
        wordWrap: true
    },

    showNotification: showNotification,
    showError: showError,
    updateStudentDisplay: updateStudentInfoDisplay
};

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    try {
        console.log('Initializing Exam Monitor App...');

        updateEditorIntegration();

        setupLoginForm();

        setupSocket();

        setupGlobalErrorHandler();

        preventDefaultBehaviors();

        checkSessionRestore();

        console.log('App initialized successfully');

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Грешка при инициализация на приложението');
    }
}

function startExam(sessionData) {
    try {
        if (!sessionData || !window.ExamApp.sessionId) {
            throw new Error('Invalid session data');
        }

        window.ExamApp.isLoggedIn = true;
        window.ExamApp.examStartTime = sessionData.examStartTime || Date.now();
        window.ExamApp.examDuration = sessionData.examDuration || (3 * 60 * 60 * 1000);
        window.ExamApp.examEndTime = new Date(window.ExamApp.examStartTime + window.ExamApp.examDuration);

        hideLoginComponent();
        showExamComponent();

        updateStudentInfoDisplay(
            window.ExamApp.studentName,
            window.ExamApp.studentClass,
            window.ExamApp.sessionId
        );

        initializeMonaco();

        setupTabs();

        enterFullscreenMode();
        setTimeout(() => {
            activateAntiCheat();
        }, 1000);

        startExamTimer(window.ExamApp.examEndTime);

        setupExamControls();

        fixHeaderStyles();

        showNotification('Изпитът започна успешно!', 'success');

        console.log('Exam started successfully');

    } catch (error) {
        console.error('Failed to start exam:', error);
        showError('Грешка при стартиране на изпита');

        setTimeout(() => {
            exitExam('start_error');
        }, 3000);
    }
}

function initializeMonaco() {
    const editor = initializeMonacoEditor();

    if (editor) {
        window.ExamApp.editor = editor;

        const fileManager = new MonacoFileManager(editor);
        window.ExamApp.fileManager = fileManager;

        setupEditorControls();

        setupFileManagerCommands();

        if (window.ExamApp.sessionId) {
            fileManager.loadProjectStructure(window.ExamApp.sessionId)
                .then(success => {
                    if (!success) {
                        console.log('No existing project found, loading starter files');
                        loadStarterProject();
                    }
                })
                .catch(error => {
                    console.error('Error loading project:', error);
                    loadStarterProject();
                });
        } else {
            loadStarterProject();
        }
    }
}

function setupFileManagerCommands() {
    const fileManager = window.ExamApp.fileManager;

    document.getElementById('new-file-btn')?.addEventListener('click', () => {
        fileManager.createNewFile();
    });

    document.getElementById('save-btn')?.addEventListener('click', () => {
        fileManager.saveCurrentFile();
    });

    window.ExamApp.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        fileManager.saveCurrentFile();
    });

    window.ExamApp.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
        fileManager.closeCurrentFile();
    });

    window.ExamApp.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, () => {
        fileManager.createNewFile();
    });
}

function setupExamControls() {
    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
        runBtn.addEventListener('click', () => {
            runCode();
        });
    }

    const formatBtn = document.getElementById('format-btn');
    if (formatBtn) {
        formatBtn.addEventListener('click', () => {
            formatCode();
        });
    }

    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearOutput();
        });
    }

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', changeTheme);
    }

    const submitBtn = document.getElementById('submit-exam-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (confirm('Сигурни ли сте, че искате да предадете изпита?')) {
                completeExam('manual_submit');
            }
        });
    }

    const toggleFiles = document.getElementById('toggle-files');
    if (toggleFiles) {
        toggleFiles.addEventListener('click', () => {
            document.getElementById('exam-container').classList.toggle('hide-files');
        });
    }

    const toggleDevTools = document.getElementById('toggle-devtools');
    if (toggleDevTools) {
        toggleDevTools.addEventListener('click', () => {
            document.getElementById('exam-container').classList.toggle('hide-devtools');
        });
    }

    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            enterFullscreenMode();
        });
    }
}

function fixHeaderStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .exam-info {
            display: flex;
            gap: 20px;
            align-items: center;
            padding: 5px 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 4px;
        }
        
        .student-name {
            color: #ffffff !important;
            font-weight: 600;
            font-size: 16px;
        }
        
        .student-class {
            color: #e0e0e0 !important;
            font-size: 14px;
        }
        
        .session-id {
            color: #a0a0a0 !important;
            font-size: 12px;
            font-family: monospace;
        }
        
        .exam-timer {
            background: rgba(0, 0, 0, 0.3);
            padding: 5px 15px;
            border-radius: 4px;
        }
        
        .timer-label {
            color: #e0e0e0 !important;
            margin-right: 10px;
        }
        
        .timer-value {
            color: #4CAF50 !important;
            font-weight: 600;
            font-size: 18px;
            font-family: monospace;
        }
        
        .file-tabs-container {
            display: flex;
            background: var(--editor-panel-bg);
            border-bottom: 1px solid var(--editor-border);
            overflow-x: auto;
            scrollbar-width: thin;
            flex: 1;
            min-width: 0;
        }
        
        .editor-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0;
            background: var(--editor-panel-bg);
            border-bottom: 1px solid var(--editor-border);
        }
        
        .editor-actions {
            display: flex;
            gap: 5px;
            padding: 5px 10px;
            flex-shrink: 0;
        }
    `;

    document.head.appendChild(style);
}

function completeExam(reason = 'unknown') {
    try {
        window.ExamApp.completionInProgress = true;

        if (window.ExamApp.fileManager) {
            window.ExamApp.fileManager.saveCurrentFile();
        }

        deactivateAntiCheat();

        if (window.ExamApp.timerInterval) {
            clearInterval(window.ExamApp.timerInterval);
        }

        if (window.ExamApp.socket) {
            window.ExamApp.socket.emit('exam-complete', {
                sessionId: window.ExamApp.sessionId,
                reason: reason,
                timestamp: Date.now()
            });
        }

        showCompletionDialog(reason);

        setTimeout(() => {
            exitExam(reason);
        }, 3000);

    } catch (error) {
        console.error('Error completing exam:', error);
    }
}

function exitExam(reason = 'unknown') {
    try {
        window.ExamApp.completionInProgress = true;

        deactivateAntiCheat();

        if (window.ExamApp.timerInterval) {
            clearInterval(window.ExamApp.timerInterval);
        }

        if (window.ExamApp.fileManager) {
            window.ExamApp.fileManager.disposeAll();
        }

        if (window.ExamApp.socket) {
            window.ExamApp.socket.emit('exam-complete', {
                sessionId: window.ExamApp.sessionId,
                reason: reason,
                timestamp: Date.now()
            });
        }

        window.ExamApp.isLoggedIn = false;
        window.ExamApp.antiCheatActive = false;

        setTimeout(() => {
            hideExamComponent();
            showLoginComponent();
            window.ExamApp.completionInProgress = false;
        }, 2000);

        console.log(`Exam exited: ${reason}`);

    } catch (error) {
        console.error('Error during exam exit:', error);
    }
}

function showLoginComponent() {
    const loginComponent = document.getElementById('login-component');
    if (loginComponent) {
        loginComponent.style.display = 'flex';
    }
}

function hideLoginComponent() {
    const loginComponent = document.getElementById('login-component');
    if (loginComponent) {
        loginComponent.style.display = 'none';
    }
}

function showExamComponent() {
    const examComponent = document.getElementById('exam-component');
    if (examComponent) {
        examComponent.style.display = 'block';
    }
}

function hideExamComponent() {
    const examComponent = document.getElementById('exam-component');
    if (examComponent) {
        examComponent.style.display = 'none';
    }
}

function updateStudentInfoDisplay(studentName, studentClass, sessionId) {
    try {
        const nameEl = document.getElementById('student-name-display');
        const classEl = document.getElementById('student-class-display');
        const sessionEl = document.getElementById('session-id-display');

        if (nameEl) nameEl.textContent = studentName || 'Неизвестен';
        if (classEl) classEl.textContent = studentClass || 'Неизвестен';
        if (sessionEl) sessionEl.textContent = sessionId || 'Неизвестен';

        console.log(`Student display updated: ${studentName} (${studentClass}) - ${sessionId}`);
    } catch (error) {
        console.error('Failed to update student display:', error);
    }
}

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showError(message) {
    showNotification(message, 'error');
}

function preventDefaultBehaviors() {
    document.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('dragstart', e => e.preventDefault());
    document.addEventListener('drop', e => e.preventDefault());

    document.addEventListener('selectstart', e => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });
}

function setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showError(`Грешка: ${event.error?.message || 'Неизвестна грешка'}`);
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showError(`Грешка: ${event.reason?.message || 'Неизвестна грешка'}`);
    });
}

function checkSessionRestore() {
    const savedSession = localStorage.getItem('examSession');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            if (sessionData.examEndTime > Date.now()) {
                handleSessionRestore(sessionData);
            } else {
                localStorage.removeItem('examSession');
            }
        } catch (error) {
            console.error('Failed to restore session:', error);
            localStorage.removeItem('examSession');
        }
    }
}

window.startExam = startExam;
window.completeExam = completeExam;
window.exitExam = exitExam;