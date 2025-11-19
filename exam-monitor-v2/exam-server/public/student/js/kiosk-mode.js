/**
 * Kiosk Mode Implementation
 * Opens exam in isolated popup window and closes parent
 * Point of no return - maximum security
 */

/**
 * Check if currently running in kiosk mode
 */
export function isKioskMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('kiosk') === 'true';
}

/**
 * Launch exam in kiosk mode popup window
 * @param {Object} sessionData - Session data from login
 * @returns {Window|null} - Popup window reference or null if blocked
 */
export function launchKioskMode(sessionData) {
    try {
        console.log('🚀 Launching Kiosk Mode...');

        // Build URL with kiosk parameter and session data
        const baseUrl = window.location.origin + '/student';
        const params = new URLSearchParams({
            kiosk: 'true',
            sessionId: sessionData.sessionId,
            restore: 'true'
        });

        const kioskUrl = `${baseUrl}?${params.toString()}`;

        // Kiosk window features
        const features = [
            'fullscreen=yes',           // Request fullscreen
            'location=no',              // Hide address bar
            'menubar=no',               // Hide menu bar
            'toolbar=no',               // Hide toolbar
            'status=no',                // Hide status bar
            'resizable=no',             // Prevent resizing
            'scrollbars=no',            // Hide scrollbars
            'width=' + screen.width,    // Full screen width
            'height=' + screen.height   // Full screen height
        ].join(',');

        // Open popup window
        const kioskWindow = window.open(kioskUrl, 'ExamKiosk', features);

        if (!kioskWindow) {
            console.error('❌ Popup blocked by browser');
            return null;
        }

        console.log('✅ Kiosk window opened successfully');

        // Store reference for parent window
        window.kioskWindow = kioskWindow;

        // Monitor kiosk window
        monitorKioskWindow(kioskWindow);

        // Close parent window after 2 seconds (point of no return)
        scheduleParentClose();

        return kioskWindow;

    } catch (error) {
        console.error('Failed to launch kiosk mode:', error);
        return null;
    }
}

/**
 * Monitor kiosk window for unexpected closure
 */
function monitorKioskWindow(kioskWindow) {
    // Check every second if kiosk window is still open
    const checkInterval = setInterval(() => {
        if (kioskWindow.closed) {
            console.log('⚠️ Kiosk window was closed');
            clearInterval(checkInterval);

            // Kiosk window closed - show warning on parent (if still open)
            if (!window.closed) {
                showKioskClosedWarning();
            }
        }
    }, 1000);

    // Store interval ID for cleanup
    window.kioskMonitorInterval = checkInterval;
}

/**
 * Schedule parent window closure
 */
function scheduleParentClose() {
    console.log('⏱️ Parent window will close in 2 seconds...');

    // Show countdown message
    const countdownDiv = document.createElement('div');
    countdownDiv.id = 'parent-close-countdown';
    countdownDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        z-index: 999999;
        animation: fadeIn 0.3s ease;
    `;

    countdownDiv.innerHTML = `
        <div style="text-align: center; max-width: 600px; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">🚀</div>
            <h1 style="font-size: 32px; margin-bottom: 20px;">Изпитът започва...</h1>
            <p style="font-size: 18px; opacity: 0.9; margin-bottom: 30px;">
                Изпитният прозорец е отворен в нов таб.
            </p>
            <div id="countdown-number" style="font-size: 72px; font-weight: bold; margin: 30px 0;">
                2
            </div>
            <p style="font-size: 16px; opacity: 0.8;">
                Този прозорец ще се затвори автоматично
            </p>
        </div>
    `;

    document.body.appendChild(countdownDiv);

    let countdown = 2;
    const countdownNumber = document.getElementById('countdown-number');

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownNumber) {
            countdownNumber.textContent = countdown;
        }

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            closeParentWindow();
        }
    }, 1000);
}

/**
 * Close parent window
 */
function closeParentWindow() {
    try {
        console.log('🔒 Closing parent window (point of no return)');

        // Try multiple methods to close the window
        window.close();

        // If window.close() doesn't work (some browsers prevent it)
        setTimeout(() => {
            if (!window.closed) {
                // Redirect to blank page as fallback
                window.location.href = 'about:blank';
            }
        }, 500);

    } catch (error) {
        console.error('Failed to close parent window:', error);
        // Fallback: redirect to blank page
        window.location.href = 'about:blank';
    }
}

/**
 * Show warning if kiosk window was closed unexpectedly
 */
function showKioskClosedWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #dc3545;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        z-index: 999999;
    `;

    warningDiv.innerHTML = `
        <div style="text-align: center; max-width: 600px; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
            <h1 style="font-size: 32px; margin-bottom: 20px;">Изпитът е затворен</h1>
            <p style="font-size: 18px; opacity: 0.9;">
                Изпитният прозорец беше затворен.
            </p>
            <p style="font-size: 16px; opacity: 0.8; margin-top: 30px;">
                Свържете се с преподавателя си ако имате проблеми.
            </p>
        </div>
    `;

    document.body.innerHTML = '';
    document.body.appendChild(warningDiv);
}

