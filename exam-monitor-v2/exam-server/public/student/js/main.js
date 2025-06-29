/**
 * Student Exam System - Main Entry Point
 * Coordinates all modules and initializes the exam system
 */

async function loadTemplates() {
    const templates = {
        'login-form': 'html/login-form.html',
        'exam-workspace': 'html/exam-workspace.html',
        'console-panel': 'html/console-panel.html',
        'violation-screen': 'html/violation-screen.html'
    };

    for (const [name, path] of Object.entries(templates)) {
        try {
            const response = await fetch(`/student/${path}`);
            const html = await response.text();
            document.body.innerHTML = document.body.innerHTML.replace(`{{${name}}}`, html);
        } catch (error) {
            console.error(`Failed to load template ${name}:`, error);
        }
    }
}

import { setupLoginForm, handleLoginSuccess, handleSessionRestore, handleLoginError } from './login.js';
import { setupSocket } from './socket.js';
import { initializeMonacoEditor, setupEditorControls, runCode, formatCode, clearOutput, changeTheme, saveCode } from './editor.js';
import { startExamTimer, handleTimeWarning, handleExamExpired } from './timer.js';
import { setupAntiCheat, activateAntiCheat, enterFullscreenMode, deactivateAntiCheat } from './anticheat.js';
import { showCompletionDialog, hideCustomDialogs } from './dialogs.js';
import { setupTabs } from './tabs.js';

window.ExamApp = {
    socket: null,
    editor: null,
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
    isConnected: false,
    completionInProgress: false,
    dialogSystemActive: true,
    startExam: null,
    exitExam: null,
    showViolationScreen: null,
    hideViolationScreen: null,
    showNotification: null,
    showError: null
};

document.addEventListener('DOMContentLoaded', async function () {
    await loadTemplates();
    console.log('Student Exam System initializing...');

    if (document.readyState === 'loading') {
        document.addEventListener('readystatechange', function () {
            if (document.readyState === 'interactive' || document.readyState === 'complete') {
                initializeAppSafely();
            }
        });
    } else {
        initializeAppSafely();
    }
});

function initializeAppSafely() {
    try {
        setupLoginForm();
        setupAntiCheat();
        setupExamControls();
        setupNotificationSystem();

        setTimeout(() => {
            setupSocket();
        }, 100);

        console.log('Student Exam System initialized');

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Грешка при зареждане на системата');
    }
}

function setupExamControls() {
    try {
        // Setup tabs only - editor controls will be setup after Monaco loads
        setupTabs();

        // Finish exam button
        const finishBtn = document.getElementById('finish-exam-btn');
        if (finishBtn) {
            finishBtn.addEventListener('click', handleFinishExam);
        }

        console.log('Exam controls setup completed');
    } catch (error) {
        console.error('Failed to setup exam controls:', error);
    }
}

function setupNotificationSystem() {
    try {
        window.ExamApp.showNotification = showNotification;
        window.ExamApp.showError = showError;
    } catch (error) {
        console.error('Failed to setup notification system:', error);
    }
}

async function startExam(data) {
    try {
        const loginContainer = document.getElementById('login-container');
        const examContainer = document.getElementById('exam-container');

        if (!loginContainer || !examContainer) {
            throw new Error('Required containers not found in DOM');
        }

        loginContainer.style.display = 'none';
        examContainer.style.display = 'flex';

        window.ExamApp.isLoggedIn = true;
        window.ExamApp.examStartTime = Date.now();

        // Initialize Monaco Editor first
        await initializeMonacoEditor();

        // NOW setup editor controls after Monaco is ready
        setupEditorControls({
            runCode: runCode,
            formatCode: formatCode,
            clearOutput: clearOutput,
            changeTheme: changeTheme
        });

        activateAntiCheat();
        enterFullscreenMode();
        startExamTimer(window.ExamApp.examDuration);

        console.log('Exam started successfully');

    } catch (error) {
        console.error('Failed to start exam:', error);
        showError('Грешка при стартиране на изпита');
    }
}

