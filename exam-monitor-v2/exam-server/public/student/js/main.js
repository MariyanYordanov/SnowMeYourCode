/**
 * Student Exam System - Main Entry Point
 * Coordinates all modules and initializes the exam system
 */

// Import all required modules
import { setupLoginForm, handleLoginSuccess, handleSessionRestore, handleLoginError } from './login.js';
import { setupSocket, sendCodeUpdate, reportSuspiciousActivity } from './socket.js';
import { initializeMonacoEditor, setupEditorControls, runCode, formatCode, saveCode, clearOutput, changeTheme } from './editor.js';
import { startExamTimer, updateTimerDisplay, handleTimeWarning, handleExamExpired } from './timer.js';
import { setupAntiCheat, activateAntiCheat, deactivateAntiCheat, enterFullscreenMode } from './anticheat.js';
import { showCompletionDialog, showViolationExitDialog, showInfoDialog, hideCustomDialogs } from './dialogs.js';

// ================================
// GLOBAL STATE MANAGEMENT
// ================================
window.ExamApp = {
    // Core state
    socket: null,
    editor: null,
    sessionId: null,
    studentName: null,
    studentClass: null,

    // Exam timing
    examStartTime: null,
    examDuration: 3 * 60 * 60 * 1000, // 3 hours
    examEndTime: null,
    timeLeft: 0,
    timerInterval: null,

    // Security state
    isFullscreen: false,
    violationCount: 0,
    antiCheatActive: false,

    // UI state
    isLoggedIn: false,
    lastSaveTime: null,
    isConnected: false,
    completionInProgress: false,

    // Dialog system
    dialogSystemActive: true,

    // Function references for cross-module access
    startExam: null,
    exitExam: null,
    showViolationScreen: null,
    hideViolationScreen: null,
    showNotification: null,
    showError: null
};

// ================================
// APPLICATION INITIALIZATION
// ================================
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 DOM Content Loaded - Initializing Student Exam System...');

    // Wait for all scripts to load
    if (document.readyState === 'loading') {
        console.log('⏳ Document still loading, waiting...');
        document.addEventListener('readystatechange', function () {
            if (document.readyState === 'interactive' || document.readyState === 'complete') {
                console.log('📄 Document ready state:', document.readyState);
                initializeAppSafely();
            }
        });
    } else {
        initializeAppSafely();
    }
});

// Safe initialization with proper timing
function initializeAppSafely() {
    console.log('🎯 Starting safe initialization...');

    try {
        // Setup core components first
        setupLoginForm();
        setupAntiCheat();
        setupExamControls();
        setupViolationScreen();
        setupNotificationSystem();

        console.log('✅ Core components initialized');

        // Setup Socket.io with delay to ensure scripts are ready
        setTimeout(() => {
            setupSocket();
        }, 100);

        console.log('✅ Student Exam System initialization started');

    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        showError('Грешка при зареждане на системата');
    }
}

// ================================
// EXAM CONTROLS SETUP
// ================================
function setupExamControls() {
    try {
        // Setup editor controls with proper action handlers (NO SAVE BUTTON)
        setupEditorControls({
            runCode: runCode,
            formatCode: formatCode,
            clearOutput: clearOutput,
            changeTheme: changeTheme
            // saveCode removed - auto-save only
        });

        // Finish exam button
        const finishBtn = document.getElementById('finish-exam-btn');
        if (finishBtn) {
            finishBtn.addEventListener('click', handleFinishExam);
        }

        console.log('✅ Exam controls initialized (no manual save)');
    } catch (error) {
        console.error('❌ Failed to setup exam controls:', error);
    }
}

// ================================
// VIOLATION SCREEN SETUP
// ================================
function setupViolationScreen() {
    try {
        // Violation screen buttons
        const continueBtn = document.getElementById('continue-exam-btn');
        const exitBtn = document.getElementById('exit-violation-btn');

        if (continueBtn) {
            continueBtn.addEventListener('click', continueAfterViolation);
        }

        if (exitBtn) {
            exitBtn.addEventListener('click', exitAfterViolation);
        }

        // Add functions to global scope for cross-module access
        window.ExamApp.showViolationScreen = showViolationScreen;
        window.ExamApp.hideViolationScreen = hideViolationScreen;

        console.log('✅ Violation screen setup completed');
    } catch (error) {
        console.error('❌ Failed to setup violation screen:', error);
    }
}

