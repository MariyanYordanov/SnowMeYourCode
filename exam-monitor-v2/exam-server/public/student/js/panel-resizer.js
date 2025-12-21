/**
 * Panel Resizer - Makes panels resizable with drag handles
 */

export class PanelResizer {
    constructor() {
        this.isResizing = false;
        this.currentHandle = null;
        this.startPos = 0;
        this.startSize = 0;
        this.minSize = 200;
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
        
        // Sidebar resize handle (between main content and sidebar)
        this.createHandle('sidebar-resize-handle', 'exam-sidebar', 'vertical');
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

        // Add visual indicator
        handle.innerHTML = direction === 'horizontal' ?
            '<div class="resize-indicator horizontal-indicator"></div>' :
            '<div class="resize-indicator vertical-indicator"></div>';

        // Position the handle
        if (direction === 'horizontal') {
            // Insert before console panel
            target.parentNode.insertBefore(handle, target);
        } else {
            // For vertical handles (sidebar), append to the target as the last child
            // This puts it on the right edge of the sidebar
            target.appendChild(handle);
        }

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
        if (direction === 'horizontal') {
            this.startPos = e.clientY;
            this.startSize = target.offsetHeight;
        } else {
            this.startPos = e.clientX;
            // For sidebar, get the current width from grid
            const examContainer = document.querySelector('.exam-container');
            const computedStyle = window.getComputedStyle(examContainer);
            const columns = computedStyle.gridTemplateColumns.split(' ');
            this.startSize = parseInt(columns[0]);
        }

        // Add visual feedback
        document.body.classList.add('resizing');
        handle.classList.add('active');

        // Change cursor
        document.body.style.cursor = direction === 'horizontal' ? 'ns-resize' : 'ew-resize';
    }

    /**
     * Handle resize movement
     */
    handleResize(e) {
        if (!this.isResizing || !this.currentHandle) return;

        const targetId = this.currentHandle.dataset.target;
        const direction = this.currentHandle.dataset.direction;
        const target = document.getElementById(targetId);

        if (!target) return;

        let delta, newSize;

        if (direction === 'horizontal') {
            delta = e.clientY - this.startPos;
            newSize = this.startSize - delta; // Subtract because console grows upward
        } else {
            delta = e.clientX - this.startPos;
            newSize = this.startSize + delta;
        }

        // Apply constraints
        newSize = Math.max(this.minSize, Math.min(this.maxSize, newSize));

        // Apply the new size
        if (direction === 'horizontal') {
            target.style.height = newSize + 'px';

            // Also update the editor height
            const editorContainer = document.querySelector('.editor-container');
            if (editorContainer) {
                const availableHeight = window.innerHeight - 120; // Account for header/toolbar
                const editorHeight = availableHeight - newSize - 20; // 20px for gap
                editorContainer.style.height = Math.max(200, editorHeight) + 'px';
            }
        } else {
            // For sidebar, update the grid-template-columns
            const examContainer = document.querySelector('.exam-container');
            if (examContainer) {
                examContainer.style.gridTemplateColumns = `${newSize}px 1fr`;
            }
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
        const direction = handle.dataset.direction;
        const target = document.getElementById(targetId);
        
        if (!target) return;

        // Set default sizes
        if (direction === 'horizontal') {
            target.style.height = '300px'; // Default console height
            
            // Reset editor height
            const editorContainer = document.querySelector('.editor-container');
            if (editorContainer) {
                editorContainer.style.height = 'calc(100vh - 420px)';
            }
        } else {
            target.style.width = '300px'; // Default sidebar width
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
        
        // Save sidebar width
        const sidebar = document.getElementById('exam-sidebar');
        if (sidebar && sidebar.style.width) {
            sizes.sidebarWidth = sidebar.style.width;
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
            
            // Restore sidebar width
            if (sizes.sidebarWidth) {
                const sidebar = document.getElementById('exam-sidebar');
                if (sidebar) {
                    sidebar.style.width = sizes.sidebarWidth;
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
        const sidebar = document.getElementById('exam-sidebar');
        
        return {
            consoleHeight: consolePanel ? consolePanel.offsetHeight : 0,
            sidebarWidth: sidebar ? sidebar.offsetWidth : 0
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
        
        if (sizes.sidebarWidth) {
            const sidebar = document.getElementById('exam-sidebar');
            if (sidebar) {
                sidebar.style.width = sizes.sidebarWidth + 'px';
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
        
        // Ensure panels don't exceed window bounds
        const maxConsoleHeight = window.innerHeight - 200;
        const maxSidebarWidth = window.innerWidth - 300;
        
        if (sizes.consoleHeight > maxConsoleHeight) {
            this.setSizes({ consoleHeight: maxConsoleHeight });
        }
        
        if (sizes.sidebarWidth > maxSidebarWidth) {
            this.setSizes({ sidebarWidth: maxSidebarWidth });
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

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ExamApp = window.ExamApp || {};
        window.ExamApp.panelResizer = new PanelResizer();
    });
} else {
    window.ExamApp = window.ExamApp || {};
    window.ExamApp.panelResizer = new PanelResizer();
}

export default PanelResizer;