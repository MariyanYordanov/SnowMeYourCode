/**
 * Custom Dialog System - Fullscreen Safe
 * Replaces browser confirm/alert to prevent fullscreen exits
 * Maintains exam security by staying in fullscreen mode
 */

// Active dialog tracking
let activeDialog = null;

/**
 * Show custom completion dialog for exam exit
 * @param {Object} options - Dialog configuration
 * @returns {Promise<boolean>} - User choice (true = confirm, false = cancel)
 */
export function showCompletionDialog(options = {}) {
    const defaultOptions = {
        title: 'Напускане на изпита',
        message: 'Потвърдете напускане на изпита.',
        confirmText: 'Да, напускам',
        cancelText: 'Не, продължавам',
        type: 'completion'
    };

    const config = { ...defaultOptions, ...options };

    return new Promise((resolve) => {
        // Close any existing dialog
        hideCustomDialogs();

        // Create dialog HTML
        const dialogHTML = createDialogHTML(config);

        // Show dialog
        showDialog(dialogHTML, (result) => {
            hideCustomDialogs();
            resolve(result);
        });
    });
}

/**
 * Show custom violation exit dialog
 * @param {string} violationMessage - The violation message to display
 * @returns {Promise<boolean>} - User choice
 */
export function showViolationExitDialog(violationMessage = 'Искате ли да напуснете изпита?') {
    const options = {
        title: 'Нарушение на правилата',
        message: violationMessage,
        confirmText: 'Да, напускам',
        cancelText: 'Не, продължавам',
        type: 'violation'
    };

    return new Promise((resolve) => {
        // Close any existing dialog
        hideCustomDialogs();

        // Create dialog HTML
        const dialogHTML = createDialogHTML(options);

        // Show dialog
        showDialog(dialogHTML, (result) => {
            hideCustomDialogs();
            resolve(result);
        });
    });
}

/**
 * Show custom information dialog (non-blocking)
 * @param {Object} options - Dialog configuration
 * @returns {Promise<void>}
 */
export function showInfoDialog(options = {}) {
    const defaultOptions = {
        title: 'Информация',
        message: 'Информационно съобщение',
        confirmText: 'Разбрах',
        type: 'info',
        showCancel: false
    };

    const config = { ...defaultOptions, ...options };

    return new Promise((resolve) => {
        // Close any existing dialog
        hideCustomDialogs();

        // Create dialog HTML
        const dialogHTML = createDialogHTML(config);

        // Show dialog
        showDialog(dialogHTML, () => {
            hideCustomDialogs();
            resolve();
        });
    });
}

/**
 * Create dialog HTML structure
 * @param {Object} config - Dialog configuration
 * @returns {HTMLElement} - Dialog element
 */
function createDialogHTML(config) {
    try {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';
        overlay.id = 'custom-dialog-overlay';

        // Create dialog box
        const dialog = document.createElement('div');
        dialog.className = `custom-dialog custom-dialog-${config.type}`;

        // Dialog header
        const header = document.createElement('div');
        header.className = 'dialog-header';

        const icon = getDialogIcon(config.type);
        const title = document.createElement('h2');
        title.className = 'dialog-title';
        title.textContent = config.title;

        header.appendChild(icon);
        header.appendChild(title);

        // Dialog message
        const messageEl = document.createElement('p');
        messageEl.className = 'dialog-message';
        messageEl.textContent = config.message;

        // Dialog buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'dialog-buttons';

        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.className = `dialog-btn dialog-btn-confirm dialog-btn-${config.type}`;
        confirmBtn.textContent = config.confirmText;
        confirmBtn.setAttribute('data-action', 'confirm');

        buttonsContainer.appendChild(confirmBtn);

        // Cancel button (if needed)
        if (config.showCancel !== false && config.cancelText) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'dialog-btn dialog-btn-cancel';
            cancelBtn.textContent = config.cancelText;
            cancelBtn.setAttribute('data-action', 'cancel');

            buttonsContainer.appendChild(cancelBtn);
        }

        // Assemble dialog
        dialog.appendChild(header);
        dialog.appendChild(messageEl);
        dialog.appendChild(buttonsContainer);

        overlay.appendChild(dialog);

        return overlay;

    } catch (error) {
        console.error('❌ Error creating dialog HTML:', error);
        return null;
    }
}

/**
 * Get appropriate icon for dialog type
 * @param {string} type - Dialog type
 * @returns {HTMLElement} - Icon element
 */