// ================================
// NOTIFICATION SYSTEM
// ================================
function setupNotificationSystem() {
    try {
        // Add notification functions to global scope
        window.ExamApp.showNotification = showNotification;
        window.ExamApp.showError = showError;

        console.log('✅ Notification system setup completed');
    } catch (error) {
        console.error('❌ Failed to setup notification system:', error);
    }
}

// ================================
// EXAM LIFECYCLE FUNCTIONS
// ================================

/**
 * Start exam after successful login
 */
async function startExam(data) {
    try {
        console.log('🎯 Starting exam...');

        // Hide login, show exam
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('exam-container').style.display = 'flex';

        // Update student info display
        updateStudentDisplay();

        // Start timer
        if (data.timeLeft) {
            startExamTimer(data.timeLeft);
        } else {
            startExamTimer(window.ExamApp.examDuration);
        }

        // Initialize Monaco Editor
        await initializeMonacoEditor(data.lastCode || '');

        // Enter fullscreen
        enterFullscreenMode();

        // Activate anti-cheat
        activateAntiCheat();

        // Mark as logged in
        window.ExamApp.isLoggedIn = true;

        console.log('✅ Exam started successfully');
    } catch (error) {
        console.error('❌ Failed to start exam:', error);
        showError('Грешка при стартиране на изпита');
    }
}

/**
 * Update student display in exam interface
 */
function updateStudentDisplay() {
    try {
        const nameEl = document.getElementById('student-name-display');
        const classEl = document.getElementById('student-class-display');
        const sessionEl = document.getElementById('session-id-display');

        if (nameEl) nameEl.textContent = window.ExamApp.studentName || 'Неизвестен';
        if (classEl) classEl.textContent = window.ExamApp.studentClass || 'Неизвестен';
        if (sessionEl) sessionEl.textContent = window.ExamApp.sessionId || 'Неизвестен';

        console.log(`📋 Student display updated: ${window.ExamApp.studentName} (${window.ExamApp.studentClass}) - ${window.ExamApp.sessionId}`);
    } catch (error) {
        console.error('❌ Failed to update student display:', error);
    }
}

/**
 * Handle finish exam button
 */
async function handleFinishExam() {
    try {
        // Use custom dialog instead of browser confirm
        const shouldExit = await showCompletionDialog({
            title: 'Приключване на изпита',
            message: 'Сигурен ли сте че искате да приключите изпита?\n\nВашият код ще бъде автоматично запазен.',
            confirmText: 'Да, приключвам',
            cancelText: 'Не, продължавам'
        });

        if (shouldExit) {
            console.log('🏁 Student finishing exam normally');
            exitExam('completed');
        }
    } catch (error) {
        console.error('❌ Error handling finish exam:', error);
    }
}

/**
 * Exit exam with specified reason - MODIFIED FOR RESULT DETECTION
 */
function exitExam(reason) {
    try {
        console.log(`🚪 Exiting exam with reason: ${reason}`);

        // Mark completion in progress to prevent violations
        window.ExamApp.completionInProgress = true;

        // Different handling based on reason
        const isViolationTermination = reason.includes('violation');
        const isVoluntaryExit = reason === 'completed';

        if (isViolationTermination) {
            // AUTOMATIC TERMINATION - no screens, no saves, direct exit
            console.log(`🚫 ${reason} - AUTOMATIC TERMINATION (no code save)`);

            // Send completion to server immediately
            if (window.ExamApp.socket && window.ExamApp.socket.connected) {
                window.ExamApp.socket.emit('exam-complete', {
                    sessionId: window.ExamApp.sessionId,
                    reason: reason,
                    completed: false,
                    terminated: true,
                    timestamp: Date.now()
                });
            }

            // Clean up and close immediately
            deactivateAntiCheat();
            if (window.ExamApp.timerInterval) {
                clearInterval(window.ExamApp.timerInterval);
            }

            // Close window immediately - no delays, no screens
            window.close();

        } else if (isVoluntaryExit) {
            // VOLUNTARY EXIT - normal completion with auto-save
            console.log('✅ Voluntary completion - auto-save active');

            // Send completion to server
            if (window.ExamApp.socket && window.ExamApp.socket.connected) {
                window.ExamApp.socket.emit('exam-complete', {
                    sessionId: window.ExamApp.sessionId,
                    reason: reason,
                    completed: true,
                    terminated: false,
                    timestamp: Date.now()
                });
            }

            // Clean up
            deactivateAntiCheat();
            if (window.ExamApp.timerInterval) {
                clearInterval(window.ExamApp.timerInterval);
            }

            // Close window after short delay for save completion
            setTimeout(() => {
                window.close();
            }, 1000);

        } else {
            // OTHER REASONS (expired, etc.) - normal handling
            console.log(`⏰ ${reason} - normal termination`);

            // Send completion to server
            if (window.ExamApp.socket && window.ExamApp.socket.connected) {
                window.ExamApp.socket.emit('exam-complete', {
                    sessionId: window.ExamApp.sessionId,
                    reason: reason,
                    completed: false,
                    terminated: false,
                    timestamp: Date.now()
                });
            }

            // Clean up
            deactivateAntiCheat();
            if (window.ExamApp.timerInterval) {
                clearInterval(window.ExamApp.timerInterval);
            }

            // Close window after delay
            setTimeout(() => {
                window.close();
            }, 2000);
        }

    } catch (error) {
        console.error('❌ Error exiting exam:', error);
        // Force close on error
        window.close();
    }
}

