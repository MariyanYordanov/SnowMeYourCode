import { MonacoFileManager } from './monaco-file-manager.js';
import { updateEditorIntegration, loadStarterProject } from './editor-integration.js';
import { SidebarManager } from './sidebar-manager.js';
import { previewManager } from './preview-manager.js';
import { HelpChat } from './help-chat.js';
import { PanelResizer } from './panel-resizer.js';
import { BottomPanelManager } from './bottom-panel.js';
import { DocsManager } from './docs-manager.js';

import {
    setupLoginForm,
    handleLogin,
    handleLoginSuccess,
    handleSessionRestore,
    handleLoginError,
    updateStudentDisplay
} from './login.js';

import { setupSocket } from './socket.js';

import {
    initializeMonacoEditor,
    setupEditorControls,
    runCode,
    formatCode,
    clearOutput
} from './editor.js';

import {
    startExamTimer,
    handleTimeWarning,
    handleExamExpired
} from './timer.js';

import {
    showCompletionDialog,
    hideCustomDialogs,
    confirm as customConfirm
} from './dialogs.js';

import { setupTabs } from './tabs.js';

window.ExamApp = {
    socket: null,
    editor: null,
    fileManager: null,
    previewManager: previewManager,
    docsManager: null,

    sessionId: null,
    studentName: null,
    studentClass: null,
    helpChat: null,

    examStartTime: null,
    examDuration: 3 * 60 * 60 * 1000,
    examEndTime: null,
    timeLeft: 0,
    timerInterval: null,

    isLoggedIn: false,
    lastSaveTime: null,
    isCompletionInProgress: false,

    settings: {
        autoSave: true,
        autoSaveInterval: 30000,
        theme: 'vs-dark',
        fontSize: 14,
        wordWrap: true
    },

    showNotification: showNotification,
    showError: showError,
    updateStudentDisplay: updateStudentDisplay
};

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    try {
        console.log('Initializing Exam Monitor App (SEB Mode)...');

        // Check for mobile/tablet devices and block access
        if (detectMobileDevice()) {
            blockMobileAccess();
            return;
        }

        const examApp = window.ExamApp;

        updateEditorIntegration();
        setupLoginForm(examApp);
        setupSocket();
        setupGlobalErrorHandler();
        preventDefaultBehaviors();
        setupWindowFunctions();

        examApp.sidebarManager = new SidebarManager();
        examApp.panelResizer = new PanelResizer();
        examApp.bottomPanel = new BottomPanelManager();
        examApp.docsManager = new DocsManager();

        console.log('App initialized successfully (SEB Mode - No Anticheat)');

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Application initialization error');
    }
}

async function startExam(sessionData) {
    try {
        const examApp = window.ExamApp;

        if (!sessionData || !examApp.sessionId) {
            throw new Error('Invalid session data');
        }

        console.log('Starting exam (SEB Mode)...');

        examApp.isLoggedIn = true;
        examApp.examStartTime = sessionData.examStartTime || Date.now();
        examApp.examDuration = sessionData.examDuration || (3 * 60 * 60 * 1000);
        examApp.examEndTime = new Date(examApp.examStartTime + examApp.examDuration);

        hideLoginComponent();
        showExamComponent();

        // Update student display
        updateStudentDisplay(
            examApp.studentName,
            examApp.studentClass,
            examApp.sessionId
        );

        // Start timer
        startExamTimer(sessionData.timeLeft || examApp.examDuration);

        // Initialize Monaco editor
        await initializeMonaco();
        setupTabs();

        // Initialize help chat
        if (examApp.socket) {
            examApp.helpChat = new HelpChat(examApp.socket);
            examApp.helpChat.requestNotificationPermission();
        }

        // Restore code for continuing sessions
        if (!sessionData.isNewSession && sessionData.lastCode && examApp.editor) {
            examApp.editor.setValue(sessionData.lastCode);
            const minutesLeft = Math.floor(sessionData.timeLeft / 60000);
            showNotification(`Session restored. ${minutesLeft} minutes remaining`, 'info');
        } else {
            showNotification('Exam started successfully!', 'success');
        }

        console.log('Exam started successfully');

    } catch (error) {
        console.error('Failed to start exam:', error);
        showError('Failed to start exam');
    }
}

