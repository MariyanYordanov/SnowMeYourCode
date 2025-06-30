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
import { initializeFileExplorer } from './file-explorer.js';
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
    hideCustomDialogs,
    prompt,
    confirm
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
        // Setup finish exam button
        const finishBtn = document.getElementById('finish-exam-btn');
        if (finishBtn) {
            finishBtn.addEventListener('click', handleFinishExam);
            finishBtn.textContent = 'Предай изпита'; // Fix button text
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

    // Expose functions globally for easier access
    window.updateStudentInfoDisplay = updateStudentInfoDisplay;
}

/**
 * Update student info display in header
 */
function updateStudentInfoDisplay(studentName, studentClass, sessionId) {
    try {
        const studentNameEl = document.querySelector('.student-name');
        const studentClassEl = document.querySelector('.student-class');
        const sessionIdEl = document.querySelector('.session-id');

        if (studentNameEl) {
            studentNameEl.textContent = studentName || 'Unknown';
        }

        if (studentClassEl) {
            studentClassEl.textContent = `(${studentClass || 'Unknown'})`;
        }

        if (sessionIdEl) {
            sessionIdEl.textContent = `Session: ${sessionId || 'None'}`;
        }

        console.log('Student info display updated:', { studentName, studentClass, sessionId });
    } catch (error) {
        console.error('Failed to update student info display:', error);
    }
}

// ===================================
// EXAM LIFECYCLE
// ===================================

/**
 * Start exam process
 */
function startExam(sessionData) {
    try {
        // Validate session data
        if (!sessionData || !window.ExamApp.sessionId) {
            throw new Error('Invalid session data');
        }

        // Update exam state
        window.ExamApp.isLoggedIn = true;
        window.ExamApp.examStartTime = sessionData.examStartTime || Date.now();
        window.ExamApp.examDuration = sessionData.examDuration || (3 * 60 * 60 * 1000);
        window.ExamApp.examEndTime = new Date(window.ExamApp.examStartTime + window.ExamApp.examDuration);

        // Hide login, show exam
        hideLoginComponent();
        showExamComponent();

        // Update student info display
        updateStudentInfoDisplay(
            window.ExamApp.studentName,
            window.ExamApp.studentClass,
            window.ExamApp.sessionId
        );

        // Initialize Monaco Editor and setup controls after it's ready
        initializeMonacoEditor().then(() => {
            // Setup editor controls WITHOUT parameters
            setupEditorControls();

            // Setup tabs after editor is ready
            setupTabs();
        }).catch(error => {
            console.error('Failed to initialize Monaco editor:', error);
            showError('Грешка при зареждане на редактора');
        });

        // Initialize File Explorer
        initializeFileExplorer();

        // Enter fullscreen first
        enterFullscreenMode();

        // Activate anti-cheat with delay to avoid immediate trigger
        setTimeout(() => {
            window.ExamApp.completionInProgress = false; // Ensure we're not in completion mode
            activateAntiCheat();
        }, 2000); // 2 second delay

        // Start exam timer
        startExamTimer(window.ExamApp.examEndTime);

        // Setup default button
        setupDefaultButton();

        // Show success notification
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

/**
 * Setup default button functionality
 */
function setupDefaultButton() {
    // Find button by multiple possible selectors
    const defaultBtn = document.querySelector('[title*="Default"]') ||
        document.querySelector('#layout-mode') ||
        document.querySelector('.layout-btn');

    if (defaultBtn) {
        defaultBtn.addEventListener('click', () => {
            const sampleCode = `// Напишете вашият JavaScript код тук
console.log("Здравей, свят!");

// Пример за функция
function решиЗадача() {
    // Вашето решение тук
    return "Готово!";
}

// Тествайте кода си
console.log(решиЗадача());

// Enhanced Console Examples:
console.table([{име: "Иван", възраст: 17}, {име: "Мария", възраст: 18}]);`;

            if (window.ExamApp?.editor) {
                window.ExamApp.editor.setValue(sampleCode);
                showNotification('Зареден е примерен код', 'info');
            }
        });
    }
}

/**
 * Exit exam process
 */
function exitExam(reason = 'unknown') {
    try {
        // Mark exam as completed
        window.ExamApp.completionInProgress = true;

        // Deactivate anti-cheat
        deactivateAntiCheat();

        // Stop timer
        if (window.ExamApp.timerInterval) {
            clearInterval(window.ExamApp.timerInterval);
        }

        // Save final code
        if (window.ExamApp.editor) {
            saveCode();
        }

        // Notify server
        if (window.ExamApp.socket) {
            window.ExamApp.socket.emit('exam-complete', {
                sessionId: window.ExamApp.sessionId,
                reason: reason,
                timestamp: Date.now()
            });
        }

        // Reset state
        window.ExamApp.isLoggedIn = false;
        window.ExamApp.antiCheatActive = false;

        // Show login after delay
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

// ===================================
// UI UTILITIES
// ===================================

/**
 * Show/hide components
 */
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

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    try {
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification notification-${type}`;
        notificationEl.textContent = message;
        notificationEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
        `;

        document.body.appendChild(notificationEl);

        setTimeout(() => {
            notificationEl.style.opacity = '1';
        }, 100);

        setTimeout(() => {
            notificationEl.style.opacity = '0';
            setTimeout(() => {
                notificationEl.remove();
            }, 300);
        }, 3000);

    } catch (error) {
        console.error('Failed to show notification:', error);
    }
}

/**
 * Show error message
 */
function showError(message) {
    showNotification(message, 'error');
}

/**
 * Handle finish exam button
 */
async function handleFinishExam() {
    try {
        const confirmed = await showCompletionDialog({
            title: 'Приключване на изпита',
            message: 'Сигурни ли сте, че искате да приключите изпита? След потвърждение няма да можете да се върнете.',
            confirmText: 'Да, приключи изпита',
            cancelText: 'Не, продължи'
        });

        if (confirmed) {
            exitExam('manual_completion');
        }
    } catch (error) {
        console.error('Error handling exam finish:', error);
    }
}

/**
 * Show violation screen
 */
function showViolationScreen(reason) {
    try {
        const violationOverlay = document.getElementById('violation-overlay');
        const violationReason = document.getElementById('violation-reason');

        if (violationOverlay && violationReason) {
            violationReason.textContent = reason || 'Неизвестно нарушение';
            violationOverlay.style.display = 'flex';
        }

        // Force exam termination after 5 seconds
        setTimeout(() => {
            exitExam('violation_termination');
        }, 5000);

    } catch (error) {
        console.error('Error showing violation screen:', error);
    }
}

/**
 * Hide violation screen
 */
window.ExamApp.hideViolationScreen = function () {
    const violationOverlay = document.getElementById('violation-overlay');
    if (violationOverlay) {
        violationOverlay.style.display = 'none';
    }
};

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
        },
        fixDisplay: () => updateStudentInfoDisplay(
            window.ExamApp.studentName,
            window.ExamApp.studentClass,
            window.ExamApp.sessionId
        )
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