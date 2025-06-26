/**
 * Anti-Cheat Security Module - RESULT DETECTION APPROACH
 * Only detects RESULTS (fullscreen exit, document hidden), not methods
 * LOGIC: Exit fullscreen OR hide document → instant termination (no warnings)
 */

// Import socket functions for reporting
import { reportSuspiciousActivity } from './socket.js';

/**
 * Setup anti-cheat monitoring (result detection only)
 */
export function setupAntiCheat() {
    try {
        // Setup fullscreen monitoring (always active)
        setupFullscreenMonitoring();

        console.log('✅ Anti-cheat initialized');
        return true;
    } catch (error) {
        console.error('❌ Failed to setup anti-cheat:', error);
        return false;
    }
}

/**
 * Activate anti-cheat protection (when exam starts)
 */
export function activateAntiCheat() {
    try {
        // Mark as active
        window.ExamApp.antiCheatActive = true;

        // Setup only RESULT detection systems
        setupVisibilityDetection(); // Document hidden detection
        setupActiveFullscreenMonitoring(); // Enhanced fullscreen monitoring

        console.log('✅ Anti-cheat activated');
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
        // Mark as inactive
        window.ExamApp.antiCheatActive = false;

        // Remove event listeners
        removeVisibilityDetection();
        removeActiveFullscreenMonitoring();

    } catch (error) {
        console.error('❌ Error deactivating anti-cheat:', error);
    }
}

/**
 * Setup fullscreen monitoring (core detection)
 */
export function setupFullscreenMonitoring() {
    try {
        // Listen for fullscreen changes - ALL PLATFORMS
        const fullscreenEvents = [
            'fullscreenchange',        // Standard
            'webkitfullscreenchange',  // Safari, Chrome old
            'mozfullscreenchange',     // Firefox old  
            'MSFullscreenChange'       // IE/Edge old
        ];

        fullscreenEvents.forEach(eventName => {
            document.addEventListener(eventName, handleFullscreenChange);
        });

    } catch (error) {
        console.error('❌ Failed to setup fullscreen monitoring:', error);
    }
}

/**
 * Enter fullscreen mode
 */
