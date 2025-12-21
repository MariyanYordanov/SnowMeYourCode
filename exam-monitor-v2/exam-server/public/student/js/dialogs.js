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
        title: 'Leave Exam',
        message: 'Confirm leaving the exam.',
        confirmText: 'Yes, leave',
        cancelText: 'No, continue',
        type: 'completion'
    };

    const config = { ...defaultOptions, ...options };

    return new Promise((resolve) => {
        hideCustomDialogs();

        const dialogHTML = createDialogHTML(config);

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
export function showViolationExitDialog(violationMessage = 'Do you want to leave the exam?') {
    const options = {
        title: 'Rule Violation',
        message: violationMessage,
        confirmText: 'Yes, leave',
        cancelText: 'No, continue',
        type: 'violation'
    };

    return new Promise((resolve) => {
        hideCustomDialogs();

        const dialogHTML = createDialogHTML(options);

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
        title: 'Information',
        message: 'Information message',
        confirmText: 'OK',
        type: 'info',
        showCancel: false
    };

    const config = { ...defaultOptions, ...options };

    return new Promise((resolve) => {
        hideCustomDialogs();

        const dialogHTML = createDialogHTML(config);

        showDialog(dialogHTML, () => {
            hideCustomDialogs();
            resolve();
        });
    });
}

/**
 * Custom prompt dialog for text input
 * @param {string} message - Prompt message
 * @param {string} defaultValue - Default input value
 * @returns {Promise<string|null>} - User input or null
 */
export function prompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        hideCustomDialogs();

        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';
        overlay.id = 'custom-dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'custom-dialog custom-dialog-prompt';

        dialog.innerHTML = `
            <div class="dialog-header">
                <h2 class="dialog-title">Enter Data</h2>
            </div>
            <p class="dialog-message">${message}</p>
            <input type="text" class="dialog-input" value="${defaultValue}" />
            <div class="dialog-buttons">
                <button class="dialog-btn dialog-btn-cancel" data-action="cancel">Cancel</button>
                <button class="dialog-btn dialog-btn-confirm dialog-btn-info" data-action="confirm">OK</button>
            </div>
        `;

        overlay.appendChild(dialog);

        const input = dialog.querySelector('.dialog-input');
        const confirmBtn = dialog.querySelector('[data-action="confirm"]');
        const cancelBtn = dialog.querySelector('[data-action="cancel"]');

        const cleanup = () => {
            hideCustomDialogs();
        };

        const handleConfirm = () => {
            const value = input.value.trim();
            cleanup();
            resolve(value || null);
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        });

        activeDialog = overlay;
        getDialogContainer().appendChild(overlay);

        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);
    });
}

/**
 * Custom confirm dialog
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} - User choice
 */
export function confirm(message) {
    return new Promise((resolve) => {
        hideCustomDialogs();

        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';
        overlay.id = 'custom-dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'custom-dialog custom-dialog-confirm';

        dialog.innerHTML = `
            <div class="dialog-header">
                <h2 class="dialog-title">Confirm Action</h2>
            </div>
            <p class="dialog-message">${message}</p>
            <div class="dialog-buttons">
                <button class="dialog-btn dialog-btn-cancel dialog-btn-success" data-action="cancel">No</button>
                <button class="dialog-btn dialog-btn-confirm dialog-btn-danger" data-action="confirm">Yes</button>
            </div>
        `;

        overlay.appendChild(dialog);

        const confirmBtn = dialog.querySelector('[data-action="confirm"]');
        const cancelBtn = dialog.querySelector('[data-action="cancel"]');

        const cleanup = () => {
            hideCustomDialogs();
        };

        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        document.addEventListener('keydown', function handleKey(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                document.removeEventListener('keydown', handleKey);
                handleCancel();
            }
        });

        activeDialog = overlay;
        getDialogContainer().appendChild(overlay);

        setTimeout(() => {
            confirmBtn.focus();
        }, 100);
    });
}

/**
 * Create dialog HTML structure
 * @param {Object} config - Dialog configuration
 * @returns {HTMLElement} - Dialog element
 */
