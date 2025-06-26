/**
 * Hybrid Output Panel Tabs Module
 * Handles Console/MDN tab switching with offline reference + external MDN
 */

import { OFFLINE_MDN, MDN_URLS } from './mdn-offline.js';

// Tab state
let currentTab = 'console';
let currentMDNRef = 'overview';

// Popup tracking for security
const openedPopups = new Set();

/**
 * Setup tabs functionality
 */
export function setupTabs() {
    try {
        // Setup tab buttons
        setupTabButtons();

        // Setup MDN functions in global scope
        setupMDNFunctions();

        // Setup popup tracking
        setupPopupTracking();

        console.log('✅ Hybrid tabs system initialized');
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
    // Show offline reference
    window.showOfflineRef = function (topic) {
        try {
            // Update navigation buttons
            const navBtns = document.querySelectorAll('.mdn-nav-btn');
            navBtns.forEach(btn => btn.classList.remove('active'));

            const targetBtn = document.querySelector(`[onclick="showOfflineRef('${topic}')"]`);
            if (targetBtn) {
                targetBtn.classList.add('active');
            }

            // Show content
            if (topic === 'overview') {
                showOverview();
            } else {
                showAPIReference(topic);
            }

            currentMDNRef = topic;
            console.log(`📖 Showing offline reference: ${topic}`);

        } catch (error) {
            console.error('❌ Error showing offline reference:', error);
        }
    };

    // Open external MDN with ad-blocking and security
    window.openMDNExternal = function () {
        const currentTopic = currentMDNRef === 'overview' ? 'general' : currentMDNRef;
        openSecureMDN(currentTopic);
    };

    // Search MDN externally
    window.searchMDNExternal = function () {
        const searchInput = document.getElementById('mdn-search-mini');
        if (!searchInput) return;

        const query = searchInput.value.trim();
        if (query) {
            const searchUrl = `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query + ' javascript')}`;
            openSecurePopup(searchUrl, 'mdn_search');
            console.log(`🔍 Searched MDN for: ${query}`);
            searchInput.value = ''; // Clear search
        }
    };

    // Enter key support for search
    setTimeout(() => {
        const searchInput = document.getElementById('mdn-search-mini');
        if (searchInput) {
            searchInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    window.searchMDNExternal();
                }
            });
        }
    }, 100);
}

/**
 * Show overview page
 */
function showOverview() {
    const overviewEl = document.getElementById('mdn-overview');
    const dynamicEl = document.getElementById('mdn-dynamic-content');

    if (overviewEl && dynamicEl) {
        overviewEl.classList.add('active');
        dynamicEl.classList.remove('active');
    }
}

/**
 * Show API reference for specific topic
 */
function showAPIReference(topic) {
    const overviewEl = document.getElementById('mdn-overview');
    const dynamicEl = document.getElementById('mdn-dynamic-content');

    if (!overviewEl || !dynamicEl) return;

    // Hide overview, show dynamic content
    overviewEl.classList.remove('active');
    dynamicEl.classList.add('active');

    // Get API data
    const apiData = OFFLINE_MDN[topic];
    if (!apiData) {
        dynamicEl.innerHTML = '<div class="api-error">API reference not found</div>';
        return;
    }

    // Generate HTML
    const html = generateAPIHTML(apiData, topic);
    dynamicEl.innerHTML = html;

    // Setup copy buttons
    setupCopyButtons();
}

/**
 * Generate API reference HTML
 */
function generateAPIHTML(apiData, topic) {
    return `
        <div class="api-ref">
            <div class="api-header">
                <h3>${apiData.title}</h3>
                <div class="api-actions">
                    <button class="mdn-external-btn" onclick="openSecureMDN('${topic}')">
                        🔗 Full Documentation
                    </button>
                </div>
            </div>
            
            <div class="syntax">
                <strong>Syntax:</strong> ${apiData.syntax}
            </div>
            
            <div class="description">
                ${apiData.description}
            </div>
            
            ${apiData.examples ? generateExamplesHTML(apiData.examples) : ''}
            ${apiData.methods ? generateMethodsHTML(apiData.methods) : ''}
            ${apiData.properties ? generatePropertiesHTML(apiData.properties) : ''}
        </div>
    `;
}

/**
 * Generate examples HTML
 */
function generateExamplesHTML(examples) {
    const examplesHTML = examples.map((example, index) => `
        <div class="example-block">
            <div class="example-title">${example.title}</div>
            <div class="code-block">
                <button class="copy-btn" onclick="copyCode(this)">📋 Copy</button>
                ${escapeHTML(example.code)}
            </div>
        </div>
    `).join('');

    return `
        <div class="api-examples">
            <h4>📋 Examples</h4>
            ${examplesHTML}
        </div>
    `;
}

/**
 * Generate methods HTML
 */
function generateMethodsHTML(methods) {
    const methodsHTML = methods.map(method => `
        <li>
            <span class="method-name">${method.name}</span>
            <span class="method-desc">- ${method.description}</span>
        </li>
    `).join('');

    return `
        <div class="api-methods">
            <h4>🔧 Methods</h4>
            <ul class="methods-list">
                ${methodsHTML}
            </ul>
        </div>
    `;
}

/**
 * Generate properties HTML
 */
