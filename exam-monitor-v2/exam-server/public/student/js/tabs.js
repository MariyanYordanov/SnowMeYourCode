/**
 * Enhanced Output Panel Tabs Module
 * Handles Console/DOM Preview/MDN tab switching
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
        setupMDNFunctions();
        console.log('Enhanced tabs system initialized');
        return true;
    } catch (error) {
        console.error('Failed to setup tabs:', error);
        return false;
    }
}

/**
 * Setup tab button event handlers
 */
function setupTabButtons() {
    const consoleTab = document.getElementById('console-tab');
    const mdnTab = document.getElementById('mdn-tab');

    consoleTab.addEventListener('click', () => switchTab('console'));
    mdnTab.addEventListener('click', () => switchTab('mdn'));
}

/**
 * Switch between Console, DOM Preview, and MDN tabs
 */
export function switchTab(tabName) {
    try {
        // Validate tab name
        const validTabs = ['console', 'mdn'];
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

        console.log(`Switched to ${tabName} tab`);

    } catch (error) {
        console.error('Error switching tabs:', error);
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

            case 'mdn':
                // MDN tab - ensure proper section is shown
                console.log('MDN Reference tab activated');
                break;
        }
    } catch (error) {
        console.error('Error in tab switch handler:', error);
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

            console.log(`Showing MDN section: ${sectionName}`);

        } catch (error) {
            console.error('Error showing MDN section:', error);
        }
    };

    console.log('Offline MDN functions initialized');
}

/**
 * Get current tab
 */
export function getCurrentTab() {
    return currentTab;
}

// Add pulse animation on load
if (typeof document !== 'undefined') {
    addPulseAnimation();
}

// Export for debugging
window.tabsDebug = {
    switchTab,
    getCurrentTab,
    currentTab: () => currentTab
};