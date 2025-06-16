/**
 * UIManager - Clean template-based anti-cheat UI management
 * Handles overlays, notifications, and user interactions using templates
 */
export class UIManager {
    constructor(config = {}) {
        this.config = {
            warningDuration: 8000, // 8 seconds
            notificationDuration: 3000, // 3 seconds
            enableAnimations: true,
            templatesPath: '/student/templates/',

            // Override with provided config
            ...config
        };

        this.state = {
            isWarningVisible: false,
            currentWarningType: null,
            activeNotifications: new Set(),
            terminationTimerId: null,
            templates: new Map() // Cache templates
        };

        // Callbacks
        this.callbacks = {
            onContinueExam: null,
            onExitExam: null,
            onForceClose: null
        };

        // Ensure CSS is loaded
        this.loadCSS();

        console.log('🎨 UIManager initialized (template-based)');
    }

    /**
     * Load required CSS files
     */
    loadCSS() {
        const cssFiles = [
            '/student/css/anticheat/warning-dialogs.css',
            '/student/css/anticheat/notifications.css',
            '/student/css/anticheat/overlays.css'
        ];

        cssFiles.forEach(cssFile => {
            if (!document.querySelector(`link[href="${cssFile}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssFile;
                document.head.appendChild(link);
            }
        });
    }

    /**
     * Load HTML template with caching
     */
    async loadTemplate(templateName) {
        // Check cache first
        if (this.state.templates.has(templateName)) {
            return this.state.templates.get(templateName);
        }

        try {
            const response = await fetch(`${this.config.templatesPath}${templateName}`);
            if (!response.ok) {
                throw new Error(`Template not found: ${templateName}`);
            }

            const html = await response.text();
            this.state.templates.set(templateName, html);
            return html;

        } catch (error) {
            console.error(`❌ Failed to load template ${templateName}:`, error);
            return this.getFallbackTemplate(templateName);
        }
    }

    /**
     * Get fallback template if loading fails
     */
    getFallbackTemplate(templateName) {
        console.error(`❌ Template ${templateName} failed to load, using minimal fallback`);

        // Minimal fallback - just show error message, no HTML
        return `<div class="template-error">Template loading failed: ${templateName}</div>`;
    }

    /**
     * Populate template with data
     */
    populateTemplate(template, data) {
        let populated = template;

        // Simple template replacement
        Object.keys(data).forEach(key => {
            const value = data[key];

            // Handle boolean conditions {{#showExit}}...{{/showExit}}
            if (typeof value === 'boolean') {
                const conditionRegex = new RegExp(`{{#${key}}}(.*?){{/${key}}}`, 'gs');
                populated = populated.replace(conditionRegex, value ? '$1' : '');
            }

            // Handle simple substitutions {{key}}
            const simpleRegex = new RegExp(`{{${key}}}`, 'g');
            populated = populated.replace(simpleRegex, value || '');
        });

        // Clean up any remaining template syntax
        populated = populated.replace(/{{[^}]+}}/g, '');

        return populated;
    }

    /**
     * Show warning dialog based on violation type and severity
     */
    async showWarning(type, data = {}) {
        if (this.state.isWarningVisible) {
            console.log('⚠️ Warning already visible, skipping');
            return;
        }

        this.state.isWarningVisible = true;
        this.state.currentWarningType = type;

        const warningConfig = this.getWarningConfig(type, data);

        if (warningConfig.immediate) {
            await this.showTerminationScreen(warningConfig);
        } else {
            await this.showWarningDialog(warningConfig);
        }
    }

    /**
     * Get warning configuration based on type
     */
    getWarningConfig(type, data) {
        const configs = {
            windowsKey: {
                title: '⚠️ КРИТИЧНО ПРЕДУПРЕЖДЕНИЕ',
                message: 'Засечено е натискане на Windows клавиша!\nТова е строго забранено по време на изпита.\n\nПовторно нарушение ще доведе до прекратяване на изпита!',
                severity: 'critical',
                immediate: data.count >= 2,
                showExit: true
            },
            focusLoss: {
                title: '⚠️ ПРЕДУПРЕЖДЕНИЕ',
                message: `Засечено е излизане от прозореца на изпита!\nПредупреждение ${data.count || 1}/${data.maxAttempts || 5}`,
                severity: 'moderate',
                immediate: false,
                showExit: false
            },
            fullscreenExit: {
                title: '🔒 FULLSCREEN НАРУШЕНИЕ',
                message: `Опит за излизане от fullscreen режим!\nПредупреждение ${data.attempt || 1}/${data.maxAttempts || 3}`,
                severity: 'high',
                immediate: data.attempt >= 3,
                showExit: true
            },
            totalViolations: {
                title: '🚫 ПРЕКРАТЯВАНЕ НА ИЗПИТА',
                message: 'Превишен е лимитът от нарушения!\nИзпитът ще бъде прекратен автоматично.',
                severity: 'critical',
                immediate: true,
                showExit: false
            }
        };

        return configs[type] || configs.focusLoss;
    }

    /**
     * Show warning dialog using template
     */
    async showWarningDialog(config) {
        // Remove existing overlay
        this.removeExistingOverlay();

        // Load and populate template
        const template = await this.loadTemplate('warning-dialog.html');
        const html = this.populateTemplate(template, config);

        // Create element
        const overlay = document.createElement('div');
        overlay.id = 'antiCheatOverlay';
        overlay.innerHTML = html;

        // Add to DOM
        document.body.appendChild(overlay);

        // Attach event listeners
        this.attachWarningEventListeners(overlay);

        // Auto-hide for non-critical warnings
        if (config.severity !== 'critical') {
            setTimeout(() => {
                this.hideWarning();
            }, this.config.warningDuration);
        }

        console.log(`🔴 Warning dialog shown: ${config.title}`);
    }

    /**
     * Show termination screen using template
     */
    async showTerminationScreen(config) {
        // Remove existing overlay
        this.removeExistingOverlay();

        // Load and populate template
        const template = await this.loadTemplate('termination-screen.html');
        const html = this.populateTemplate(template, {
            ...config,
            violationType: this.state.currentWarningType,
            timestamp: new Date().toLocaleTimeString(),
            countdown: 5
        });

        // Create element
        const overlay = document.createElement('div');
        overlay.id = 'terminationOverlay';
        overlay.innerHTML = html;

        // Add to DOM
        document.body.appendChild(overlay);

        // Attach event listeners
        this.attachTerminationEventListeners(overlay);

        // Start countdown
        this.startTerminationCountdown(overlay);

        console.log(`🚫 Termination screen shown: ${config.title}`);
    }

    /**
     * Show notification using template
     */
    async showNotification(message, type = 'warning', duration = null) {
        const notificationDuration = duration || this.config.notificationDuration;

        // Load and populate template
        const template = await this.loadTemplate('notification.html');
        const html = this.populateTemplate(template, {
            message: message,
            type: type
        });

        // Create element
        const notification = document.createElement('div');
        notification.className = 'notification-container';
        notification.innerHTML = html;

        // Add to DOM
        document.body.appendChild(notification);
        this.state.activeNotifications.add(notification);

        // Auto-remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
                this.state.activeNotifications.delete(notification);
            }
        }, notificationDuration);

