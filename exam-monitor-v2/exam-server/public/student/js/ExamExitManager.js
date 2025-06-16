/**
 * Unified Exam Exit Manager
 * Handles all exam termination scenarios with proper cleanup and messaging
 */
class ExamExitManager {
    static exitReasons = {
        STUDENT_FINISH: 'student_finish',
        TIME_EXPIRED: 'time_expired',
        INSTRUCTOR_TERMINATED: 'instructor_terminated',
        SECURITY_VIOLATION: 'security_violation',
        ANTI_CHEAT_VIOLATION: 'anti_cheat_violation',
        FULLSCREEN_VIOLATION: 'fullscreen_violation',
        CONNECTION_LOST: 'connection_lost',
        BROWSER_CLOSED: 'browser_closed'
    };

    static exitMessages = {
        [this.exitReasons.STUDENT_FINISH]: {
            title: '✅ Изпит приключен',
            message: 'Изпитът е приключен успешно!\nВашият код е запазен автоматично.',
            type: 'success'
        },
        [this.exitReasons.TIME_EXPIRED]: {
            title: '⏰ Време изтече',
            message: 'Времето за изпита изтече.\nВашият код е запазен автоматично.',
            type: 'warning'
        },
        [this.exitReasons.INSTRUCTOR_TERMINATED]: {
            title: '🛑 Прекратен от преподавател',
            message: 'Изпитът беше прекратен от преподавателя.\nВашият код е запазен автоматично.',
            type: 'info'
        },
        [this.exitReasons.SECURITY_VIOLATION]: {
            title: '🚫 Нарушение на сигурността',
            message: 'Изпитът е прекратен поради нарушение на правилата за сигурност.\nВсички действия са регистрирани.',
            type: 'error'
        },
        [this.exitReasons.ANTI_CHEAT_VIOLATION]: {
            title: '⚠️ Нарушение на правилата',
            message: 'Изпитът е прекратен поради многократни нарушения.\nВсички действия са регистрирани.',
            type: 'error'
        },
        [this.exitReasons.FULLSCREEN_VIOLATION]: {
            title: '🔒 Fullscreen нарушение',
            message: 'Изпитът е прекратен поради опити за излизане от fullscreen режим.\nВсички действия са регистрирани.',
            type: 'error'
        },
        [this.exitReasons.CONNECTION_LOST]: {
            title: '🌐 Връзката се прекъсна',
            message: 'Връзката със сървъра се прекъсна и не може да бъде възстановена.\nСвържете се с преподавателя.',
            type: 'warning'
        },
        [this.exitReasons.BROWSER_CLOSED]: {
            title: '❌ Прозорецът се затваря',
            message: 'Изпитът е прекратен.\nВашият код е запазен автоматично.',
            type: 'info'
        }
    };

    static isExiting = false;
    static cleanupCallbacks = [];
    static exitTimeoutId = null;

    /**
     * Register cleanup callback to be called before exit
     */
    static registerCleanupCallback(callback) {
        if (typeof callback === 'function') {
            this.cleanupCallbacks.push(callback);
        }
    }

    /**
     * Main exit handler - handles all exam termination scenarios
     */
    static async handleExamExit(reason, details = {}) {
        // Prevent multiple simultaneous exits
        if (this.isExiting) {
            console.log('🔄 Exit already in progress, ignoring duplicate call');
            return;
        }

        this.isExiting = true;
        console.log(`🚪 Exam exit initiated: ${reason}`, details);

        try {
            // Step 1: Execute cleanup sequence
            await this.executeCleanupSequence(reason, details);

            // Step 2: Show exit message
            await this.showExitMessage(reason, details);

            // Step 3: Attempt to close window gracefully
            await this.gracefulWindowClose(reason);

        } catch (error) {
            console.error('❌ Error during exam exit:', error);
            // Force close as fallback
            this.forceWindowClose();
        }
    }

    /**
     * Execute comprehensive cleanup sequence
     */
    static async executeCleanupSequence(reason, details) {
        console.log('🧹 Starting cleanup sequence...');

        // Clear all timers and intervals
        this.clearAllTimers();

        // Execute registered cleanup callbacks
        await this.executeCleanupCallbacks(reason, details);

        // Save final state if possible
        await this.saveFinalState(reason, details);

        // Deactivate protection systems
        this.deactivateProtectionSystems();

        // Send final telemetry
        await this.sendFinalTelemetry(reason, details);

        console.log('✅ Cleanup sequence completed');
    }

    /**
     * Clear all known timers and intervals
     */
    static clearAllTimers() {
        // Clear exam timer
        if (window.fullscreenExamSystem?.examTimer) {
            clearInterval(window.fullscreenExamSystem.examTimer);
        }

        // Clear auto-save interval
        if (window.fullscreenExamSystem?.autoSaveInterval) {
            clearInterval(window.fullscreenExamSystem.autoSaveInterval);
        }

        // Clear focus lock interval
        if (window.fullscreenExamSystem?.focusLockInterval) {
            clearInterval(window.fullscreenExamSystem.focusLockInterval);
        }

        // Clear fullscreen check interval
        if (window.fullscreenExamSystem?.fullscreenCheckInterval) {
            clearInterval(window.fullscreenExamSystem.fullscreenCheckInterval);
        }

        // Clear any other known intervals
        ['heartbeatInterval', 'statusCheckInterval', 'antiCheatInterval'].forEach(timerName => {
            if (window[timerName]) {
                clearInterval(window[timerName]);
            }
        });

        console.log('⏱️ All timers cleared');
    }

