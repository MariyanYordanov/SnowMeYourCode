/**
 * Exam Timer Module
 * Handles exam countdown, time warnings, and expiration logic
 */

// Timer configuration
const TIME_WARNINGS = [5]; // Minutes before exam end to warn
const WARNING_COLORS = {
    normal: '#4CAF50',
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
        const examApp = window.ExamApp;

        // Store timer info in global state
        examApp.examEndTime = endTime;
        examApp.examDuration = duration;

        // Clear any existing timer
        if (examApp.timerInterval) {
            clearInterval(examApp.timerInterval);
        }

        // Reset warned times
        warnedTimes.clear();

        // Start countdown interval
        examApp.timerInterval = setInterval(() => {
            updateTimerTick(endTime);
        }, 1000);

        // Initial update
        updateTimerTick(endTime);

        console.log('Exam timer started');
        return true;
    } catch (error) {
        console.error('Failed to start exam timer:', error);
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
        console.error('Timer tick error:', error);
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

        const timerEl = document.getElementById('exam-timer');
        if (timerEl) {
            timerEl.textContent = display;
        }

        // Update timer color based on time left
        updateTimerColor(timeLeft);

        // Update global state
        window.ExamApp.timeLeft = timeLeft;
    } catch (error) {
        console.error('Failed to update timer display:', error);
    }
}

/**
 * Update timer color based on remaining time
 */
function updateTimerColor(timeLeft) {
    try {
        const timerEl = document.getElementById('exam-timer');
        if (!timerEl) return;

        const minutesLeft = Math.floor(timeLeft / (1000 * 60));

        if (minutesLeft < 5) {
            // Critical: last 5 minutes - RED with pulse animation
            timerEl.style.color = WARNING_COLORS.critical;
            timerEl.style.animation = 'pulse 1s infinite';
        } else {
            // Normal: more than 5 minutes - GREEN
            timerEl.style.color = WARNING_COLORS.normal;
            timerEl.style.animation = 'none';
        }
    } catch (error) {
        console.error('Failed to update timer color:', error);
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
        console.error('Error checking time warnings:', error);
    }
}

/**
 * Show time warning to student
 */
export function showTimeWarning(minutes) {
    try {
        const message = `Warning! ${minutes} minutes remaining until the end of the exam!`;
        const examApp = window.ExamApp;

        // Show notification
        if (examApp.showNotification) {
            examApp.showNotification(message, 'warning');
        }

        // Log warning (only when actually shown)
        console.log(`Time warning: ${minutes} minutes left`);

        // Flash timer for attention
        flashTimer();

        // Play warning sound (if available)
        playWarningSound(minutes);
    } catch (error) {
        console.error('Error showing time warning:', error);
    }
}

/**
 * Flash timer for visual attention
 */
function flashTimer() {
    try {
        const timerEl = document.getElementById('exam-timer');
        if (!timerEl) return;

        // Add flash class
        timerEl.classList.add('timer-flash');

        // Remove flash class after animation
        setTimeout(() => {
            timerEl.classList.remove('timer-flash');
        }, 1000);
    } catch (error) {
        console.error('Error flashing timer:', error);
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
        console.log('Exam time expired');
        const examApp = window.ExamApp;

        // Clear timer interval
        if (examApp.timerInterval) {
            clearInterval(examApp.timerInterval);
            examApp.timerInterval = null;
        }

        // Update display to show 00:00:00
        updateTimerDisplay(0);

        // Save final code
        if (examApp.editor && typeof saveCode === 'function') {
            try {
                saveCode();
            } catch (error) {
                console.error('Failed to save final code:', error);
            }
        }

        // Show expiration screen
        if (examApp.showViolationScreen) {
            examApp.showViolationScreen('Exam time has expired!');
        }

        // Auto-close after 10 seconds
        setTimeout(() => {
            if (examApp.exitExam) {
                examApp.exitExam('expired');
            } else {
                window.close();
            }
        }, 10000);

    } catch (error) {
        console.error('Error handling exam expiration:', error);
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
        console.error('Error handling server time warning:', error);
    }
}

