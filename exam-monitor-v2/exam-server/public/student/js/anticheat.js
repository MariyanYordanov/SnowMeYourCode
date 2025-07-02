export function setupAntiCheat() {
    try {
        setupFullscreenMonitoring();
        console.log('Anti-cheat initialized');
        return true;
    } catch (error) {
        console.error('Failed to setup anti-cheat:', error);
        return false;
    }
}

export function activateAntiCheat() {
    try {
        if (!window.ExamApp.isFullscreen) {
            console.warn('Cannot activate anti-cheat - not in fullscreen mode');
            return false;
        }

        window.ExamApp.antiCheatActive = true;

        setupVisibilityDetection();
        setupActiveFullscreenMonitoring();

        console.log('Anti-cheat activated');
        return true;
    } catch (error) {
        console.error('Failed to activate anti-cheat:', error);
        return false;
    }
}

export function deactivateAntiCheat() {
    try {
        window.ExamApp.antiCheatActive = false;

        removeVisibilityDetection();
        removeActiveFullscreenMonitoring();

    } catch (error) {
        console.error('Error deactivating anti-cheat:', error);
    }
}

export function setupFullscreenMonitoring() {
    try {
        const fullscreenEvents = [
            'fullscreenchange',
            'webkitfullscreenchange',
            'mozfullscreenchange',
            'MSFullscreenChange'
        ];

        fullscreenEvents.forEach(eventName => {
            document.addEventListener(eventName, handleFullscreenChange);
        });

    } catch (error) {
        console.error('Failed to setup fullscreen monitoring:', error);
    }
}

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
            console.warn('Fullscreen API not supported');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to enter fullscreen:', error);
        return false;
    }
}

function handleFullscreenChange() {
    try {
        const isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        const wasFullscreen = window.ExamApp.isFullscreen;
        window.ExamApp.isFullscreen = isFullscreen;

        if (isFullscreen) {
            updateFullscreenStatus('Fullscreen активен');

            if (!wasFullscreen && window.ExamApp.isLoggedIn && !window.ExamApp.antiCheatActive) {
                console.log('Fullscreen entered - activating anti-cheat');
                activateAntiCheat();
            }
        } else {
            updateFullscreenStatus('Fullscreen неактивен');

            if (wasFullscreen &&
                window.ExamApp.isLoggedIn &&
                window.ExamApp.antiCheatActive &&
                !window.ExamApp.completionInProgress) {

                console.log('FULLSCREEN EXIT DETECTED - TERMINATING EXAM');
                handleFullscreenViolation();
            }
        }
    } catch (error) {
        console.error('Error handling fullscreen change:', error);
    }
}

function handleFullscreenViolation() {
    try {
        reportSuspiciousActivity('fullscreen_exit_violation', {
            method: 'result_detection',
            platform: getPlatformInfo(),
            timestamp: Date.now()
        });

        terminateExamDirectly('fullscreen_violation');

    } catch (error) {
        console.error('Error handling fullscreen violation:', error);
        window.close();
    }
}

function setupVisibilityDetection() {
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

function removeVisibilityDetection() {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
}

function handleVisibilityChange() {
    if (!window.ExamApp.antiCheatActive) return;
    if (!window.ExamApp.isFullscreen) return;

    try {
        if (document.hidden) {
            console.log('DOCUMENT HIDDEN DETECTED - TERMINATING EXAM');

            reportSuspiciousActivity('document_hidden_violation', {
                method: 'result_detection',
                timestamp: Date.now()
            });

            terminateExamDirectly('document_hidden_violation');
        }
    } catch (error) {
        console.error('Error handling visibility change:', error);
    }
}

function setupActiveFullscreenMonitoring() {
    try {
        if (window.ExamApp.fullscreenMonitorInterval) {
            clearInterval(window.ExamApp.fullscreenMonitorInterval);
        }

        window.ExamApp.fullscreenMonitorInterval = setInterval(() => {
            if (!window.ExamApp.antiCheatActive) return;

            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );

            if (window.ExamApp.isFullscreen && !isCurrentlyFullscreen) {
                window.ExamApp.isFullscreen = false;
                updateFullscreenStatus('⚠️ Fullscreen неактивен');

                handleFullscreenViolation();
            }

        }, 500);

    } catch (error) {
        console.error('Failed to setup active fullscreen monitoring:', error);
    }
}

function removeActiveFullscreenMonitoring() {
    try {
        if (window.ExamApp.fullscreenMonitorInterval) {
            clearInterval(window.ExamApp.fullscreenMonitorInterval);
            window.ExamApp.fullscreenMonitorInterval = null;
        }
    } catch (error) {
        console.error('Failed to remove active fullscreen monitoring:', error);
    }
}

function terminateExamDirectly(violationType) {
    try {
        window.ExamApp.completionInProgress = true;

        if (window.ExamApp.exitExam) {
            window.ExamApp.exitExam(violationType);
        } else {
            window.close();
        }

    } catch (error) {
        console.error('Error terminating exam:', error);
        window.close();
    }
}

function reportSuspiciousActivity(activityType, details = {}) {
    try {
        if (window.ExamApp.socket && window.ExamApp.socket.connected) {
            window.ExamApp.socket.emit('suspicious-activity', {
                sessionId: window.ExamApp.sessionId,
                activityType: activityType,
                details: details,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                platform: navigator.platform
            });
        }

        console.warn('Suspicious activity reported:', activityType, details);

    } catch (error) {
        console.error('Failed to report suspicious activity:', error);
    }
}

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

function updateFullscreenStatus(text) {
    try {
        const statusEl = document.getElementById('fullscreen-status');
        if (statusEl) {
            statusEl.textContent = text;
        }
    } catch (error) {
        console.error('Failed to update fullscreen status:', error);
    }
}

export function emergencyResetViolations() {
    try {
        window.ExamApp.completionInProgress = false;

        if (window.ExamApp.hideViolationScreen) {
            window.ExamApp.hideViolationScreen();
        }

        console.log('Emergency violation reset');
        return true;
    } catch (error) {
        console.error('Error in emergency violation reset:', error);
        return false;
    }
}

export function getAntiCheatStatus() {
    return {
        antiCheatActive: window.ExamApp.antiCheatActive,
        isFullscreen: window.ExamApp.isFullscreen,
        completionInProgress: window.ExamApp.completionInProgress,
        hasActiveMonitoring: !!window.ExamApp.fullscreenMonitorInterval,
        platform: getPlatformInfo()
    };
}

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

    console.log('Fullscreen status check:', fullscreenStatus);
    return fullscreenStatus;
}