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

    initDevTools() {
        const devtoolTabs = document.querySelectorAll('.devtool-tab');
        const devtoolPanels = document.querySelectorAll('.devtool-panel');

        devtoolTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const toolName = e.target.getAttribute('data-tool');

                devtoolTabs.forEach(t => {
                    t.classList.toggle('active', t.getAttribute('data-tool') === toolName);
                });

                devtoolPanels.forEach(panel => {
                    panel.classList.toggle('active', panel.id === `${toolName}-tool`);
                });
            });
        });
    }

    initMDN() {
        const mdnTabs = document.querySelectorAll('.mdn-tabs .tab');
        const mdnContent = document.querySelector('.mdn-content');

        mdnTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const section = e.target.getAttribute('data-section');

                mdnTabs.forEach(t => {
                    t.classList.toggle('active', t.getAttribute('data-section') === section);
                });

                this.loadMDNContent(section);
            });
        });
    }

    loadMDNContent(section) {
        const content = document.querySelector('.mdn-content');
        const contentMap = {
            javascript: '<h3>JavaScript Reference</h3><p>Array methods, String methods, Objects, Functions...</p>',
            dom: '<h3>DOM API Reference</h3><p>Document methods, Element methods, Events...</p>',
            css: '<h3>CSS Reference</h3><p>Properties, Selectors, Units, Functions...</p>',
            html: '<h3>HTML Reference</h3><p>Elements, Attributes, Global attributes...</p>'
        };

        content.innerHTML = contentMap[section] || '<p>Content not available</p>';
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