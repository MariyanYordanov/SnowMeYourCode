/**
 * Anti-Cheat Security Module
 * Focus-based monitoring - tracks fullscreen exits instead of blocking keys
 * FIRST violation: choice screen, SECOND violation: automatic termination
 * Updated with Custom Dialog System for fullscreen-safe interactions
 */

// Import socket functions for reporting
import { reportSuspiciousActivity } from './socket.js';

// Import custom dialog system
import {
    showViolationExitDialog,
    showInfoDialog,
    hideCustomDialogs,
    isSecureDialogActive
} from './dialogs.js';

// Grace periods for accidental violations
const GRACE_PERIODS = {
    windowBlur: 3000, // 3 seconds
    documentHidden: 5000 // 5 seconds
};

// Violation tracking - only count fullscreen exits
let fullscreenViolationCount = 0;
const MAX_FULLSCREEN_VIOLATIONS = 1; // After 1 violation, next one terminates

// Timeouts for grace periods
let graceTimeouts = new Map();

/**
 * Setup anti-cheat monitoring (passive, before exam starts)
 */
export function setupAntiCheat() {
    try {
        console.log('🛡️ Setting up focus-based anti-cheat monitoring...');

        // Setup fullscreen monitoring (always active)
        setupFullscreenMonitoring();

        console.log('✅ Focus-based anti-cheat monitoring setup completed');
        return true;
    } catch (error) {
        console.error('❌ Failed to setup anti-cheat:', error);
        return false;
    }
}

/**
 * Activate full anti-cheat protection (when exam starts)
 */
export function activateAntiCheat() {
    try {
        console.log('🛡️ Activating focus-based anti-cheat protection...');

        // Mark as active
        window.ExamApp.antiCheatActive = true;

        // Setup monitoring systems (no keyboard blocking)
        setupFocusMonitoring();
        setupVisibilityMonitoring();
        setupContextMenuBlocking();
        setupCopyPasteMonitoring();

        console.log('✅ Focus-based anti-cheat protection activated');
        return true;
    } catch (error) {
        console.error('❌ Failed to activate anti-cheat:', error);
        return false;
    }
}

/**
 * Deactivate anti-cheat protection (when exam ends)
 */
export function deactivateAntiCheat() {
    try {
        console.log('🛡️ Deactivating anti-cheat protection...');

        // Mark as inactive
        window.ExamApp.antiCheatActive = false;

        // Remove event listeners (no keyboard monitoring to remove)
        removeFocusMonitoring();
        removeVisibilityMonitoring();
        removeContextMenuBlocking();
        removeCopyPasteMonitoring();

        // Clear grace timeouts
        clearAllGraceTimeouts();

        // Remove fullscreen protection CSS
        const protectionStyle = document.getElementById('fullscreen-protection');
        if (protectionStyle) {
            protectionStyle.remove();
        }

        console.log('✅ Anti-cheat protection deactivated');
    } catch (error) {
        console.error('❌ Error deactivating anti-cheat:', error);
    }
}

/**
 * Setup fullscreen monitoring (core mechanism)
 */
export function setupFullscreenMonitoring() {
    try {
        // Listen for fullscreen changes - this is our main detection method
        const fullscreenEvents = [
            'fullscreenchange',
            'webkitfullscreenchange',
            'mozfullscreenchange',
            'MSFullscreenChange'
        ];

        fullscreenEvents.forEach(eventName => {
            document.addEventListener(eventName, handleFullscreenChange);
        });

        console.log('🔒 Focus-based fullscreen monitoring initialized');
    } catch (error) {
        console.error('❌ Failed to setup fullscreen monitoring:', error);
    }
}

/**
 * Enter fullscreen mode
 */
