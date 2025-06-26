/* ================================
   STUDENT EXAM SYSTEM - MAIN ENTRY POINT
   Modular architecture with ES6 imports
   ================================ */

// Import all modules
import {
    setupLoginForm,
    updateStudentDisplay
} from './login.js';

import {
    initializeMonacoEditor,
    setupEditorControls,
    runCode,
    formatCode,
    saveCode,
    clearOutput,
    changeTheme
} from './editor.js';

import {
    setupSocket,
    updateConnectionStatus
} from './socket.js';

import {
    startExamTimer,
    updateTimerDisplay,
    handleTimeWarning,
    handleExamExpired
} from './timer.js';

import {
    setupAntiCheat,
    activateAntiCheat,
    deactivateAntiCheat,
    setupFullscreenMonitoring,
    enterFullscreenMode
} from './anticheat.js';

// TODO: Create console.js module - Phase 1
// import {
//     initializeEnhancedConsole,
//     overrideConsoleMethods,
//     ENHANCED_CONSOLE_STYLES
// } from './console.js';

// TODO: Create preview.js module - Phase 1
// import {
//     initializeDOMPreview,
//     DOM_PREVIEW_STYLES
// } from './preview.js';

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
    timerInterval: null,

    // Security state
    isFullscreen: false,
    violationCount: 0,
    antiCheatActive: false,

    // UI state
    isLoggedIn: false,
    lastSaveTime: null,
    isConnected: false,

    // Enhanced features (Phase 1 - TODO)
    enhancedConsoleActive: false,
    domPreviewActive: false
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

