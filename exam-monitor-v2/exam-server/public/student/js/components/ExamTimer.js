/**
 * ExamTimer Component - Pure behavior for existing timer
 * Works with existing DOM elements in index.html
 */
import { Time } from '/shared/js/utils.js';

export class ExamTimer {
    constructor() {
        this.timeLeft = 0;
        this.warningLevel = 0; // 0=none, 1=yellow, 2=red
        this.isRunning = false;
        this.callbacks = new Map();

        // Cache existing DOM elements from index.html
        this.elements = {
            timerContainer: document.getElementById('exam-timer'),
            displayElement: document.getElementById('timer-display')
        };

        this.validateElements();
        console.log('⏰ ExamTimer component initialized');
    }

    /**
     * Validate that required DOM elements exist
     */
    validateElements() {
        if (!this.elements.timerContainer) {
            console.error('❌ Missing #exam-timer element');
            throw new Error('ExamTimer requires #exam-timer element in DOM');
        }

        if (!this.elements.displayElement) {
            console.error('❌ Missing #timer-display element');
            throw new Error('ExamTimer requires #timer-display element in DOM');
        }
    }

    /**
     * Start timer with initial time
     */
    start(initialTimeLeft) {
        this.timeLeft = initialTimeLeft;
        this.isRunning = true;
        this.updateDisplay();
        this.emit('timerStarted', { timeLeft: this.timeLeft });
        console.log('▶️ Timer started with', Time.formatDuration(this.timeLeft));
    }

    /**
     * Update timer with new time
     */
    update(timeLeft) {
        this.timeLeft = timeLeft;
        this.updateDisplay();
        this.checkWarnings();
    }

    /**
     * Update display and styling
     */
    updateDisplay() {
        if (!this.elements.displayElement) return;

        const formatted = Time.formatDuration(this.timeLeft);
        this.elements.displayElement.textContent = formatted;

        // Update warning levels
        this.updateWarningLevel();
    }

    /**
     * Update warning level based on time left
     */
    updateWarningLevel() {
        const minutes = Math.floor(this.timeLeft / (1000 * 60));
        let newLevel = 0;

        if (minutes <= 5) {
            newLevel = 2; // Critical (red)
        } else if (minutes <= 15) {
            newLevel = 1; // Warning (yellow)
        }

        if (newLevel !== this.warningLevel) {
            this.setWarningLevel(newLevel);
        }
    }

    /**
     * Set warning level styling via CSS classes
     */
    setWarningLevel(level) {
        this.warningLevel = level;

        // Remove existing warning classes
        this.elements.timerContainer.classList.remove('timer-warning', 'timer-critical');

        // Add appropriate class
        switch (level) {
            case 1:
                this.elements.timerContainer.classList.add('timer-warning');
                break;
            case 2:
                this.elements.timerContainer.classList.add('timer-critical');
                break;
        }

        this.emit('warningLevelChanged', { level, timeLeft: this.timeLeft });
    }

    /**
     * Check for specific time warnings
     */
    checkWarnings() {
        const minutes = Math.floor(this.timeLeft / (1000 * 60));
        const warningMinutes = [60, 30, 15, 5, 1];

        if (warningMinutes.includes(minutes)) {
            this.showTimeWarning(minutes);
        }

        // Check for expiration
        if (this.timeLeft <= 0) {
            this.handleExpiration();
        }
    }

    /**
     * Show time warning notification
     */
    showTimeWarning(minutes) {
        const message = minutes === 1
            ? 'Остава 1 минута до края на изпита!'
            : `Остават ${minutes} минути до края на изпита!`;

        this.emit('timeWarning', {
            minutes,
            message,
            timeLeft: this.timeLeft,
            critical: minutes <= 5
        });

        console.log(`⚠️ Time warning: ${minutes} minutes left`);
    }

    /**
     * Handle timer expiration
     */
    handleExpiration() {
        this.isRunning = false;
        this.timeLeft = 0;
        this.elements.displayElement.textContent = '00:00:00';
        this.elements.timerContainer.classList.add('timer-expired');

        this.emit('timerExpired', { message: 'Времето за изпита изтече!' });
        console.log('⏰ Timer expired');
    }

    /**
     * Pause timer
     */
    pause() {
        this.isRunning = false;
        this.elements.timerContainer.classList.add('timer-paused');
        this.emit('timerPaused', { timeLeft: this.timeLeft });
    }

    /**
     * Resume timer
     */
    resume() {
        this.isRunning = true;
        this.elements.timerContainer.classList.remove('timer-paused');
        this.emit('timerResumed', { timeLeft: this.timeLeft });
    }

    /**
     * Stop timer
     */
    stop() {
        this.isRunning = false;
        this.elements.timerContainer.classList.add('timer-stopped');
        this.emit('timerStopped', { timeLeft: this.timeLeft });
    }

    /**
     * Get current time left
     */
    getTimeLeft() {
        return this.timeLeft;
    }

    /**
     * Get formatted time left
     */
    getFormattedTimeLeft() {
        return Time.formatDuration(this.timeLeft);
    }

    /**
     * Get warning level
     */
    getWarningLevel() {
        return this.warningLevel;
    }

    /**
     * Check if timer is running
     */
    isTimerRunning() {
        return this.isRunning;
    }

    /**
     * Show custom message in timer temporarily
     */
    showMessage(message, duration = 3000) {
        const originalText = this.elements.displayElement.textContent;
        this.elements.displayElement.textContent = message;

        setTimeout(() => {
            this.elements.displayElement.textContent = originalText;
        }, duration);
    }

    /**
     * Event subscription
     */
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    /**
     * Emit event
     */
    emit(event, data = {}) {
        if (this.callbacks.has(event)) {
            this.callbacks.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ ExamTimer callback error for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Destroy component
     */
    destroy() {
        this.stop();
        this.callbacks.clear();
        console.log('🧹 ExamTimer destroyed');
    }
}