        console.log(`💬 Notification shown: ${message}`);
    }

    /**
     * Attach event listeners to warning overlay
     */
    attachWarningEventListeners(overlay) {
        const continueBtn = overlay.querySelector('.btn-continue');
        const exitBtn = overlay.querySelector('.btn-exit');

        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.handleContinueExam();
            });
        }

        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                this.handleExitExam();
            });
        }
    }

    /**
     * Attach event listeners to termination overlay
     */
    attachTerminationEventListeners(overlay) {
        const closeBtn = overlay.querySelector('.btn-close-now');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.handleForceClose();
            });
        }
    }

    /**
     * Start termination countdown
     */
    startTerminationCountdown(overlay) {
        let countdown = 5;
        const countdownElement = overlay.querySelector('.countdown');

        this.state.terminationTimerId = setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }

            if (countdown <= 0) {
                clearInterval(this.state.terminationTimerId);
                this.handleForceClose();
            }
        }, 1000);
    }

    /**
     * Hide current warning
     */
    hideWarning() {
        this.removeExistingOverlay();
        this.state.isWarningVisible = false;
        this.state.currentWarningType = null;

        // Clear termination timer if active
        if (this.state.terminationTimerId) {
            clearInterval(this.state.terminationTimerId);
            this.state.terminationTimerId = null;
        }

        console.log('✅ Warning hidden');
    }

    /**
     * Remove existing overlay
     */
    removeExistingOverlay() {
        const existingOverlay = document.getElementById('antiCheatOverlay') ||
            document.getElementById('terminationOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }

    /**
     * Event handlers
     */
    handleContinueExam() {
        console.log('✅ Student chose to continue exam');
        this.hideWarning();

        if (this.callbacks.onContinueExam) {
            this.callbacks.onContinueExam();
        }
    }

    handleExitExam() {
        console.log('🚪 Student chose to exit exam');
        this.hideWarning();

        if (this.callbacks.onExitExam) {
            this.callbacks.onExitExam();
        }
    }

    handleForceClose() {
        console.log('🔴 Force close button clicked');

        if (this.callbacks.onForceClose) {
            this.callbacks.onForceClose();
        }
    }

    /**
     * Set callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Clear all notifications
     */
    clearAllNotifications() {
        this.state.activeNotifications.forEach(notification => {
            if (notification.parentNode) {
                notification.remove();
            }
        });
        this.state.activeNotifications.clear();
    }

    /**
     * Get UI state
     */
    getState() {
        return {
            isWarningVisible: this.state.isWarningVisible,
            currentWarningType: this.state.currentWarningType,
            activeNotificationsCount: this.state.activeNotifications.size,
            hasTerminationTimer: !!this.state.terminationTimerId,
            templatesLoaded: this.state.templates.size
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ UIManager configuration updated');
    }
}