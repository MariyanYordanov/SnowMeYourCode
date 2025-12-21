export class BottomPanelManager {
  constructor() {
    this.bottomPanel = document.getElementById('console-panel');
    this.consoleOutput = document.getElementById('console-output');
    this.resizeHandle = document.getElementById('bottom-panel-resize-handle');
    this.clearButton = document.getElementById('clear-bottom-btn');
    this.previewFrame = document.getElementById('preview-frame');

    // Tab management
    this.currentTab = 'console';
    this.tabs = document.querySelectorAll('.bottom-tab');
    this.contentDivs = document.querySelectorAll('.bottom-content');

    // Icons for different message types
    this.icons = {
      log: '>',
      info: 'i',
      warn: '!',
      error: 'x',
      success: 'OK'
    };

    // Initialize
    this.setupTabs();
    this.setupResizing();
    this.setupClearButton();
    this.setupPreviewConsoleListener();
  }

  /**
   * Listen for console messages from preview iframe
   */
  setupPreviewConsoleListener() {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'preview-console') {
        const { method, args } = event.data;
        const message = args.join(' ');
        this.addMessage(method, message);

        // Auto-switch to console tab when there's output
        if (this.currentTab !== 'console') {
          this.switchTab('console');
        }
      }
    });
  }

  /**
   * Setup tab switching functionality
   */
  setupTabs() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.panel;
        this.switchTab(tabName);
      });
    });
  }

  /**
   * Switch between tabs
   * @param {string} tabName - Name of the tab ('console' or 'preview')
   */
  switchTab(tabName) {
    this.currentTab = tabName;

    // Update tab buttons
    this.tabs.forEach(tab => {
      if (tab.dataset.panel === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update content divs
    this.contentDivs.forEach(content => {
      if (content.id === `${tabName}-content`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // Auto-refresh preview when switching to preview tab
    if (tabName === 'preview') {
      this.triggerPreviewRefresh();
    }
  }

  /**
   * Trigger preview refresh using the PreviewManager
   */
  triggerPreviewRefresh() {
    // Use the PreviewManager from ExamApp if available
    if (window.ExamApp?.previewManager) {
      window.ExamApp.previewManager.refreshPreview();
    }
  }

  /**
   * Execute code and capture output
   * This method should be called by the "Run" button
   */
  executeCode(code) {
    // Clear previous output
    this.clearConsole();

    // Create a sandboxed execution context
    const capturedLogs = [];

    // Create a mock console object
    const mockConsole = {
      log: (...args) => capturedLogs.push({ type: 'log', args }),
      info: (...args) => capturedLogs.push({ type: 'info', args }),
      warn: (...args) => capturedLogs.push({ type: 'warn', args }),
      error: (...args) => capturedLogs.push({ type: 'error', args })
    };

    try {
      // Execute code with sandboxed console
      const func = new Function('console', code);
      func(mockConsole);

      // Display captured output
      if (capturedLogs.length === 0) {
        this.addMessage('success', 'Code executed successfully (no output)');
      } else {
        capturedLogs.forEach(log => {
          this.addMessage(log.type, this.formatArguments(log.args));
        });
      }
    } catch (error) {
      this.addMessage('error', `Error: ${error.message}`);
    }
  }

  /**
   * Format console arguments into readable string
   * @param {Array} args - Arguments passed to console method
   * @returns {string} Formatted message
   */
  formatArguments(args) {
    return args
      .map((arg) => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
  }

  /**
   * Add a message to the console output
   * @param {string} type - Message type (log, info, warn, error, success)
   * @param {string} message - Message content
   */
  addMessage(type, message) {
    if (!this.consoleOutput) return;

    // Create message container
    const messageElement = document.createElement('div');
    messageElement.className = 'console-message';

    // Create icon element
    const iconElement = document.createElement('span');
    iconElement.className = `console-message-icon console-message-icon-${type}`;
    iconElement.textContent = this.icons[type] || this.icons.log;

    // Create content element
    const contentElement = document.createElement('div');
    contentElement.className = `console-message-content console-message-content-${type}`;

    // Format timestamp
    const timestamp = this.getTimestamp();
    const messageText = document.createElement('span');
    messageText.className = 'console-message-text';
    messageText.textContent = message;

    const timestampElement = document.createElement('span');
    timestampElement.className = 'console-message-timestamp';
    timestampElement.textContent = timestamp;

    contentElement.appendChild(messageText);
    contentElement.appendChild(timestampElement);

    messageElement.appendChild(iconElement);
    messageElement.appendChild(contentElement);

    this.consoleOutput.appendChild(messageElement);

    // Auto-scroll to bottom
    this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
  }

  /**
   * Get current timestamp in HH:MM:SS format
   * @returns {string} Formatted timestamp
   */
  getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Clear console output
   */
  clearConsole() {
    if (this.consoleOutput) {
      this.consoleOutput.innerHTML = '';
    }
  }

  /**
   * Clear preview frame
   */
  clearPreview() {
    if (this.previewFrame) {
      this.previewFrame.srcdoc = '';
    }
  }

  /**
   * Update preview with HTML content
   * @param {string} htmlContent - Complete HTML document to display
   */
  updatePreview(htmlContent) {
    if (!this.previewFrame) return;
    this.previewFrame.srcdoc = htmlContent;
  }

  /**
   * Refresh preview by collecting files from Monaco models
   * This method should be called with Monaco editor instance
   * @param {object} monaco - Monaco editor instance
   */
  refreshPreview(monaco) {
    if (!monaco) return;

    const models = monaco.editor.getModels();
    let htmlContent = '';
    let cssContent = '';
    let jsContent = '';

    // Collect content from all models
    models.forEach(model => {
      const uri = model.uri.path;
      const content = model.getValue();

      if (uri.endsWith('.html')) {
        htmlContent = content;
      } else if (uri.endsWith('.css')) {
        cssContent += content + '\n';
      } else if (uri.endsWith('.js')) {
        jsContent += content + '\n';
      }
    });

    // Generate complete HTML document
    const completeHTML = this.generatePreviewHTML(htmlContent, cssContent, jsContent);
    this.updatePreview(completeHTML);
  }

  /**
   * Generate complete HTML document with inline CSS and JS
   * @param {string} html - HTML content
   * @param {string} css - CSS content
   * @param {string} js - JavaScript content
   * @returns {string} Complete HTML document
   */
  generatePreviewHTML(html, css, js) {
    // If HTML contains a full document, inject CSS and JS into it
    if (html.includes('<!DOCTYPE') || html.includes('<html')) {
      // Find head tag and inject CSS
      let result = html;

      if (css) {
        const styleTag = `<style>${css}</style>`;
        if (result.includes('</head>')) {
          result = result.replace('</head>', `${styleTag}\n</head>`);
        } else {
          result = result.replace('<html>', `<html>\n<head>${styleTag}</head>`);
        }
      }

      if (js) {
        const scriptTag = `<script>${js}</script>`;
        if (result.includes('</body>')) {
          result = result.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          result = result.replace('</html>', `<body>${scriptTag}</body>\n</html>`);
        }
      }

      return result;
    }

    // Otherwise, create a complete document
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  ${css ? `<style>${css}</style>` : ''}
</head>
<body>
  ${html}
  ${js ? `<script>${js}</script>` : ''}
</body>
</html>`;
  }

  /**
   * Setup resizing functionality for bottom panel
   */
  setupResizing() {
    if (!this.resizeHandle || !this.bottomPanel) {
      console.warn('Resize handle or bottom panel not found:', {
        resizeHandle: this.resizeHandle,
        bottomPanel: this.bottomPanel
      });
      return;
    }

    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    const onMouseDown = (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = this.bottomPanel.offsetHeight;

      // Prevent text selection during drag
      document.body.style.userSelect = 'none';

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isResizing) return;

      const deltaY = startY - e.clientY;
      const newHeight = startHeight + deltaY;

      // Set minimum and maximum height constraints
      const minHeight = 100; // pixels
      const maxHeight = window.innerHeight * 0.8; // 80% of viewport

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        this.bottomPanel.style.height = `${newHeight}px`;
      }
    };

    const onMouseUp = () => {
      isResizing = false;

      // Restore text selection
      document.body.style.userSelect = '';

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    this.resizeHandle.addEventListener('mousedown', onMouseDown);
    console.log('Bottom panel resizing initialized');
  }

  /**
   * Setup clear button click handler
   */
  setupClearButton() {
    if (!this.clearButton) return;

    this.clearButton.addEventListener('click', () => {
      if (this.currentTab === 'console') {
        this.clearConsole();
      } else if (this.currentTab === 'preview') {
        this.clearPreview();
      }
    });
  }

}
