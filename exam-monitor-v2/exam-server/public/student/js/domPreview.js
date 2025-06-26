/**
 * DOM Preview Module
 * Provides live HTML/CSS preview functionality in iframe
 */

// DOM Preview state
const domPreviewState = {
    currentMode: 'html',
    lastHTML: '',
    lastCSS: '',
    isInitialized: false,
    iframe: null,
    placeholder: null,
    errorPanel: null,
    statusElement: null
};

/**
 * Initialize DOM Preview functionality
 */
export function setupDOMPreview() {
    try {
        // Get DOM elements
        domPreviewState.iframe = document.getElementById('preview-frame');
        domPreviewState.placeholder = document.getElementById('preview-placeholder');
        domPreviewState.errorPanel = document.getElementById('dom-error-panel');
        domPreviewState.statusElement = document.getElementById('preview-status');

        if (!domPreviewState.iframe) {
            console.error('❌ Preview iframe not found');
            return false;
        }

        // Setup preview controls
        setupPreviewControls();

        // Initialize iframe with empty document
        initializeIframe();

        domPreviewState.isInitialized = true;
        console.log('✅ DOM Preview initialized');
        return true;

    } catch (error) {
        console.error('❌ Failed to setup DOM Preview:', error);
        return false;
    }
}

/**
 * Setup preview control buttons
 */
function setupPreviewControls() {
    // Mode buttons
    const htmlBtn = document.getElementById('html-mode-btn');
    const cssBtn = document.getElementById('css-mode-btn');
    const combinedBtn = document.getElementById('combined-mode-btn');
    const refreshBtn = document.getElementById('refresh-preview-btn');

    if (htmlBtn) htmlBtn.addEventListener('click', () => setPreviewMode('html'));
    if (cssBtn) cssBtn.addEventListener('click', () => setPreviewMode('css'));
    if (combinedBtn) combinedBtn.addEventListener('click', () => setPreviewMode('combined'));
    if (refreshBtn) refreshBtn.addEventListener('click', refreshPreview);

    console.log('✅ Preview controls initialized');
}

/**
 * Set preview mode
 */
function setPreviewMode(mode) {
    try {
        domPreviewState.currentMode = mode;

        // Update button states
        document.querySelectorAll('.preview-btn[data-mode]').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`[data-mode="${mode}"]`);
        if (activeBtn && mode !== 'refresh') {
            activeBtn.classList.add('active');
        }

        // Update preview based on mode
        updatePreview();

        console.log(`🔄 Preview mode set to: ${mode}`);

    } catch (error) {
        console.error('❌ Failed to set preview mode:', error);
    }
}

/**
 * Initialize iframe with basic document structure
 */
function initializeIframe() {
    try {
        const iframeDoc = domPreviewState.iframe.contentDocument ||
            domPreviewState.iframe.contentWindow.document;

        const baseHTML = `
<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DOM Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #ffffff;
            color: #333;
            line-height: 1.6;
        }
        .preview-placeholder {
            text-align: center;
            color: #6c757d;
            padding: 40px 20px;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="preview-placeholder">
        <h3>🌐 DOM Preview готов</h3>
        <p>Напишете HTML или CSS код за да видите резултата</p>
    </div>
</body>
</html>`;

        iframeDoc.open();
        iframeDoc.write(baseHTML);
        iframeDoc.close();

        updateStatus('Ready', 'success');

    } catch (error) {
        console.error('❌ Failed to initialize iframe:', error);
        showDOMError('Failed to initialize preview iframe');
    }
}

/**
 * Update preview based on current mode and code
 */
export function updatePreview(code = null, codeType = 'javascript') {
    if (!domPreviewState.isInitialized) return;

    try {
        updateStatus('Updating...', 'loading');

        // If code is provided, try to detect if it's HTML or CSS
        if (code) {
            const detectedType = detectCodeType(code);

            if (detectedType === 'html') {
                domPreviewState.lastHTML = code;
            } else if (detectedType === 'css') {
                domPreviewState.lastCSS = code;
            }
        }

        // Update based on current mode
        switch (domPreviewState.currentMode) {
            case 'html':
                updateHTMLPreview();
                break;
            case 'css':
                updateCSSPreview();
                break;
            case 'combined':
                updateCombinedPreview();
                break;
        }

        // Show/hide placeholder
        togglePlaceholder();

    } catch (error) {
        console.error('❌ Failed to update preview:', error);
        showDOMError(`Preview update failed: ${error.message}`);
    }
}

/**
 * Detect if code is HTML, CSS, or JavaScript
 */
function detectCodeType(code) {
    const trimmedCode = code.trim().toLowerCase();

    // Check for HTML
    if (trimmedCode.includes('<html') ||
        trimmedCode.includes('<!doctype') ||
        trimmedCode.includes('<div') ||
        trimmedCode.includes('<p>') ||
        /^<[a-z][\s\S]*>/.test(trimmedCode)) {
        return 'html';
    }

    // Check for CSS
    if (trimmedCode.includes('{') && trimmedCode.includes('}') &&
        (trimmedCode.includes(':') || trimmedCode.includes('color') ||
            trimmedCode.includes('background') || trimmedCode.includes('margin'))) {
        return 'css';
    }

    return 'javascript';
}

