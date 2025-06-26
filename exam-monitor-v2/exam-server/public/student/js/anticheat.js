/**
 * Anti-Cheat Security Module
 * Handles security monitoring, fullscreen enforcement, and violation detection
 */

// Import socket functions for reporting
import { reportSuspiciousActivity } from './socket.js';

// Anti-cheat configuration
const VIOLATION_LIMITS = {
    fullscreenExit: 3,
    keyboardShortcuts: 5,
    contextMenu: 3,
    copyPaste: 3,
    devTools: 2
};

// Violation tracking
let violations = {
    fullscreenExit: 0,
    keyboardShortcuts: 0,
    contextMenu: 0,
    copyPaste: 0,
    devTools: 0,
    windowBlur: 0
};

// Grace periods for accidental violations
const GRACE_PERIODS = {
    windowBlur: 3000, // 3 seconds
    documentHidden: 5000 // 5 seconds
};

// Timeouts for grace periods
let graceTimeouts = new Map();

/**
 * Setup anti-cheat monitoring (passive, before exam starts)
 */
export function setupAntiCheat() {
    try {
        console.log('🛡️ Setting up anti-cheat monitoring...');

        // Reset violation counts
        resetViolations();

        // Setup fullscreen monitoring (always active)
        setupFullscreenMonitoring();

        console.log('✅ Anti-cheat monitoring setup completed');
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
        console.log('🛡️ Activating full anti-cheat protection...');

        // Mark as active
        window.ExamApp.antiCheatActive = true;

        // Setup all monitoring systems
        setupKeyboardMonitoring();
        setupFocusMonitoring();
        setupVisibilityMonitoring();
        setupContextMenuBlocking();
        setupCopyPasteMonitoring();
        setupDevToolsDetection();

        console.log('✅ Anti-cheat protection activated');
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

        // Remove all event listeners
        removeKeyboardMonitoring();
        removeFocusMonitoring();
        removeVisibilityMonitoring();
        removeContextMenuBlocking();
        removeCopyPasteMonitoring();

        // Clear grace timeouts
        clearAllGraceTimeouts();

        console.log('✅ Anti-cheat protection deactivated');
    } catch (error) {
        console.error('❌ Error deactivating anti-cheat:', error);
    }
}

/**
 * Setup fullscreen monitoring (always active)
 */
export function setupFullscreenMonitoring() {
    try {
        // Listen for fullscreen changes
        const fullscreenEvents = [
            'fullscreenchange',
            'webkitfullscreenchange',
            'mozfullscreenchange',
            'MSFullscreenChange'
        ];

        fullscreenEvents.forEach(eventName => {
            document.addEventListener(eventName, handleFullscreenChange);
        });

        console.log('🔒 Fullscreen monitoring initialized');
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
            element.requestFullscreen();
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
 * Handle fullscreen change events
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
        } else {
            console.log('⚠️ Exited fullscreen mode');
            updateFullscreenStatus('⚠️ Fullscreen неактивен');

            // Trigger violation if exam is active
            if (window.ExamApp.isLoggedIn && window.ExamApp.antiCheatActive) {
                handleFullscreenViolation();
            }
        }
    } catch (error) {
        console.error('❌ Error handling fullscreen change:', error);
    }
}

/**
 * Handle fullscreen violation
 */
function handleFullscreenViolation() {
    try {
        violations.fullscreenExit++;
        window.ExamApp.violationCount = violations.fullscreenExit;

        console.log(`🚫 Fullscreen violation #${violations.fullscreenExit}`);

        // Report to server
        reportSuspiciousActivity('fullscreen_exit', {
            count: violations.fullscreenExit,
            timestamp: Date.now()
        });

        // Show violation screen
        if (window.ExamApp.showViolationScreen) {
            window.ExamApp.showViolationScreen('Излизане от fullscreen режим е забранено!');
        }

        // Check if limit exceeded
        if (violations.fullscreenExit >= VIOLATION_LIMITS.fullscreenExit) {
            handleViolationLimitExceeded('fullscreen_violations');
        }
    } catch (error) {
        console.error('❌ Error handling fullscreen violation:', error);
    }
}

/**
 * Setup keyboard monitoring
 */
function setupKeyboardMonitoring() {
    document.addEventListener('keydown', handleKeyDown, { capture: true });
}

function removeKeyboardMonitoring() {
    document.removeEventListener('keydown', handleKeyDown, { capture: true });
}

/**
 * Handle keyboard events
 */