function getDialogIcon(type) {
    const iconEl = document.createElement('div');
    iconEl.className = 'dialog-icon';

    const icons = {
        'completion': '🏁',
        'violation': '⚠️',
        'info': 'ℹ️',
        'error': '❌',
        'warning': '⚠️'
    };

    iconEl.textContent = icons[type] || 'ℹ️';
    return iconEl;
}

/**
 * Show dialog and setup event handlers
 * @param {HTMLElement} dialogElement - The dialog element
 * @param {Function} callback - Callback function with result
 */
function showDialog(dialogElement, callback) {
    try {
        if (!dialogElement) {
            console.error('❌ Cannot show dialog: invalid element');
            callback(false);
            return;
        }

        // Get container
        const container = getDialogContainer();

        // Add dialog to container
        container.appendChild(dialogElement);

        // Store reference
        activeDialog = dialogElement;

        // Setup event handlers
        setupDialogEventHandlers(dialogElement, callback);

        // Show with animation
        setTimeout(() => {
            dialogElement.classList.add('dialog-visible');
        }, 10);

        // Focus first button for keyboard navigation
        const firstButton = dialogElement.querySelector('.dialog-btn');
        if (firstButton) {
            firstButton.focus();
        }

        console.log('💬 Custom dialog shown');

    } catch (error) {
        console.error('❌ Error showing dialog:', error);
        callback(false);
    }
}

/**
 * Setup event handlers for dialog
 * @param {HTMLElement} dialogElement - Dialog element
 * @param {Function} callback - Callback function
 */
function setupDialogEventHandlers(dialogElement, callback) {
    try {
        // Get dialog type for security level
        const dialogType = getDialogType(dialogElement);
        const isSecureDialog = ['completion', 'violation'].includes(dialogType);

        // Button click handlers
        const buttons = dialogElement.querySelectorAll('.dialog-btn');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const action = button.getAttribute('data-action');
                const result = action === 'confirm';

                console.log(`💬 Dialog action: ${action} (result: ${result})`);
                callback(result);
            });
        });

        // Keyboard handlers - AGGRESSIVE BLOCKING
        dialogElement.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Enter':
                    // Enter = confirm
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('💬 Dialog confirmed via Enter key');
                    callback(true);
                    break;

                case 'Escape':
                    // BLOCK Escape for secure dialogs
                    if (isSecureDialog) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🚫 Escape blocked for secure dialog');
                        showBlockedFeedback(dialogElement);
                        return false;
                    }

                    // Allow Escape for info dialogs
                    const cancelBtn = dialogElement.querySelector('[data-action="cancel"]');
                    if (cancelBtn) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('💬 Dialog cancelled via Escape key');
                        callback(false);
                    }
                    break;

                case 'Tab':
                    // Handle tab navigation between buttons
                    handleTabNavigation(e, dialogElement);
                    break;

                default:
                    // Block all other keys for secure dialogs
                    if (isSecureDialog && (e.ctrlKey || e.altKey || e.metaKey)) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(`🚫 Blocked key combination: ${e.key}`);
                        return false;
                    }
                    break;
            }
        });

        // AGGRESSIVE click outside blocking
        dialogElement.addEventListener('click', (e) => {
            if (e.target === dialogElement) {
                // Clicked on overlay, not dialog content
                e.preventDefault();
                e.stopPropagation();

                // Show aggressive feedback for secure dialogs
                if (isSecureDialog) {
                    showBlockedFeedback(dialogElement);
                } else {
                    // Gentle shake for info dialogs
                    const dialog = dialogElement.querySelector('.custom-dialog');
                    if (dialog) {
                        dialog.classList.add('dialog-shake');
                        setTimeout(() => {
                            dialog.classList.remove('dialog-shake');
                        }, 500);
                    }
                }

                return false;
            }
        });

        // Block context menu on dialog
        dialogElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isSecureDialog) {
                showBlockedFeedback(dialogElement);
            }
            return false;
        });

        // Block text selection for secure dialogs
        if (isSecureDialog) {
            dialogElement.addEventListener('selectstart', (e) => {
                e.preventDefault();
                return false;
            });

            dialogElement.addEventListener('dragstart', (e) => {
                e.preventDefault();
                return false;
            });
        }

    } catch (error) {
        console.error('❌ Error setting up dialog handlers:', error);
    }
}

/**
 * Handle tab navigation within dialog
 * @param {KeyboardEvent} e - Keyboard event
 * @param {HTMLElement} dialogElement - Dialog element
 */