    /**
     * Execute all registered cleanup callbacks
     */
    static async executeCleanupCallbacks(reason, details) {
        for (const callback of this.cleanupCallbacks) {
            try {
                await callback(reason, details);
            } catch (error) {
                console.error('❌ Cleanup callback error:', error);
            }
        }
    }

    /**
     * Save final exam state
     */
    static async saveFinalState(reason, details) {
        try {
            // Save current code one last time
            if (window.fullscreenExamSystem?.saveCode) {
                window.fullscreenExamSystem.saveCode();
            }

            // Send final exam completion event
            if (window.fullscreenExamSystem?.socket?.connected) {
                window.fullscreenExamSystem.socket.emit('exam-final-exit', {
                    reason: reason,
                    details: details,
                    timestamp: Date.now(),
                    sessionId: window.fullscreenExamSystem.sessionId
                });
            }

            console.log('💾 Final state saved');
        } catch (error) {
            console.warn('⚠️ Could not save final state:', error);
        }
    }

    /**
     * Deactivate all protection systems
     */
    static deactivateProtectionSystems() {
        // Deactivate anti-cheat
        if (window.antiCheat?.deactivate) {
            window.antiCheat.deactivate();
        }

        // Stop fullscreen protection
        if (window.fullscreenExamSystem?.stopFullscreenProtection) {
            window.fullscreenExamSystem.stopFullscreenProtection();
        }

        // Mark exam as inactive
        if (window.fullscreenExamSystem) {
            window.fullscreenExamSystem.isExamActive = false;
            window.fullscreenExamSystem.isFullscreenActive = false;
        }

        console.log('🛡️ Protection systems deactivated');
    }

    /**
     * Send final telemetry data
     */
    static async sendFinalTelemetry(reason, details) {
        try {
            const telemetryData = {
                exitReason: reason,
                exitDetails: details,
                sessionDuration: this.calculateSessionDuration(),
                violationCount: window.antiCheat?.violations || 0,
                fullscreenExitAttempts: window.fullscreenExamSystem?.fullscreenExitAttempts || 0,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                sessionId: window.fullscreenExamSystem?.sessionId
            };

            // Send to server if possible
            if (window.fullscreenExamSystem?.socket?.connected) {
                window.fullscreenExamSystem.socket.emit('exam-telemetry', telemetryData);
            }

            console.log('📊 Final telemetry sent', telemetryData);
        } catch (error) {
            console.warn('⚠️ Could not send telemetry:', error);
        }
    }

    /**
     * Calculate total session duration
     */
    static calculateSessionDuration() {
        if (window.fullscreenExamSystem?.sessionData?.startTime) {
            return Date.now() - new Date(window.fullscreenExamSystem.sessionData.startTime).getTime();
        }
        return 0;
    }

    /**
     * Show appropriate exit message based on reason
     */
    static async showExitMessage(reason, details) {
        const messageConfig = this.exitMessages[reason] || this.exitMessages[this.exitReasons.BROWSER_CLOSED];

        // Create and show custom exit dialog
        await this.showCustomExitDialog(messageConfig, details);
    }