/**
 * Get remaining time
 */
export function getRemainingTime() {
    try {
        const examApp = window.ExamApp;
        if (!examApp.examEndTime) {
            return 0;
        }

        const now = Date.now();
        return Math.max(0, examApp.examEndTime - now);
    } catch (error) {
        console.error('Error getting remaining time:', error);
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
        const examApp = window.ExamApp;
        if (!examApp.examStartTime) {
            return 0;
        }

        const now = Date.now();
        return Math.max(0, now - examApp.examStartTime);
    } catch (error) {
        console.error('Error getting elapsed time:', error);
        return 0;
    }
}

/**
 * Get exam progress percentage
 */
export function getExamProgress() {
    try {
        const examApp = window.ExamApp;
        if (!examApp.examDuration || !examApp.examStartTime) {
            return 0;
        }

        const elapsed = getElapsedTime();
        const progress = (elapsed / examApp.examDuration) * 100;
        return Math.min(100, Math.max(0, progress));
    } catch (error) {
        console.error('Error calculating exam progress:', error);
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
 * Check if exam time is in warning zone (less than 5 minutes)
 */
export function isTimeWarning() {
    const timeLeft = getRemainingTime();
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));
    return minutesLeft < 5;
}

/**
 * Extend exam time (admin function)
 */
export function extendExamTime(additionalMinutes) {
    try {
        const examApp = window.ExamApp;
        if (!examApp.examEndTime) {
            console.error('No exam in progress');
            return false;
        }

        const additionalTime = additionalMinutes * 60 * 1000;
        examApp.examEndTime += additionalTime;
        examApp.examDuration += additionalTime;

        console.log(`Exam time extended by ${additionalMinutes} minutes`);

        // Show notification
        if (examApp.showNotification) {
            examApp.showNotification(`Exam time extended by ${additionalMinutes} minutes`, 'success');
        }

        return true;
    } catch (error) {
        console.error('Error extending exam time:', error);
        return false;
    }
}

/**
 * Pause timer (for emergencies)
 */
export function pauseTimer() {
    try {
        const examApp = window.ExamApp;
        if (examApp.timerInterval) {
            clearInterval(examApp.timerInterval);
            examApp.timerInterval = null;
            examApp.timerPaused = true;

            console.log('Timer paused');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error pausing timer:', error);
        return false;
    }
}

/**
 * Resume timer
 */
export function resumeTimer() {
    try {
        const examApp = window.ExamApp;
        if (examApp.timerPaused && examApp.examEndTime) {
            examApp.timerInterval = setInterval(() => {
                updateTimerTick(examApp.examEndTime);
            }, 1000);

            examApp.timerPaused = false;
            console.log('Timer resumed');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error resuming timer:', error);
        return false;
    }
}

/**
 * Stop and cleanup timer
 */
export function stopTimer() {
    try {
        const examApp = window.ExamApp;
        if (examApp.timerInterval) {
            clearInterval(examApp.timerInterval);
            examApp.timerInterval = null;
        }

        // Reset timer state
        examApp.examEndTime = null;
        examApp.examDuration = null;
        examApp.timeLeft = 0;
        examApp.timerPaused = false;

        // Clear warned times
        warnedTimes.clear();

        return true;
    } catch (error) {
        console.error('Error stopping timer:', error);
        return false;
    }
}

/**
 * Get timer status
 */
export function getTimerStatus() {
    const examApp = window.ExamApp;
    return {
        isRunning: Boolean(examApp.timerInterval),
        isPaused: Boolean(examApp.timerPaused),
        timeLeft: getRemainingTime(),
        formattedTimeLeft: getFormattedRemainingTime(),
        elapsedTime: getElapsedTime(),
        progress: getExamProgress(),
        isCritical: isTimeCritical(),
        isWarning: isTimeWarning(),
        examEndTime: examApp.examEndTime,
        examDuration: examApp.examDuration
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
        console.error('Failed to inject timer styles:', error);
    }
}