/**
 * Initialize kiosk mode exam (called in kiosk window)
 */
export function initializeKioskExam() {
    try {
        console.log('🔒 Initializing Kiosk Mode Exam...');

        // Check if running in kiosk mode
        if (!isKioskMode()) {
            console.warn('Not in kiosk mode, skipping kiosk initialization');
            return false;
        }

        // Get session data from URL parameters
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('sessionId');
        const shouldRestore = params.get('restore') === 'true';

        if (!sessionId) {
            console.error('❌ No session ID in kiosk mode URL');
            showKioskError('Грешка: Липсва session ID');
            return false;
        }

        console.log(`✅ Kiosk mode initialized with session: ${sessionId}`);

        // Prevent accidental window close
        preventWindowClose();

        // Block browser back button
        preventBrowserBack();

        // Request fullscreen immediately
        requestKioskFullscreen();

        return true;

    } catch (error) {
        console.error('Failed to initialize kiosk exam:', error);
        showKioskError('Грешка при инициализация на изпита');
        return false;
    }
}

/**
 * Prevent accidental window close
 */
function preventWindowClose() {
    // Warn before closing/refreshing
    window.addEventListener('beforeunload', (e) => {
        e.preventDefault();
        e.returnValue = 'Сигурни ли сте че искате да напуснете изпита?';
        return e.returnValue;
    });
}

/**
 * Block browser back button
 */
function preventBrowserBack() {
    // Push dummy state to prevent back navigation
    history.pushState(null, '', location.href);

    window.addEventListener('popstate', () => {
        history.pushState(null, '', location.href);
    });
}

/**
 * Request fullscreen for kiosk window
 * AGGRESSIVE MODE: Force fullscreen immediately
 */
function requestKioskFullscreen() {
    // Try to request fullscreen ASAP
    const attemptFullscreen = () => {
        try {
            const element = document.documentElement;

            if (element.requestFullscreen) {
                element.requestFullscreen({ navigationUI: "hide" })
                    .then(() => {
                        console.log('✅ Fullscreen activated in kiosk mode');

                        // Monitor for fullscreen exit attempts
                        monitorFullscreenExit();
                    })
                    .catch(err => {
                        console.warn('Fullscreen request failed:', err);

                        // Retry after user interaction
                        showMandatoryFullscreenBlocker();
                    });
            } else {
                console.warn('Fullscreen API not supported');
                showMandatoryFullscreenBlocker();
            }
        } catch (error) {
            console.error('Error requesting fullscreen:', error);
            showMandatoryFullscreenBlocker();
        }
    };

    // Try immediately (might fail without user gesture)
    attemptFullscreen();

    // Also try after a short delay
    setTimeout(attemptFullscreen, 500);
    setTimeout(attemptFullscreen, 1000);
}

/**
 * Monitor fullscreen exit attempts
 */