export function enterFullscreenMode() {
    try {
        console.log('🔒 Entering fullscreen mode...');

        const element = document.documentElement;

        if (element.requestFullscreen) {
            element.requestFullscreen({ navigationUI: "hide" });
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        } else {
            console.warn('⚠️ Fullscreen API not supported');
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Failed to enter fullscreen:', error);
        return false;
    }
}

/**
 * Handle fullscreen change events - MAIN VIOLATION DETECTION
 */
function handleFullscreenChange() {
    try {
        const isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        window.ExamApp.isFullscreen = isFullscreen;

        if (isFullscreen) {
            console.log('✅ Entered fullscreen mode');
            updateFullscreenStatus('🔒 Fullscreen активен');

            // Inject fullscreen protection CSS
            injectFullscreenProtectionCSS();
        } else {
            console.log('⚠️ Exited fullscreen mode - VIOLATION DETECTED');
            updateFullscreenStatus('⚠️ Fullscreen неактивен');

            // Handle violation if exam is active AND not in completion process
            if (window.ExamApp.isLoggedIn &&
                window.ExamApp.antiCheatActive &&
                !window.ExamApp.completionInProgress) {
                handleFullscreenViolation();
            } else if (window.ExamApp.completionInProgress) {
                console.log('🔄 Fullscreen exit during completion process - allowed');
            }
        }
    } catch (error) {
        console.error('❌ Error handling fullscreen change:', error);
    }
}

/**
 * Inject fullscreen protection CSS (old student.css rules)
 */
function injectFullscreenProtectionCSS() {
    try {
        // Remove existing protection CSS
        const existingStyle = document.getElementById('fullscreen-protection');
        if (existingStyle) {
            existingStyle.remove();
        }

        // Create protection CSS using old student.css rules
        const style = document.createElement('style');
        style.id = 'fullscreen-protection';
        style.innerHTML = `
            /* FOCUS-BASED FULLSCREEN PROTECTION */
            html:fullscreen,
            body:fullscreen {
                margin: 0 !important;
                padding: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                overflow: hidden !important;
            }

            :fullscreen {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
            }

            /* Block browser UI in fullscreen */
            ::-webkit-fullscreen-controls {
                display: none !important;
                visibility: hidden !important;
            }

            :fullscreen::-moz-full-screen-ancestor {
                display: none !important;
            }

            /* Fullscreen protection overlay */
            body:fullscreen::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 100px;
                z-index: 999999;
                pointer-events: none;
                background: transparent;
                display: block;
            }
        `;

        document.head.appendChild(style);
        console.log('🔒 Focus-based fullscreen protection CSS injected');
    } catch (error) {
        console.error('❌ Failed to inject fullscreen protection CSS:', error);
    }
}

/**
 * Handle fullscreen violation - CORE LOGIC: 1st choice, 2nd terminate
 */
function handleFullscreenViolation() {
    try {
        fullscreenViolationCount++;
        console.log(`🚫 Fullscreen exit violation #${fullscreenViolationCount}`);

        // Report to server
        reportSuspiciousActivity('fullscreen_exit', {
            violationNumber: fullscreenViolationCount,
            method: 'focus_detection', // How we detected it
            timestamp: Date.now()
        });

        if (fullscreenViolationCount === 1) {
            // FIRST violation - show choice screen with custom dialogs
            console.log('🟡 First violation - showing choice screen with custom dialogs');

            showFirstViolationScreen();

        } else {
            // SECOND+ violation - automatic termination
            console.log('🔴 AUTOMATIC TERMINATION: Second fullscreen violation');

            reportSuspiciousActivity('automatic_termination', {
                reason: 'second_fullscreen_exit',
                totalViolations: fullscreenViolationCount,
                timestamp: Date.now()
            });

            showAutomaticTerminationScreen();
        }

    } catch (error) {
        console.error('❌ Error handling fullscreen violation:', error);
        // Fallback - terminate immediately if error handling fails
        if (fullscreenViolationCount >= 2) {
            window.close();
        }
    }
}

/**
 * Show first violation screen - REMOVE AUTO RE-ENTER
 */
function showFirstViolationScreen() {
    try {
        // Close any existing custom dialogs first
        hideCustomDialogs();

        // Show traditional violation screen first
        if (window.ExamApp.showViolationScreen) {
            window.ExamApp.showViolationScreen(
                'Излизане от fullscreen режим е забранено!\n\n' +
                'Това е вашето единствено предупреждение.\n' +
                'При следващо нарушение изпитът ще бъде прекратен автоматично.\n\n' +
                'Натиснете "Продължи изпита" за да се върнете в fullscreen режим.'
            );
        }

        // REMOVED: Auto re-enter fullscreen (was causing errors)
        // User must manually click "Continue" to re-enter fullscreen

    } catch (error) {
        console.error('❌ Error showing first violation screen:', error);
    }
}

/**
 * Show automatic termination screen with countdown
 */
function showAutomaticTerminationScreen() {
    try {
        // Close any existing custom dialogs
        hideCustomDialogs();

        // Show termination violation screen
        if (window.ExamApp.showViolationScreen) {
            window.ExamApp.showViolationScreen(
                'ПРЕКРАТЯВАНЕ НА ИЗПИТА!\n\n' +
                'Второ излизане от fullscreen режим.\n\n' +
                'Изпитът ще бъде прекратен автоматично след 5 секунди.'
            );
        }

        // Disable anti-cheat to prevent further violations during termination
        window.ExamApp.antiCheatActive = false;

        // Auto-terminate after 5 seconds
        setTimeout(() => {
            console.log('🚫 TERMINATING EXAM: Second fullscreen violation');
            if (window.ExamApp.exitExam) {
                window.ExamApp.exitExam('automatic_termination');
            } else {
                window.close();
            }
        }, 5000);

    } catch (error) {
        console.error('❌ Error showing termination screen:', error);
        // Fallback - immediate termination
        window.close();
    }
}

/**
 * Setup focus monitoring (detect alt+tab, window switching)
 */
function setupFocusMonitoring() {
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
}

function removeFocusMonitoring() {
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
}

/**
 * Handle window blur (focus lost)
 */
function handleWindowBlur() {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        console.log('👁️ Window lost focus');

        // Skip focus warnings if secure dialog is active
        if (isSecureDialogActive()) {
            console.log('🔒 Secure dialog active - skipping focus warning');
            return;
        }

        // Report to server (for monitoring, not violations)
        reportSuspiciousActivity('window_blur', {
            timestamp: Date.now()
        });

        // Give grace period for accidental clicks
        const timeoutId = setTimeout(() => {
            if (!document.hasFocus() &&
                window.ExamApp.antiCheatActive &&
                !isSecureDialogActive()) {
                // Show warning using custom dialog (not counted as violation)
                showFocusWarningDialog();
            }
        }, GRACE_PERIODS.windowBlur);

        graceTimeouts.set('windowBlur', timeoutId);
    } catch (error) {
        console.error('❌ Error handling window blur:', error);
    }
}

