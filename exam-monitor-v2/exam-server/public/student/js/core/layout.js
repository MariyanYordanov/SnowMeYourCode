/**
 * Adaptive Layout Manager
 * Manages 3-column responsive layout with smart panel sizing
 * Files Panel | Editor | DevTools Panel
 */

export class AdaptiveLayoutManager {
    constructor() {
        this.container = null;
        this.currentLayout = 'collapsed'; // collapsed, files, devtools, both, focus-devtools, focus-files
        this.panelStates = {
            files: false,
            devtools: false
        };
        this.breakpoints = {
            mobile: 768,
            tablet: 1024,
            desktop: 1280,
            wide: 1600
        };

        this.init();
    }

    /**
     * Initialize layout manager
     */
    init() {
        this.container = document.querySelector('.exam-container');
        if (!this.container) {
            console.warn('Exam container not found');
            return;
        }

        this.bindEvents();
        this.updateLayoutForScreenSize();
        this.initResizeHandles();

        // Listen for screen size changes
        window.addEventListener('resize', () => {
            this.debounce(this.updateLayoutForScreenSize.bind(this), 150)();
        });

        console.log('Adaptive Layout Manager initialized');
    }

    /**
     * Bind event listeners for layout controls
     */
    bindEvents() {
        // Panel toggle buttons
        const filesBtn = document.getElementById('toggle-files-btn');
        const devtoolsBtn = document.getElementById('toggle-devtools-btn');

        if (filesBtn) {
            filesBtn.addEventListener('click', () => this.togglePanel('files'));
        }

        if (devtoolsBtn) {
            devtoolsBtn.addEventListener('click', () => this.togglePanel('devtools'));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        this.togglePanel('files');
                        break;
                    case 'j':
                        e.preventDefault();
                        this.togglePanel('devtools');
                        break;
                    case 'k':
                        e.preventDefault();
                        this.toggleLayout();
                        break;
                }
            }
        });
    }

    /**
     * Toggle panel visibility
     * @param {string} panel - 'files' or 'devtools'
     */
    togglePanel(panel) {
        if (!['files', 'devtools'].includes(panel)) {
            console.warn('Invalid panel:', panel);
            return;
        }

        const currentState = this.panelStates[panel];
        this.panelStates[panel] = !currentState;

        // Update layout based on new panel states
        this.updateLayout();
        this.updateButtonStates();

        // Trigger Monaco editor resize if needed
        if (window.ExamApp?.editor) {
            setTimeout(() => {
                window.ExamApp.editor.layout();
            }, 300); // Wait for CSS transition
        }

        // Analytics/tracking
        this.trackLayoutChange(panel, !currentState);
    }

    /**
     * Update container layout classes
     */
    updateLayout() {
        if (!this.container) return;

        const { files, devtools } = this.panelStates;
        const screenSize = this.getScreenSize();

        // Remove all layout classes
        this.container.classList.remove(
            'show-files', 'show-devtools', 'show-both',
            'focus-devtools', 'focus-files'
        );

        // Determine new layout
        let newLayout = 'collapsed';

        if (screenSize === 'mobile') {
            // Mobile: Only one panel at a time, full screen
            if (files && devtools) {
                newLayout = 'devtools'; // Prefer devtools on mobile
                this.panelStates.files = false;
            } else if (files) {
                newLayout = 'files';
            } else if (devtools) {
                newLayout = 'devtools';
            }
        } else {
            // Desktop/tablet: Support multiple panels
            if (files && devtools) {
                newLayout = 'both';
            } else if (files) {
                newLayout = 'files';
            } else if (devtools) {
                newLayout = 'devtools';
            }
        }

        // Apply layout class
        if (newLayout !== 'collapsed') {
            this.container.classList.add(`show-${newLayout}`);
        }

        this.currentLayout = newLayout;
        console.log('Layout updated:', newLayout, 'Panel states:', this.panelStates);
    }

    /**
     * Update button active states
     */
    updateButtonStates() {
        const filesBtn = document.getElementById('toggle-files-btn');
        const devtoolsBtn = document.getElementById('toggle-devtools-btn');

        if (filesBtn) {
            filesBtn.classList.toggle('active', this.panelStates.files);
        }

        if (devtoolsBtn) {
            devtoolsBtn.classList.toggle('active', this.panelStates.devtools);
        }
    }

    /**
     * Cycle through layout modes
     */
    toggleLayout() {
        const modes = ['collapsed', 'files', 'devtools', 'both'];
        const currentIndex = modes.indexOf(this.currentLayout);
        const nextIndex = (currentIndex + 1) % modes.length;
        const nextMode = modes[nextIndex];

        // Set panel states based on mode
        switch (nextMode) {
            case 'collapsed':
                this.panelStates.files = false;
                this.panelStates.devtools = false;
                break;
            case 'files':
                this.panelStates.files = true;
                this.panelStates.devtools = false;
                break;
            case 'devtools':
                this.panelStates.files = false;
                this.panelStates.devtools = true;
                break;
            case 'both':
                this.panelStates.files = true;
                this.panelStates.devtools = true;
                break;
        }

        this.updateLayout();
        this.updateButtonStates();
    }

    /**
     * Set focus mode for specific panel
     * @param {string} panel - 'files' or 'devtools'
     */
    setFocusMode(panel) {
        if (!this.container) return;

        this.container.classList.remove('focus-devtools', 'focus-files');

        if (panel === 'devtools') {
            this.container.classList.add('focus-devtools');
            this.panelStates.devtools = true;
            this.panelStates.files = false;
        } else if (panel === 'files') {
            this.container.classList.add('focus-files');
            this.panelStates.files = true;
            this.panelStates.devtools = false;
        }

        this.updateButtonStates();
        this.currentLayout = `focus-${panel}`;
    }

    /**
     * Get current screen size category
     * @returns {string} - 'mobile', 'tablet', 'desktop', 'wide'
     */
    getScreenSize() {
        const width = window.innerWidth;

        if (width < this.breakpoints.mobile) return 'mobile';
        if (width < this.breakpoints.tablet) return 'tablet';
        if (width < this.breakpoints.desktop) return 'desktop';
        return 'wide';
    }

    /**
     * Update layout based on screen size changes
     */
    updateLayoutForScreenSize() {
        const screenSize = this.getScreenSize();

        // Handle mobile constraints
        if (screenSize === 'mobile' && this.panelStates.files && this.panelStates.devtools) {
            // Can't show both panels on mobile, prefer DevTools
            this.panelStates.files = false;
            this.updateLayout();
            this.updateButtonStates();
        }

        // Update layout for current screen size
        this.updateLayout();

        console.log('Screen size changed:', screenSize);
    }

    /**
     * Initialize drag-to-resize handles
     */
    initResizeHandles() {
        // Add resize handles to panels
        this.addResizeHandle('files');
        this.addResizeHandle('devtools');
    }

    /**
     * Add resize handle to panel
     * @param {string} panel - 'files' or 'devtools'
     */
    addResizeHandle(panel) {
        const panelElement = document.querySelector(`.${panel}-panel`);
        if (!panelElement) return;

        const handle = document.createElement('div');
        handle.className = `resize-handle ${panel}`;
        panelElement.appendChild(handle);

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = panelElement.offsetWidth;

            panelElement.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const deltaX = panel === 'files' ? (e.clientX - startX) : (startX - e.clientX);
            const newWidth = Math.max(200, Math.min(600, startWidth + deltaX));

            // Update CSS custom property for this panel
            document.documentElement.style.setProperty(
                `--${panel}-width`,
                `${newWidth}px`
            );
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                panelElement.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                // Trigger Monaco editor resize
                if (window.ExamApp?.editor) {
                    setTimeout(() => window.ExamApp.editor.layout(), 100);
                }
            }
        });
    }

    /**
     * Get current layout state
     * @returns {Object} - Current layout information
     */
    getLayoutState() {
        return {
            layout: this.currentLayout,
            panels: { ...this.panelStates },
            screenSize: this.getScreenSize(),
            containerWidth: this.container?.offsetWidth || 0
        };
    }

    /**
     * Restore layout state
     * @param {Object} state - Layout state to restore
     */
    setLayoutState(state) {
        if (!state || typeof state !== 'object') return;

        this.panelStates = { ...this.panelStates, ...state.panels };
        this.updateLayout();
        this.updateButtonStates();
    }

    /**
     * Track layout changes for analytics
     * @param {string} panel - Panel that was toggled
     * @param {boolean} isOpen - Whether panel is now open
     */
    trackLayoutChange(panel, isOpen) {
        // Send to analytics service if available
        if (window.ExamApp?.analytics) {
            window.ExamApp.analytics.track('layout_change', {
                panel,
                isOpen,
                layout: this.currentLayout,
                screenSize: this.getScreenSize(),
                timestamp: Date.now()
            });
        }
    }

    /**
     * Debounce function for performance
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} - Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Destroy layout manager
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.updateLayoutForScreenSize);

        // Remove resize handles
        document.querySelectorAll('.resize-handle').forEach(handle => {
            handle.remove();
        });

        console.log('Adaptive Layout Manager destroyed');
    }
}

// Initialize layout manager when DOM is ready
let layoutManager;

export function initializeAdaptiveLayout() {
    if (layoutManager) {
        layoutManager.destroy();
    }

    layoutManager = new AdaptiveLayoutManager();

    // Expose for debugging
    if (window.ExamApp) {
        window.ExamApp.layoutManager = layoutManager;
    }

    return layoutManager;
}

export function getLayoutManager() {
    return layoutManager;
}