function handleKeyDown(e) {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        // Block dangerous key combinations
        const blocked = [
            // Windows key
            e.key === 'Meta' || e.code === 'MetaLeft' || e.code === 'MetaRight',
            // Alt+Tab
            e.altKey && e.code === 'Tab',
            // Ctrl+Shift+I (Dev Tools)
            e.ctrlKey && e.shiftKey && e.code === 'KeyI',
            // F12 (Dev Tools)
            e.code === 'F12',
            // Ctrl+U (View Source)
            e.ctrlKey && e.code === 'KeyU',
            // Ctrl+Shift+C (Inspect Element)
            e.ctrlKey && e.shiftKey && e.code === 'KeyC',
            // Ctrl+W (Close Tab)
            e.ctrlKey && e.code === 'KeyW',
            // Ctrl+R (Refresh)
            e.ctrlKey && e.code === 'KeyR',
            // F5 (Refresh)
            e.code === 'F5',
            // Alt+F4 (Close Window)
            e.altKey && e.code === 'F4',
            // Ctrl+Shift+J (Console)
            e.ctrlKey && e.shiftKey && e.code === 'KeyJ'
        ];

        if (blocked.some(condition => condition)) {
            e.preventDefault();
            e.stopPropagation();

            const violationType = getViolationType(e);
            handleKeyboardViolation(violationType, e);

            return false;
        }
    } catch (error) {
        console.error('❌ Error handling keyboard event:', error);
    }
}

/**
 * Get violation type from keyboard event
 */
function getViolationType(e) {
    if (e.key === 'Meta' || e.code === 'MetaLeft' || e.code === 'MetaRight') {
        return 'windows_key';
    }
    if (e.altKey && e.code === 'Tab') {
        return 'alt_tab';
    }
    if ((e.ctrlKey && e.shiftKey && e.code === 'KeyI') || e.code === 'F12' || (e.ctrlKey && e.shiftKey && e.code === 'KeyJ')) {
        return 'dev_tools';
    }
    if (e.ctrlKey && e.code === 'KeyU') {
        return 'view_source';
    }
    if ((e.ctrlKey && e.code === 'KeyW') || (e.altKey && e.code === 'F4')) {
        return 'close_attempt';
    }
    if ((e.ctrlKey && e.code === 'KeyR') || e.code === 'F5') {
        return 'refresh_attempt';
    }

    return 'unknown_shortcut';
}

/**
 * Handle keyboard violation
 */
function handleKeyboardViolation(violationType, event) {
    try {
        violations.keyboardShortcuts++;

        console.log(`🚫 Keyboard violation: ${violationType} (${violations.keyboardShortcuts})`);

        // Report to server
        reportSuspiciousActivity(violationType, {
            count: violations.keyboardShortcuts,
            keyCode: event.code,
            modifiers: {
                ctrl: event.ctrlKey,
                alt: event.altKey,
                shift: event.shiftKey,
                meta: event.metaKey
            },
            timestamp: Date.now()
        });

        // Show violation screen for serious violations
        const seriousViolations = ['windows_key', 'dev_tools', 'close_attempt'];
        if (seriousViolations.includes(violationType)) {
            const messages = {
                'windows_key': 'Натискане на Windows клавиша е забранено!',
                'dev_tools': 'Опит за отваряне на Developer Tools!',
                'close_attempt': 'Опит за затваряне на изпита!'
            };

            if (window.ExamApp.showViolationScreen) {
                window.ExamApp.showViolationScreen(messages[violationType] || 'Засечено нарушение!');
            }
        }

        // Check if limit exceeded
        if (violations.keyboardShortcuts >= VIOLATION_LIMITS.keyboardShortcuts) {
            handleViolationLimitExceeded('keyboard_violations');
        }
    } catch (error) {
        console.error('❌ Error handling keyboard violation:', error);
    }
}

/**
 * Setup focus monitoring
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
        violations.windowBlur++;

        // Report to server
        reportSuspiciousActivity('window_blur', {
            count: violations.windowBlur,
            timestamp: Date.now()
        });

        // Give grace period for accidental clicks
        const timeoutId = setTimeout(() => {
            if (!document.hasFocus() && window.ExamApp.antiCheatActive) {
                if (window.ExamApp.showViolationScreen) {
                    window.ExamApp.showViolationScreen('Излизане от прозореца на изпита е забранено!');
                }
            }
        }, GRACE_PERIODS.windowBlur);

        graceTimeouts.set('windowBlur', timeoutId);
    } catch (error) {
        console.error('❌ Error handling window blur:', error);
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

            reportSuspiciousActivity('document_hidden', {
                timestamp: Date.now()
            });

            // Show violation after grace period
            const timeoutId = setTimeout(() => {
                if (document.hidden && window.ExamApp.antiCheatActive) {
                    if (window.ExamApp.showViolationScreen) {
                        window.ExamApp.showViolationScreen('Скриване на прозореца е забранено!');
                    }
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
        }
    } catch (error) {
        console.error('❌ Error handling visibility change:', error);
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
 * Handle context menu attempts
 */
function handleContextMenu(e) {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        // Allow context menu only in editor area
        const editorArea = e.target.closest('#monaco-editor');
        if (!editorArea) {
            e.preventDefault();
            violations.contextMenu++;

            reportSuspiciousActivity('context_menu', {
                count: violations.contextMenu,
                timestamp: Date.now()
            });

            return false;
        }
    } catch (error) {
        console.error('❌ Error handling context menu:', error);
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
 * Handle copy attempts
 */
function handleCopyAttempt(e) {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        // Allow copy only in editor area
        const editorArea = e.target.closest('#monaco-editor');
        if (!editorArea) {
            e.preventDefault();
            violations.copyPaste++;

            reportSuspiciousActivity('copy_attempt', {
                count: violations.copyPaste,
                timestamp: Date.now()
            });

            return false;
        }
    } catch (error) {
        console.error('❌ Error handling copy attempt:', error);
    }
}

