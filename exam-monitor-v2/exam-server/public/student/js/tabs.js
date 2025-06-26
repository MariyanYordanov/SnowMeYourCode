/**
 * Simple Output Panel Tabs Module
 * Handles Console/MDN tab switching with simple MDN links
 */

// Tab state
let currentTab = 'console';

/**
 * Setup tabs functionality
 */
export function setupTabs() {
    try {
        // Setup tab buttons
        setupTabButtons();

        // Setup MDN functions in global scope
        setupMDNFunctions();

        console.log('✅ Simple tabs system initialized');
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

        console.log(`📑 Switched to ${tabName} tab`);

    } catch (error) {
        console.error('❌ Error switching tabs:', error);
    }
}

/**
 * Setup MDN functions in global scope
 */
function setupMDNFunctions() {
    // MDN URL mappings
    const mdnUrls = {
        fetch: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
        dom: 'https://developer.mozilla.org/en-US/docs/Web/API/Document',
        array: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
        object: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object',
        json: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON',
        storage: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage',
        promise: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
        classes: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes'
    };

    // Open specific MDN page
    window.openMDN = function (topic) {
        const url = mdnUrls[topic];
        if (url) {
            window.open(url, 'mdn_reference', 'width=1000,height=700,scrollbars=yes,resizable=yes');
            console.log(`📖 Opened MDN: ${topic}`);
        } else {
            console.error(`Unknown MDN topic: ${topic}`);
        }
    };

    // Open general MDN JavaScript reference
    window.openMDNGeneral = function () {
        window.open(
            'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference',
            'mdn_general',
            'width=1200,height=800,scrollbars=yes,resizable=yes'
        );
        console.log('📖 Opened general MDN reference');
    };

    // Search MDN
    window.searchMDN = function () {
        const searchInput = document.getElementById('mdn-search-simple');
        if (!searchInput) return;

        const query = searchInput.value.trim();
        if (query) {
            const searchUrl = `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query + ' javascript')}`;
            window.open(searchUrl, 'mdn_search', 'width=1000,height=700,scrollbars=yes,resizable=yes');
            console.log(`🔍 Searched MDN for: ${query}`);
        }
    };

    // Enter key support for search
    setTimeout(() => {
        const searchInput = document.getElementById('mdn-search-simple');
        if (searchInput) {
            searchInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    window.searchMDN();
                }
            });
        }
    }, 100);
}

/**
 * Get current tab
 */
export function getCurrentTab() {
    return currentTab;
}

// Export for debugging
window.tabsDebug = {
    switchTab,
    getCurrentTab,
    currentTab: () => currentTab
};