import { MonacoFileManager } from './monaco-file-manager.js';
import { updateEditorIntegration, loadStarterProject } from './editor-integration.js';

import {
    setupLoginForm,
    handleLogin,
    handleLoginSuccess,
    handleSessionRestore,
    handleLoginError,
    updateStudentDisplay
} from './login.js';

import { setupSocket } from './socket.js';

import {
    initializeMonacoEditor,
    setupEditorControls,
    runCode,
    formatCode,
    clearOutput
} from './editor.js';

import {
    startExamTimer,
    handleTimeWarning,
    handleExamExpired
} from './timer.js';

import {
    setupAntiCheat,
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
    updateStudentDisplay: updateStudentDisplay
};

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    try {
        console.log('Initializing Exam Monitor App...');

        updateEditorIntegration();

        setupLoginForm();

        setupSocket();

        setupAntiCheat();

        setupGlobalErrorHandler();

        preventDefaultBehaviors();

        setupWindowFunctions();

        console.log('App initialized successfully');

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Грешка при инициализация на приложението');
    }
}

async function startExam(sessionData) {
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

        updateStudentDisplay(
            window.ExamApp.studentName,
            window.ExamApp.studentClass,
            window.ExamApp.sessionId
        );

        await initializeMonaco();

        setupTabs();

        enterFullscreenMode();

        startExamTimer(window.ExamApp.examEndTime);

        // Различни съобщения за нова/възстановена сесия
        if (sessionData.isNewSession) {
            showNotification('Изпитът започна! Успех!', 'success');
        } else {
            const minutesLeft = Math.floor(sessionData.timeLeft / 60000);
            showNotification(`Добре дошли обратно! Остават ${minutesLeft} минути`, 'info');

            // Възстановяваме кода
            if (sessionData.lastCode && window.ExamApp.editor) {
                window.ExamApp.editor.setValue(sessionData.lastCode);
            }
        }

        console.log('Exam started successfully');

    } catch (error) {
        console.error('Failed to start exam:', error);
        showError('[ERROR] Грешка при стартиране на изпита');

        setTimeout(() => {
            if (window.ExamApp.isLoggedIn) {
                exitExam('start_error');
            }
        }, 3000);
    }
}

async function startFullscreenExam() {
    try {
        const success = enterFullscreenMode();

        if (!success) {
            showError('Браузърът не поддържа fullscreen режим');
            return;
        }

        hidePreExamComponent();
        showExamComponent();

        updateStudentDisplay(
            window.ExamApp.studentName,
            window.ExamApp.studentClass,
            window.ExamApp.sessionId
        );

        await initializeMonaco();

        setupTabs();

        startExamTimer(window.ExamApp.examEndTime);

        showNotification('Изпитът започна успешно! Успех!', 'success');

        console.log('Exam started successfully in fullscreen');

    } catch (error) {
        console.error('Failed to start fullscreen exam:', error);
        showError('[ERROR] Грешка при стартиране на изпита');
    }
}

async function initializeMonaco() {
    try {
        console.log('Initializing Monaco editor...');

        const editor = await initializeMonacoEditor();

        if (!editor) {
            throw new Error('Failed to create Monaco editor');
        }

        window.ExamApp.editor = editor;

        const fileManager = new MonacoFileManager(editor);
        window.ExamApp.fileManager = fileManager;

        setupEditorControls();

        if (typeof monaco !== 'undefined') {
            setupFileManagerCommands();
        }

        if (window.ExamApp.sessionId) {
            try {
                const success = await fileManager.loadProjectStructure(window.ExamApp.sessionId);
                if (!success) {
                    console.log('No existing project found, loading starter files');
                    loadStarterProject();
                }
            } catch (error) {
                console.error('Error loading project:', error);
                loadStarterProject();
            }
        } else {
            loadStarterProject();
        }

        console.log('Monaco initialization complete');

    } catch (error) {
        console.error('Monaco initialization failed:', error);
        throw error;
    }
}

function setupFileManagerCommands() {
    try {
        const fileManager = window.ExamApp.fileManager;
        const editor = window.ExamApp.editor;

        if (!fileManager || !editor || typeof monaco === 'undefined') {
            console.warn('Cannot setup file manager commands - missing dependencies');
            return;
        }

        const newFileBtn = document.getElementById('new-file-btn');
        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => {
                fileManager.createNewFile();
            });
        }

        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                fileManager.saveCurrentFile();
            });
        }

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            fileManager.saveCurrentFile();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
            fileManager.closeCurrentFile();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, () => {
            fileManager.createNewFile();
        });

        console.log('File manager commands setup complete');

    } catch (error) {
        console.error('Failed to setup file manager commands:', error);
    }
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

        if (window.ExamApp.socket && window.ExamApp.socket.connected) {
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

        if (window.ExamApp.socket && window.ExamApp.socket.connected) {
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

function showPreExamComponent() {
    const preExamComponent = document.getElementById('pre-exam-component');
    if (preExamComponent) {
        preExamComponent.style.display = 'flex';
    }
}

function hidePreExamComponent() {
    const preExamComponent = document.getElementById('pre-exam-component');
    if (preExamComponent) {
        preExamComponent.style.display = 'none';
    }
}

function updatePreExamDisplay(studentName, studentClass, sessionId) {
    const nameEl = document.getElementById('pre-exam-student-name');
    const classEl = document.getElementById('pre-exam-student-class');
    const sessionEl = document.getElementById('pre-exam-session-id');

    if (nameEl) nameEl.textContent = studentName || 'Неизвестен';
    if (classEl) classEl.textContent = studentClass || 'Неизвестен';
    if (sessionEl) sessionEl.textContent = sessionId || 'Неизвестен';
}

function setupPreExamButton() {
    const startBtn = document.getElementById('start-fullscreen-exam-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            startFullscreenExam();
        });
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

function setupWindowFunctions() {
    window.handleLogin = handleLogin;
    window.handleLoginSuccess = handleLoginSuccess;
    window.handleSessionRestore = handleSessionRestore;
    window.handleLoginError = handleLoginError;
    window.handleTimeWarning = handleTimeWarning;
    window.handleExamExpired = handleExamExpired;
}

window.startExam = startExam;
window.startFullscreenExam = startFullscreenExam;
window.completeExam = completeExam;
window.exitExam = exitExam;

window.ExamApp.startExam = startExam;
window.ExamApp.startFullscreenExam = startFullscreenExam;
window.ExamApp.completeExam = completeExam;
window.ExamApp.exitExam = exitExam;