/**
 * Update HTML preview
 */
function updateHTMLPreview() {
    if (!domPreviewState.lastHTML) {
        initializeIframe();
        return;
    }

    try {
        const iframeDoc = domPreviewState.iframe.contentDocument ||
            domPreviewState.iframe.contentWindow.document;

        // Create full HTML document if it's just fragments
        let htmlContent = domPreviewState.lastHTML;

        if (!htmlContent.toLowerCase().includes('<!doctype') &&
            !htmlContent.toLowerCase().includes('<html')) {
            htmlContent = `
<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Preview</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            margin: 20px; 
            line-height: 1.6; 
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
        }

        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        updateStatus('HTML loaded', 'success');

    } catch (error) {
        showDOMError(`HTML Preview Error: ${error.message}`);
    }
}

/**
 * Update CSS preview
 */
function updateCSSPreview() {
    if (!domPreviewState.lastCSS) {
        initializeIframe();
        return;
    }

    try {
        const iframeDoc = domPreviewState.iframe.contentDocument ||
            domPreviewState.iframe.contentWindow.document;

        const htmlWithCSS = `
<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSS Preview</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            margin: 20px; 
            line-height: 1.6; 
        }
        /* User CSS */
        ${domPreviewState.lastCSS}
    </style>
</head>
<body>
    <div class="demo-content">
        <h1>CSS Preview</h1>
        <p>Това е примерен текст за тестване на CSS стиловете.</p>
        <div class="box">Box елемент</div>
        <button>Примерен бутон</button>
        <ul>
            <li>Първи елемент</li>
            <li>Втори елемент</li>
            <li>Трети елемент</li>
        </ul>
    </div>
</body>
</html>`;

        iframeDoc.open();
        iframeDoc.write(htmlWithCSS);
        iframeDoc.close();

        updateStatus('CSS applied', 'success');

    } catch (error) {
        showDOMError(`CSS Preview Error: ${error.message}`);
    }
}

/**
 * Update combined HTML + CSS preview
 */
function updateCombinedPreview() {
    if (!domPreviewState.lastHTML && !domPreviewState.lastCSS) {
        initializeIframe();
        return;
    }

    try {
        const iframeDoc = domPreviewState.iframe.contentDocument ||
            domPreviewState.iframe.contentWindow.document;

        let htmlContent = domPreviewState.lastHTML || '<p>Няма HTML код</p>';
        const cssContent = domPreviewState.lastCSS || '';

        // Wrap HTML if it's just fragments
        if (!htmlContent.toLowerCase().includes('<!doctype') &&
            !htmlContent.toLowerCase().includes('<html')) {
            htmlContent = `
<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Combined Preview</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            margin: 20px; 
            line-height: 1.6; 
        }
        ${cssContent}
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
        } else {
            // Insert CSS into existing HTML
            const styleTag = `<style>${cssContent}</style>`;
            htmlContent = htmlContent.replace('</head>', `${styleTag}</head>`);
        }

        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        updateStatus('Combined preview', 'success');

    } catch (error) {
        showDOMError(`Combined Preview Error: ${error.message}`);
    }
}

/**
 * Refresh preview
 */
function refreshPreview() {
    try {
        updateStatus('Refreshing...', 'loading');
        setTimeout(() => {
            updatePreview();
        }, 300);
    } catch (error) {
        showDOMError(`Refresh failed: ${error.message}`);
    }
}

/**
 * Toggle placeholder visibility
 */
function togglePlaceholder() {
    const hasContent = domPreviewState.lastHTML || domPreviewState.lastCSS;

    if (domPreviewState.placeholder) {
        domPreviewState.placeholder.style.display = hasContent ? 'none' : 'flex';
    }

    if (domPreviewState.iframe) {
        domPreviewState.iframe.style.display = hasContent ? 'block' : 'none';
    }
}

/**
 * Update status display
 */
function updateStatus(message, type = 'info') {
    if (!domPreviewState.statusElement) return;

    domPreviewState.statusElement.textContent = message;
    domPreviewState.statusElement.className = type;
}

/**
 * Show DOM error
 */
function showDOMError(message) {
    console.error('DOM Preview Error:', message);

    if (domPreviewState.errorPanel) {
        const errorContent = domPreviewState.errorPanel.querySelector('#dom-error-content');
        if (errorContent) {
            errorContent.textContent = message;
        }
        domPreviewState.errorPanel.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            domPreviewState.errorPanel.style.display = 'none';
        }, 5000);
    }

    updateStatus('Error', 'error');
}

/**
 * Hide DOM error panel
 */
export function hideDOMError() {
    if (domPreviewState.errorPanel) {
        domPreviewState.errorPanel.style.display = 'none';
    }
}

/**
 * Get current preview state
 */
export function getPreviewState() {
    return { ...domPreviewState };
}

/**
 * Manual update with specific content
 */
export function setPreviewContent(html = '', css = '') {
    domPreviewState.lastHTML = html;
    domPreviewState.lastCSS = css;
    updatePreview();
}

// Export for debugging
if (typeof window !== 'undefined') {
    window.domPreviewDebug = {
        state: domPreviewState,
        updatePreview,
        setPreviewMode,
        setPreviewContent
    };
}