/**
 * Show focus warning using custom dialog
 */
function showFocusWarningDialog() {
    try {
        // Check if dialog system is available
        if (window.ExamApp.dialogSystemActive && showInfoDialog) {
            showInfoDialog({
                title: 'Внимание',
                message: 'Излизане от прозореца на изпита е забранено!\n\nМоля фокусирайте се върху изпита.',
                confirmText: 'Разбрах',
                type: 'warning'
            }).then(() => {
                console.log('💬 Focus warning acknowledged');
            }).catch(error => {
                console.error('❌ Error showing focus warning dialog:', error);
            });
        } else {
            // Fallback to violation screen
            if (window.ExamApp.showViolationScreen) {
                window.ExamApp.showViolationScreen('Излизане от прозореца на изпита е забранено!\n\nМоля фокусирайте се върху изпита.');
            }
        }
    } catch (error) {
        console.error('❌ Error showing focus warning:', error);
    }
}

/**
 * Handle window focus (focus regained)
 */
function handleWindowFocus() {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        console.log('👁️ Window regained focus');

        // Clear grace timeout
        const timeoutId = graceTimeouts.get('windowBlur');
        if (timeoutId) {
            clearTimeout(timeoutId);
            graceTimeouts.delete('windowBlur');
        }

        // Hide any warning dialogs when focus is regained
        if (window.ExamApp.dialogSystemActive) {
            hideCustomDialogs();
        }

    } catch (error) {
        console.error('❌ Error handling window focus:', error);
    }
}