function createDialogHTML(config) {
    try {
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';
        overlay.id = 'custom-dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = `custom-dialog custom-dialog-${config.type}`;

        const header = document.createElement('div');
        header.className = 'dialog-header';

        const title = document.createElement('h2');
        title.className = 'dialog-title';
        title.textContent = config.title;

        header.appendChild(title);

        const messageEl = document.createElement('p');
        messageEl.className = 'dialog-message';
        messageEl.textContent = config.message;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'dialog-buttons';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = `dialog-btn dialog-btn-confirm dialog-btn-${config.type}`;
        confirmBtn.textContent = config.confirmText;
        confirmBtn.setAttribute('data-action', 'confirm');

        buttonsContainer.appendChild(confirmBtn);

        if (config.showCancel !== false && config.cancelText) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'dialog-btn dialog-btn-cancel';
            cancelBtn.textContent = config.cancelText;
            cancelBtn.setAttribute('data-action', 'cancel');

            buttonsContainer.appendChild(cancelBtn);
        }

        dialog.appendChild(header);
        dialog.appendChild(messageEl);
        dialog.appendChild(buttonsContainer);

        overlay.appendChild(dialog);

        return overlay;

    } catch (error) {
        console.error('Error creating dialog HTML:', error);
        return null;
    }
}

/**
 * Show dialog and setup event handlers
 * @param {HTMLElement} dialogElement - The dialog element
 * @param {Function} callback - Callback function with result
 */
function showDialog(dialogElement, callback) {
    try {
        if (!dialogElement) {
            console.error('Cannot show dialog: invalid element');
            callback(false);
            return;
        }

        const container = getDialogContainer();
        activeDialog = dialogElement;
        container.appendChild(dialogElement);

        setupDialogEventHandlers(dialogElement, callback);

        setTimeout(() => {
            const focusTarget = dialogElement.querySelector('.dialog-btn-confirm') ||
                dialogElement.querySelector('.dialog-btn');
            if (focusTarget) {
                focusTarget.focus();
            }
        }, 100);

    } catch (error) {
        console.error('Error showing dialog:', error);
        callback(false);
    }
}

/**
 * Setup event handlers for dialog
 * @param {HTMLElement} dialogElement - The dialog element
 * @param {Function} callback - Callback function
 */
function setupDialogEventHandlers(dialogElement, callback) {
    try {
        const buttons = dialogElement.querySelectorAll('.dialog-btn');

        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const action = button.getAttribute('data-action');
                const result = action === 'confirm';
                callback(result);
            });
        });

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                document.removeEventListener('keydown', handleEscape);
                callback(false);
            }
        };

        document.addEventListener('keydown', handleEscape);

        dialogElement.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                handleTabNavigation(e, dialogElement);
            }
        });

    } catch (error) {
        console.error('Error setting up dialog event handlers:', error);
    }
}

/**
 * Handle tab navigation within dialog
 * @param {KeyboardEvent} e - The keyboard event
 * @param {HTMLElement} dialogElement - The dialog element
 */
function handleTabNavigation(e, dialogElement) {
    try {
        const buttons = Array.from(dialogElement.querySelectorAll('.dialog-btn'));
        const inputs = Array.from(dialogElement.querySelectorAll('.dialog-input'));
        const focusableElements = [...inputs, ...buttons];

        if (focusableElements.length === 0) return;

        const currentIndex = focusableElements.indexOf(document.activeElement);

        if (currentIndex !== -1) {
            e.preventDefault();

            let nextIndex;
            if (e.shiftKey) {
                nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
            } else {
                nextIndex = currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1;
            }

            focusableElements[nextIndex].focus();
        }
    } catch (error) {
        console.error('Error handling tab navigation:', error);
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
        console.error('Error getting dialog container:', error);
        return document.body;
    }
}

/**
 * Hide any active custom dialogs
 */
export function hideCustomDialogs() {
    try {
        if (activeDialog) {
            activeDialog.classList.add('dialog-hiding');

            setTimeout(() => {
                if (activeDialog && activeDialog.parentNode) {
                    activeDialog.parentNode.removeChild(activeDialog);
                }
                activeDialog = null;
            }, 200);
        }

        const container = document.getElementById('custom-dialog-container');
        if (container) {
            container.innerHTML = '';
        }

    } catch (error) {
        console.error('Error hiding dialogs:', error);
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
        console.error('Error checking secure dialog status:', error);
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
        return 'unknown';
    } catch (error) {
        console.error('Error getting dialog type:', error);
        return 'unknown';
    }
}