async function initializeMonaco() {
    try {
        console.log('Initializing Monaco editor...');

        const editor = await initializeMonacoEditor();
        const examApp = window.ExamApp;

        if (!editor) {
            throw new Error('Failed to create Monaco editor');
        }

        examApp.editor = editor;

        const fileManager = new MonacoFileManager(editor);
        examApp.fileManager = fileManager;

        setupEditorControls();

        if (typeof monaco !== 'undefined') {
            setupFileManagerCommands();
        }

        // Setup finish exam button
        const finishBtn = document.getElementById('finish-exam-btn');
        if (finishBtn) {
            finishBtn.addEventListener('click', () => {
                showSimpleConfirm(
                    'Are you sure you want to submit your exam?',
                    () => {
                        window.ExamApp.completeExam('student_submit');
                    },
                    () => {
                        console.log('User cancelled');
                    }
                );
            });
        }

        // Load project files
        if (examApp.sessionId) {
            try {
                const success = await fileManager.loadProjectStructure(examApp.sessionId);
                if (!success) {
                    loadStarterProject();
                }
            } catch (error) {
                console.error('Error loading project:', error);
                loadStarterProject();
            }
        } else {
            loadStarterProject();
        }

        console.log('Monaco initialization complete');

    } catch (error) {
        console.error('Monaco initialization failed:', error);
        throw error;
    }
}

function setupFileManagerCommands() {
    try {
        const examApp = window.ExamApp;
        const fileManager = examApp.fileManager;
        const editor = examApp.editor;

        if (!fileManager || !editor || typeof monaco === 'undefined') {
            return;
        }

        const newFolderBtn = document.getElementById('new-folder-btn');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => {
                fileManager.createNewFolder();
            });
        }

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            fileManager.saveCurrentFile();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
            fileManager.closeCurrentFile();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, () => {
            fileManager.createNewFile();
        });

    } catch (error) {
        console.error('Failed to setup file manager commands:', error);
    }
}

async function completeExam(reason = 'unknown') {
    try {
        const examApp = window.ExamApp;
        examApp.completionInProgress = true;

        // Save current file before completing
        if (examApp.fileManager) {
            await examApp.fileManager.saveCurrentFile();
        }

        // Close help chat window if open
        const helpChatWindow = document.querySelector('.help-chat-window');
        if (helpChatWindow) {
            helpChatWindow.style.display = 'none';
        }

        if (examApp.timerInterval) {
            clearInterval(examApp.timerInterval);
        }

        showNotification('Submitting solution...', 'info');

        // Try socket first, but also use HTTP API as fallback
        if (examApp.socket && examApp.socket.connected) {
            examApp.socket.emit('exam-complete', {
                sessionId: examApp.sessionId,
                reason: reason,
                timestamp: Date.now()
            });
        }

        // Also call HTTP API to ensure completion is recorded
        try {
            await fetch('/api/exam-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: examApp.sessionId,
                    reason: reason,
                    timestamp: Date.now()
                })
            });
        } catch (e) {
            console.warn('HTTP completion fallback failed:', e);
        }

        setTimeout(() => {
            exitExam(reason);
        }, 2000);

    } catch (error) {
        console.error('Error completing exam:', error);
        // Still exit even if there's an error
        exitExam(reason);
    }
}

function exitExam(reason = 'unknown') {
    try {
        const examApp = window.ExamApp;
        examApp.completionInProgress = true;
        examApp.isLoggedIn = false;

        // Close help chat window if open
        const helpChatWindow = document.querySelector('.help-chat-window');
        if (helpChatWindow) {
            helpChatWindow.style.display = 'none';
        }

        if (examApp.timerInterval) {
            clearInterval(examApp.timerInterval);
        }

        if (examApp.fileManager) {
            examApp.fileManager.disposeAll();
        }

        if (examApp.socket && examApp.socket.connected) {
            examApp.socket.emit('exam-complete', {
                sessionId: examApp.sessionId,
                reason: reason,
                timestamp: Date.now()
            });
        }

        hideExamComponent();
        showCompletionScreen(reason);
        examApp.completionInProgress = false;

        console.log(`Exam exited: ${reason}`);

    } catch (error) {
        console.error('Error during exam exit:', error);
    }
}

window.exitExam = exitExam;

function showLoginComponent() {
    const loginComponent = document.getElementById('login-component');
    if (loginComponent) {
        loginComponent.style.display = 'flex';
    }
}

function hideLoginComponent() {
    const termsComponent = document.getElementById('terms-component');
    const loginComponent = document.getElementById('login-component');
    if (termsComponent) {
        termsComponent.style.display = 'none';
    }
    if (loginComponent) {
        loginComponent.style.display = 'none';
    }
}