/**
 * Setup visibility monitoring
 */
function setupVisibilityMonitoring() {
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

function removeVisibilityMonitoring() {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Handle visibility change
 */
function handleVisibilityChange() {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        if (document.hidden) {
            console.log('👁️ Document hidden');

            // Skip warnings if secure dialog is active
            if (isSecureDialogActive()) {
                console.log('🔒 Secure dialog active - skipping visibility warning');
                return;
            }

            reportSuspiciousActivity('document_hidden', {
                timestamp: Date.now()
            });

            // Show warning after grace period (not counted as violation)
            const timeoutId = setTimeout(() => {
                if (document.hidden &&
                    window.ExamApp.antiCheatActive &&
                    !isSecureDialogActive()) {
                    showVisibilityWarningDialog();
                }
            }, GRACE_PERIODS.documentHidden);

            graceTimeouts.set('documentHidden', timeoutId);
        } else {
            // Clear grace timeout when visible again
            const timeoutId = graceTimeouts.get('documentHidden');
            if (timeoutId) {
                clearTimeout(timeoutId);
                graceTimeouts.delete('documentHidden');
            }

            // Hide warning dialogs when visibility is restored (but not secure dialogs)
            if (window.ExamApp.dialogSystemActive && !isSecureDialogActive()) {
                hideCustomDialogs();
            }
        }
    } catch (error) {
        console.error('❌ Error handling visibility change:', error);
    }
}

/**
 * Show visibility warning using custom dialog
 */
function showVisibilityWarningDialog() {
    try {
        // Check if dialog system is available
        if (window.ExamApp.dialogSystemActive && showInfoDialog) {
            showInfoDialog({
                title: 'Внимание',
                message: 'Скриване на прозореца е забранено!\n\nМоля върнете се към изпита.',
                confirmText: 'Разбрах',
                type: 'warning'
            }).then(() => {
                console.log('💬 Visibility warning acknowledged');
            }).catch(error => {
                console.error('❌ Error showing visibility warning dialog:', error);
            });
        } else {
            // Fallback to violation screen
            if (window.ExamApp.showViolationScreen) {
                window.ExamApp.showViolationScreen('Скриване на прозореца е забранено!\n\nМоля върнете се към изпита.');
            }
        }
    } catch (error) {
        console.error('❌ Error showing visibility warning:', error);
    }
}

/**
 * Setup context menu blocking
 */
function setupContextMenuBlocking() {
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
}

function removeContextMenuBlocking() {
    document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
}

/**
 * Handle context menu attempts (minor violation - warning only)
 */
function handleContextMenu(e) {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        // Allow context menu only in editor area
        const editorArea = e.target.closest('#monaco-editor');
        if (!editorArea) {
            e.preventDefault();

            // Report but don't count as serious violation
            reportSuspiciousActivity('context_menu', {
                timestamp: Date.now()
            });

            // Show brief warning using custom dialog
            showContextMenuWarning();

            return false;
        }
    } catch (error) {
        console.error('❌ Error handling context menu:', error);
    }
}

/**
 * Show context menu warning
 */
function showContextMenuWarning() {
    try {
        if (window.ExamApp.dialogSystemActive && showInfoDialog) {
            showInfoDialog({
                title: 'Ограничение',
                message: 'Десният клик е ограничен по време на изпита!',
                confirmText: 'Разбрах',
                type: 'warning'
            }).catch(error => {
                console.error('❌ Error showing context menu warning:', error);
            });
        }
    } catch (error) {
        console.error('❌ Error showing context menu warning:', error);
    }
}

/**
 * Setup copy/paste monitoring
 */
function setupCopyPasteMonitoring() {
    document.addEventListener('copy', handleCopyAttempt, { capture: true });
    document.addEventListener('paste', handlePasteAttempt, { capture: true });
    document.addEventListener('cut', handleCutAttempt, { capture: true });
}

function removeCopyPasteMonitoring() {
    document.removeEventListener('copy', handleCopyAttempt, { capture: true });
    document.removeEventListener('paste', handlePasteAttempt, { capture: true });
    document.removeEventListener('cut', handleCutAttempt, { capture: true });
}

