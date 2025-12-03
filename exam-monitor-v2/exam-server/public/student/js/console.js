export class ConsoleManager {
  constructor() {
    this.consolePanel = document.getElementById('console-panel');
    this.consoleOutput = document.getElementById('console-output');
    this.resizeHandle = document.getElementById('console-resize-handle');
    this.clearButton = document.getElementById('clear-console-btn');

    // Store original console methods
    this.originalLog = console.log;
    this.originalInfo = console.info;
    this.originalWarn = console.warn;
    this.originalError = console.error;

    // Icons for different message types
    this.icons = {
      log: '📝',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    };

    // Initialize
    this.interceptConsole();
    this.setupResizing();
    this.setupClearButton();
  }

  /**
   * Override console methods to capture output
   */
  interceptConsole() {
    console.log = (...args) => {
      this.addMessage('log', this.formatArguments(args));
      this.originalLog.apply(console, args);
    };

    console.info = (...args) => {
      this.addMessage('info', this.formatArguments(args));
      this.originalInfo.apply(console, args);
    };

    console.warn = (...args) => {
      this.addMessage('warn', this.formatArguments(args));
      this.originalWarn.apply(console, args);
    };

    console.error = (...args) => {
      this.addMessage('error', this.formatArguments(args));
      this.originalError.apply(console, args);
    };
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
   * Clear all messages from console output
   */
  clear() {
    if (this.consoleOutput) {
      this.consoleOutput.innerHTML = '';
    }
  }

  /**
   * Setup resizing functionality for console panel
   */
  setupResizing() {
    if (!this.resizeHandle || !this.consolePanel) return;

    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    const onMouseDown = (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = this.consolePanel.offsetHeight;

      // Prevent text selection during drag
      document.body.style.userSelect = 'none';

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isResizing) return;

      const deltaY = e.clientY - startY;
      const newHeight = startHeight + deltaY;

      // Set minimum and maximum height constraints
      const minHeight = 100; // pixels
      const maxHeight = window.innerHeight * 0.8; // 80% of viewport

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        this.consolePanel.style.height = `${newHeight}px`;
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
  }

  /**
   * Setup clear button click handler
   */
  setupClearButton() {
    if (!this.clearButton) return;

    this.clearButton.addEventListener('click', () => {
      this.clear();
    });
  }

  /**
   * Restore original console methods
   */
  restoreConsole() {
    console.log = this.originalLog;
    console.info = this.originalInfo;
    console.warn = this.originalWarn;
    console.error = this.originalError;
  }
}