// ================================
// SAFE INITIALIZATION
// ================================
function initializeAppSafely() {
    console.log('🎯 Starting safe initialization...');

    try {
        // TODO: Restore when console.js and preview.js are created - Phase 1
        // injectModuleStyles();

        // Setup core components
        setupLoginForm();
        setupAntiCheat();
        setupFullscreenMonitoring();
        setupExamControls();

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
// STYLE INJECTION - TODO Phase 1
// ================================
// TODO: Restore when console.js and preview.js are created
// function injectModuleStyles() {
//     try {
//         // Create style element
//         const styleElement = document.createElement('style');
//         styleElement.id = 'module-styles';

//         // Combine all module styles
//         const combinedStyles = `
//             /* Enhanced Console Styles */
//             ${ENHANCED_CONSOLE_STYLES}

//             /* DOM Preview Styles */
//             ${DOM_PREVIEW_STYLES}
//         `;

//         styleElement.textContent = combinedStyles;
//         document.head.appendChild(styleElement);

//         console.log('✅ Module styles injected');
//     } catch (error) {
//         console.error('❌ Failed to inject styles:', error);
//     }
// }

// ================================
// EXAM CONTROLS SETUP
// ================================
function setupExamControls() {
    try {
        // Setup editor controls using imported functions
        setupEditorControls({
            runCode: runCode,
            formatCode: formatCode,
            saveCode: saveCode,
            clearOutput: clearOutput,
            changeTheme: changeTheme
        });

        // Finish exam button
        const finishBtn = document.getElementById('finish-exam-btn');
        if (finishBtn) {
            finishBtn.addEventListener('click', finishExam);
        }

        // Violation screen buttons
        const continueBtn = document.getElementById('continue-exam-btn');
        const exitBtn = document.getElementById('exit-violation-btn');

        if (continueBtn) {
            continueBtn.addEventListener('click', continueAfterViolation);
        }

        if (exitBtn) {
            exitBtn.addEventListener('click', exitAfterViolation);
        }

        console.log('✅ Exam controls initialized');
    } catch (error) {
        console.error('❌ Failed to setup exam controls:', error);
    }
}

// ================================
// EXAM LIFECYCLE FUNCTIONS
// ================================

/**
 * Start exam with provided data
 */
function startExam(data) {
    try {
        console.log('🎯 Starting exam...');

        // Hide login, show exam
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('exam-container').style.display = 'flex';

        // Update student info display
        updateStudentDisplay(window.ExamApp.studentName, window.ExamApp.studentClass, window.ExamApp.sessionId);

        // Start timer
        startExamTimer(data.timeLeft || window.ExamApp.examDuration);

        // Initialize Monaco Editor (async) - FIXED Promise handling
        initializeMonacoEditor(data.lastCode || '')
            .then(editor => {
                // Editor is already stored in window.ExamApp.editor inside initializeMonacoEditor
                console.log('✅ Monaco Editor ready for use');
            })
            .catch(error => {
                console.error('❌ Monaco Editor initialization failed:', error);
                showError('Грешка при зареждане на редактора');
            });

        // TODO: Restore when console.js and preview.js are created - Phase 1
        // initializeEnhancedFeatures();

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
 * Initialize enhanced features (console + preview) - TODO Phase 1
 */
// TODO: Restore when console.js and preview.js are created
// function initializeEnhancedFeatures() {
//     try {
//         // Initialize enhanced console
//         if (initializeEnhancedConsole('code-output')) {
//             overrideConsoleMethods();
//             window.ExamApp.enhancedConsoleActive = true;
//             console.log('✅ Enhanced console activated');
//         }

//         // Initialize DOM preview
//         if (initializeDOMPreview('output-panel', 'code-output')) {
//             window.ExamApp.domPreviewActive = true;
//             console.log('✅ DOM preview activated');
//         }
//     } catch (error) {
//         console.error('❌ Failed to initialize enhanced features:', error);
//     }
// }

/**
 * Finish exam gracefully
 */
function finishExam() {
    if (confirm('Сигурен ли сте че искате да приключите изпита?')) {
        console.log('🏁 Student finishing exam normally');
        exitExam('completed');
    }
}

/**
 * Exit exam with specified reason
 */
function exitExam(reason) {
    console.log(`🚪 Exiting exam with reason: ${reason}`);

    try {
        // Save final code
        if (window.ExamApp.editor) {
            saveCode();
        }

        // Send completion to server
        if (window.ExamApp.socket && window.ExamApp.socket.connected) {
            window.ExamApp.socket.emit('exam-complete', {
                sessionId: window.ExamApp.sessionId,
                reason: reason,
                completed: reason === 'completed',
                timestamp: Date.now()
            });
        }

        // Clean up
        cleanupExamSession();

        // Close window after short delay
        setTimeout(() => {
            window.close();
        }, 1000);
    } catch (error) {
        console.error('❌ Error during exam exit:', error);
    }
}

/**
 * Cleanup exam session
 */
function cleanupExamSession() {
    try {
        // Deactivate anti-cheat
        deactivateAntiCheat();

        // Clear timer
        if (window.ExamApp.timerInterval) {
            clearInterval(window.ExamApp.timerInterval);
        }

        // Reset state
        window.ExamApp.isLoggedIn = false;
        window.ExamApp.antiCheatActive = false;

        console.log('🧹 Exam session cleanup completed');
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}

/**
 * Handle violation screen - continue
 */
function continueAfterViolation() {
    console.log('✅ Student chose to continue after violation');

    hideViolationScreen();

    // Re-enter fullscreen if needed
    if (!window.ExamApp.isFullscreen) {
        enterFullscreenMode();
    }
}

/**
 * Handle violation screen - exit
 */
function exitAfterViolation() {
    if (confirm('Сигурен ли сте че искате да напуснете изпита?')) {
        console.log('🚪 Student chose to exit after violation');
        exitExam('violation');
    }
}

/**
 * Show violation screen
 */
function showViolationScreen(reason) {
    console.log(`🚫 Showing violation screen: ${reason}`);

    try {
        const violationScreen = document.getElementById('violation-screen');
        const violationReason = document.getElementById('violation-reason');
        const examContainer = document.getElementById('exam-container');

        if (violationReason) {
            violationReason.textContent = reason;
        }

        if (violationScreen) {
            violationScreen.style.display = 'flex';
        }

        // Blur exam content
        if (examContainer) {
            examContainer.classList.add('violation-detected');
        }
    } catch (error) {
        console.error('❌ Error showing violation screen:', error);
    }
}

/**
 * Hide violation screen
 */
function hideViolationScreen() {
    try {
        const violationScreen = document.getElementById('violation-screen');
        const examContainer = document.getElementById('exam-container');

        if (violationScreen) {
            violationScreen.style.display = 'none';
        }

        if (examContainer) {
            examContainer.classList.remove('violation-detected');
        }
    } catch (error) {
        console.error('❌ Error hiding violation screen:', error);
    }
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Show error message to user
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
 * Hide error panel
 */
function hideError() {
    try {
        const errorPanel = document.getElementById('error-panel');
        if (errorPanel) {
            errorPanel.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to hide error:', error);
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    try {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());

        // Create new notification
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
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);

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
        console.error('Failed to show notification:', error);
    }
}

// ================================
// GLOBAL EXPORTS FOR MODULES
// ================================

// Export functions that modules might need
window.ExamApp.showError = showError;
window.ExamApp.hideError = hideError;
window.ExamApp.showNotification = showNotification;
window.ExamApp.showViolationScreen = showViolationScreen;
window.ExamApp.hideViolationScreen = hideViolationScreen;
window.ExamApp.startExam = startExam;
window.ExamApp.exitExam = exitExam;

// ================================
// EMERGENCY FUNCTIONS
// ================================
window.emergencyExit = function () {
    console.log('🚨 Emergency exit triggered');
    cleanupExamSession();
    window.close();
};

window.resetViolations = function () {
    console.log('🔄 Resetting violation count');
    window.ExamApp.violationCount = 0;
    hideViolationScreen();
};

// ================================
// DEBUGGING FUNCTIONS (DEVELOPMENT ONLY)
// ================================
if (window.location.hostname === 'localhost') {
    window.examDebug = {
        getState: () => window.ExamApp,
        triggerViolation: (reason) => showViolationScreen(reason),
        forceFullscreen: () => enterFullscreenMode(),
        saveCode: () => saveCode(),
        runCode: () => runCode()
    };

    console.log('🐛 Debug functions available: window.examDebug');
}

console.log('🎯 Student Exam System main.js loaded successfully!');