/**
 * Handle copy attempts (minor violation - warning only)
 */
function handleCopyAttempt(e) {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        // Allow copy only in editor area
        const editorArea = e.target.closest('#monaco-editor');
        if (!editorArea) {
            e.preventDefault();

            reportSuspiciousActivity('copy_attempt', {
                timestamp: Date.now()
            });

            showCopyPasteWarning('copy');
            return false;
        }
    } catch (error) {
        console.error('❌ Error handling copy attempt:', error);
    }
}

/**
 * Handle paste attempts (minor violation - warning only)
 */
function handlePasteAttempt(e) {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        // Allow paste only in editor area
        const editorArea = e.target.closest('#monaco-editor');
        if (!editorArea) {
            e.preventDefault();

            reportSuspiciousActivity('paste_attempt', {
                timestamp: Date.now()
            });

            showCopyPasteWarning('paste');
            return false;
        }
    } catch (error) {
        console.error('❌ Error handling paste attempt:', error);
    }
}

/**
 * Handle cut attempts (minor violation - warning only)
 */
function handleCutAttempt(e) {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        // Allow cut only in editor area
        const editorArea = e.target.closest('#monaco-editor');
        if (!editorArea) {
            e.preventDefault();

            reportSuspiciousActivity('cut_attempt', {
                timestamp: Date.now()
            });

            showCopyPasteWarning('cut');
            return false;
        }
    } catch (error) {
        console.error('❌ Error handling cut attempt:', error);
    }
}

/**
 * Show copy/paste warning
 */
function showCopyPasteWarning(action) {
    try {
        if (window.ExamApp.dialogSystemActive && showInfoDialog) {
            const messages = {
                'copy': 'Копирането е забранено извън редактора!',
                'paste': 'Поставянето е забранено извън редактора!',
                'cut': 'Изрязването е забранено извън редактора!'
            };

            showInfoDialog({
                title: 'Ограничение',
                message: messages[action] || 'Действието е ограничено!',
                confirmText: 'Разбрах',
                type: 'warning'
            }).catch(error => {
                console.error('❌ Error showing copy/paste warning:', error);
            });
        }
    } catch (error) {
        console.error('❌ Error showing copy/paste warning:', error);
    }
}

/**
 * Update fullscreen status display
 */
function updateFullscreenStatus(text) {
    try {
        const statusEl = document.getElementById('fullscreen-status');
        if (statusEl) {
            statusEl.textContent = text;
        }
    } catch (error) {
        console.error('❌ Failed to update fullscreen status:', error);
    }
}

/**
 * Clear all grace timeouts
 */
function clearAllGraceTimeouts() {
    for (const timeoutId of graceTimeouts.values()) {
        clearTimeout(timeoutId);
    }
    graceTimeouts.clear();
}

/**
 * Emergency violation reset (admin function)
 */
export function emergencyResetViolations() {
    try {
        // Reset fullscreen violation counter
        fullscreenViolationCount = 0;

        clearAllGraceTimeouts();

        // Hide both traditional violation screen and custom dialogs
        if (window.ExamApp.hideViolationScreen) {
            window.ExamApp.hideViolationScreen();
        }

        if (window.ExamApp.dialogSystemActive) {
            hideCustomDialogs();
        }

        console.log('🚨 Emergency violation reset - fullscreen violations reset to 0');
        return true;
    } catch (error) {
        console.error('❌ Error in emergency violation reset:', error);
        return false;
    }
}

/**
 * Get current violation status (for debugging)
 */
export function getViolationStatus() {
    return {
        fullscreenViolationCount: fullscreenViolationCount,
        maxViolationsAllowed: MAX_FULLSCREEN_VIOLATIONS,
        nextViolationWillTerminate: fullscreenViolationCount >= MAX_FULLSCREEN_VIOLATIONS,
        antiCheatActive: window.ExamApp.antiCheatActive,
        isFullscreen: window.ExamApp.isFullscreen,
        dialogSystemActive: window.ExamApp.dialogSystemActive,
        completionInProgress: window.ExamApp.completionInProgress
    };
}