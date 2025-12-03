/**
 * MDN Reference Viewer
 * Provides offline JavaScript and DOM reference
 */

export class MDNViewer {
    constructor() {
        this.data = null;
        this.currentCategory = 'javascript';
        this.currentObject = 'Array';

        this.loadReference();
    }

    /**
     * Load MDN reference data
     */
    async loadReference() {
        try {
            const response = await fetch('/student/data/mdn-reference.json');
            this.data = await response.json();
            console.log('MDN Reference loaded');
            return true;
        } catch (error) {
            console.error('Failed to load MDN reference:', error);
            return false;
        }
    }

    /**
     * Initialize MDN viewer in sidebar
     */
    initializeViewer() {
        if (!this.data) {
            console.warn('MDN data not loaded yet');
            return;
        }

        const mdnPanel = document.getElementById('mdn-panel');
        if (!mdnPanel) {
            console.warn('MDN panel not found');
            return;
        }

        const mdnContainer = this.createMDNContainer();
        mdnPanel.appendChild(mdnContainer);
        
        this.renderCategoryList();
        this.bindEvents();
        
        console.log('MDN Viewer initialized');
    }

    /**
     * Create main MDN container
     */
    createMDNContainer() {
        const container = document.createElement('div');
        container.id = 'mdn-viewer';
        container.className = 'mdn-viewer';
        
        container.innerHTML = `
            <div class="mdn-header">
                <h3>JavaScript Reference</h3>
            </div>

            <div class="mdn-tabs">
                <button class="mdn-tab active" data-category="javascript">JS</button>
                <button class="mdn-tab" data-category="dom">DOM</button>
            </div>

            <div class="mdn-content">
                <div class="mdn-sidebar">
                    <div id="mdn-category-list"></div>
                </div>
                <div class="mdn-main">
                    <div id="mdn-method-details"></div>
                </div>
            </div>
        `;
        
        return container;
    }

    /**
     * Render category list (Array, String, Object, etc.)
     */
    renderCategoryList() {
        const listContainer = document.getElementById('mdn-category-list');
        if (!listContainer || !this.data) return;

        const categories = this.data[this.currentCategory];
        
        listContainer.innerHTML = Object.keys(categories).map(objectName => `
            <div class="mdn-object ${objectName === this.currentObject ? 'active' : ''}"
                 data-object="${objectName}">
                <div class="mdn-object-name">${objectName}</div>
                <div class="mdn-methods">
                    ${Object.keys(categories[objectName]).map(methodName => `
                        <div class="mdn-method" data-object="${objectName}" data-method="${methodName}">
                            ${methodName}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render method details
     */
    renderMethodDetails(objectName, methodName) {
        const detailsContainer = document.getElementById('mdn-method-details');
        if (!detailsContainer || !this.data) return;

        const method = this.data[this.currentCategory][objectName]?.[methodName];
        if (!method) {
            detailsContainer.innerHTML = '<p class="mdn-error">Методът не е намерен</p>';
            return;
        }

        detailsContainer.innerHTML = `
            <div class="mdn-method-header">
                <h4>${objectName}.${methodName}</h4>
            </div>
            
            <div class="mdn-syntax">
                <h5>Синтаксис:</h5>
                <code>${method.syntax}</code>
            </div>
            
            <div class="mdn-description">
                <h5>Описание:</h5>
                <p>${method.description}</p>
            </div>
            
            ${method.returns ? `
                <div class="mdn-returns">
                    <h5>Връща:</h5>
                    <p><code>${method.returns}</code></p>
                </div>
            ` : ''}
            
            <div class="mdn-examples">
                <h5>Примери:</h5>
                ${method.examples.map((example, index) => `
                    <div class="mdn-example">
                        <div class="mdn-example-header">
                            <span>Пример ${index + 1}</span>
                            <button class="mdn-copy-btn" data-code="${this.escapeHtml(example)}">
                                Копирай
                            </button>
                        </div>
                        <pre><code>${this.escapeHtml(example)}</code></pre>
                    </div>
                `).join('')}
            </div>
            
            <div class="mdn-category">
                <small>Категория: ${method.category}</small>
            </div>
        `;
    }



    /**
     * Bind event listeners
     */
    bindEvents() {
        // Tab switching
        document.querySelectorAll('.mdn-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.switchCategory(category);
            });
        });

        // Method selection
        document.addEventListener('click', (e) => {
            if (e.target.matches('.mdn-method')) {
                const object = e.target.dataset.object;
                const method = e.target.dataset.method;
                const category = e.target.dataset.category || this.currentCategory;

                if (object && method) {
                    this.currentCategory = category;
                    this.renderMethodDetails(object, method);
                }
            }

            // Copy example code
            if (e.target.matches('.mdn-copy-btn')) {
                const code = e.target.dataset.code;
                this.copyToClipboard(code);
                this.showCopyFeedback(e.target);
            }

            // Object expansion
            if (e.target.matches('.mdn-object-name')) {
                e.target.closest('.mdn-object').classList.toggle('expanded');
            }
        });
    }

    /**
     * Switch category
     */
    switchCategory(category) {
        this.currentCategory = category;
        this.renderCategoryList();
        document.getElementById('mdn-method-details').innerHTML = `
            <div class="mdn-welcome">
                <h4>Добре дошли в JavaScript Reference</h4>
                <p>Изберете обект и метод от лявата страна за да видите подробности</p>
            </div>
        `;

        this.setActiveTab(category);
    }

    /**
     * Set active tab
     */
    setActiveTab(category) {
        document.querySelectorAll('.mdn-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
    }


    /**
     * Utility methods
     */
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }

    showCopyFeedback(button) {
        const originalText = button.textContent;
        button.textContent = '✓ Копирано!';
        button.disabled = true;
        
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 1500);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Public API methods
     */
    getPopularMethods() {
        // Return most commonly used methods for quick access
        return [
            { object: 'Array', method: 'map', category: 'javascript' },
            { object: 'Array', method: 'filter', category: 'javascript' },
            { object: 'Array', method: 'forEach', category: 'javascript' },
            { object: 'String', method: 'split', category: 'javascript' },
            { object: 'String', method: 'indexOf', category: 'javascript' },
            { object: 'Object', method: 'keys', category: 'javascript' },
            { object: 'document', method: 'getElementById', category: 'dom' },
            { object: 'document', method: 'querySelector', category: 'dom' }
        ];
    }
}

export default MDNViewer;