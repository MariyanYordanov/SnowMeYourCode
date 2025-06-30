/**
 * Student Exam System - Main Entry Point
 * Coordinates all modules and initializes the exam system
 * 
 * @module main
 * @version 2.0.0
 */

// ===================================
// IMPORTS - All module dependencies
// ===================================

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

// ===================================
// GLOBAL STATE - ExamApp namespace
// ===================================

window.ExamApp = {
    // Socket & Editor instances
    socket: null,
    editor: null,

    // Session data
    sessionId: null,
    studentName: null,
    studentClass: null,

    // Exam timing
    examStartTime: null,
    examDuration: 3 * 60 * 60 * 1000, // 3 hours
    examEndTime: null,
    timeLeft: 0,
    timerInterval: null,

    // State flags
    isFullscreen: false,
    violationCount: 0,
    antiCheatActive: false,
    isLoggedIn: false,
    lastSaveTime: null,
    isConnected: false,
    completionInProgress: false,
    dialogSystemActive: true,

    // Public API methods (will be assigned below)
    startExam: null,
    exitExam: null,
    showViolationScreen: null,
    hideViolationScreen: null,
    showNotification: null,
    showError: null
};

// ===================================
// TEMPLATE LOADING
// ===================================

/**
 * Load HTML templates into the page
 * @returns {Promise<void>}
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

// ===================================
// INITIALIZATION
// ===================================

/**
 * Initialize application safely with error handling
 */
function initializeApp() {
    try {
        // Setup core systems
        setupLoginForm();
        setupAntiCheat();
        setupExamControls();
        setupNotificationSystem();

        // Assign public methods
        assignPublicMethods();

        // Setup socket connection with delay
        setTimeout(() => {
            setupSocket();
        }, 100);

        console.log('Student Exam System initialized');

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Грешка при зареждане на системата');
    }
}

/**
 * Setup exam-specific controls
 */
function setupExamControls() {
    try {
        // Note: setupTabs() moved to startExam() to ensure DOM is ready

        // Setup finish exam button
        const finishBtn = document.getElementById('finish-exam-btn');
        if (finishBtn) {
            finishBtn.addEventListener('click', handleFinishExam);
        }

        console.log('Exam controls setup completed');
    } catch (error) {
        console.error('Failed to setup exam controls:', error);
    }
}

/**
 * Setup notification system
 */
function setupNotificationSystem() {
    try {
        window.ExamApp.showNotification = showNotification;
        window.ExamApp.showError = showError;
    } catch (error) {
        console.error('Failed to setup notification system:', error);
    }
}

/**
 * Assign public methods to ExamApp
 */
function assignPublicMethods() {
    window.ExamApp.startExam = startExam;
    window.ExamApp.exitExam = exitExam;
    window.ExamApp.showViolationScreen = showViolationScreen;

    window.ExamApp.handleLoginSuccess = handleLoginSuccess;
    window.ExamApp.handleSessionRestore = handleSessionRestore;
    window.ExamApp.handleLoginError = handleLoginError;

    window.ExamApp.handleTimeWarning = handleTimeWarning;
    window.ExamApp.handleExamExpired = handleExamExpired;
}

// ===================================
// EXAM LIFECYCLE METHODS
// ===================================

/**
 * Start the exam after successful login
 * @param {Object} data - Login response data
 */
