/**
 * Anti-Cheat Security Module - SIMPLE APPROACH
 * No blocking - just detection and auto-reload on violations
 * LOGIC: Exit fullscreen → warning → reload page (no code saving for cheaters)
 */

// Import socket functions for reporting
import { reportSuspiciousActivity } from './socket.js';

// Violation tracking
let violationCount = 0;
const MAX_VIOLATIONS = 2; // 1st = warning + reload, 2nd = instant reload

/**
 * Setup anti-cheat monitoring (passive detection only)
 */
export function setupAntiCheat() {
    try {
        console.log('🛡️ Setting up SIMPLE anti-cheat monitoring...');

        // Setup fullscreen monitoring (always active)
        setupFullscreenMonitoring();

        console.log('✅ Simple anti-cheat monitoring setup completed');
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
        console.log('🛡️ Activating simple anti-cheat protection...');

        // Mark as active
        window.ExamApp.antiCheatActive = true;

        // Setup detection systems
        setupFocusDetection();
        setupVisibilityDetection();
        setupTouchpadGestureDetection(); // NEW: Detect touchpad gestures

        console.log('✅ Simple anti-cheat protection activated');
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

        // Remove event listeners
        removeFocusDetection();
        removeVisibilityDetection();
        removeTouchpadGestureDetection(); // NEW: Remove gesture detection

        console.log('✅ Anti-cheat protection deactivated');
    } catch (error) {
        console.error('❌ Error deactivating anti-cheat:', error);
    }
}

/**
 * Setup fullscreen monitoring (core detection)
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

        console.log('🔒 Simple fullscreen monitoring initialized');
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
 * Handle fullscreen change events - MAIN DETECTION
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
 * Handle fullscreen violation - DIRECT TERMINATION
 */
function handleFullscreenViolation() {
    try {
        violationCount++;
        console.log(`🚫 Fullscreen exit violation - TERMINATING EXAM`);

        // Report to server
        reportSuspiciousActivity('fullscreen_exit_termination', {
            violationNumber: violationCount,
            method: 'direct_termination',
            timestamp: Date.now()
        });

        // DIRECT TERMINATION - no second chances
        console.log('🔴 TERMINATING EXAM: Fullscreen violation');
        terminateExamDirectly();

    } catch (error) {
        console.error('❌ Error handling fullscreen violation:', error);
        // Fallback - force close
        window.close();
    }
}

/**
 * Terminate exam directly - no warnings, no second chances
 */
function terminateExamDirectly() {
    try {
        // Mark completion in progress to prevent other violations
        window.ExamApp.completionInProgress = true;

        // Show termination screen
        if (window.ExamApp.showViolationScreen) {
            window.ExamApp.showViolationScreen(
                'ИЗПИТЪТ Е ПРЕКРАТЕН!\n\n' +
                'Нарушение на правилата на изпита.\n' +
                'Излязохте от прозореца или fullscreen режим.\n\n' +
                'Прозорецът ще се затвори автоматично.'
            );
        }

        // Determine termination reason based on how we got here
        let reason = 'fullscreen_violation';
        if (document.hidden) {
            reason = 'document_hidden_violation';
        }

        // Call main exit function
        if (window.ExamApp.exitExam) {
            setTimeout(() => {
                window.ExamApp.exitExam(reason);
            }, 2000);
        } else {
            // Fallback - direct close
            setTimeout(() => {
                window.close();
            }, 2000);
        }

    } catch (error) {
        console.error('❌ Error terminating exam:', error);
        // Force close on error
        window.close();
    }
}

/**
 * Setup focus detection (optional monitoring)
 */
function setupFocusDetection() {
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
}

function removeFocusDetection() {
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
}

/**
 * Handle window blur (focus lost) - JUST REPORT, NO ACTION
 */
function handleWindowBlur() {
    if (!window.ExamApp.antiCheatActive) return;

    try {
        console.log('👁️ Window lost focus - reporting only');

        // Just report to server for monitoring
        reportSuspiciousActivity('window_blur', {
            timestamp: Date.now()
        });

        // NO ACTION - just detection

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
        // Just log - no action needed
    } catch (error) {
        console.error('❌ Error handling window focus:', error);
    }
}

/**
 * Setup visibility detection (optional monitoring)
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
            console.log('👁️ Document hidden - TERMINATING EXAM');

            // Report and terminate immediately
            reportSuspiciousActivity('document_hidden_termination', {
                timestamp: Date.now()
            });

            // DIRECT TERMINATION - no warnings
            console.log('🔴 TERMINATING EXAM: Document hidden violation');
            terminateExamDirectly();

        } else {
            console.log('👁️ Document visible again');
        }
    } catch (error) {
        console.error('❌ Error handling visibility change:', error);
    }
}

/**
 * Setup touchpad gesture detection for three-finger swipes
 */
