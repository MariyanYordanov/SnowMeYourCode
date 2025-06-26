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
 * Setup MDN functions with iframe (no anti-cheat conflicts)
 */
function setupMDNFunctions() {
    const mdnUrls = {
        fetch: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
        dom: 'https://developer.mozilla.org/en-US/docs/Web/API/Document',
        array: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
        object: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object',
        json: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON',
        storage: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage',
        promise: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise'
    };

    // Load MDN content in iframe
    window.loadMDN = function (topic) {
        try {
            // Update navigation buttons
            const navBtns = document.querySelectorAll('.mdn-nav-btn');
            navBtns.forEach(btn => btn.classList.remove('active'));

            const targetBtn = document.querySelector(`[onclick="loadMDN('${topic}')"]`);
            if (targetBtn) {
                targetBtn.classList.add('active');
            }

            if (topic === 'overview') {
                // Show overview page
                document.getElementById('mdn-overview-page').style.display = 'block';
                document.getElementById('mdn-iframe').style.display = 'none';
            } else {
                // Load MDN page in iframe
                const url = mdnUrls[topic];
                if (url) {
                    document.getElementById('mdn-overview-page').style.display = 'none';
                    document.getElementById('mdn-iframe').style.display = 'block';
                    document.getElementById('mdn-iframe').src = url;
                    console.log(`📖 Loaded MDN: ${topic}`);
                } else {
                    console.error(`Unknown MDN topic: ${topic}`);
                }
            }
        } catch (error) {
            console.error('❌ Error loading MDN:', error);
        }
    };

    // Search MDN in iframe
    window.searchMDNIframe = function () {
        try {
            const searchInput = document.getElementById('mdn-search-iframe');
            if (!searchInput) return;

            const query = searchInput.value.trim();
            if (query) {
                const searchUrl = `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query + ' javascript')}`;

                document.getElementById('mdn-overview-page').style.display = 'none';
                document.getElementById('mdn-iframe').style.display = 'block';
                document.getElementById('mdn-iframe').src = searchUrl;

                // Update nav buttons
                const navBtns = document.querySelectorAll('.mdn-nav-btn');
                navBtns.forEach(btn => btn.classList.remove('active'));

                console.log(`🔍 Searched MDN for: ${query}`);
                searchInput.value = ''; // Clear search
            }
        } catch (error) {
            console.error('❌ Error searching MDN:', error);
        }
    };

    // Enter key support for search
    setTimeout(() => {
        const searchInput = document.getElementById('mdn-search-iframe');
        if (searchInput) {
            searchInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    window.searchMDNIframe();
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