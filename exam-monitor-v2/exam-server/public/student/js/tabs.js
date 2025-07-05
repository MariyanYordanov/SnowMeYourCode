export function setupTabs() {
    const examApp = window.ExamApp;
    if (!examApp) {
        console.warn('ExamApp not initialized');
        return false;
    }

    console.log('Tabs functionality integrated with sidebar-manager');
    return true;
}

export function switchTab(tabName) {
    const examApp = window.ExamApp;
    if (examApp?.sidebarManager) {
        examApp.sidebarManager.switchPanel(tabName);
    }
}

export function getCurrentTab() {
    const examApp = window.ExamApp;
    if (examApp?.sidebarManager) {
        return examApp.sidebarManager.getCurrentPanel();
    }
    return 'files';
}

window.showMDNSection = function (sectionName) {
    const examApp = window.ExamApp;
    if (examApp?.sidebarManager) {
        examApp.sidebarManager.loadMDNContent(sectionName);
    }
};

window.tabsDebug = {
    switchTab,
    getCurrentTab
};