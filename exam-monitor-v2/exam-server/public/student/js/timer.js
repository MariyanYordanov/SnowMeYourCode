/**
 * Exam Timer Module
 * Handles exam countdown, time warnings, and expiration logic
 */

// Timer configuration
const TIME_WARNINGS = [60, 30, 15, 5, 1]; // Minutes before exam end to warn
const WARNING_COLORS = {
    normal: '#4CAF50',
    warning: '#ffa502',
    critical: '#ff4757'
};

// Warned times to prevent duplicate warnings
let warnedTimes = new Set();

/**
 * Start exam timer with given duration
 */
export function startExamTimer(duration) {
    try {
        const endTime = Date.now() + duration;

        // Store timer info in global state
        window.ExamApp.examEndTime = endTime;
        window.ExamApp.examDuration = duration;

        // Clear any existing timer
        if (window.ExamApp.timerInterval) {
            clearInterval(window.ExamApp.timerInterval);
        }

        // Reset warned times
        warnedTimes.clear();

        // Start countdown interval
        window.ExamApp.timerInterval = setInterval(() => {
            updateTimerTick(endTime);
        }, 1000);

        // Initial update
        updateTimerTick(endTime);

        console.log('✅ Exam timer started');
        return true;
    } catch (error) {
        console.error('❌ Failed to start exam timer:', error);
        return false;
    }
}

/**
 * Timer tick update function
 */
function updateTimerTick(endTime) {
    try {
        const now = Date.now();
        const timeLeft = Math.max(0, endTime - now);

        // Update display
        updateTimerDisplay(timeLeft);

        // Check for time warnings
        checkTimeWarnings(timeLeft);

        // Auto-expire if time is up
        if (timeLeft <= 0) {
            handleExamExpired();
        }
    } catch (error) {
        console.error('❌ Timer tick error:', error);
    }
}

/**
 * Update timer display in UI
 */
export function updateTimerDisplay(timeLeft) {
    try {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const timerEl = document.getElementById('timer-display');
        if (timerEl) {
            timerEl.textContent = display;
        }

        // Update timer color based on time left
        updateTimerColor(timeLeft);

        // Update global state
        window.ExamApp.timeLeft = timeLeft;
    } catch (error) {
        console.error('❌ Failed to update timer display:', error);
    }
}

/**
 * Update timer color based on remaining time
 */
function updateTimerColor(timeLeft) {
    try {
        const timerEl = document.querySelector('.exam-timer');
        if (!timerEl) return;

        const minutesLeft = Math.floor(timeLeft / (1000 * 60));

        if (minutesLeft <= 5) {
            // Critical: last 5 minutes
            timerEl.style.color = WARNING_COLORS.critical;
            timerEl.style.animation = 'pulse 1s infinite';
        } else if (minutesLeft <= 15) {
            // Warning: last 15 minutes
            timerEl.style.color = WARNING_COLORS.warning;
            timerEl.style.animation = 'none';
        } else {
            // Normal: more than 15 minutes
            timerEl.style.color = WARNING_COLORS.normal;
            timerEl.style.animation = 'none';
        }
    } catch (error) {
        console.error('❌ Failed to update timer color:', error);
    }
}

/**
 * Check for time warnings and show them
 */
function checkTimeWarnings(timeLeft) {
    try {
        const minutesLeft = Math.floor(timeLeft / (1000 * 60));

        TIME_WARNINGS.forEach(warningMinutes => {
            if (minutesLeft === warningMinutes && !warnedTimes.has(warningMinutes)) {
                showTimeWarning(warningMinutes);
                warnedTimes.add(warningMinutes);
            }
        });
    } catch (error) {
        console.error('❌ Error checking time warnings:', error);
    }
}

/**
 * Show time warning to student
 */
