import { MDNViewer } from './mdn-viewer.js';
import { DevToolsUI } from './devtools-ui.js';

export class SidebarManager {
    constructor() {
        this.container = document.querySelector('.exam-container');
        this.sidebar = document.querySelector('.exam-sidebar');
        this.tabs = document.querySelectorAll('.sidebar-tab');
        this.panels = document.querySelectorAll('.sidebar-panel');

        this.currentPanel = 'files';
        this.isExpanded = false;
        this.mdnViewer = null;
        this.devToolsUI = null;

        this.init();
    }

    init() {
        if (!this.sidebar || this.tabs.length === 0) {
            console.warn('Sidebar elements not found');
            return;
        }

        this.bindEvents();
        this.restoreState();

        console.log('Sidebar manager initialized');
    }

    bindEvents() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const panelName = e.target.getAttribute('data-panel');
                this.switchPanel(panelName);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchPanel('files');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchPanel('mdn');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchPanel('devtools');
                        break;
                }
            }
        });
    }

    switchPanel(panelName) {
        if (!panelName || panelName === this.currentPanel) return;

        this.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-panel') === panelName);
        });

        this.panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${panelName}-panel`);
        });

        this.currentPanel = panelName;

        if (panelName === 'mdn' || panelName === 'devtools') {
            this.expandSidebar();
        } else {
            this.collapseSidebar();
        }

        if (panelName === 'devtools') {
            this.initDevTools();
        } else if (panelName === 'mdn') {
            this.initMDN();
        } else if (panelName === 'devtools') {
            this.initDevTools();
        }

        this.saveState();

        console.log(`Switched to ${panelName} panel`);
    }

    expandSidebar() {
        if (!this.isExpanded) {
            this.container.classList.add('sidebar-expanded');
            this.isExpanded = true;
        }
    }

    collapseSidebar() {
        if (this.isExpanded) {
            this.container.classList.remove('sidebar-expanded');
            this.isExpanded = false;
        }
    }

    async initDevTools() {
        if (!this.devToolsUI) {
            this.devToolsUI = new DevToolsUI();
        }

        const devtoolsPanel = document.getElementById('devtools-panel');
        if (devtoolsPanel && !devtoolsPanel.querySelector('.devtools-container')) {
            // Clear existing content and initialize DevTools UI
            devtoolsPanel.innerHTML = '';
            this.devToolsUI.initializeInPanel(devtoolsPanel);
        } else if (!devtoolsPanel) {
            console.warn('DevTools panel element not found in DOM');
        }
    }

    async initMDN() {
        if (!this.mdnViewer) {
            this.mdnViewer = new MDNViewer();
            await this.mdnViewer.loadReference();
        }

        const mdnPanel = document.getElementById('mdn-panel');
        if (mdnPanel && !mdnPanel.querySelector('.mdn-viewer')) {
            // Clear existing content and initialize MDN viewer
            mdnPanel.innerHTML = '';
            this.mdnViewer.initializeViewer();
        }
    }

    /**
     * Get MDN viewer instance for external use
     */
    getMDNViewer() {
        return this.mdnViewer;
    }

    /**
     * Quick search in MDN
     */
    searchMDN(query) {
        if (this.mdnViewer) {
            this.switchPanel('mdn');
            setTimeout(() => {
                this.mdnViewer.quickSearch(query);
            }, 100);
        }
    }

    /**
     * Show specific MDN method
     */
    showMDNMethod(objectName, methodName, category = 'javascript') {
        if (this.mdnViewer) {
            this.switchPanel('mdn');
            setTimeout(() => {
                this.mdnViewer.showMethod(objectName, methodName, category);
            }, 100);
        }
    }

    saveState() {
        localStorage.setItem('sidebarState', JSON.stringify({
            currentPanel: this.currentPanel,
            isExpanded: this.isExpanded
        }));
    }

    restoreState() {
        try {
            const saved = localStorage.getItem('sidebarState');
            if (saved) {
                const state = JSON.parse(saved);
                if (state.currentPanel) {
                    this.switchPanel(state.currentPanel);
                }
            }
        } catch (error) {
            console.error('Failed to restore sidebar state:', error);
        }
    }

    getCurrentPanel() {
        return this.currentPanel;
    }

    toggleSidebar() {
        if (this.isExpanded) {
            this.collapseSidebar();
        } else {
            this.expandSidebar();
        }
    }
}