    /**
     * Show custom styled exit dialog
     */
    static showCustomExitDialog(messageConfig, details) {
        return new Promise((resolve) => {
            // Remove any existing dialogs
            const existingDialog = document.getElementById('exam-exit-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }

            // Create exit dialog
            const dialog = document.createElement('div');
            dialog.id = 'exam-exit-dialog';
            dialog.innerHTML = `
                <div class="exit-dialog-overlay">
                    <div class="exit-dialog-content ${messageConfig.type}">
                        <div class="exit-dialog-header">
                            <h2>${messageConfig.title}</h2>
                        </div>
                        <div class="exit-dialog-body">
                            <p>${messageConfig.message}</p>
                            ${details.additionalInfo ? `<p class="additional-info">${details.additionalInfo}</p>` : ''}
                        </div>
                        <div class="exit-dialog-footer">
                            <div class="exit-timer">Затваряне след <span id="exit-countdown">3</span> секунди...</div>
                        </div>
                    </div>
                </div>
            `;

            // Add styles
            dialog.innerHTML += `
                <style>
                    .exit-dialog-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.9);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 999999;
                        font-family: Arial, sans-serif;
                    }
                    
                    .exit-dialog-content {
                        background: white;
                        border-radius: 12px;
                        padding: 0;
                        max-width: 500px;
                        width: 90%;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                        overflow: hidden;
                    }
                    
                    .exit-dialog-header {
                        padding: 20px 30px;
                        color: white;
                        text-align: center;
                    }
                    
                    .exit-dialog-content.success .exit-dialog-header { background: #28a745; }
                    .exit-dialog-content.warning .exit-dialog-header { background: #ffc107; color: #212529; }
                    .exit-dialog-content.info .exit-dialog-header { background: #17a2b8; }
                    .exit-dialog-content.error .exit-dialog-header { background: #dc3545; }
                    
                    .exit-dialog-header h2 {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 600;
                    }
                    
                    .exit-dialog-body {
                        padding: 30px;
                        text-align: center;
                        line-height: 1.6;
                    }
                    
                    .exit-dialog-body p {
                        margin: 0 0 15px 0;
                        font-size: 16px;
                        color: #333;
                    }
                    
                    .additional-info {
                        font-size: 14px;
                        color: #666;
                        font-style: italic;
                    }
                    
                    .exit-dialog-footer {
                        padding: 20px 30px;
                        background: #f8f9fa;
                        text-align: center;
                        border-top: 1px solid #dee2e6;
                    }
                    
                    .exit-timer {
                        font-size: 14px;
                        color: #666;
                        font-weight: 500;
                    }
                    
                    #exit-countdown {
                        font-weight: bold;
                        color: #007bff;
                    }
                </style>
            `;

            document.body.appendChild(dialog);

            // Start countdown timer
            let countdown = 3;
            const countdownElement = document.getElementById('exit-countdown');

            const countdownTimer = setInterval(() => {
                countdown--;
                if (countdownElement) {
                    countdownElement.textContent = countdown;
                }

                if (countdown <= 0) {
                    clearInterval(countdownTimer);
                    resolve();
                }
            }, 1000);

            // Store timer ID for cleanup
            this.exitTimeoutId = countdownTimer;

            console.log(`💬 Exit message shown: ${messageConfig.title}`);
        });
    }

    /**
     * Attempt graceful window close
     */
    static async gracefulWindowClose(reason) {
        console.log('🚪 Attempting graceful window close...');

        // Exit fullscreen first
        await this.exitFullscreen();

        // Small delay to ensure fullscreen exit
        await new Promise(resolve => setTimeout(resolve, 500));

        // Try to close window
        try {
            window.close();

            // If window.close() doesn't work immediately, give it some time
            setTimeout(() => {
                if (!window.closed) {
                    console.warn('⚠️ Window.close() did not work, trying alternative methods');
                    this.forceWindowClose();
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Error closing window:', error);
            this.forceWindowClose();
        }
    }

    /**
     * Exit fullscreen mode
     */
    static async exitFullscreen() {
        try {
            if (document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement) {

                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    await document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    await document.msExitFullscreen();
                }

                console.log('🔓 Exited fullscreen mode');
            }
        } catch (error) {
            console.warn('⚠️ Could not exit fullscreen:', error);
        }
    }

    /**
     * Force window close using alternative methods
     */
    static forceWindowClose() {
        console.log('🔨 Force closing window...');

        try {
            // Method 1: Try to redirect to about:blank
            window.location.href = 'about:blank';

            // Method 2: Try to replace with empty page
            setTimeout(() => {
                window.location.replace('data:text/html,<html><body><h1>Exam Completed</h1><p>You can close this window now.</p><script>window.close();</script></body></html>');
            }, 100);

            // Method 3: Try opening new window and closing this one
            setTimeout(() => {
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                    newWindow.close();
                }
                window.close();
            }, 200);

        } catch (error) {
            console.error('❌ Force close failed:', error);

            // Last resort: Show manual close instruction
            document.body.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    font-family: Arial, sans-serif;
                    text-align: center;
                    background: #f8f9fa;
                ">
                    <div>
                        <h1 style="color: #28a745;">✅ Изпит приключен</h1>
                        <p style="font-size: 18px; margin: 20px 0;">Можете да затворите този прозорец.</p>
                        <p style="color: #666; font-size: 14px;">Alt + F4 или затворете таба</p>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Emergency exit - called from window.beforeunload
     */
    static emergencyExit() {
        if (!this.isExiting) {
            // Quick cleanup without waiting
            this.clearAllTimers();
            this.deactivateProtectionSystems();

            // Send quick exit signal
            if (window.fullscreenExamSystem?.socket?.connected) {
                window.fullscreenExamSystem.socket.emit('exam-emergency-exit', {
                    timestamp: Date.now(),
                    sessionId: window.fullscreenExamSystem?.sessionId
                });
            }
        }
    }

    /**
     * Public method to check if exit is in progress
     */
    static isExitInProgress() {
        return this.isExiting;
    }

    /**
     * Cancel exit process (for testing purposes)
     */
    static cancelExit() {
        this.isExiting = false;
        if (this.exitTimeoutId) {
            clearTimeout(this.exitTimeoutId);
            this.exitTimeoutId = null;
        }

        const dialog = document.getElementById('exam-exit-dialog');
        if (dialog) {
            dialog.remove();
        }
    }
}

// Make available globally
window.ExamExitManager = ExamExitManager;

// Register emergency exit handler
window.addEventListener('beforeunload', () => {
    ExamExitManager.emergencyExit();
});

console.log('🚪 ExamExitManager loaded and ready');