function showExamComponent() {
    const examComponent = document.getElementById('exam-component');
    if (examComponent) {
        examComponent.style.display = 'block';
    }
}

function hideExamComponent() {
    const examComponent = document.getElementById('exam-component');
    if (examComponent) {
        examComponent.style.display = 'none';
    }
}

function showCompletionScreen(reason = 'unknown') {
    const examApp = window.ExamApp;
    const completionComponent = document.getElementById('completion-component');

    if (completionComponent) {
        const studentNameEl = document.getElementById('completion-student-name');
        const studentClassEl = document.getElementById('completion-student-class');
        const completionTimeEl = document.getElementById('completion-time');

        if (studentNameEl) studentNameEl.textContent = examApp.studentName || 'Unknown';
        if (studentClassEl) studentClassEl.textContent = examApp.studentClass || 'Unknown';
        if (completionTimeEl) {
            const now = new Date();
            completionTimeEl.textContent = now.toLocaleString('en-US');
        }

        const titleEl = document.getElementById('completion-title');
        const messageEl = document.getElementById('completion-message');

        if (titleEl) {
            titleEl.textContent = 'Exam Completed Successfully!';
            titleEl.style.color = '#059669';
        }
        if (messageEl) {
            messageEl.textContent = 'Your solution has been submitted successfully.';
            messageEl.style.color = '#4a5568';
        }

        completionComponent.style.display = 'block';
    }
}

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showError(message) {
    showNotification(message, 'error');
}

function preventDefaultBehaviors() {
    // Minimal prevention - SEB handles the rest
    document.addEventListener('contextmenu', e => e.preventDefault());
}

function setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showError(`Error: ${event.error?.message || 'Unknown error'}`);
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showError(`Error: ${event.reason?.message || 'Unknown error'}`);
    });
}

function setupWindowFunctions() {
    const examApp = window.ExamApp;
    window.handleLogin = (data) => handleLogin(examApp, data);
    window.handleLoginSuccess = (data) => handleLoginSuccess(examApp, data);
    window.handleSessionRestore = (data) => handleSessionRestore(examApp, data);
    window.handleLoginError = (error) => handleLoginError(examApp, error);
    window.handleTimeWarning = handleTimeWarning;
    window.handleExamExpired = handleExamExpired;

    examApp.startExam = startExam;
    examApp.completeExam = completeExam;
    examApp.exitExam = exitExam;
}

function detectMobileDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = [
        'android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry',
        'iemobile', 'opera mini', 'mobile', 'tablet', 'kindle', 'silk'
    ];

    const isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword));
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const smallScreen = window.innerWidth <= 768 || window.innerHeight <= 600;
    const isMobileUA = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    return isMobile || (hasTouch && smallScreen) || isMobileUA;
}

function blockMobileAccess() {
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 20px;
            font-family: Arial, sans-serif;
        ">
            <div style="
                background: rgba(0,0,0,0.3);
                padding: 40px;
                border-radius: 10px;
                max-width: 500px;
            ">
                <h1 style="font-size: 48px; margin-bottom: 20px;">Mobile</h1>
                <h2 style="margin-bottom: 20px;">Mobile Devices Not Supported</h2>
                <p style="font-size: 18px; line-height: 1.6;">
                    The exam can only be taken on a laptop or desktop computer.
                </p>
            </div>
        </div>
    `;
}

function showSimpleConfirm(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 2rem;
        min-width: 400px;
        max-width: 600px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    dialog.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <h2 style="color: #2d3748; font-size: 1.5rem; font-weight: 600; margin: 0;">Confirm Action</h2>
        </div>
        <p style="color: #4a5568; font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem;">${message}</p>
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button id="confirm-cancel" style="
                padding: 0.75rem 1.5rem;
                font-size: 1rem;
                font-weight: 500;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                background: #e2e8f0;
                color: #2d3748;
            ">No</button>
            <button id="confirm-yes" style="
                padding: 0.75rem 1.5rem;
                font-size: 1rem;
                font-weight: 500;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                background: #667eea;
                color: white;
            ">Yes</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-cancel');

    const cleanup = () => {
        document.body.removeChild(overlay);
    };

    yesBtn.addEventListener('click', () => {
        cleanup();
        if (onConfirm) onConfirm();
    });

    noBtn.addEventListener('click', () => {
        cleanup();
        if (onCancel) onCancel();
    });

    setTimeout(() => yesBtn.focus(), 100);
}