export function showTimeWarning(minutes) {
    try {
        const message = `⚠️ Внимание! Остават ${minutes} минути до края на изпита!`;

        // Show notification
        if (window.ExamApp.showNotification) {
            window.ExamApp.showNotification(message, 'warning');
        }

        // Log warning (only when actually shown)
        console.log(`⚠️ Time warning: ${minutes} minutes left`);

        // Flash timer for attention
        flashTimer();

        // Play warning sound (if available)
        playWarningSound(minutes);
    } catch (error) {
        console.error('❌ Error showing time warning:', error);
    }
}

/**
 * Flash timer for visual attention
 */
function flashTimer() {
    try {
        const timerEl = document.querySelector('.exam-timer');
        if (!timerEl) return;

        // Add flash class
        timerEl.classList.add('timer-flash');

        // Remove flash class after animation
        setTimeout(() => {
            timerEl.classList.remove('timer-flash');
        }, 1000);
    } catch (error) {
        console.error('❌ Error flashing timer:', error);
    }
}

/**
 * Play warning sound (if enabled)
 */
function playWarningSound(minutes) {
    try {
        // Only play sound for critical warnings
        if (minutes <= 5) {
            // Create audio context for beep
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            }
        }
    } catch (error) {
        // Ignore audio errors - not critical
    }
}

/**
 * Handle exam expiration
 */
export function handleExamExpired() {
    try {
        console.log('⏰ Exam time expired');

        // Clear timer interval
        if (window.ExamApp.timerInterval) {
            clearInterval(window.ExamApp.timerInterval);
            window.ExamApp.timerInterval = null;
        }

        // Update display to show 00:00:00
        updateTimerDisplay(0);

        // Save final code
        if (window.ExamApp.editor && typeof saveCode === 'function') {
            try {
                saveCode();
            } catch (error) {
                console.error('Failed to save final code:', error);
            }
        }

        // Show expiration screen
        if (window.ExamApp.showViolationScreen) {
            window.ExamApp.showViolationScreen('Времето за изпита изтече!');
        }

        // Auto-close after 10 seconds
        setTimeout(() => {
            if (window.ExamApp.exitExam) {
                window.ExamApp.exitExam('expired');
            } else {
                window.close();
            }
        }, 10000);

    } catch (error) {
        console.error('❌ Error handling exam expiration:', error);
    }
}

/**
 * Handle time warning from server
 */
export function handleTimeWarning(data) {
    try {
        if (data.minutesLeft) {
            showTimeWarning(data.minutesLeft);
        }

        // Update timer if server provides time info
        if (data.timeLeft) {
            updateTimerDisplay(data.timeLeft);
        }
    } catch (error) {
        console.error('❌ Error handling server time warning:', error);
    }
}

/**
 * Get remaining time
 */
export function getRemainingTime() {
    try {
        if (!window.ExamApp.examEndTime) {
            return 0;
        }

        const now = Date.now();
        return Math.max(0, window.ExamApp.examEndTime - now);
    } catch (error) {
        console.error('❌ Error getting remaining time:', error);
        return 0;
    }
}

/**
 * Get formatted remaining time
 */
export function getFormattedRemainingTime() {
    const timeLeft = getRemainingTime();

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Get time elapsed since exam start
 */
export function getElapsedTime() {
    try {
        if (!window.ExamApp.examStartTime) {
            return 0;
        }

        const now = Date.now();
        return Math.max(0, now - window.ExamApp.examStartTime);
    } catch (error) {
        console.error('❌ Error getting elapsed time:', error);
        return 0;
    }
}

/**
 * Get exam progress percentage
 */
export function getExamProgress() {
    try {
        if (!window.ExamApp.examDuration || !window.ExamApp.examStartTime) {
            return 0;
        }

        const elapsed = getElapsedTime();
        const progress = (elapsed / window.ExamApp.examDuration) * 100;
        return Math.min(100, Math.max(0, progress));
    } catch (error) {
        console.error('❌ Error calculating exam progress:', error);
        return 0;
    }
}

/**
 * Check if exam time is critical (less than 5 minutes)
 */
export function isTimeCritical() {
    const timeLeft = getRemainingTime();
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));
    return minutesLeft <= 5;
}

