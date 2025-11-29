/**
 * MDN Reference Viewer
 * Provides offline JavaScript and DOM reference
 */

export class MDNViewer {
    constructor() {
        this.data = null;
        this.currentCategory = 'javascript';
        this.currentObject = 'Array';
        this.searchHistory = [];
        this.favorites = this.loadFavorites();
        
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
                <div class="mdn-search">
                    <input type="text" id="mdn-search" placeholder="Търси метод..." />
                    <button id="mdn-search-btn">🔍</button>
                </div>
            </div>
            
            <div class="mdn-tabs">
                <button class="mdn-tab active" data-category="javascript">JS</button>
                <button class="mdn-tab" data-category="dom">DOM</button>
                <button class="mdn-tab" data-category="favorites">⭐</button>
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
                            <span class="mdn-favorite ${this.isFavorite(objectName, methodName) ? 'active' : ''}" 
                                  data-object="${objectName}" data-method="${methodName}">⭐</span>
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

        // Add to search history
        this.addToHistory(objectName, methodName);

        detailsContainer.innerHTML = `
            <div class="mdn-method-header">
                <h4>${objectName}.${methodName}</h4>
                <button class="mdn-favorite-btn ${this.isFavorite(objectName, methodName) ? 'active' : ''}" 
                        data-object="${objectName}" data-method="${methodName}">
                    ⭐ ${this.isFavorite(objectName, methodName) ? 'Премахни от любими' : 'Добави в любими'}
                </button>
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
     * Render favorites
     */
    renderFavorites() {
        const listContainer = document.getElementById('mdn-category-list');
        const detailsContainer = document.getElementById('mdn-method-details');
        
        if (!listContainer || !detailsContainer) return;

        if (this.favorites.length === 0) {
            listContainer.innerHTML = '<p class="mdn-empty">Няма добавени любими методи</p>';
            detailsContainer.innerHTML = '<p class="mdn-empty">Добавете методи в любими за бърз достъп</p>';
            return;
        }

        listContainer.innerHTML = this.favorites.map(fav => `
            <div class="mdn-favorite-item" data-category="${fav.category}" data-object="${fav.object}" data-method="${fav.method}">
                <div class="mdn-favorite-name">${fav.object}.${fav.method}</div>
                <div class="mdn-favorite-category">${fav.category}</div>
                <button class="mdn-remove-favorite" data-object="${fav.object}" data-method="${fav.method}">✖</button>
            </div>
        `).join('');

        detailsContainer.innerHTML = `
            <div class="mdn-favorites-info">
                <h4>⭐ Любими методи</h4>
                <p>Кликнете на метод за да видите подробности</p>
                <p>Общо: ${this.favorites.length} метода</p>
            </div>
        `;
    }

    /**
     * Search methods
     */
    search(query) {
        if (!query || !this.data) return [];

        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const [categoryName, category] of Object.entries(this.data)) {
            for (const [objectName, objectData] of Object.entries(category)) {
                for (const [methodName, methodData] of Object.entries(objectData)) {
                    if (methodName.toLowerCase().includes(lowerQuery) ||
                        methodData.description.toLowerCase().includes(lowerQuery) ||
                        objectName.toLowerCase().includes(lowerQuery)) {
                        
                        results.push({
                            category: categoryName,
                            object: objectName,
                            method: methodName,
                            data: methodData,
                            relevance: this.calculateRelevance(query, objectName, methodName, methodData)
                        });
                    }
                }
            }
        }

        return results.sort((a, b) => b.relevance - a.relevance);
    }

    /**
     * Calculate search relevance
     */
    calculateRelevance(query, objectName, methodName, methodData) {
        const lowerQuery = query.toLowerCase();
        let score = 0;

        // Exact method name match
        if (methodName.toLowerCase() === lowerQuery) score += 100;
        // Method name starts with query
        else if (methodName.toLowerCase().startsWith(lowerQuery)) score += 50;
        // Method name contains query
        else if (methodName.toLowerCase().includes(lowerQuery)) score += 25;

        // Object name match
        if (objectName.toLowerCase().includes(lowerQuery)) score += 20;

        // Description match
        if (methodData.description.toLowerCase().includes(lowerQuery)) score += 10;

        return score;
    }

    /**
     * Display search results
     */
    displaySearchResults(results) {
        const listContainer = document.getElementById('mdn-category-list');
        const detailsContainer = document.getElementById('mdn-method-details');
        
        if (!listContainer || !detailsContainer) return;

        if (results.length === 0) {
            listContainer.innerHTML = '<p class="mdn-empty">Няма намерени резултати</p>';
            detailsContainer.innerHTML = '<p class="mdn-empty">Опитайте с различна заявка</p>';
            return;
        }

        listContainer.innerHTML = results.map(result => `
            <div class="mdn-search-result" 
                 data-category="${result.category}" 
                 data-object="${result.object}" 
                 data-method="${result.method}">
                <div class="mdn-result-name">${result.object}.${result.method}</div>
                <div class="mdn-result-description">${result.data.description.substring(0, 60)}...</div>
                <div class="mdn-result-category">${result.category}</div>
            </div>
        `).join('');

        detailsContainer.innerHTML = `
            <div class="mdn-search-info">
                <h4>Резултати от търсенето</h4>
                <p>Намерени: ${results.length} метода</p>
                <p>Кликнете на резултат за подробности</p>
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

        // Search
        const searchInput = document.getElementById('mdn-search');
        const searchBtn = document.getElementById('mdn-search-btn');
        
        if (searchInput && searchBtn) {
            const performSearch = () => {
                const query = searchInput.value.trim();
                if (query) {
                    const results = this.search(query);
                    this.displaySearchResults(results);
                    this.setActiveTab('search');
                }
            };

            searchBtn.addEventListener('click', performSearch);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') performSearch();
            });

