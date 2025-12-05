/**
 * Help Chat System
 * Allows students to communicate with teachers during exam
 */

export class HelpChat {
    constructor(socket) {
        this.socket = socket;
        this.isOpen = false;
        this.messages = [];
        this.unreadCount = 0;
        this.isTyping = false;
        this.typingTimeout = null;
        
        this.init();
    }

    /**
     * Initialize help chat
     */
    init() {
        this.createChatUI();
        this.bindEvents();
        this.setupSocketEvents();
        console.log('Help Chat initialized');
    }

    /**
     * Create chat UI
     */
    createChatUI() {
        // Use existing help button instead of creating new one
        const existingHelpButton = document.getElementById('help-btn');
        if (existingHelpButton) {
            // Add unread badge to existing button
            const unreadBadge = document.createElement('span');
            unreadBadge.id = 'unread-badge';
            unreadBadge.className = 'unread-badge';
            unreadBadge.style.display = 'none';
            unreadBadge.textContent = '0';
            existingHelpButton.appendChild(unreadBadge);
        }

        // Create chat window
        const chatWindow = document.createElement('div');
        chatWindow.id = 'help-chat-window';
        chatWindow.className = 'help-chat-window';
        chatWindow.innerHTML = `
            <div class="chat-header">
                <div class="chat-title">
                    <span class="chat-icon">Chat</span>
                    <span>Помощ от учителя</span>
                </div>
                <div class="chat-controls">
                    <button id="chat-minimize" class="chat-control-btn">–</button>
                    <button id="chat-close" class="chat-control-btn">✖</button>
                </div>
            </div>
            
            <div class="chat-messages" id="chat-messages">
                <div class="welcome-message">
                    <div class="system-message">
                        <span class="system-icon">ℹ️</span>
                        <div class="system-text">
                            <p>Добре дошли в системата за помощ!</p>
                            <p>Можете да задавате въпроси на учителя по време на изпита.</p>
                            <p><strong>Правила:</strong></p>
                            <ul>
                                <li>Задавайте само въпроси свързани с изпита</li>
                                <li>Бъдете кратки и ясни</li>
                                <li>Учителят ще отговори възможно най-скоро</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="chat-typing-indicator" id="chat-typing" style="display: none;">
                <span class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
                <span class="typing-text">Учителят пише...</span>
            </div>
            
            <div class="chat-input-container">
                <div class="chat-input-wrapper">
                    <textarea 
                        id="chat-input" 
                        placeholder="Напишете въпроса си тук..."
                        rows="1"
                        maxlength="500"
                    ></textarea>
                    <div class="chat-input-actions">
                        <span class="char-counter" id="char-counter">0/500</span>
                        <button id="chat-send" class="chat-send-btn" disabled>Изпрати</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(chatWindow);
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        const chatButton = document.getElementById('help-btn'); // Use existing help button
        const chatWindow = document.getElementById('help-chat-window');
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');
        const chatMinimize = document.getElementById('chat-minimize');
        const chatClose = document.getElementById('chat-close');
        const charCounter = document.getElementById('char-counter');

        // Chat button click
        chatButton.addEventListener('click', () => {
            this.toggleChat();
        });

        // Chat controls
        chatMinimize.addEventListener('click', () => {
            this.minimizeChat();
        });

        chatClose.addEventListener('click', () => {
            this.closeChat();
        });

        // Input handling
        chatInput.addEventListener('input', (e) => {
            this.handleInputChange(e);
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        chatSend.addEventListener('click', () => {
            this.sendMessage();
        });

        // Auto-resize textarea
        chatInput.addEventListener('input', () => {
            this.autoResizeTextarea(chatInput);
        });

        // Outside click to close
        document.addEventListener('click', (e) => {
            if (this.isOpen && 
                !chatWindow.contains(e.target) && 
                !chatButton.contains(e.target)) {
                // Don't close when clicking outside, just minimize
                // this.minimizeChat();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + H to toggle chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                this.toggleChat();
            }
        });
    }

    /**
     * Setup socket event listeners
     */
    setupSocketEvents() {
        if (!this.socket) return;

        // Receive message from teacher
        this.socket.on('help-response', (data) => {
            this.receiveMessage(data);
        });

        // Receive teacher message (inline chat)
        this.socket.on('teacher-message', (data) => {
            this.receiveMessage(data);
        });

        // Teacher typing indicator
        this.socket.on('teacher-typing', (data) => {
            this.showTypingIndicator(data.isTyping);
        });

        // Message delivery confirmation
        this.socket.on('help-message-received', (data) => {
            this.markMessageAsDelivered(data.messageId);
        });

        // Chat status updates
        this.socket.on('chat-status', (data) => {
            this.updateChatStatus(data);
        });
    }

    /**
     * Handle input changes
     */
    handleInputChange(e) {
        const input = e.target;
        const length = input.value.length;
        const maxLength = 500;
        
        // Update character counter
        const charCounter = document.getElementById('char-counter');
        charCounter.textContent = `${length}/${maxLength}`;
        charCounter.className = length > maxLength * 0.9 ? 'char-counter warning' : 'char-counter';

        // Enable/disable send button
        const sendBtn = document.getElementById('chat-send');
        sendBtn.disabled = length === 0 || length > maxLength;

        // Send typing indicator
        this.sendTypingIndicator();
    }

    /**
     * Auto-resize textarea
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    /**
     * Send typing indicator
     */
    sendTypingIndicator() {
        if (!this.socket) return;

        this.isTyping = true;
        this.socket.emit('student-typing', {
            studentId: window.ExamApp?.sessionId,
            isTyping: true
        });

        // Clear previous timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Stop typing indicator after second
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            this.socket.emit('student-typing', {
                studentId: window.ExamApp?.sessionId,
                isTyping: false
            });
        }, 1000);
    }

    /**
     * Send message
     */
    sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message || !this.socket) {
            console.log('[CHAT ERROR] Cannot send message:', {
                hasMessage: !!message,
                hasSocket: !!this.socket,
                socketConnected: this.socket?.connected
            });
            return;
        }

        const messageData = {
            id: this.generateMessageId(),
            studentId: window.ExamApp?.sessionId,
            studentName: window.ExamApp?.studentName,
            message: message,
            timestamp: Date.now(),
            type: 'question'
        };

        console.log('[CHAT] Student sending help request:', messageData);

        // Add to local messages
        this.addMessage({
            ...messageData,
            sender: 'student',
            status: 'sending'
        });

        // Send to server
        this.socket.emit('help-request', messageData);
        console.log('[CHAT] Help request emitted to server');

        // Clear input
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('char-counter').textContent = '0/500';
        document.getElementById('chat-send').disabled = true;

        // Stop typing indicator
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        this.socket.emit('student-typing', {
            studentId: window.ExamApp?.sessionId,
            isTyping: false
        });

        // Scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Receive message from teacher
     */
    receiveMessage(data) {
        this.addMessage({
            id: data.id || this.generateMessageId(),
            sender: 'teacher',
            message: data.message,
            timestamp: data.timestamp || Date.now(),
            teacherName: data.teacherName || 'Учител',
            type: data.type || 'response'
        });

        // Show notification if chat is closed
        if (!this.isOpen) {
            this.showNotification(data.message);
            this.incrementUnreadCount();
        }

        // Play notification sound
        this.playNotificationSound();
    }

    /**
     * Add message to chat
     */
    addMessage(messageData) {
        this.messages.push(messageData);
        this.renderMessage(messageData);
        this.scrollToBottom();
    }

    /**
     * Render message in chat
     */
    renderMessage(messageData) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${messageData.sender}-message`;
        messageElement.dataset.messageId = messageData.id;

        if (messageData.sender === 'student') {
            messageElement.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble student-bubble">
                        <div class="message-text">${this.escapeHtml(messageData.message)}</div>
                        <div class="message-meta">
                            <span class="message-time">${this.formatTime(messageData.timestamp)}</span>
                            <span class="message-status ${messageData.status || 'sent'}">${this.getStatusIcon(messageData.status)}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-content">
                    <div class="message-info">
                        <span class="sender-name">${this.escapeHtml(messageData.teacherName || 'Учител')}</span>
                        <span class="message-time">${this.formatTime(messageData.timestamp)}</span>
                    </div>
                    <div class="message-bubble teacher-bubble">
                        <div class="message-text">${this.escapeHtml(messageData.message)}</div>
                    </div>
                </div>
            `;
        }

        messagesContainer.appendChild(messageElement);
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator(isTyping) {
        const typingIndicator = document.getElementById('chat-typing');
        if (typingIndicator) {
            typingIndicator.style.display = isTyping ? 'flex' : 'none';
            if (isTyping) {
                this.scrollToBottom();
            }
        }
    }

    /**
     * Toggle chat window
     */
    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    /**
     * Open chat window
     */
    openChat() {
        const chatWindow = document.getElementById('help-chat-window');
        const chatButton = document.getElementById('help-btn');
        
        if (chatWindow && chatButton) {
            chatWindow.style.display = 'flex';
            chatButton.classList.add('chat-open');
            this.isOpen = true;
            
            // Clear unread count
            this.clearUnreadCount();
            
            // Focus input
            setTimeout(() => {
                const input = document.getElementById('chat-input');
                if (input) input.focus();
            }, 100);
            
            this.scrollToBottom();
        }
    }

    /**
     * Close chat window
     */
    closeChat() {
        const chatWindow = document.getElementById('help-chat-window');
        const chatButton = document.getElementById('help-btn');
        
        if (chatWindow && chatButton) {
            chatWindow.style.display = 'none';
            chatButton.classList.remove('chat-open');
            this.isOpen = false;
        }
    }

    /**
     * Minimize chat window
     */
    minimizeChat() {
        this.closeChat();
    }

    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 50);
        }
    }

    /**
     * Increment unread count
     */
    incrementUnreadCount() {
        this.unreadCount++;
        this.updateUnreadBadge();
    }

    /**
     * Clear unread count
     */
    clearUnreadCount() {
        this.unreadCount = 0;
        this.updateUnreadBadge();
    }

    /**
     * Update unread badge
     */
    updateUnreadBadge() {
        const badge = document.getElementById('unread-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    /**
     * Show desktop notification
     */
    showNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Нов отговор от учителя', {
                body: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                icon: '/student/images/chat-icon.png'
            });
        }
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        try {
            // Create a subtle notification sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Fallback - no sound
        }
    }

    /**
     * Mark message as delivered
     */
    markMessageAsDelivered(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            const statusElement = messageElement.querySelector('.message-status');
            if (statusElement) {
                statusElement.className = 'message-status delivered';
                statusElement.textContent = '✓';
            }
        }
        
        // Update in messages array
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            message.status = 'delivered';
        }
    }

    /**
     * Update chat status
     */
    updateChatStatus(data) {
        // Handle various chat status updates
        if (data.teacherOnline !== undefined) {
            this.updateTeacherStatus(data.teacherOnline);
        }
    }

    /**
     * Update teacher online status
     */
    updateTeacherStatus(isOnline) {
        // Add status indicator to chat header
        const chatTitle = document.querySelector('.chat-title');
        if (chatTitle) {
            const existingStatus = chatTitle.querySelector('.teacher-status');
            if (existingStatus) {
                existingStatus.remove();
            }
            
            const statusElement = document.createElement('span');
            statusElement.className = `teacher-status ${isOnline ? 'online' : 'offline'}`;
            statusElement.textContent = isOnline ? 'Online' : 'Offline';
            statusElement.title = isOnline ? 'Учителят е онлайн' : 'Учителят е офлайн';
            chatTitle.appendChild(statusElement);
        }
    }

    /**
     * Utility functions
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('bg-BG', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getStatusIcon(status) {
        switch (status) {
            case 'sending': return '...';
            case 'sent': return '✓';
            case 'delivered': return '✓';
            case 'read': return 'Read';
            default: return '';
        }
    }

    /**
     * Public API methods
     */
    
    /**
     * Request notification permission
     */
    requestNotificationPermission() {
        try {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(err => {
                    console.log('Notification permission request failed (expected in fullscreen):', err);
                });
            }
        } catch (error) {
            console.log('Notification permission not available:', error);
        }
    }

    /**
     * Get chat statistics
     */
    getStats() {
        return {
            totalMessages: this.messages.length,
            studentMessages: this.messages.filter(m => m.sender === 'student').length,
            teacherMessages: this.messages.filter(m => m.sender === 'teacher').length,
            unreadCount: this.unreadCount,
            isOpen: this.isOpen
        };
    }

    /**
     * Clear chat history
     */
    clearHistory() {
        this.messages = [];
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            // Keep welcome message
            const welcomeMessage = messagesContainer.querySelector('.welcome-message');
            messagesContainer.innerHTML = '';
            if (welcomeMessage) {
                messagesContainer.appendChild(welcomeMessage);
            }
        }
    }

    /**
     * Export chat history
     */
    exportHistory() {
        return {
            timestamp: Date.now(),
            studentId: window.ExamApp?.sessionId,
            studentName: window.ExamApp?.studentName,
            messages: this.messages.map(msg => ({
                ...msg,
                formattedTime: this.formatTime(msg.timestamp)
            }))
        };
    }

    /**
     * Destroy chat system
     */
    destroy() {
        // Remove UI elements
        const chatButton = document.getElementById('help-btn');
        const chatWindow = document.getElementById('help-chat-window');
        
        if (chatButton) chatButton.remove();
        if (chatWindow) chatWindow.remove();
        
        // Clear timeouts
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        console.log('Help Chat destroyed');
    }
}

export default HelpChat;