function setupTouchpadGestureDetection() {
    try {
        // Detect touchpad/trackpad gestures that can exit fullscreen
        const gestureEvents = [
            'wheel',           // Touchpad scroll with modifiers
            'gesturestart',    // Touch gestures (Safari)
            'gesturechange',   // Touch gesture change
            'gestureend',      // Touch gesture end
            'touchstart',      // Touch screen start
            'touchmove',       // Touch screen move
            'touchend'         // Touch screen end
        ];

        gestureEvents.forEach(eventType => {
            document.addEventListener(eventType, handlePotentialGesture, {
                capture: true,
                passive: false
            });
        });

        // Monitor for rapid fullscreen changes (gesture-induced)
        setupFullscreenChangeMonitoring();

        console.log('🔒 Touchpad gesture detection activated');
    } catch (error) {
        console.error('❌ Failed to setup gesture detection:', error);
    }
}

/**
 * Remove touchpad gesture detection
 */
function removeTouchpadGestureDetection() {
    try {
        const gestureEvents = [
            'wheel', 'gesturestart', 'gesturechange', 'gestureend',
            'touchstart', 'touchmove', 'touchend'
        ];

        gestureEvents.forEach(eventType => {
            document.removeEventListener(eventType, handlePotentialGesture, { capture: true });
        });

        if (window.ExamApp.fullscreenMonitorInterval) {
            clearInterval(window.ExamApp.fullscreenMonitorInterval);
        }

        console.log('🔒 Touchpad gesture detection removed');
    } catch (error) {
        console.error('❌ Failed to remove gesture detection:', error);
    }
}

/**
 * Handle potential gestures that might exit fullscreen
 */
function handlePotentialGesture(e) {
    if (!window.ExamApp.antiCheatActive || !window.ExamApp.isFullscreen) return;

    try {
        let suspiciousGesture = false;
        let gestureType = '';

        // Detect three-finger swipe (wheel event with specific characteristics)
        if (e.type === 'wheel') {
            // Three-finger swipe usually has deltaY but no deltaX, and specific deltaMode
            if (Math.abs(e.deltaY) > 50 && Math.abs(e.deltaX) < 20) {
                suspiciousGesture = true;
                gestureType = 'three_finger_swipe';
            }

            // Pinch-to-zoom gesture (wheel with ctrl)
            if (e.ctrlKey || e.metaKey) {
                suspiciousGesture = true;
                gestureType = 'pinch_zoom';
            }
        }

        // Detect touch gestures (mobile/touch screens)
        if (e.type.startsWith('gesture')) {
            suspiciousGesture = true;
            gestureType = 'touch_gesture';
        }

        // Detect multi-touch (three finger touch)
        if (e.type.startsWith('touch') && e.touches && e.touches.length >= 3) {
            suspiciousGesture = true;
            gestureType = 'multi_touch';
        }

        if (suspiciousGesture) {
            console.log(`🚫 Detected suspicious gesture: ${gestureType}`);

            // Report to server
            reportSuspiciousActivity('suspicious_gesture', {
                gestureType: gestureType,
                eventType: e.type,
                deltaX: e.deltaX,
                deltaY: e.deltaY,
                touches: e.touches ? e.touches.length : 0,
                timestamp: Date.now()
            });

            // Check for fullscreen exit in next tick
            setTimeout(() => {
                if (!window.ExamApp.isFullscreen && window.ExamApp.antiCheatActive) {
                    console.log(`🚫 Fullscreen exited after ${gestureType} - TERMINATING`);
                    handleFullscreenViolation();
                }
            }, 100);
        }

    } catch (error) {
        console.error('❌ Error handling gesture:', error);
    }
}

/**
 * Setup active fullscreen monitoring (check every 200ms)
 */
function setupFullscreenChangeMonitoring() {
    try {
        // Clear existing monitor
        if (window.ExamApp.fullscreenMonitorInterval) {
            clearInterval(window.ExamApp.fullscreenMonitorInterval);
        }

        // Monitor fullscreen status every 200ms
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
                console.log('🚫 DETECTED: Fullscreen exit via gesture/swipe');

                // Update state
                window.ExamApp.isFullscreen = false;
                updateFullscreenStatus('⚠️ Fullscreen неактивен');

                // Trigger violation
                handleFullscreenViolation();
            }

        }, 200); // Check every 200ms

        console.log('🔒 Active fullscreen monitoring started');
    } catch (error) {
        console.error('❌ Failed to setup fullscreen monitoring:', error);
    }
}
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
        // Reset violation counter
        violationCount = 0;

        // Hide violation screen
        if (window.ExamApp.hideViolationScreen) {
            window.ExamApp.hideViolationScreen();
        }

        console.log('🚨 Emergency violation reset - violations reset to 0');
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
        violationCount: violationCount,
        maxViolationsAllowed: MAX_VIOLATIONS,
        antiCheatActive: window.ExamApp.antiCheatActive,
        isFullscreen: window.ExamApp.isFullscreen,
        completionInProgress: window.ExamApp.completionInProgress
    };
}