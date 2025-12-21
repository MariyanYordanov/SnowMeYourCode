/**
 * Panel Resizer - Makes panels resizable with drag handles
 */

export class PanelResizer {
    constructor() {
        this.isResizing = false;
        this.currentHandle = null;
        this.startPos = 0;
        this.startSize = 0;
        this.minSize = 32;
        this.maxSize = 800;

        this.init();
    }

    /**
     * Initialize panel resizing
     */
    init() {
        this.createResizeHandles();
        this.bindEvents();
        this.loadSavedSizes();
        console.log('Panel Resizer initialized');
    }

    /**
     * Create resize handles
     */
    createResizeHandles() {
        // Console resize handle (between editor and console)
        this.createHandle('console-resize-handle', 'console-panel', 'horizontal');
    }

    /**
     * Create a resize handle
     */
    createHandle(handleId, targetId, direction) {
        const target = document.getElementById(targetId);
        if (!target) {
            console.warn(`Panel resize target not found: ${targetId}`);
            return;
        }

        const handle = document.createElement('div');
        handle.id = handleId;
        handle.className = `resize-handle resize-handle-${direction}`;
        handle.dataset.target = targetId;
        handle.dataset.direction = direction;

        // Insert before target panel
        target.parentNode.insertBefore(handle, target);

        console.log(`Resize handle created: ${handleId} for ${targetId}`);
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Handle mouse down on resize handles
        document.addEventListener('mousedown', (e) => {
            if (e.target.matches('.resize-handle, .resize-indicator')) {
                this.startResize(e);
            }
        });

        // Handle mouse move during resize
        document.addEventListener('mousemove', (e) => {
            if (this.isResizing) {
                this.handleResize(e);
            }
        });

        // Handle mouse up to end resize
        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.endResize();
            }
        });

        // Also listen on window for mouseup (catches releases outside document)
        window.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.endResize();
            }
        });

        // Handle mouse leaving the window
        document.addEventListener('mouseleave', () => {
            if (this.isResizing) {
                this.endResize();
            }
        });

        // Handle losing focus (e.g., alt-tab)
        window.addEventListener('blur', () => {
            if (this.isResizing) {
                this.endResize();
            }
        });

        // Prevent text selection during resize
        document.addEventListener('selectstart', (e) => {
            if (this.isResizing) {
                e.preventDefault();
            }
        });

        // Double-click to reset size
        document.addEventListener('dblclick', (e) => {
            if (e.target.matches('.resize-handle, .resize-indicator')) {
                this.resetSize(e);
            }
        });
    }

    /**
     * Start resizing
     */
    startResize(e) {
        e.preventDefault();

        const handle = e.target.closest('.resize-handle');
        if (!handle) return;

        this.isResizing = true;
        this.currentHandle = handle;

        const targetId = handle.dataset.target;
        const direction = handle.dataset.direction;
        const target = document.getElementById(targetId);

        if (!target) return;

        // Store initial values
        this.startPos = e.clientY;
        this.startSize = target.offsetHeight;

        // Add visual feedback
        document.body.classList.add('resizing');
        handle.classList.add('active');

        // Change cursor
        document.body.style.cursor = 'ns-resize';
    }

    /**
     * Handle resize movement
     */
    handleResize(e) {
        if (!this.isResizing || !this.currentHandle) return;

        const targetId = this.currentHandle.dataset.target;
        const target = document.getElementById(targetId);

        if (!target) return;

        const delta = e.clientY - this.startPos;
        let newSize = this.startSize - delta; // Subtract because console grows upward

        // Apply constraints
        newSize = Math.max(this.minSize, Math.min(this.maxSize, newSize));

        // Apply the new size
        target.style.height = newSize + 'px';

        // Also update the editor height
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            const availableHeight = window.innerHeight - 120; // Account for header/toolbar
            const editorHeight = availableHeight - newSize - 20; // 20px for gap
            editorContainer.style.height = Math.max(200, editorHeight) + 'px';
        }

        // Trigger Monaco editor layout update
        if (window.ExamApp?.editor) {
            setTimeout(() => {
                window.ExamApp.editor.layout();
            }, 0);
        }
    }

    /**
     * End resizing
     */
    endResize() {
        if (!this.isResizing) return;

        this.isResizing = false;
        
        // Remove visual feedback
        document.body.classList.remove('resizing');
        document.body.style.cursor = '';
        
        if (this.currentHandle) {
            this.currentHandle.classList.remove('active');
        }

        // Save the new size
        this.saveSizes();
        
        this.currentHandle = null;
    }

    /**
     * Reset panel size to default
     */
    resetSize(e) {
        const handle = e.target.closest('.resize-handle');
        if (!handle) return;

        const targetId = handle.dataset.target;
        const target = document.getElementById(targetId);

        if (!target) return;

        // Set default console height
        target.style.height = '200px';

        // Reset editor height
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            editorContainer.style.height = 'calc(100vh - 420px)';
        }

        // Trigger Monaco editor layout update
        if (window.ExamApp?.editor) {
            setTimeout(() => {
                window.ExamApp.editor.layout();
            }, 0);
        }

        this.saveSizes();
    }

    /**
     * Save panel sizes to localStorage
     */
    saveSizes() {
        const sizes = {};

        // Save console height
        const consolePanel = document.getElementById('console-panel');
        if (consolePanel && consolePanel.style.height) {
            sizes.consoleHeight = consolePanel.style.height;
        }

        try {
            localStorage.setItem('exam-panel-sizes', JSON.stringify(sizes));
        } catch (error) {
            console.warn('Failed to save panel sizes:', error);
        }
    }

    /**
     * Load saved panel sizes
     */
    loadSavedSizes() {
        try {
            const saved = localStorage.getItem('exam-panel-sizes');
            if (!saved) return;

            const sizes = JSON.parse(saved);

            // Restore console height
            if (sizes.consoleHeight) {
                const consolePanel = document.getElementById('console-panel');
                if (consolePanel) {
                    consolePanel.style.height = sizes.consoleHeight;

                    // Update editor height accordingly
                    const editorContainer = document.querySelector('.editor-container');
                    if (editorContainer) {
                        const consoleHeight = parseInt(sizes.consoleHeight);
                        const availableHeight = window.innerHeight - 120;
                        const editorHeight = availableHeight - consoleHeight - 20;
                        editorContainer.style.height = Math.max(200, editorHeight) + 'px';
                    }
                }
            }

            // Trigger Monaco layout update after restore
            setTimeout(() => {
                if (window.ExamApp?.editor) {
                    window.ExamApp.editor.layout();
                }
            }, 100);

        } catch (error) {
            console.warn('Failed to load panel sizes:', error);
        }
    }

    /**
     * Get current panel sizes
     */
    getSizes() {
        const consolePanel = document.getElementById('console-panel');

        return {
            consoleHeight: consolePanel ? consolePanel.offsetHeight : 0
        };
    }

    /**
     * Set panel sizes programmatically
     */
    setSizes(sizes) {
        if (sizes.consoleHeight) {
            const consolePanel = document.getElementById('console-panel');
            if (consolePanel) {
                consolePanel.style.height = sizes.consoleHeight + 'px';
            }
        }

        // Trigger layout update
        setTimeout(() => {
            if (window.ExamApp?.editor) {
                window.ExamApp.editor.layout();
            }
        }, 0);

        this.saveSizes();
    }

    /**
     * Toggle panel visibility
     */
    togglePanel(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        const isHidden = panel.style.display === 'none' || panel.classList.contains('hidden');
        
        if (isHidden) {
            panel.style.display = '';
            panel.classList.remove('hidden');
        } else {
            panel.style.display = 'none';
            panel.classList.add('hidden');
        }

        // Update layout
        setTimeout(() => {
            if (window.ExamApp?.editor) {
                window.ExamApp.editor.layout();
            }
        }, 0);
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Recalculate sizes on window resize
        const sizes = this.getSizes();

        // Ensure console doesn't exceed window bounds
        const maxConsoleHeight = window.innerHeight - 200;

        if (sizes.consoleHeight > maxConsoleHeight) {
            this.setSizes({ consoleHeight: maxConsoleHeight });
        }
    }

    /**
     * Destroy panel resizer
     */
    destroy() {
        // Remove resize handles
        document.querySelectorAll('.resize-handle').forEach(handle => {
            handle.remove();
        });
        
        // Remove event listeners would require storing references
        console.log('Panel Resizer destroyed');
    }
}
export default PanelResizer;