/**
 * Handle paste attempts
 */
function handlePasteAttempt(e) {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        // Allow paste only in editor area
        const editorArea = e.target.closest('#monaco-editor');
        if (!editorArea) {
            e.preventDefault();
            violations.copyPaste++;

            reportSuspiciousActivity('paste_attempt', {
                count: violations.copyPaste,
                timestamp: Date.now()
            });

            return false;
        }
    } catch (error) {
        console.error('❌ Error handling paste attempt:', error);
    }
}

/**
 * Handle cut attempts
 */
function handleCutAttempt(e) {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        // Allow cut only in editor area
        const editorArea = e.target.closest('#monaco-editor');
        if (!editorArea) {
            e.preventDefault();
            violations.copyPaste++;

            reportSuspiciousActivity('cut_attempt', {
                count: violations.copyPaste,
                timestamp: Date.now()
            });

            return false;
        }
    } catch (error) {
        console.error('❌ Error handling cut attempt:', error);
    }
}

/**
 * Setup developer tools detection
 */
function setupDevToolsDetection() {
    try {
        // DevTools detection using console
        setInterval(() => {
            if (window.ExamApp.antiCheatActive) {
                detectDevTools();
            }
        }, 1000);
    } catch (error) {
        console.error('❌ Error setting up dev tools detection:', error);
    }
}

/**
 * Detect developer tools opening
 */
function detectDevTools() {
    try {
        const threshold = 160;

        if (window.outerHeight - window.innerHeight > threshold ||
            window.outerWidth - window.innerWidth > threshold) {

            violations.devTools++;

            console.log(`🚫 Developer tools detected (${violations.devTools})`);

            reportSuspiciousActivity('dev_tools_detected', {
                count: violations.devTools,
                windowDimensions: {
                    outerWidth: window.outerWidth,
                    outerHeight: window.outerHeight,
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight
                },
                timestamp: Date.now()
            });

            if (window.ExamApp.showViolationScreen) {
                window.ExamApp.showViolationScreen('Developer Tools са забранени по време на изпита!');
            }

            // Check if limit exceeded
            if (violations.devTools >= VIOLATION_LIMITS.devTools) {
                handleViolationLimitExceeded('dev_tools_violations');
            }
        }
    } catch (error) {
        // Ignore errors in dev tools detection
    }
}

/**
 * Handle violation limit exceeded
 */
function handleViolationLimitExceeded(violationType) {
    try {
        console.log(`🚫 Violation limit exceeded: ${violationType}`);

        // Report to server
        reportSuspiciousActivity('violation_limit_exceeded', {
            violationType: violationType,
            allViolations: violations,
            timestamp: Date.now()
        });

        // Show termination screen
        if (window.ExamApp.showViolationScreen) {
            window.ExamApp.showViolationScreen('Превишен е лимитът от нарушения. Изпитът ще бъде прекратен.');
        }

        // Auto-terminate after 5 seconds
        setTimeout(() => {
            if (window.ExamApp.exitExam) {
                window.ExamApp.exitExam('violations');
            } else {
                window.close();
            }
        }, 5000);
    } catch (error) {
        console.error('❌ Error handling violation limit exceeded:', error);
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
 * Reset all violation counts
 */
function resetViolations() {
    violations = {
        fullscreenExit: 0,
        keyboardShortcuts: 0,
        contextMenu: 0,
        copyPaste: 0,
        devTools: 0,
        windowBlur: 0
    };

    window.ExamApp.violationCount = 0;
    console.log('🔄 Violation counts reset');
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
 * Get violation statistics
 */
export function getViolationStats() {
    return {
        ...violations,
        total: Object.values(violations).reduce((sum, count) => sum + count, 0),
        limits: VIOLATION_LIMITS
    };
}

/**
 * Check if student is in violation danger zone
 */
export function isInDangerZone() {
    return violations.fullscreenExit >= VIOLATION_LIMITS.fullscreenExit - 1 ||
        violations.devTools >= VIOLATION_LIMITS.devTools - 1 ||
        violations.keyboardShortcuts >= VIOLATION_LIMITS.keyboardShortcuts - 2;
}

/**
 * Emergency violation reset (admin function)
 */
export function emergencyResetViolations() {
    try {
        resetViolations();
        clearAllGraceTimeouts();

        if (window.ExamApp.hideViolationScreen) {
            window.ExamApp.hideViolationScreen();
        }

        console.log('🚨 Emergency violation reset performed');
        return true;
    } catch (error) {
        console.error('❌ Error in emergency violation reset:', error);
        return false;
    }
}