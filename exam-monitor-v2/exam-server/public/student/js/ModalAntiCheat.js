/**
 * Modal-Style AntiCheat System
 * Uses modal blocking techniques for complete page lockdown
 */
class ModalAntiCheat {
    constructor(socket) {
        this.socket = socket;
        this.isActive = false;
        this.isBlocked = false;
        this.violations = 0;
        this.eventListeners = [];

        console.log('🛡️ Modal AntiCheat System initialized');
    }

    /**
     * Activate modal-style protection
     */
    activate() {
        if (this.isActive) return;
        this.isActive = true;

        console.log('🚫 Activating modal-style protection...');

        this.setupDetection();
        this.addProtectionStyles();

        console.log('✅ Modal protection active');
    }

    /**
     * Setup violation detection
     */
    setupDetection() {
        // Detect tab switching
        this.addListener(document, 'visibilitychange', () => {
            if (document.hidden && this.isActive) {
                this.triggerViolation('tab_switch', 'Превключване към друг таб');
            }
        });

        // Detect window blur
        this.addListener(window, 'blur', () => {
            if (this.isActive) {
                this.triggerViolation('window_blur', 'Излизане от прозореца на изпита');
            }
        });

        // Block keyboard shortcuts
        this.addListener(document, 'keydown', (e) => {
            if (!this.isActive) return;

            const blocked = this.checkBlockedShortcut(e);
            if (blocked) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.triggerViolation('blocked_shortcut', blocked);
                return false;
            }
        }, true);

        // Block right click outside code editor
        this.addListener(document, 'contextmenu', (e) => {
            if (!this.isActive) return;

            if (!this.isCodeEditorArea(e.target)) {
                e.preventDefault();
                this.triggerViolation('right_click', 'Десен клик извън редактора');
                return false;
            }
        }, true);

