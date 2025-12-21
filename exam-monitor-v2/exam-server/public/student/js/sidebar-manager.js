export class SidebarManager {
    constructor() {
        this.container = document.querySelector('.exam-container');
        this.sidebar = document.querySelector('.exam-sidebar');
        this.tabs = document.querySelectorAll('.sidebar-tab');
        this.panels = document.querySelectorAll('.sidebar-panel');

        this.currentPanel = 'files';
        this.isExpanded = false;

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
            if (e.altKey && e.key === '1') {
                e.preventDefault();
                this.switchPanel('files');
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