/**
 * Check if exam time is in warning zone (less than 15 minutes)
 */
export function isTimeWarning() {
    const timeLeft = getRemainingTime();
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));
    return minutesLeft <= 15;
}

/**
 * Extend exam time (admin function)
 */
export function extendExamTime(additionalMinutes) {
    try {
        if (!window.ExamApp.examEndTime) {
            console.error('❌ No exam in progress');
            return false;
        }

        const additionalTime = additionalMinutes * 60 * 1000;
        window.ExamApp.examEndTime += additionalTime;
        window.ExamApp.examDuration += additionalTime;

        console.log(`⏰ Exam time extended by ${additionalMinutes} minutes`);

        // Show notification
        if (window.ExamApp.showNotification) {
            window.ExamApp.showNotification(`Времето за изпита е удължено с ${additionalMinutes} минути`, 'success');
        }

        return true;
    } catch (error) {
        console.error('❌ Error extending exam time:', error);
        return false;
    }
}

/**
 * Pause timer (for emergencies)
 */
export function pauseTimer() {
    try {
        if (window.ExamApp.timerInterval) {
            clearInterval(window.ExamApp.timerInterval);
            window.ExamApp.timerInterval = null;
            window.ExamApp.timerPaused = true;

            console.log('⏸️ Timer paused');
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error pausing timer:', error);
        return false;
    }
}

/**
 * Resume timer
 */
export function resumeTimer() {
    try {
        if (window.ExamApp.timerPaused && window.ExamApp.examEndTime) {
            window.ExamApp.timerInterval = setInterval(() => {
                updateTimerTick(window.ExamApp.examEndTime);
            }, 1000);

            window.ExamApp.timerPaused = false;
            console.log('▶️ Timer resumed');
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error resuming timer:', error);
        return false;
    }
}

/**
 * Stop and cleanup timer
 */
export function stopTimer() {
    try {
        if (window.ExamApp.timerInterval) {
            clearInterval(window.ExamApp.timerInterval);
            window.ExamApp.timerInterval = null;
        }

        // Reset timer state
        window.ExamApp.examEndTime = null;
        window.ExamApp.examDuration = null;
        window.ExamApp.timeLeft = 0;
        window.ExamApp.timerPaused = false;

        // Clear warned times
        warnedTimes.clear();

        return true;
    } catch (error) {
        console.error('❌ Error stopping timer:', error);
        return false;
    }
}

/**
 * Get timer status
 */
export function getTimerStatus() {
    return {
        isRunning: Boolean(window.ExamApp.timerInterval),
        isPaused: Boolean(window.ExamApp.timerPaused),
        timeLeft: getRemainingTime(),
        formattedTimeLeft: getFormattedRemainingTime(),
        elapsedTime: getElapsedTime(),
        progress: getExamProgress(),
        isCritical: isTimeCritical(),
        isWarning: isTimeWarning(),
        examEndTime: window.ExamApp.examEndTime,
        examDuration: window.ExamApp.examDuration
    };
}

/**
 * Add CSS for timer animations
 */
export function injectTimerStyles() {
    try {
        const style = document.createElement('style');
        style.id = 'timer-styles';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .timer-flash {
                animation: timer-flash 0.5s ease-in-out 2;
            }
            
            @keyframes timer-flash {
                0%, 100% { background-color: transparent; }
                50% { background-color: rgba(255, 193, 7, 0.3); }
            }
            
            .exam-timer.critical {
                color: #ff4757 !important;
                font-weight: bold;
            }
            
            .exam-timer.warning {
                color: #ffa502 !important;
            }
        `;

        document.head.appendChild(style);
    } catch (error) {
        console.error('❌ Failed to inject timer styles:', error);
    }
}