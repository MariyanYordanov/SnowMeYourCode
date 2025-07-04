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
        const examApp = window.ExamApp;
        if (!examApp.isFullscreen) {
            console.warn('Cannot activate anti-cheat - not in fullscreen mode');
            return false;
        }

        examApp.antiCheatActive = true;

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
        const examApp = window.ExamApp;
        examApp.antiCheatActive = false;

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
        const examApp = window.ExamApp;

        const wasFullscreen = examApp.isFullscreen;
        examApp.isFullscreen = isFullscreen;

        if (isFullscreen) {
            updateFullscreenStatus('Fullscreen активен');

            if (!wasFullscreen && examApp.isLoggedIn && !examApp.antiCheatActive) {
                console.log('Fullscreen entered - activating anti-cheat');
                activateAntiCheat();
            }
        } else {
            updateFullscreenStatus('Fullscreen неактивен');

            if (wasFullscreen &&
                examApp.isLoggedIn &&
                examApp.antiCheatActive &&
                !examApp.completionInProgress) {

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
    const examApp = window.ExamApp;
    if (!examApp.antiCheatActive) return;
    if (!examApp.isFullscreen) return;

    try {
        if (document.hidden) {
            console.log('DOCUMENT HIDDEN DETECTED - TERMINATING EXAM');

            reportSuspiciousActivity('document_hidden_violation', {
                method: 'result_detection',
                timestamp: Date.now()
            });

            
        }
    } catch (error) {
        console.error('Error handling visibility change:', error);
    }
}

function setupActiveFullscreenMonitoring() {
    try {
        const examApp = window.ExamApp;
        if (examApp.fullscreenMonitorInterval) {
            clearInterval(examApp.fullscreenMonitorInterval);
        }

        examApp.fullscreenMonitorInterval = setInterval(() => {
            if (!examApp.antiCheatActive) return;

            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );

            if (examApp.isFullscreen && !isCurrentlyFullscreen) {
                examApp.isFullscreen = false;
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
        const examApp = window.ExamApp;
        if (examApp.fullscreenMonitorInterval) {
            clearInterval(examApp.fullscreenMonitorInterval);
            examApp.fullscreenMonitorInterval = null;
        }
    } catch (error) {
        console.error('Failed to remove active fullscreen monitoring:', error);
    }
}

function terminateExamDirectly(violationType) {
    // This function is now a no-op on the client side, as termination is handled by the server.
    // The server will force disconnect the student based on suspicious activity reports.
    console.warn(`Client-side termination attempt for violation: ${violationType}. Server will handle actual termination.`);
}

function reportSuspiciousActivity(activityType, details = {}) {
    try {
        const examApp = window.ExamApp;
        if (examApp.socket && examApp.socket.connected) {
            examApp.socket.emit('suspicious-activity', {
                sessionId: examApp.sessionId,
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



export function getAntiCheatStatus() {
    const examApp = window.ExamApp;
    return {
        antiCheatActive: examApp.antiCheatActive,
        isFullscreen: examApp.isFullscreen,
        completionInProgress: examApp.completionInProgress,
        hasActiveMonitoring: !!examApp.fullscreenMonitorInterval,
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