export function enterFullscreenMode() {
    try {
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
 * Handle fullscreen change events - MAIN DETECTION (Cross-Platform)
 */
function handleFullscreenChange() {
    try {
        // Cross-platform fullscreen detection
        const isFullscreen = !!(
            document.fullscreenElement ||        // Standard (Chrome, Firefox)
            document.webkitFullscreenElement ||  // Safari, Chrome old
            document.mozFullScreenElement ||     // Firefox old
            document.msFullscreenElement         // IE/Edge old
        );

        window.ExamApp.isFullscreen = isFullscreen;

        if (isFullscreen) {
            updateFullscreenStatus('🔒 Fullscreen активен');
        } else {
            updateFullscreenStatus('⚠️ Fullscreen неактивен');

            // Handle violation if exam is active AND not in completion process
            if (window.ExamApp.isLoggedIn &&
                window.ExamApp.antiCheatActive &&
                !window.ExamApp.completionInProgress) {

                console.log('🚫 FULLSCREEN EXIT DETECTED - TERMINATING EXAM');
                handleFullscreenViolation();
            }
        }
    } catch (error) {
        console.error('❌ Error handling fullscreen change:', error);
    }
}

/**
 * Handle fullscreen violation - DIRECT TERMINATION
 */
function handleFullscreenViolation() {
    try {
        // Report to server
        reportSuspiciousActivity('fullscreen_exit_violation', {
            method: 'result_detection',
            platform: getPlatformInfo(),
            timestamp: Date.now()
        });

        // DIRECT TERMINATION - no red screen, no confirmation
        terminateExamDirectly('fullscreen_violation');

    } catch (error) {
        console.error('❌ Error handling fullscreen violation:', error);
        // Fallback - force close
        window.close();
    }
}

/**
 * Setup visibility detection (document hidden)
 */
function setupVisibilityDetection() {
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

function removeVisibilityDetection() {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Handle visibility change - DIRECT TERMINATION on document hidden
 */
function handleVisibilityChange() {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        if (document.hidden) {
            console.log('🚫 DOCUMENT HIDDEN DETECTED - TERMINATING EXAM');

            // Report and terminate immediately
            reportSuspiciousActivity('document_hidden_violation', {
                method: 'result_detection',
                timestamp: Date.now()
            });

            // DIRECT TERMINATION
            terminateExamDirectly('document_hidden_violation');
        }
    } catch (error) {
        console.error('❌ Error handling visibility change:', error);
    }
}

/**
 * Setup active fullscreen monitoring (enhanced detection)
 */
function setupActiveFullscreenMonitoring() {
    try {
        // Clear existing monitor
        if (window.ExamApp.fullscreenMonitorInterval) {
            clearInterval(window.ExamApp.fullscreenMonitorInterval);
        }

        // Monitor fullscreen status every 500ms (less aggressive)
        window.ExamApp.fullscreenMonitorInterval = setInterval(() => {
            if (!window.ExamApp.antiCheatActive) return;

            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );

            // If we think we're in fullscreen but we're actually not
            if (window.ExamApp.isFullscreen && !isCurrentlyFullscreen) {
                // Update state
                window.ExamApp.isFullscreen = false;
                updateFullscreenStatus('⚠️ Fullscreen неактивен');

                // Trigger violation
                handleFullscreenViolation();
            }

        }, 500); // Check every 500ms (balanced performance)

    } catch (error) {
        console.error('❌ Failed to setup active fullscreen monitoring:', error);
    }
}

function removeActiveFullscreenMonitoring() {
    try {
        if (window.ExamApp.fullscreenMonitorInterval) {
            clearInterval(window.ExamApp.fullscreenMonitorInterval);
            window.ExamApp.fullscreenMonitorInterval = null;
        }
    } catch (error) {
        console.error('❌ Failed to remove active fullscreen monitoring:', error);
    }
}

/**
 * Terminate exam directly - NO RED SCREEN, NO CONFIRMATION
 */
function terminateExamDirectly(violationType) {
    try {
        // Mark completion in progress to prevent other violations
        window.ExamApp.completionInProgress = true;

        // Call main exit function - NO VIOLATION SCREEN
        if (window.ExamApp.exitExam) {
            // Direct exit without showing violation screen
            window.ExamApp.exitExam(violationType);
        } else {
            // Fallback - direct close
            window.close();
        }

    } catch (error) {
        console.error('❌ Error terminating exam:', error);
        // Force close on error
        window.close();
    }
}

/**
 * Get platform information for reporting
 */
function getPlatformInfo() {
    try {
        return {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            vendor: navigator.vendor,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            hardwareConcurrency: navigator.hardwareConcurrency,
            maxTouchPoints: navigator.maxTouchPoints
        };
    } catch (error) {
        return { error: 'Platform info unavailable' };
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
 * Emergency violation reset (admin function)
 */
export function emergencyResetViolations() {
    try {
        // Reset completion flag
        window.ExamApp.completionInProgress = false;

        // Hide violation screen
        if (window.ExamApp.hideViolationScreen) {
            window.ExamApp.hideViolationScreen();
        }

        console.log('🚨 Emergency violation reset');
        return true;
    } catch (error) {
        console.error('❌ Error in emergency violation reset:', error);
        return false;
    }
}

/**
 * Get current anti-cheat status (for debugging)
 */
export function getAntiCheatStatus() {
    return {
        antiCheatActive: window.ExamApp.antiCheatActive,
        isFullscreen: window.ExamApp.isFullscreen,
        completionInProgress: window.ExamApp.completionInProgress,
        hasActiveMonitoring: !!window.ExamApp.fullscreenMonitorInterval,
        platform: getPlatformInfo()
    };
}

/**
 * Manual fullscreen check (debugging function)
 */
export function checkFullscreenStatus() {
    const fullscreenStatus = {
        standard: !!document.fullscreenElement,
        webkit: !!document.webkitFullscreenElement,
        moz: !!document.mozFullScreenElement,
        ms: !!document.msFullscreenElement,
        combined: !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        )
    };

    console.log('🔍 Fullscreen status check:', fullscreenStatus);
    return fullscreenStatus;
}