// ================================
// VIOLATION SCREEN HANDLERS
// ================================

/**
 * Show violation screen
 */
function showViolationScreen(reason) {
    try {
        console.log(`🚫 Showing violation screen: ${reason}`);

        document.getElementById('violation-reason').textContent = reason;
        document.getElementById('violation-screen').style.display = 'flex';

        // Blur exam content
        document.getElementById('exam-container').classList.add('violation-detected');
    } catch (error) {
        console.error('❌ Error showing violation screen:', error);
    }
}

/**
 * Hide violation screen
 */
function hideViolationScreen() {
    try {
        document.getElementById('violation-screen').style.display = 'none';
        document.getElementById('exam-container').classList.remove('violation-detected');
    } catch (error) {
        console.error('❌ Error hiding violation screen:', error);
    }
}

/**
 * Continue after violation
 */
function continueAfterViolation() {
    try {
        console.log('✅ Student chose to continue after violation');

        hideViolationScreen();

        // Re-enter fullscreen if needed
        if (!window.ExamApp.isFullscreen) {
            enterFullscreenMode();
        }
    } catch (error) {
        console.error('❌ Error continuing after violation:', error);
    }
}

/**
 * Exit after violation
 */
async function exitAfterViolation() {
    try {
        // Use custom dialog instead of browser confirm
        const shouldExit = await showViolationExitDialog(
            'Сигурен ли сте че искате да напуснете изпита поради нарушение?\n\nТова действие не може да бъде отменено.'
        );

        if (shouldExit) {
            console.log('🚪 Student chose to exit after violation');
            exitExam('violation');
        }
    } catch (error) {
        console.error('❌ Error handling violation exit:', error);
    }
}

// ================================
// NOTIFICATION FUNCTIONS
// ================================

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    try {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;

        // Set background color based on type
        const colors = {
            'success': '#4CAF50',
            'error': '#ff4757',
            'warning': '#ffc107',
            'info': '#2196F3'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Hide notification after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);

    } catch (error) {
        console.error('❌ Error showing notification:', error);
    }
}

/**
 * Show error message
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
        console.error('❌ Failed to show error:', error);
    }
}

// ================================
// ASSIGN GLOBAL FUNCTIONS
// ================================

// Make main functions available globally for module access
window.ExamApp.startExam = startExam;
window.ExamApp.exitExam = exitExam;

// Socket event handlers for login responses
window.ExamApp.handleLoginSuccess = handleLoginSuccess;
window.ExamApp.handleSessionRestore = handleSessionRestore;
window.ExamApp.handleLoginError = handleLoginError;

// Timer event handlers
window.ExamApp.handleTimeWarning = handleTimeWarning;
window.ExamApp.handleExamExpired = handleExamExpired;

// ================================
// DEBUGGING FUNCTIONS (DEVELOPMENT ONLY)
// ================================
if (window.location.hostname === 'localhost') {
    window.examDebug = {
        getState: () => window.ExamApp,
        triggerViolation: (reason) => showViolationScreen(reason),
        forceFullscreen: () => enterFullscreenMode(),
        saveCode: () => saveCode(),
        runCode: () => runCode(),
        resetState: () => {
            window.ExamApp.isLoggedIn = false;
            document.getElementById('login-container').style.display = 'flex';
            document.getElementById('exam-container').style.display = 'none';
        }
    };

    console.log('🐛 Debug functions available: window.examDebug');
}

console.log('🎯 Student Exam System Main Entry Point loaded successfully!');