function exitExam(reason = 'manual') {
    try {
        console.log(`Exiting exam. Reason: ${reason}`);

        window.ExamApp.isLoggedIn = false;
        window.ExamApp.antiCheatActive = false;

        if (window.ExamApp.timerInterval) {
            clearInterval(window.ExamApp.timerInterval);
            window.ExamApp.timerInterval = null;
        }

        deactivateAntiCheat();

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(console.error);
        }

        const loginContainer = document.getElementById('login-container');
        const examContainer = document.getElementById('exam-container');

        if (examContainer) examContainer.style.display = 'none';
        if (loginContainer) loginContainer.style.display = 'flex';

        if (window.ExamApp.socket) {
            window.ExamApp.socket.emit('student-exit', {
                sessionId: window.ExamApp.sessionId,
                reason: reason,
                timestamp: Date.now()
            });
        }

        console.log('Exam exited successfully');

    } catch (error) {
        console.error('Failed to exit exam:', error);
    }
}

function showViolationScreen(reason = 'Нарушение на правилата на изпита') {
    try {
        console.warn('Violation detected:', reason);

        window.ExamApp.completionInProgress = true;

        const violationContainer = document.getElementById('violation-component');
        if (violationContainer) {
            violationContainer.style.display = 'flex';
            violationContainer.style.position = 'fixed';
            violationContainer.style.top = '0';
            violationContainer.style.left = '0';
            violationContainer.style.width = '100vw';
            violationContainer.style.height = '100vh';
            violationContainer.style.zIndex = '9999';
        }

        deactivateAntiCheat();

        if (window.ExamApp.socket) {
            window.ExamApp.socket.emit('violation-detected', {
                sessionId: window.ExamApp.sessionId,
                reason: reason,
                timestamp: Date.now()
            });
        }

        setTimeout(() => {
            exitExam('violation');
        }, 3000);

        console.log('Violation screen shown');

    } catch (error) {
        console.error('Failed to show violation screen:', error);
    }
}

async function handleFinishExam() {
    try {
        window.ExamApp.completionInProgress = true;

        const shouldFinish = await showCompletionDialog({
            title: 'Приключване на изпита',
            message: 'Сигурни ли сте, че искате да приключите изпита?',
            confirmText: 'Да, приключвам',
            cancelText: 'Не, продължавам'
        });

        if (shouldFinish) {
            if (window.ExamApp.editor) {
                saveCode();
            }

            exitExam('completed');
        } else {
            window.ExamApp.completionInProgress = false;
        }

    } catch (error) {
        console.error('Error finishing exam:', error);
        window.ExamApp.completionInProgress = false;
    }
}

function showNotification(message, type = 'info') {
    try {
        console.log(`Notification (${type}): ${message}`);
    } catch (error) {
        console.error('Failed to show notification:', error);
    }
}

function showError(message) {
    try {
        const errorPanel = document.getElementById('error-panel');
        const errorContent = document.getElementById('error-content');

        if (errorPanel && errorContent) {
            errorContent.textContent = message;
            errorPanel.style.display = 'block';
        }

        console.error('Error shown to user:', message);
    } catch (error) {
        console.error('Failed to show error:', error);
    }
}

window.ExamApp.startExam = startExam;
window.ExamApp.exitExam = exitExam;
window.ExamApp.showViolationScreen = showViolationScreen;

window.ExamApp.handleLoginSuccess = handleLoginSuccess;
window.ExamApp.handleSessionRestore = handleSessionRestore;
window.ExamApp.handleLoginError = handleLoginError;

window.ExamApp.handleTimeWarning = handleTimeWarning;
window.ExamApp.handleExamExpired = handleExamExpired;

if (window.location.hostname === 'localhost') {
    window.examDebug = {
        getState: () => window.ExamApp,
        triggerViolation: (reason) => showViolationScreen(reason),
        forceFullscreen: () => enterFullscreenMode(),
        saveCode: () => saveCode(),
        runCode: () => runCode(),
        resetState: () => {
            window.ExamApp.isLoggedIn = false;
            const loginContainer = document.getElementById('login-container');
            const examContainer = document.getElementById('exam-container');
            if (loginContainer) loginContainer.style.display = 'flex';
            if (examContainer) examContainer.style.display = 'none';
        }
    };
}

console.log('Student Exam System loaded successfully!');