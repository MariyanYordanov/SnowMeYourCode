/**
 * Layout Toggle System for 3-Column Exam Interface
 * Handles Files Panel | Editor | DevTools Panel toggling
 */

export class LayoutToggle {
    constructor() {
        this.container = document.querySelector('.exam-container');
        this.toggleFilesBtn = document.getElementById('toggle-files');
        this.toggleDevToolsBtn = document.getElementById('toggle-devtools');
        this.layoutModeBtn = document.getElementById('layout-mode');

        // Layout states
        this.states = {
            files: true,
            devtools: true,
            mode: 'default' // default, focus-files, focus-devtools, editor-only
        };

        // Initialize
        this.init();
    }

    init() {
        if (!this.container) {
            console.warn('Exam container not found');
            return;
        }

        // Restore saved layout preference
        this.restoreLayout();

        // Bind event listeners
        this.bindEvents();

        // Apply initial state
        this.updateLayout();

        console.log('Layout toggle system initialized');
    }

    bindEvents() {
        // Toggle Files Panel
        if (this.toggleFilesBtn) {
            this.toggleFilesBtn.addEventListener('click', () => {
                this.togglePanel('files');
            });
        }

        // Toggle DevTools Panel
        if (this.toggleDevToolsBtn) {
            this.toggleDevToolsBtn.addEventListener('click', () => {
                this.togglePanel('devtools');
            });
        }

        // Layout Mode Cycling
        if (this.layoutModeBtn) {
            this.layoutModeBtn.addEventListener('click', () => {
                this.cycleLayoutMode();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.togglePanel('files');
                        break;
                    case '2':
                        e.preventDefault();
                        this.togglePanel('devtools');
                        break;
                    case '3':
                        e.preventDefault();
                        this.cycleLayoutMode();
                        break;
                }
            }
        });
    }

    togglePanel(panel) {
        this.states[panel] = !this.states[panel];
        this.updateLayout();
        this.saveLayout();
    }

    cycleLayoutMode() {
        const modes = ['default', 'focus-files', 'focus-devtools', 'editor-only'];
        const currentIndex = modes.indexOf(this.states.mode);
        this.states.mode = modes[(currentIndex + 1) % modes.length];

        // Update button text
        if (this.layoutModeBtn) {
            const modeNames = {
                'default': 'Default',
                'focus-files': 'Files Focus',
                'focus-devtools': 'DevTools Focus',
                'editor-only': 'Editor Only'
            };
            this.layoutModeBtn.textContent = `⚙️ ${modeNames[this.states.mode]}`;
        }

        this.updateLayout();
        this.saveLayout();
    }

    updateLayout() {
        if (!this.container) return;

        // Remove all layout classes
        this.container.classList.remove(
            'hide-files', 'hide-devtools', 'editor-only',
            'show-both', 'focus-files', 'focus-devtools'
        );

        // Apply mode-specific classes
        switch (this.states.mode) {
            case 'editor-only':
                this.container.classList.add('editor-only');
                break;

            case 'focus-files':
                this.container.classList.add('focus-files');
                break;

            case 'focus-devtools':
                this.container.classList.add('focus-devtools');
                break;

            default: // default mode
                if (!this.states.files) {
                    this.container.classList.add('hide-files');
                }
                if (!this.states.devtools) {
                    this.container.classList.add('hide-devtools');
                }
                if (this.states.files && this.states.devtools) {
                    this.container.classList.add('show-both');
                }
        }

        // Update button states
        this.updateButtonStates();

        // Dispatch layout change event
        window.dispatchEvent(new CustomEvent('layoutChanged', {
            detail: { states: this.states }
        }));
    }

    updateButtonStates() {
        // Update toggle buttons
        if (this.toggleFilesBtn) {
            this.toggleFilesBtn.classList.toggle('active', this.states.files);
        }
        if (this.toggleDevToolsBtn) {
            this.toggleDevToolsBtn.classList.toggle('active', this.states.devtools);
        }
    }

    saveLayout() {
        localStorage.setItem('examLayoutPrefs', JSON.stringify(this.states));
    }

    restoreLayout() {
        try {
            const saved = localStorage.getItem('examLayoutPrefs');
            if (saved) {
                const savedStates = JSON.parse(saved);
                Object.assign(this.states, savedStates);
            }
        } catch (error) {
            console.error('Failed to restore layout preferences:', error);
        }
    }

    // Public API methods
    showPanel(panel) {
        this.states[panel] = true;
        this.updateLayout();
    }

    hidePanel(panel) {
        this.states[panel] = false;
        this.updateLayout();
    }

    setMode(mode) {
        this.states.mode = mode;
        this.updateLayout();
    }

    getState() {
        return { ...this.states };
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.layoutToggle = new LayoutToggle();
    });
} else {
    window.layoutToggle = new LayoutToggle();
}