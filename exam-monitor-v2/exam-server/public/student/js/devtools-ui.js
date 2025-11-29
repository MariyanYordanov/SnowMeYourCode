/**
 * DevTools UI Simulation
 * Provides developer tools functionality similar to browser DevTools
 */

export class DevToolsUI {
    constructor() {
        this.initialized = false;
        this.activeTab = 'network';
        this.networkRequests = [];
        this.consoleLogs = [];
        this.storageData = {};
        
        console.log('DevTools UI initialized');
    }

    /**
     * Initialize DevTools UI in panel
     */
    initializeInPanel(panelContainer) {
        if (!panelContainer) {
            console.warn('DevTools panel container not found');
            return;
        }

        // Create DevTools structure with tabs
        panelContainer.innerHTML = `
            <div class="devtools-container">
                <div class="devtools-tabs">
                    <button class="devtools-tab active" data-tab="network">🌐 Network</button>
                    <button class="devtools-tab" data-tab="console">📝 Console</button>
                    <button class="devtools-tab" data-tab="storage">💾 Storage</button>
                    <button class="devtools-tab" data-tab="elements">🏗️ Elements</button>
                </div>
                
                <div class="devtools-content">
                    <!-- Network Panel -->
                    <div id="network-panel" class="devtool-panel active">
                        <div class="panel-header">
                            <span>Network Activity</span>
                            <button class="clear-btn" onclick="window.devToolsUI?.clearNetwork()">Clear</button>
                        </div>
                        <div class="network-table-container">
                            <table class="network-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Status</th>
                                        <th>Type</th>
                                        <th>Size</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody id="network-requests">
                                    <tr class="no-requests">
                                        <td colspan="5">No network activity yet</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Console Panel -->
                    <div id="console-panel" class="devtool-panel">
                        <div class="panel-header">
                            <span>Console</span>
                            <button class="clear-btn" onclick="window.devToolsUI?.clearConsole()">Clear</button>
                        </div>
                        <div class="console-output" id="console-output">
                            <div class="console-message info">
                                <span class="console-icon">ℹ️</span>
                                <span class="console-text">Console initialized</span>
                            </div>
                        </div>
                        <div class="console-input">
                            <span>&gt;</span>
                            <input type="text" placeholder="Enter JavaScript..." id="console-input">
                        </div>
                    </div>

                    <!-- Storage Panel -->
                    <div id="storage-panel" class="devtool-panel">
                        <div class="panel-header">
                            <span>Storage</span>
                            <button class="clear-btn" onclick="window.devToolsUI?.clearStorage()">Clear All</button>
                        </div>
                        <div class="storage-tabs">
                            <button class="storage-tab active" data-storage="localStorage">Local Storage</button>
                            <button class="storage-tab" data-storage="sessionStorage">Session Storage</button>
                        </div>
                        <div class="storage-content">
                            <table class="storage-table">
                                <thead>
                                    <tr>
                                        <th>Key</th>
                                        <th>Value</th>
                                    </tr>
                                </thead>
                                <tbody id="storage-items">
                                    <tr>
                                        <td colspan="2">No items in storage</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Elements Panel -->
                    <div id="elements-panel" class="devtool-panel">
                        <div class="panel-header">
                            <span>DOM Elements</span>
                            <button class="clear-btn" onclick="window.devToolsUI?.refreshElements()">Refresh</button>
                        </div>
                        <div class="elements-tree" id="elements-tree-content">
                            <div class="no-preview-message">
                                <p>No preview active</p>
                                <p>Click "Preview" to generate HTML and see the DOM structure here</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(panelContainer);
        this.startNetworkMonitoring();
        this.startConsoleMonitoring();
        this.updateStorageDisplay();
        
        // Make instance globally available
        window.devToolsUI = this;
        
        this.initialized = true;
        console.log('DevTools panel initialized with tabs');
    }

    /**
     * Bind event listeners
     */
    bindEvents(container) {
        // Tab switching
        const tabs = container.querySelectorAll('.devtools-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Storage tab switching
        const storageTabs = container.querySelectorAll('.storage-tab');
        storageTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchStorageTab(tab.dataset.storage);
            });
        });

        // Console input
        const consoleInput = container.querySelector('#console-input');
        if (consoleInput) {
            consoleInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.executeConsoleCommand(e.target.value);
                    e.target.value = '';
                }
            });
        }
    }

    /**
     * Switch between DevTools tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.devtools-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update panels
        document.querySelectorAll('.devtool-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-panel`);
        });

        this.activeTab = tabName;

        // Refresh data for active tab
        if (tabName === 'storage') {
            this.updateStorageDisplay();
        } else if (tabName === 'network') {
            this.updateNetworkDisplay();
        }
    }

    /**
     * Switch storage tabs
     */
    switchStorageTab(storageType) {
        document.querySelectorAll('.storage-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.storage === storageType);
        });
        this.updateStorageDisplay(storageType);
    }

    /**
     * Start monitoring network requests
     */
    startNetworkMonitoring() {
        // Intercept fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = Date.now();
            const url = args[0];
            const options = args[1] || {};
            
            // Capture request details
            const requestHeaders = options.headers || {};
            const requestBody = options.body ? 
                (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;
            
            try {
                const response = await originalFetch(...args);
                const endTime = Date.now();
                
                // Capture response headers
                const responseHeaders = {};
                for (const [key, value] of response.headers.entries()) {
                    responseHeaders[key] = value;
                }
                
                // Try to capture response body (clone response to avoid consuming it)
                let responseBody = null;
                try {
                    const clonedResponse = response.clone();
                    const contentType = response.headers.get('content-type') || '';
                    if (contentType.includes('application/json') || contentType.includes('text/')) {
                        responseBody = await clonedResponse.text();
                    }
                } catch (e) {
                    // Ignore body capture errors
                }
                
                this.addNetworkRequest({
                    url: url,
                    status: response.status,
                    type: response.headers.get('content-type') || 'unknown',
                    size: response.headers.get('content-length') || '?',
                    time: endTime - startTime,
                    method: options.method || 'GET',
                    requestHeaders,
                    responseHeaders,
                    requestBody,
                    responseBody
                });
                
                return response;
            } catch (error) {
                this.addNetworkRequest({
                    url: url,
                    status: 'Error',
                    type: 'error',
                    size: '?',
                    time: Date.now() - startTime,
                    method: options.method || 'GET',
                    requestHeaders,
                    requestBody,
                    error: error.message
                });
                throw error;
            }
        };
    }

    /**
     * Start monitoring console
     */
    startConsoleMonitoring() {
        const originalMethods = ['log', 'error', 'warn', 'info'];
        
        originalMethods.forEach(method => {
            const original = console[method];
            console[method] = (...args) => {
                original.apply(console, args);
                this.addConsoleMessage(method, args);
            };
        });
    }

    /**
     * Add network request to display
     */
    addNetworkRequest(request) {
        // Store full request details for later viewing
        request.id = Date.now() + Math.random();
        request.timestamp = new Date().toISOString();
        request.headers = request.headers || {};
        
        this.networkRequests.push(request);
        this.updateNetworkDisplay();
    }

    /**
     * Show detailed information for a network request
     */
    showNetworkDetails(index) {
        const request = this.networkRequests[index];
        if (!request) return;

        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'network-details-modal';
        modal.innerHTML = `
            <div class="network-details-content">
                <div class="network-details-header">
                    <h4>Network Request Details</h4>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="network-details-body">
                    <div class="info-section">
                        <h5>General</h5>
                        <div class="info-grid">
                            <strong>URL:</strong> <span>${request.url}</span>
                            <strong>Method:</strong> <span>${request.method || 'GET'}</span>
                            <strong>Status:</strong> <span class="status-${request.status}">${request.status}</span>
                            <strong>Type:</strong> <span>${request.type}</span>
                            <strong>Size:</strong> <span>${request.size}</span>
                            <strong>Time:</strong> <span>${request.time}ms</span>
                            <strong>Timestamp:</strong> <span>${request.timestamp}</span>
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <h5>Request Headers</h5>
                        <div class="headers-list">
                            ${this.formatHeaders(request.requestHeaders)}
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <h5>Response Headers</h5>
                        <div class="headers-list">
                            ${this.formatHeaders(request.responseHeaders)}
                        </div>
                    </div>
                    
                    ${request.requestBody ? `
                        <div class="info-section">
                            <h5>Request Body</h5>
                            <pre class="request-body">${this.escapeHtml(request.requestBody)}</pre>
                        </div>
                    ` : ''}
                    
                    ${request.responseBody ? `
                        <div class="info-section">
                            <h5>Response Body</h5>
                            <pre class="response-body">${this.escapeHtml(request.responseBody)}</pre>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Format headers for display
     */
    formatHeaders(headers) {
        if (!headers || typeof headers !== 'object') {
            return '<div class="no-headers">No headers available</div>';
        }

        return Object.entries(headers).map(([key, value]) => 
            `<div class="header-item"><strong>${key}:</strong> ${value}</div>`
        ).join('');
    }

    /**
     * Add console message
     */
    addConsoleMessage(type, args) {
        const message = {
            type,
            text: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
            timestamp: new Date().toLocaleTimeString()
        };
        
        this.consoleLogs.push(message);
        this.updateConsoleDisplay();
    }

    /**
     * Update network display
     */
    updateNetworkDisplay() {
        const tbody = document.getElementById('network-requests');
        if (!tbody) return;

        if (this.networkRequests.length === 0) {
            tbody.innerHTML = '<tr class="no-requests"><td colspan="5">No network activity yet</td></tr>';
            return;
        }

        tbody.innerHTML = this.networkRequests.slice(-20).map((req, index) => `
            <tr class="network-row" data-index="${this.networkRequests.length - 20 + index}" onclick="window.devToolsUI?.showNetworkDetails(${this.networkRequests.length - 20 + index})">
                <td class="url-cell" title="${req.url}">${this.truncateUrl(req.url)}</td>
                <td class="status-${req.status}">${req.status}</td>
                <td>${req.type}</td>
                <td>${req.size}</td>
                <td>${req.time}ms</td>
            </tr>
        `).join('');
    }

    /**
     * Update console display
     */
    updateConsoleDisplay() {
        const output = document.getElementById('console-output');
        if (!output) return;

        const messages = this.consoleLogs.slice(-50).map(msg => `
            <div class="console-message ${msg.type}">
                <span class="console-time">${msg.timestamp}</span>
                <span class="console-icon">${this.getConsoleIcon(msg.type)}</span>
                <span class="console-text">${msg.text}</span>
            </div>
        `).join('');

        output.innerHTML = messages;
        output.scrollTop = output.scrollHeight;
    }

    /**
     * Update storage display
     */
    updateStorageDisplay(storageType = 'localStorage') {
        const tbody = document.getElementById('storage-items');
        if (!tbody) return;

        const storage = window[storageType];
        const items = [];

        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            const value = storage.getItem(key);
            items.push({ key, value });
        }

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2">No items in storage</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr>
                <td class="key-cell">${item.key}</td>
                <td class="value-cell" title="${item.value}">${this.truncateValue(item.value)}</td>
            </tr>
        `).join('');
    }

    /**
     * Execute console command
     */
    executeConsoleCommand(command) {
        if (!command.trim()) return;

        try {
            const result = eval(command);
            this.addConsoleMessage('log', [`> ${command}`, result]);
        } catch (error) {
            this.addConsoleMessage('error', [`> ${command}`, error.message]);
        }
    }

    /**
     * Clear methods
     */
    clearNetwork() {
        this.networkRequests = [];
        this.updateNetworkDisplay();
    }

    clearConsole() {
        this.consoleLogs = [];
        this.updateConsoleDisplay();
    }

    clearStorage() {
        if (confirm('Clear all storage data?')) {
            localStorage.clear();
            sessionStorage.clear();
            this.updateStorageDisplay();
        }
    }

    refreshElements() {
        this.updateElementsDisplay();
    }

    /**
     * Update elements display with HTML from current files
     */
    updateElementsDisplay() {
        const treeContainer = document.getElementById('elements-tree-content');
        if (!treeContainer) return;

        // Get HTML content from file manager
        if (window.ExamApp?.fileManager) {
            const htmlContent = this.getPreviewHTML();
            if (htmlContent) {
                treeContainer.innerHTML = this.generateElementsTree(htmlContent);
            } else {
                treeContainer.innerHTML = `
                    <div class="no-preview-message">
                        <p>No HTML content found</p>
                        <p>Create an index.html file or click "Preview" to see the DOM structure</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Get HTML content for preview
     */
    getPreviewHTML() {
        if (!window.ExamApp?.fileManager) return null;
        
        // Try to get index.html first
        let htmlContent = window.ExamApp.fileManager.getFileContent('index.html');
        
        // If no index.html, try any .html file
        if (!htmlContent) {
            const allFiles = window.ExamApp.fileManager.getAllOpenFiles();
            const htmlFile = allFiles.find(file => file.endsWith('.html'));
            if (htmlFile) {
                htmlContent = window.ExamApp.fileManager.getFileContent(htmlFile);
            }
        }
        
        return htmlContent;
    }

    /**
     * Generate elements tree from HTML
     */
    generateElementsTree(htmlContent) {
        try {
            // Create a temporary DOM to parse HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // Generate tree view
            return `
                <div class="elements-tree-view">
                    ${this.generateNodeTree(doc.documentElement, 0)}
                </div>
            `;
        } catch (error) {
            return '<div class="error-message">Error parsing HTML</div>';
        }
    }

    /**
     * Generate tree for a single node
     */
    generateNodeTree(node, depth = 0) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (!text) return '';
            return `<div class="element-text" style="margin-left: ${depth * 20}px">${this.escapeHtml(text)}</div>`;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tagName = node.tagName.toLowerCase();
        const attributes = Array.from(node.attributes)
            .map(attr => ` <span class="attr-name">${attr.name}</span>=<span class="attr-value">"${this.escapeHtml(attr.value)}"</span>`)
            .join('');

        const hasChildren = node.childNodes.length > 0;
        const indent = depth * 20;

        let html = `<div class="element-node" style="margin-left: ${indent}px">`;
        
        if (hasChildren) {
            html += `
                <span class="element-tag">&lt;${tagName}${attributes}&gt;</span>
                <div class="element-children">
                    ${Array.from(node.childNodes).map(child => this.generateNodeTree(child, depth + 1)).join('')}
                </div>
                <span class="element-tag">&lt;/${tagName}&gt;</span>
            `;
        } else {
            html += `<span class="element-tag">&lt;${tagName}${attributes} /&gt;</span>`;
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Escape HTML for display
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Utility methods
     */
    truncateUrl(url) {
        return url.length > 40 ? '...' + url.slice(-37) : url;
    }

    truncateValue(value) {
        return value.length > 50 ? value.slice(0, 47) + '...' : value;
    }

    getConsoleIcon(type) {
        const icons = {
            log: 'ℹ️',
            error: '❌',
            warn: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }
}

export default DevToolsUI;