function monitorFullscreenExit() {
    document.addEventListener('fullscreenchange', () => {
        const isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        if (!isFullscreen && isKioskMode()) {
            console.error('⚠️ FULLSCREEN EXIT DETECTED IN KIOSK MODE');

            // Show mandatory blocker immediately
            showMandatoryFullscreenBlocker();
        }
    });
}

/**
 * Show MANDATORY fullscreen blocker
 * Blocks ALL interaction until student enters fullscreen
 */
function showMandatoryFullscreenBlocker() {
    // Remove existing blocker if any
    const existingBlocker = document.getElementById('mandatory-fullscreen-blocker');
    if (existingBlocker) {
        existingBlocker.remove();
    }

    const blocker = document.createElement('div');
    blocker.id = 'mandatory-fullscreen-blocker';
    blocker.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        z-index: 9999999;
        cursor: not-allowed;
    `;

    blocker.innerHTML = `
        <div style="text-align: center; max-width: 600px; padding: 40px;">
            <div style="font-size: 72px; margin-bottom: 20px; animation: pulse 1.5s infinite;">
                ⚠️
            </div>
            <h1 style="font-size: 36px; margin-bottom: 20px;">
                Fullscreen е ЗАДЪЛЖИТЕЛЕН!
            </h1>
            <p style="font-size: 20px; line-height: 1.6; margin-bottom: 40px;">
                Не може да продължите без fullscreen режим.<br>
                Кликнете бутона долу за да влезете в fullscreen.
            </p>
            <button
                id="force-fullscreen-btn"
                style="
                    padding: 20px 60px;
                    font-size: 20px;
                    background: rgba(255,255,255,0.9);
                    color: #dc3545;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s;
                    animation: bounce 2s infinite;
                "
                onmouseover="this.style.background='white'; this.style.transform='scale(1.05)'"
                onmouseout="this.style.background='rgba(255,255,255,0.9)'; this.style.transform='scale(1)'"
            >
                🚀 Влез в Fullscreen
            </button>
            <p style="margin-top: 40px; opacity: 0.8; font-size: 14px;">
                ESC няма да ви позволи да излезете
            </p>
        </div>

        <style>
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
        </style>
    `;

    document.body.appendChild(blocker);

    // Add click handler to button
    const btn = document.getElementById('force-fullscreen-btn');
    btn.addEventListener('click', async () => {
        try {
            await document.documentElement.requestFullscreen({ navigationUI: "hide" });

            // Remove blocker once in fullscreen
            setTimeout(() => {
                blocker.remove();
            }, 500);

        } catch (error) {
            console.error('Failed to enter fullscreen:', error);
            alert('Моля, разрешете fullscreen режим за да продължите!');
        }
    });

    // Block all clicks outside the button
    blocker.addEventListener('click', (e) => {
        if (e.target.id !== 'force-fullscreen-btn') {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
}

/**
 * Show fullscreen prompt if auto-request failed
 */
function showFullscreenPrompt() {
    showMandatoryFullscreenBlocker();
}

/**
 * Show kiosk mode error
 */
function showKioskError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #dc3545;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        z-index: 999999;
    `;

    errorDiv.innerHTML = `
        <div style="text-align: center; max-width: 600px; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
            <h1 style="font-size: 32px; margin-bottom: 20px;">Грешка</h1>
            <p style="font-size: 18px; opacity: 0.9;">
                ${message}
            </p>
            <button
                onclick="window.close()"
                style="
                    margin-top: 30px;
                    padding: 12px 30px;
                    font-size: 16px;
                    background: rgba(255,255,255,0.2);
                    border: 1px solid white;
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                "
            >
                Затвори прозорец
            </button>
        </div>
    `;

    document.body.innerHTML = '';
    document.body.appendChild(errorDiv);
}

/**
 * Check if kiosk mode is supported
 */
export function isKioskModeSupported() {
    // Check if popup windows are supported
    try {
        const testPopup = window.open('', '_blank', 'width=1,height=1');
        if (testPopup) {
            testPopup.close();
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}
