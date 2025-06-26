/**
 * Enhanced Output Panel Tabs Module
 * Handles Console/DOM Preview/MDN tab switching
 */

import { setupDOMPreview, updatePreview } from './domPreview.js';

// Tab state
let currentTab = 'console';

/**
 * Setup tabs functionality
 */
export function setupTabs() {
    try {
        // Setup tab buttons
        setupTabButtons();

        // Setup DOM Preview
        setupDOMPreview();

        // Setup MDN functions in global scope
        setupMDNFunctions();

        console.log('✅ Enhanced tabs system initialized');
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
    const domTab = document.getElementById('dom-tab');
    const mdnTab = document.getElementById('mdn-tab');

    if (!consoleTab || !domTab || !mdnTab) {
        console.error('Tab buttons not found');
        return;
    }

    consoleTab.addEventListener('click', () => switchTab('console'));
    domTab.addEventListener('click', () => switchTab('dom'));
    mdnTab.addEventListener('click', () => switchTab('mdn'));
}

/**
 * Switch between Console, DOM Preview, and MDN tabs
 */
export function switchTab(tabName) {
    try {
        // Validate tab name
        const validTabs = ['console', 'dom', 'mdn'];
        if (!validTabs.includes(tabName)) {
            console.error('Invalid tab name:', tabName);
            return;
        }

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

        // Handle tab-specific initialization
        handleTabSwitch(tabName);

        // Update current tab
        currentTab = tabName;

        console.log(`📑 Switched to ${tabName} tab`);

    } catch (error) {
        console.error('❌ Error switching tabs:', error);
    }
}

/**
 * Handle tab-specific logic when switching
 */
function handleTabSwitch(tabName) {
    try {
        switch (tabName) {
            case 'console':
                // Console tab - no special handling needed
                break;

            case 'dom':
                // DOM Preview tab - trigger preview update
                updatePreview();
                console.log('🌐 DOM Preview tab activated');
                break;

            case 'mdn':
                // MDN tab - ensure proper section is shown
                console.log('📚 MDN Reference tab activated');
                break;
        }
    } catch (error) {
        console.error('❌ Error in tab switch handler:', error);
    }
}

/**
 * Setup MDN functions (OFFLINE VERSION - NO EXTERNAL LINKS)
 */
function setupMDNFunctions() {
    // Show MDN section
    window.showMDNSection = function (sectionName) {
        try {
            // Update navigation buttons
            const navBtns = document.querySelectorAll('.mdn-nav-btn');
            navBtns.forEach(btn => btn.classList.remove('active'));

            const targetBtn = document.querySelector(`[onclick="showMDNSection('${sectionName}')"]`);
            if (targetBtn) {
                targetBtn.classList.add('active');
            }

            // Show target section
            const sections = document.querySelectorAll('.mdn-section');
            sections.forEach(section => section.classList.remove('active'));

            const targetSection = document.getElementById(`mdn-${sectionName}`);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            console.log(`📖 Showing MDN section: ${sectionName}`);

        } catch (error) {
            console.error('❌ Error showing MDN section:', error);
        }
    };

    console.log('✅ Offline MDN functions initialized');
}

/**
 * Get current tab
 */
export function getCurrentTab() {
    return currentTab;
}

/**
 * Trigger DOM preview update from external modules
 */
export function triggerDOMPreview(code = null, codeType = 'javascript') {
    try {
        if (currentTab === 'dom') {
            updatePreview(code, codeType);
        }

        // Also trigger if we detect HTML/CSS code even when not on DOM tab
        if (code && (code.includes('<') || code.includes('{'))) {
            updatePreview(code, codeType);
        }
    } catch (error) {
        console.error('❌ Error triggering DOM preview:', error);
    }
}

/**
 * Auto-switch to DOM tab if HTML/CSS code is detected
 */
export function autoSwitchToDOMIfNeeded(code) {
    try {
        const trimmedCode = code.trim().toLowerCase();

        // Check if code looks like HTML or CSS
        const isHTML = trimmedCode.includes('<html') ||
            trimmedCode.includes('<div') ||
            trimmedCode.includes('<p>') ||
            /^<[a-z][\s\S]*>/.test(trimmedCode);

        const isCSS = trimmedCode.includes('{') && trimmedCode.includes('}') &&
            (trimmedCode.includes('color') || trimmedCode.includes('background'));

        if ((isHTML || isCSS) && currentTab !== 'dom') {
            // Show a subtle hint to switch to DOM tab
            showDOMSwitchHint();
        }

    } catch (error) {
        console.error('❌ Error in auto-switch logic:', error);
    }
}

/**
 * Show hint to switch to DOM tab
 */
function showDOMSwitchHint() {
    try {
        const domTab = document.getElementById('dom-tab');
        if (domTab) {
            // Add visual hint
            domTab.style.animation = 'pulse 2s infinite';
            domTab.title = 'Изглежда че пишете HTML/CSS - превключете към DOM Preview!';

            // Remove hint after 5 seconds
            setTimeout(() => {
                domTab.style.animation = '';
                domTab.title = '';
            }, 5000);
        }
    } catch (error) {
        console.error('❌ Error showing DOM switch hint:', error);
    }
}

/**
 * Add pulse animation for hints
 */
function addPulseAnimation() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); }
            100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
        }
    `;
    document.head.appendChild(style);
}

// Add pulse animation on load
if (typeof document !== 'undefined') {
    addPulseAnimation();
}

// Export for debugging
window.tabsDebug = {
    switchTab,
    getCurrentTab,
    triggerDOMPreview,
    autoSwitchToDOMIfNeeded,
    currentTab: () => currentTab
};