async function startExam(data) {
    try {
        const loginContainer = document.getElementById('login-component');
        const examContainer = document.getElementById('exam-component');

        if (!loginContainer || !examContainer) {
            throw new Error('Required containers not found in DOM');
        }

        // Switch views
        loginContainer.style.display = 'none';
        examContainer.classList.add('active');
        examContainer.style.display = 'block';

        // Update state
        window.ExamApp.isLoggedIn = true;
        window.ExamApp.examStartTime = Date.now();

        // Initialize Monaco Editor
        await initializeMonacoEditor();

        // Setup editor controls after Monaco is ready
        setupEditorControls({
            runCode,
            formatCode,
            clearOutput,
            changeTheme
        });

        // Initialize tabs now that DOM is ready
        setupTabs();

        // Load layout toggle system
        const layoutScript = document.createElement('script');
        layoutScript.type = 'module';
        layoutScript.src = '/student/js/layout-toggle.js';
        document.body.appendChild(layoutScript);

        // Activate security features
        activateAntiCheat();
        enterFullscreenMode();

        // Start exam timer
        startExamTimer(window.ExamApp.examDuration);

        console.log('Exam started successfully');

    } catch (error) {
        console.error('Failed to start exam:', error);
        showError('Грешка при стартиране на изпита');
    }
}

/**
 * Exit exam and cleanup
 * @param {string} reason - Exit reason
 */
function exitExam(reason = 'manual') {
    try {
        console.log(`Exiting exam. Reason: ${reason}`);

        // Clear timers
        if (window.ExamApp.timerInterval) {
            clearInterval(window.ExamApp.timerInterval);
        }

        // Deactivate anti-cheat
        deactivateAntiCheat();

        // Save final code
        if (window.ExamApp.editor) {
            saveCode();
        }

        // Disconnect socket
        if (window.ExamApp.socket) {
            window.ExamApp.socket.emit('exam-complete', {
                reason,
                timestamp: Date.now()
            });
            window.ExamApp.socket.disconnect();
        }

        // Update state
        window.ExamApp.isLoggedIn = false;

        // Show exit screen or close window
        setTimeout(() => {
            if (reason === 'completed') {
                showExamCompletedScreen();
            } else {
                window.close();
            }
        }, 1000);

    } catch (error) {
        console.error('Error during exam exit:', error);
    }
}

/**
 * Handle finish exam button click
 */
async function handleFinishExam() {
    try {
        if (window.ExamApp.completionInProgress) {
            console.log('Completion already in progress');
            return;
        }

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

// ===================================
// UI HELPER METHODS
// ===================================

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, success, warning, error)
 */
function showNotification(message, type = 'info') {
    try {
        // TODO: Implement proper notification UI
        console.log(`Notification (${type}): ${message}`);
    } catch (error) {
        console.error('Failed to show notification:', error);
    }
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
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

/**
 * Show violation screen
 * @param {string} reason - Violation reason
 */
function showViolationScreen(reason) {
    try {
        const violationScreen = document.getElementById('violation-component');
        if (violationScreen) {
            violationScreen.style.display = 'flex';
            // TODO: Update violation message based on reason
        }
    } catch (error) {
        console.error('Failed to show violation screen:', error);
    }
}

/**
 * Show exam completed screen
 */
function showExamCompletedScreen() {
    // TODO: Implement exam completed UI
    alert('Изпитът е завършен успешно!');
}

// ===================================
// DEVELOPMENT HELPERS
// ===================================

// Debug utilities for development
if (window.location.hostname === 'localhost') {
    window.examDebug = {
        getState: () => window.ExamApp,
        triggerViolation: (reason) => showViolationScreen(reason),
        forceFullscreen: () => enterFullscreenMode(),
        saveCode: () => saveCode(),
        runCode: () => runCode(),
        resetState: () => {
            window.ExamApp.isLoggedIn = false;
            const loginContainer = document.getElementById('login-component');
            const examContainer = document.getElementById('exam-component');
            if (loginContainer) loginContainer.style.display = 'flex';
            if (examContainer) examContainer.style.display = 'none';
        }
    };
}

// ===================================
// ENTRY POINT
// ===================================

/**
 * Application entry point
 */
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Student Exam System initializing...');

    // Load HTML templates first
    await loadTemplates();

    // Check if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('readystatechange', function () {
            if (document.readyState === 'interactive' || document.readyState === 'complete') {
                initializeApp();
            }
        });
    } else {
        initializeApp();
    }
});

console.log('Student Exam System loaded successfully!');