        // Block navigation attempts
        this.addListener(window, 'beforeunload', (e) => {
            if (this.isActive) {
                e.preventDefault();
                e.returnValue = 'Изпит в ход - сигурни ли сте?';
                this.triggerViolation('navigation_attempt', 'Опит за напускане на страницата');
                return 'Изпит в ход - сигурни ли сте?';
            }
        });
    }

    /**
     * Check if keyboard shortcut should be blocked
     */
    checkBlockedShortcut(e) {
        const shortcuts = {
            'F5': () => e.code === 'F5',
            'Ctrl+R': () => e.ctrlKey && e.code === 'KeyR',
            'Ctrl+F5': () => e.ctrlKey && e.code === 'F5',
            'Ctrl+Shift+R': () => e.ctrlKey && e.shiftKey && e.code === 'KeyR',
            'F12': () => e.code === 'F12',
            'Ctrl+Shift+I': () => e.ctrlKey && e.shiftKey && e.code === 'KeyI',
            'Ctrl+Shift+J': () => e.ctrlKey && e.shiftKey && e.code === 'KeyJ',
            'Ctrl+U': () => e.ctrlKey && e.code === 'KeyU',
            'Ctrl+S': () => e.ctrlKey && e.code === 'KeyS',
            'Ctrl+P': () => e.ctrlKey && e.code === 'KeyP',
            'Alt+F4': () => e.altKey && e.code === 'F4',
            'Ctrl+T': () => e.ctrlKey && e.code === 'KeyT',
            'Ctrl+N': () => e.ctrlKey && e.code === 'KeyN',
            'Ctrl+W': () => e.ctrlKey && e.code === 'KeyW',
            'Alt+Tab': () => e.altKey && e.code === 'Tab',
            'Ctrl+Tab': () => e.ctrlKey && e.code === 'Tab',
            'Ctrl+Shift+Tab': () => e.ctrlKey && e.shiftKey && e.code === 'Tab'
        };

        for (const [name, check] of Object.entries(shortcuts)) {
            if (check()) {
                return name;
            }
        }
        return null;
    }

    /**
     * Check if element is in code editor area
     */
    isCodeEditorArea(element) {
        return element.closest('#code-editor, textarea, input, .code-output');
    }

    /**
     * Trigger violation and show blocking screen
     */
    triggerViolation(type, description) {
        this.violations++;

        console.log(`🚨 VIOLATION: ${description}`);

        // Report to server
        if (this.socket && this.socket.connected) {
            this.socket.emit('suspicious-activity', {
                activity: description,
                type: type,
                severity: 'critical',
                timestamp: Date.now(),
                violationCount: this.violations
            });
        }

        // Show modal blocking screen
        this.showModalBlock(description);
    }

    /**
     * Show modal blocking screen with complete page lockdown
     */
    showModalBlock(description) {
        if (this.isBlocked) return; // Already blocked

        this.isBlocked = true;

        // Add blocking class to body
        document.body.classList.add('anti-cheat-blocked');

        // Create overlay
        const overlay = this.createBlockingOverlay(description);
        document.body.appendChild(overlay);

        // Setup complete modal blocking
        this.setupModalBlocking(overlay);

        console.log('🔴 Modal blocking screen activated');
    }

    /**
     * Create blocking overlay element
     */
    createBlockingOverlay(description) {
        const overlay = document.createElement('div');
        overlay.id = 'modalAntiCheatOverlay';
        overlay.className = 'anti-cheat-overlay';

        overlay.innerHTML = `
            <div class="blocking-dialog">
                <div class="blocking-title">⚠️ ИЗПИТЪТ Е БЛОКИРАН ⚠️</div>
                <div class="blocking-message">
                    <strong>Засечено нарушение:</strong><br>
                    ${description}<br><br>
                    <small>Всички действия са блокирани.<br>
                    Натиснете "Продължи" за да се върнете към изпита.</small>
                </div>
                <div class="blocking-buttons">
                    <button id="continueExamBtn" class="continue-btn">
                        Продължи изпита
                    </button>
                    <button id="exitExamBtn" class="exit-btn">
                        Напусни изпита
                    </button>
                </div>
            </div>
        `;

        // Add event listeners to buttons
        const continueBtn = overlay.querySelector('#continueExamBtn');
        const exitBtn = overlay.querySelector('#exitExamBtn');

        continueBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.hideModalBlock();
        });

        exitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.exitExam();
        });

        return overlay;
    }

    /**
     * Setup complete modal blocking - NOTHING works except the modal
     */
    setupModalBlocking(overlay) {
        // Block ALL events outside modal
        const eventTypes = [
            'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove',
            'keydown', 'keyup', 'keypress',
            'contextmenu', 'selectstart', 'dragstart',
            'focus', 'blur', 'focusin', 'focusout',
            'submit', 'change', 'input'
        ];

        eventTypes.forEach(eventType => {
            const handler = (e) => {
                // If event is NOT from our modal, block it completely
                if (!overlay.contains(e.target)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return false;
                }
            };

            document.addEventListener(eventType, handler, true);
            this.eventListeners.push({ element: document, type: eventType, handler, capture: true });
        });

        // Setup focus trapping within modal
        this.setupFocusTrapping(overlay);

        // Block page scrolling
        document.body.style.overflow = 'hidden';

        // Focus the continue button
        setTimeout(() => {
            const continueBtn = overlay.querySelector('#continueExamBtn');
            if (continueBtn) {
                continueBtn.focus();
            }
        }, 100);
    }

    /**
     * Setup focus trapping within modal
     */
    setupFocusTrapping(overlay) {
        const focusableElements = overlay.querySelectorAll('button, input, textarea, select, a[href]');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const trapFocus = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    // Shift+Tab - backward
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    // Tab - forward
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
            // Block all other keys except Enter and Space for buttons
            else if (!['Enter', 'Space'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        overlay.addEventListener('keydown', trapFocus);
    }

    /**
     * Hide modal blocking screen
     */
    hideModalBlock() {
        this.isBlocked = false;

        // Remove blocking class
        document.body.classList.remove('anti-cheat-blocked');

        // Remove overlay
        const overlay = document.getElementById('modalAntiCheatOverlay');
        if (overlay) {
            overlay.remove();
        }

        // Restore page scrolling
        document.body.style.overflow = '';

        // Remove modal event listeners
        this.removeModalEventListeners();

        // Focus back to page
        window.focus();

        // Try to focus code editor
        setTimeout(() => {
            const codeEditor = document.getElementById('code-editor');
            if (codeEditor) {
                codeEditor.focus();
            }
        }, 100);

        console.log('🟢 Modal blocking removed');
    }

    /**
     * Remove modal-specific event listeners
     */
    removeModalEventListeners() {
        // Remove only the modal blocking listeners
        // Keep the original detection listeners
        this.eventListeners = this.eventListeners.filter(listener => {
            if (listener.capture && listener.element === document) {
                document.removeEventListener(listener.type, listener.handler, true);
                return false; // Remove from array
            }
            return true; // Keep in array
        });
    }

    /**
     * Exit exam
     */
    exitExam() {
        if (confirm('Сигурни ли сте че искате да напуснете изпита?')) {
            // Report to server
            if (this.socket && this.socket.connected) {
                this.socket.emit('exam-complete', {
                    reason: 'student_exit_violation',
                    violationCount: this.violations,
                    timestamp: Date.now()
                });
            }

            this.deactivate();
            alert('Изпитът е прекратен поради нарушения.');

            // Try to close window
            window.close();
        }
    }

    /**
     * Add event listener with tracking
     */
    addListener(element, type, handler, capture = false) {
        element.addEventListener(type, handler, capture);
        this.eventListeners.push({ element, type, handler, capture });
    }

    /**
     * Add protection styles
     */
    addProtectionStyles() {
        if (document.getElementById('modalAntiCheatStyles')) return;

        const style = document.createElement('style');
        style.id = 'modalAntiCheatStyles';
        style.textContent = `
            /* Modal blocking styles */
            body.anti-cheat-blocked {
                overflow: hidden !important;
            }
            
            body.anti-cheat-blocked * {
                pointer-events: none !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
            }
            
            .anti-cheat-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-color: rgba(220, 53, 69, 0.95) !important;
                z-index: 999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-family: Arial, sans-serif !important;
                color: white !important;
                pointer-events: auto !important;
            }
            
            .anti-cheat-overlay * {
                pointer-events: auto !important;
                user-select: auto !important;
                -webkit-user-select: auto !important;
                -moz-user-select: auto !important;
                -ms-user-select: auto !important;
            }
            
            .blocking-dialog {
                background-color: #dc3545 !important;
                padding: 40px !important;
                border-radius: 10px !important;
                text-align: center !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
                max-width: 500px !important;
                width: 90% !important;
                pointer-events: auto !important;
            }
            
            .blocking-title {
                font-size: 28px !important;
                font-weight: bold !important;
                margin-bottom: 20px !important;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.5) !important;
            }
            
            .blocking-message {
                font-size: 18px !important;
                margin-bottom: 30px !important;
                line-height: 1.5 !important;
            }
            
            .blocking-buttons {
                display: flex !important;
                gap: 20px !important;
                justify-content: center !important;
            }
            
            .continue-btn, .exit-btn {
                padding: 15px 30px !important;
                font-size: 16px !important;
                font-weight: bold !important;
                border: none !important;
                border-radius: 5px !important;
                cursor: pointer !important;
                transition: background-color 0.3s !important;
                pointer-events: auto !important;
            }
            
            .continue-btn {
                background-color: #28a745 !important;
                color: white !important;
            }
            
            .continue-btn:hover {
                background-color: #218838 !important;
            }
            
            .continue-btn:focus {
                outline: 2px solid white !important;
                outline-offset: 2px !important;
            }
            
            .exit-btn {
                background-color: #6c757d !important;
                color: white !important;
            }
            
            .exit-btn:hover {
                background-color: #545b62 !important;
            }
            
            .exit-btn:focus {
                outline: 2px solid white !important;
                outline-offset: 2px !important;
            }
            
            /* Mobile responsive */
            @media (max-width: 768px) {
                .blocking-dialog {
                    width: 95% !important;
                    padding: 30px 20px !important;
                }
                
                .blocking-title {
                    font-size: 24px !important;
                }
                
                .blocking-message {
                    font-size: 16px !important;
                }
                
                .blocking-buttons {
                    flex-direction: column !important;
                    gap: 15px !important;
                }
                
                .continue-btn, .exit-btn {
                    width: 100% !important;
                    padding: 12px 20px !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Deactivate all protection
     */
    deactivate() {
        this.isActive = false;
        this.hideModalBlock();

        // Remove all event listeners
        this.eventListeners.forEach(({ element, type, handler, capture }) => {
            element.removeEventListener(type, handler, capture);
        });
        this.eventListeners = [];

        // Remove styles
        const styles = document.getElementById('modalAntiCheatStyles');
        if (styles) {
            styles.remove();
        }

        console.log('🔓 Modal AntiCheat deactivated');
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            isActive: this.isActive,
            isBlocked: this.isBlocked,
            violations: this.violations,
            eventListenerCount: this.eventListeners.length
        };
    }
}

// Export for global use
window.ModalAntiCheat = ModalAntiCheat;