            searchInput.addEventListener('input', (e) => {
                if (e.target.value === '') {
                    this.switchCategory(this.currentCategory);
                }
            });
        }

        // Method selection
        document.addEventListener('click', (e) => {
            if (e.target.matches('.mdn-method, .mdn-search-result, .mdn-favorite-item')) {
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

            // Toggle favorites
            if (e.target.matches('.mdn-favorite, .mdn-favorite-btn')) {
                const object = e.target.dataset.object;
                const method = e.target.dataset.method;
                this.toggleFavorite(object, method);
            }

            // Remove from favorites
            if (e.target.matches('.mdn-remove-favorite')) {
                const object = e.target.dataset.object;
                const method = e.target.dataset.method;
                this.removeFavorite(object, method);
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
        if (category === 'favorites') {
            this.renderFavorites();
        } else if (category === 'search') {
            // Keep current search results
            return;
        } else {
            this.currentCategory = category;
            this.renderCategoryList();
            document.getElementById('mdn-method-details').innerHTML = `
                <div class="mdn-welcome">
                    <h4>Добре дошли в JavaScript Reference</h4>
                    <p>Изберете обект и метод от лявата страна за да видите подробности</p>
                </div>
            `;
        }

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
     * Favorites management
     */
    isFavorite(objectName, methodName) {
        return this.favorites.some(fav => 
            fav.object === objectName && fav.method === methodName
        );
    }

    toggleFavorite(objectName, methodName) {
        if (this.isFavorite(objectName, methodName)) {
            this.removeFavorite(objectName, methodName);
        } else {
            this.addFavorite(objectName, methodName);
        }
    }

    addFavorite(objectName, methodName) {
        if (!this.isFavorite(objectName, methodName)) {
            this.favorites.push({
                category: this.currentCategory,
                object: objectName,
                method: methodName,
                addedAt: Date.now()
            });
            this.saveFavorites();
            this.updateFavoriteButtons(objectName, methodName, true);
        }
    }

    removeFavorite(objectName, methodName) {
        this.favorites = this.favorites.filter(fav => 
            !(fav.object === objectName && fav.method === methodName)
        );
        this.saveFavorites();
        this.updateFavoriteButtons(objectName, methodName, false);
        
        // Refresh favorites view if currently showing
        if (document.querySelector('.mdn-tab[data-category="favorites"].active')) {
            this.renderFavorites();
        }
    }

    updateFavoriteButtons(objectName, methodName, isFavorite) {
        document.querySelectorAll(`[data-object="${objectName}"][data-method="${methodName}"]`).forEach(el => {
            if (el.matches('.mdn-favorite')) {
                el.classList.toggle('active', isFavorite);
            } else if (el.matches('.mdn-favorite-btn')) {
                el.classList.toggle('active', isFavorite);
                el.textContent = `⭐ ${isFavorite ? 'Премахни от любими' : 'Добави в любими'}`;
            }
        });
    }

    loadFavorites() {
        try {
            const saved = localStorage.getItem('mdn-favorites');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load favorites:', error);
            return [];
        }
    }

    saveFavorites() {
        try {
            localStorage.setItem('mdn-favorites', JSON.stringify(this.favorites));
        } catch (error) {
            console.error('Failed to save favorites:', error);
        }
    }

    /**
     * Add to search history
     */
    addToHistory(objectName, methodName) {
        const entry = { object: objectName, method: methodName, timestamp: Date.now() };
        this.searchHistory = this.searchHistory.filter(h => 
            !(h.object === objectName && h.method === methodName)
        );
        this.searchHistory.unshift(entry);
        
        // Keep only last 20 searches
        if (this.searchHistory.length > 20) {
            this.searchHistory = this.searchHistory.slice(0, 20);
        }
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
    showMethod(objectName, methodName, category = 'javascript') {
        this.currentCategory = category;
        this.renderMethodDetails(objectName, methodName);
        this.setActiveTab(category);
    }

    quickSearch(query) {
        const results = this.search(query);
        this.displaySearchResults(results);
        this.setActiveTab('search');
        return results;
    }

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