function handleTabNavigation(e, dialogElement) {
    try {
        const buttons = dialogElement.querySelectorAll('.dialog-btn');
        if (buttons.length <= 1) return;

        const focusedElement = document.activeElement;
        const currentIndex = Array.from(buttons).indexOf(focusedElement);

        if (currentIndex !== -1) {
            e.preventDefault();

            let nextIndex;
            if (e.shiftKey) {
                // Shift+Tab - go backwards
                nextIndex = currentIndex === 0 ? buttons.length - 1 : currentIndex - 1;
            } else {
                // Tab - go forwards
                nextIndex = currentIndex === buttons.length - 1 ? 0 : currentIndex + 1;
            }

            buttons[nextIndex].focus();
        }
    } catch (error) {
        console.error('❌ Error handling tab navigation:', error);
    }
}

/**
 * Get or create dialog container
 * @returns {HTMLElement} - Container element
 */
function getDialogContainer() {
    try {
        let container = document.getElementById('custom-dialog-container');

        if (!container) {
            container = document.createElement('div');
            container.id = 'custom-dialog-container';
            container.className = 'custom-dialog-container';
            document.body.appendChild(container);
        }

        return container;
    } catch (error) {
        console.error('❌ Error getting dialog container:', error);
        return document.body; // Fallback
    }
}

/**
 * Hide any active custom dialogs
 */
export function hideCustomDialogs() {
    try {
        if (activeDialog) {
            // Add fade out animation
            activeDialog.classList.add('dialog-hiding');

            setTimeout(() => {
                if (activeDialog && activeDialog.parentNode) {
                    activeDialog.parentNode.removeChild(activeDialog);
                }
                activeDialog = null;
            }, 200);
        }

        // Clean up container
        const container = document.getElementById('custom-dialog-container');
        if (container) {
            container.innerHTML = '';
        }

    } catch (error) {
        console.error('❌ Error hiding dialogs:', error);
    }
}

/**
 * Check if any dialog is currently active
 * @returns {boolean} - True if dialog is active
 */
export function isDialogActive() {
    return activeDialog !== null;
}

/**
 * Check if dialog is currently blocking focus events
 * @returns {boolean} - True if secure dialog is active
 */
export function isSecureDialogActive() {
    try {
        if (!activeDialog) return false;

        const dialogType = getDialogType(activeDialog);
        return ['completion', 'violation'].includes(dialogType);
    } catch (error) {
        console.error('❌ Error checking secure dialog status:', error);
        return false;
    }
}

/**
 * Get dialog type from element
 * @param {HTMLElement} dialogElement - Dialog element
 * @returns {string} - Dialog type
 */
function getDialogType(dialogElement) {
    try {
        const dialog = dialogElement.querySelector('.custom-dialog');
        if (dialog) {
            const classes = dialog.className.split(' ');
            for (const className of classes) {
                if (className.startsWith('custom-dialog-')) {
                    return className.replace('custom-dialog-', '');
                }
            }
        }
        return 'info';
    } catch (error) {
        console.error('❌ Error getting dialog type:', error);
        return 'info';
    }
}

/**
 * Show blocked feedback for aggressive dialogs
 * @param {HTMLElement} dialogElement - Dialog element
 */
function showBlockedFeedback(dialogElement) {
    try {
        const dialog = dialogElement.querySelector('.custom-dialog');
        if (dialog) {
            // Add strong visual feedback
            dialog.classList.add('dialog-blocked');

            // Flash red border
            setTimeout(() => {
                dialog.classList.remove('dialog-blocked');
            }, 800);

            // Show temporary message
            showBlockedMessage(dialog);
        }
    } catch (error) {
        console.error('❌ Error showing blocked feedback:', error);
    }
}

/**
 * Show temporary blocked message
 * @param {HTMLElement} dialog - Dialog element
 */
function showBlockedMessage(dialog) {
    try {
        // Remove existing blocked message
        const existingMessage = dialog.querySelector('.blocked-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create blocked message
        const message = document.createElement('div');
        message.className = 'blocked-message';
        message.textContent = 'Моля използвайте бутоните!';

        // Insert after dialog header
        const header = dialog.querySelector('.dialog-header');
        if (header) {
            header.insertAdjacentElement('afterend', message);
        } else {
            dialog.insertBefore(message, dialog.firstChild);
        }

        // Remove message after 2 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 2000);

    } catch (error) {
        console.error('❌ Error showing blocked message:', error);
    }
}