function generatePropertiesHTML(properties) {
    const propertiesHTML = properties.map(prop => `
        <li>
            <span class="method-name">${prop.name}</span>
            <span class="method-desc">(${prop.type}) - ${prop.description}</span>
        </li>
    `).join('');

    return `
        <div class="api-methods">
            <h4>⚙️ Properties</h4>
            <ul class="methods-list">
                ${propertiesHTML}
            </ul>
        </div>
    `;
}

/**
 * Setup copy buttons
 */
function setupCopyButtons() {
    window.copyCode = function (button) {
        try {
            const codeBlock = button.parentElement;
            const code = codeBlock.textContent.replace('📋 Copy', '').trim();

            navigator.clipboard.writeText(code).then(() => {
                button.textContent = '✅ Copied';
                setTimeout(() => {
                    button.textContent = '📋 Copy';
                }, 1500);
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = code;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                button.textContent = '✅ Copied';
                setTimeout(() => {
                    button.textContent = '📋 Copy';
                }, 1500);
            });
        } catch (error) {
            console.error('❌ Copy failed:', error);
        }
    };
}

/**
 * Open secure MDN popup with ad-blocking
 */
function openSecureMDN(topic) {
    let url;

    if (topic === 'general') {
        url = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference';
    } else {
        url = MDN_URLS[topic] || MDN_URLS.fetch;
    }

    openSecurePopup(url, `mdn_${topic}`);
}

/**
 * Open popup with security measures
 */
function openSecurePopup(url, windowName) {
    try {
        // Close any existing popup with same name
        if (openedPopups.has(windowName)) {
            const existingPopup = window.open('', windowName);
            if (existingPopup) {
                existingPopup.close();
            }
            openedPopups.delete(windowName);
        }

        // Open new popup with restricted features
        const popup = window.open(
            url,
            windowName,
            'width=1000,height=700,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=yes,status=no'
        );

        if (popup) {
            openedPopups.add(windowName);

            // Track popup close
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    openedPopups.delete(windowName);
                    clearInterval(checkClosed);
                    console.log(`📖 Popup ${windowName} closed`);
                }
            }, 1000);

            // Apply ad-blocking after load (if possible)
            try {
                popup.addEventListener('load', () => {
                    blockAdsInPopup(popup);
                });
            } catch (error) {
                // CORS restriction - can't access popup content
                console.log('Cannot access popup content due to CORS');
            }

            console.log(`📖 Opened secure popup: ${windowName}`);
        } else {
            console.error('Failed to open popup - popup blocker?');
            // Fallback: open in same tab temporarily
            const fallback = confirm('Popup blocked. Open in new tab instead?\n(You\'ll need to navigate back manually)');
            if (fallback) {
                window.open(url, '_blank');
            }
        }

    } catch (error) {
        console.error('❌ Error opening popup:', error);
    }
}

/**
 * Setup popup tracking for security
 */
function setupPopupTracking() {
    // Close all popups when exam window loses focus (security measure)
    window.addEventListener('beforeunload', () => {
        closeAllPopups();
    });

    // Monitor focus changes
    let focusTimeout;
    window.addEventListener('blur', () => {
        // If window loses focus for more than 5 seconds, warn user
        focusTimeout = setTimeout(() => {
            if (openedPopups.size > 0) {
                console.warn('⚠️ Extended focus loss detected with open popups');
                // Could trigger anti-cheat warning here if needed
            }
        }, 5000);
    });

    window.addEventListener('focus', () => {
        if (focusTimeout) {
            clearTimeout(focusTimeout);
        }
    });
}

/**
 * Block ads in popup (if accessible)
 */
function blockAdsInPopup(popup) {
    try {
        if (!popup.document) return; // CORS blocked

        // Common ad selectors
        const adSelectors = [
            '.advertisement',
            '.banner-ad',
            '.sidebar-ads',
            '[class*="ad-"]',
            '[id*="ad-"]',
            '.google-ads',
            '.adsense'
        ];

        adSelectors.forEach(selector => {
            const ads = popup.document.querySelectorAll(selector);
            ads.forEach(ad => {
                ad.style.display = 'none';
                console.log(`🚫 Blocked ad element: ${selector}`);
            });
        });

    } catch (error) {
        // Expected - CORS prevents access to popup content
        console.log('Ad blocking skipped due to CORS restrictions');
    }
}

/**
 * Close all opened popups
 */
function closeAllPopups() {
    openedPopups.forEach(windowName => {
        try {
            const popup = window.open('', windowName);
            if (popup) {
                popup.close();
            }
        } catch (error) {
            console.error(`Failed to close popup: ${windowName}`);
        }
    });
    openedPopups.clear();
    console.log('🔒 All popups closed');
}

/**
 * Utility functions
 */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get current tab
 */
export function getCurrentTab() {
    return currentTab;
}

/**
 * Get current MDN reference
 */
export function getCurrentMDNRef() {
    return currentMDNRef;
}

// Export for debugging
window.tabsDebug = {
    switchTab,
    showOfflineRef: window.showOfflineRef,
    getCurrentTab,
    getCurrentMDNRef,
    closeAllPopups,
    openedPopups: () => Array.from(openedPopups)
};

// Export popup management for anti-cheat integration
export { closeAllPopups, openedPopups };