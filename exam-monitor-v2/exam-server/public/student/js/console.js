export class ConsoleManager {
  constructor() {
    this.consolePanel = document.getElementById('console-panel');
    this.consoleOutput = document.getElementById('console-output');
    this.resizeHandle = document.getElementById('console-resize-handle');
    this.clearButton = document.getElementById('clear-console-btn');

    // Icons for different message types
    this.icons = {
      log: '📝',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    };

    // Initialize
    this.setupResizing();
    this.setupClearButton();
  }

  /**
   * Execute code and capture output
   * This method should be called by the "Run" button
   */
  executeCode(code) {
    // Clear previous output
    this.clear();

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

      const deltaY = startY - e.clientY;
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

}
