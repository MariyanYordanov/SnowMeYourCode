/**
 * Output Panel Tabs Module
 * Handles Console/MDN tab switching and MDN content
 */
// Import MDN data functions
import { getMDNContentByCategory, getAPIData, searchMDNDatabase, generateAPIHTML } from './mdn-data.js';
// Tab state
let currentTab = 'console';
let currentCategory = 'all';

/**
 * Setup tabs functionality
 */
export function setupTabs() {
    try {
        // Setup tab buttons
        setupTabButtons();

        // Setup MDN search
        setupMDNSearch();

        // Setup category buttons
        setupCategoryButtons();

        // Setup quick links
        setupQuickLinks();

        console.log('✅ Tabs system initialized');
        return true;
    } catch (error) {
        console.error('❌ Failed to setup tabs:', error);
        return false;
    }
}

/**
 * Setup tab button event handlers
 */
function setupTabButtons() {
    const consoleTab = document.getElementById('console-tab');
    const mdnTab = document.getElementById('mdn-tab');

    if (!consoleTab || !mdnTab) {
        console.error('Tab buttons not found');
        return;
    }

    consoleTab.addEventListener('click', () => switchTab('console'));
    mdnTab.addEventListener('click', () => switchTab('mdn'));
}

/**
 * Switch between Console and MDN tabs
 */
export function switchTab(tabName) {
    try {
        // Update tab buttons
        const allTabBtns = document.querySelectorAll('.tab-btn');
        allTabBtns.forEach(btn => btn.classList.remove('active'));

        const targetBtn = document.getElementById(`${tabName}-tab`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        // Update tab content
        const allTabContent = document.querySelectorAll('.tab-content');
        allTabContent.forEach(content => {
            content.style.display = 'none';
            content.classList.remove('active');
        });

        const targetContent = document.getElementById(`${tabName}-tab-content`);
        if (targetContent) {
            targetContent.style.display = 'block';
            targetContent.classList.add('active');
        }

        // Update current tab
        currentTab = tabName;

        // Special handling for MDN tab
        if (tabName === 'mdn') {
            loadMDNContent();
        }

        console.log(`📑 Switched to ${tabName} tab`);

    } catch (error) {
        console.error('❌ Error switching tabs:', error);
    }
}

/**
 * Setup MDN search functionality
 */
function setupMDNSearch() {
    const searchInput = document.getElementById('mdn-search');
    if (!searchInput) return;

    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Debounced search
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                searchMDNContent(query);
            } else {
                clearSearchResults();
                loadMDNContent(); // Show default content
            }
        }, 300);
    });

    // Clear search on escape
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            clearSearchResults();
            loadMDNContent();
        }
    });
}

/**
 * Setup category button handlers
 */
function setupCategoryButtons() {
    const categoryBtns = document.querySelectorAll('.category-btn');

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            switchCategory(category);
        });
    });
}

/**
 * Switch MDN category
 */
function switchCategory(category) {
    try {
        // Update category buttons
        const allCategoryBtns = document.querySelectorAll('.category-btn');
        allCategoryBtns.forEach(btn => btn.classList.remove('active'));

        const targetBtn = document.querySelector(`[data-category="${category}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        // Update current category
        currentCategory = category;

        // Load category content
        loadCategoryContent(category);

        console.log(`📂 Switched to ${category} category`);

    } catch (error) {
        console.error('❌ Error switching category:', error);
    }
}

/**
 * Setup quick links
 */
function setupQuickLinks() {
    const quickLinks = document.querySelectorAll('.quick-link');

    quickLinks.forEach(link => {
        link.addEventListener('click', () => {
            const api = link.getAttribute('data-api');
            showAPIReference(api);
        });
    });
}

/**
 * Load MDN content based on current category
 */
function loadMDNContent() {
    loadCategoryContent(currentCategory);
}

/**
 * Load content for specific category
 */
function loadCategoryContent(category) {
    const contentContainer = document.getElementById('mdn-content');
    if (!contentContainer) return;

    // Get content based on category
    const content = getMDNContentByCategory(category);
    contentContainer.innerHTML = content;

    // Setup click handlers for API items
    setupAPIClickHandlers();
}

/**
 * Search MDN content
 */
function searchMDNContent(query) {
    const searchResults = document.getElementById('search-results');
    if (!searchResults) return;

    // Get search results
    const results = searchMDNDatabase(query);

    if (results.length > 0) {
        const resultsHTML = results.map(result => `
            <div class="search-result-item" data-api="${result.id}">
                <strong>${result.name}</strong>
                <span class="result-category">${result.category}</span>
            </div>
        `).join('');

        searchResults.innerHTML = resultsHTML;
        searchResults.style.display = 'block';

        // Setup click handlers for search results
        setupSearchResultHandlers();
    } else {
        searchResults.innerHTML = '<div class="no-results">No APIs found</div>';
        searchResults.style.display = 'block';
    }
}

/**
 * Clear search results
 */
function clearSearchResults() {
    const searchResults = document.getElementById('search-results');
    if (searchResults) {
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }
}

/**
 * Setup search result click handlers
 */
function setupSearchResultHandlers() {
    const resultItems = document.querySelectorAll('.search-result-item');

    resultItems.forEach(item => {
        item.addEventListener('click', () => {
            const apiId = item.getAttribute('data-api');
            showAPIReference(apiId);
            clearSearchResults();
        });
    });
}

/**
 * Setup API click handlers
 */
function setupAPIClickHandlers() {
    const apiItems = document.querySelectorAll('.api-item');

    apiItems.forEach(item => {
        item.addEventListener('click', () => {
            const apiId = item.getAttribute('data-api');
            showAPIReference(apiId);
        });
    });
}

/**
 * Show specific API reference
 */
function showAPIReference(apiId) {
    const contentContainer = document.getElementById('mdn-content');
    if (!contentContainer) return;

    const apiData = getAPIData(apiId);
    if (!apiData) {
        contentContainer.innerHTML = '<div class="api-error">API reference not found</div>';
        return;
    }

    const apiHTML = generateAPIHTML(apiData);
    contentContainer.innerHTML = apiHTML;

    // Setup copy code button handlers
    setupCopyCodeHandlers();
}

/**
 * Setup copy code button handlers
 */
function setupCopyCodeHandlers() {
    const copyBtns = document.querySelectorAll('.copy-code-btn');

    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const codeBlock = btn.nextElementSibling;
            if (codeBlock) {
                copyToClipboard(codeBlock.textContent);

                // Visual feedback
                btn.textContent = '✅ Copied';
                setTimeout(() => {
                    btn.textContent = '📋 Copy';
                }, 1500);
            }
        });
    });
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    try {
        navigator.clipboard.writeText(text);
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

/**
 * Get current tab
 */
export function getCurrentTab() {
    return currentTab;
}

/**
 * Get current category
 */
export function getCurrentCategory() {
    return currentCategory;
}

// Export helper functions for other modules
export { loadMDNContent, showAPIReference, switchCategory };