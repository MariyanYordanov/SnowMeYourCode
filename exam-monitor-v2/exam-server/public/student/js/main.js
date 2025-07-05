import { MonacoFileManager } from './monaco-file-manager.js';
import { updateEditorIntegration, loadStarterProject } from './editor-integration.js'; 
import { SidebarManager } from './sidebar-manager.js';

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

        const examApp = window.ExamApp;

        updateEditorIntegration();

        setupLoginForm(examApp);

        setupSocket();

        setupAntiCheat();

        setupGlobalErrorHandler();

        preventDefaultBehaviors();

        setupWindowFunctions();

        examApp.sidebarManager = new SidebarManager();

        console.log('App initialized successfully');

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Грешка при инициализация на приложението');
    }
}

async function startExam(sessionData) {
    try {
        const examApp = window.ExamApp;

        if (!sessionData || !examApp.sessionId) {
            throw new Error('Invalid session data');
        }

        examApp.isLoggedIn = true;
        examApp.examStartTime = sessionData.examStartTime || Date.now();
        examApp.examDuration = sessionData.examDuration || (3 * 60 * 60 * 1000);
        examApp.examEndTime = new Date(examApp.examStartTime + examApp.examDuration);

        hideLoginComponent();
        showExamComponent();

        updateStudentDisplay(
            examApp.studentName,
            examApp.studentClass,
            examApp.sessionId
        );

        await initializeMonaco();

        setupTabs();

        enterFullscreenMode();

        startExamTimer(examApp.examEndTime);

        // Различни съобщения за нова/възстановена сесия
        if (sessionData.isNewSession) {
            showNotification('Изпитът започна! Успех!', 'success');
        } else {
            const minutesLeft = Math.floor(sessionData.timeLeft / 60000);
            showNotification(`Добре дошли обратно! Остават ${minutesLeft} минути`, 'info');

            // Възстановяваме кода
            if (sessionData.lastCode && examApp.editor) {
                examApp.editor.setValue(sessionData.lastCode);
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
        const examApp = window.ExamApp;

        if (!success) {
            showError('Браузърът не поддържа fullscreen режим');
            return;
        }

        hidePreExamComponent();
        showExamComponent();

        updateStudentDisplay(
            examApp.studentName,
            examApp.studentClass,
            examApp.sessionId
        );

        await initializeMonaco();

        setupTabs();

        startExamTimer(examApp.examEndTime);

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
        const examApp = window.ExamApp;

        if (!editor) {
            throw new Error('Failed to create Monaco editor');
        }

        examApp.editor = editor;

        const fileManager = new MonacoFileManager(editor);
        examApp.fileManager = fileManager;

        setupEditorControls();

        if (typeof monaco !== 'undefined') {
            setupFileManagerCommands();
    }

    if (examApp.sessionId) {
            try {
                const success = await fileManager.loadProjectStructure(examApp.sessionId);
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
        const examApp = window.ExamApp;
        const fileManager = examApp.fileManager;
        const editor = examApp.editor;

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
        const examApp = window.ExamApp;
        examApp.completionInProgress = true;

        if (examApp.fileManager) {
            examApp.fileManager.saveCurrentFile();
        }

        deactivateAntiCheat();

        if (examApp.timerInterval) {
            clearInterval(examApp.timerInterval);
        }

        if (examApp.socket && examApp.socket.connected) {
            examApp.socket.emit('exam-complete', {
                sessionId: examApp.sessionId,
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
        const examApp = window.ExamApp;
        examApp.completionInProgress = true;

        deactivateAntiCheat();

        if (examApp.timerInterval) {
            clearInterval(examApp.timerInterval);
        }

        if (examApp.fileManager) {
            examApp.fileManager.disposeAll();
        }

        if (examApp.socket && examApp.socket.connected) {
            examApp.socket.emit('exam-complete', {
                sessionId: examApp.sessionId,
                reason: reason,
                timestamp: Date.now()
            });
        }

        examApp.isLoggedIn = false;
        examApp.antiCheatActive = false;

        setTimeout(() => {
            hideExamComponent();
            showLoginComponent();
            examApp.completionInProgress = false;
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
    const examApp = window.ExamApp;
    window.handleLogin = (data) => handleLogin(examApp, data);
    window.handleLoginSuccess = (data) => handleLoginSuccess(examApp, data);
    window.handleSessionRestore = (data) => handleSessionRestore(examApp, data);
    window.handleLoginError = (error) => handleLoginError(examApp, error);
    window.handleTimeWarning = handleTimeWarning;
    window.handleExamExpired = handleExamExpired;

    // Assign functions to ExamApp for external access
    examApp.startExam = startExam;
    examApp.startFullscreenExam = startFullscreenExam;
    examApp.completeExam = completeExam;
    examApp.exitExam = exitExam;
    examApp.resetLoginState = () => resetLoginState(examApp);
    examApp.getLoginState = () => getLoginState(examApp);
    examApp.getTermsAcceptanceInfo = () => getTermsAcceptanceInfo(examApp);

    // Assign functions to ExamApp for external access
    examApp.startExam = startExam;
    examApp.startFullscreenExam = startFullscreenExam;
    examApp.completeExam = completeExam;
    examApp.exitExam = exitExam;
}