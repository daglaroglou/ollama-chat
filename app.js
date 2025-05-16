document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const modelSelector = document.getElementById('model-selector');
    const newChatButton = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');
    const modelInfo = document.getElementById('model-info');
    const confirmDialog = document.getElementById('confirm-dialog');
    const dialogBackdrop = document.getElementById('dialog-backdrop');
    const cancelDeleteButton = document.getElementById('cancel-delete');
    const confirmDeleteButton = document.getElementById('confirm-delete');
    const ollamaUrlInput = document.getElementById('ollama-url');
    const testConnectionButton = document.getElementById('test-connection');
    const connectionStatus = document.getElementById('connection-status');
    
    // State
    let currentChatId = null;
    let conversations = loadConversations();
    let availableModels = [];
    let currentModel = '';
    let isConnected = false;
    let pendingDelete = null;
    
    // Initialize app
    initializeApp();
    
    function initializeApp() {
        // Set up event listeners
        messageInput.addEventListener('keydown', handleInputKeydown);
        sendButton.addEventListener('click', sendMessage);
        newChatButton.addEventListener('click', createNewChat);
        modelSelector.addEventListener('change', handleModelChange);
        ollamaUrlInput.addEventListener('input', saveOllamaUrl);
        testConnectionButton.addEventListener('click', testConnection);
        
        // Auto adjust textarea height
        messageInput.addEventListener('input', adjustTextareaHeight);
        
        // Confirmation dialog
        cancelDeleteButton.addEventListener('click', closeConfirmDialog);
        dialogBackdrop.addEventListener('click', closeConfirmDialog);
        confirmDeleteButton.addEventListener('click', deleteConfirmedChat);
        
        // Initialize from stored settings
        const storedUrl = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';
        ollamaUrlInput.value = storedUrl;
        
        // Update history list
        updateHistoryList();
        
        // Load most recent chat or create new one
        if (Object.keys(conversations).length === 0) {
            // Don't create a new chat until user wants to - let welcome screen show first
        } else {
            // Load the most recent chat
            const mostRecentId = Object.keys(conversations).sort((a, b) => {
                return conversations[b].timestamp - conversations[a].timestamp;
            })[0];
            loadChat(mostRecentId);
        }
    }
    
    function testConnection() {
        const url = ollamaUrlInput.value.trim();
        if (!url) return;
        
        // Save URL to localStorage
        localStorage.setItem('ollamaUrl', url);
        
        connectionStatus.textContent = "Testing connection...";
        connectionStatus.className = "connection-status connection-loading";
        messageInput.disabled = true;
        sendButton.disabled = true;
        modelSelector.innerHTML = '<option value="" disabled selected>Loading models...</option>';
        modelSelector.classList.add('loading');
        
        // Test the connection
        fetch(`${url}/api/tags`)
            .then(response => {
                if (!response.ok) throw new Error('Connection failed');
                return response.json();
            })
            .then(data => {
                isConnected = true;
                connectionStatus.textContent = "✓ Connected successfully";
                connectionStatus.className = "connection-status connection-success";
                
                // Populate model selector
                populateModelSelector(data.models || []);
                
                // Enable input if model is selected
                if (modelSelector.value) {
                    messageInput.disabled = false;
                    sendButton.disabled = false;
                }
            })
            .catch(error => {
                console.error("Connection error:", error);
                isConnected = false;
                connectionStatus.textContent = "✗ Connection failed. Please make sure Ollama is running with CORS enabled.";
                connectionStatus.className = "connection-status connection-error";
                modelSelector.innerHTML = '<option value="" disabled selected>No models available</option>';
                modelSelector.classList.remove('loading');
                modelSelector.classList.add('empty');
            });
    }
    
    function populateModelSelector(models) {
        modelSelector.classList.remove('loading');
        
        // If no models are found
        if (!models || models.length === 0) {
            modelSelector.innerHTML = '<option value="" disabled selected>No models available</option>';
            modelSelector.classList.add('empty');
            return;
        }
        
        modelSelector.classList.remove('empty');
        availableModels = models;
        
        // Clear existing options
        modelSelector.innerHTML = '';
        
        // Create option for each model
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            modelSelector.appendChild(option);
        });
        
        // Set previous model if available
        const previousModel = localStorage.getItem('selectedModel');
        if (previousModel && models.some(m => m.name === previousModel)) {
            modelSelector.value = previousModel;
            currentModel = previousModel;
        } else if (models.length > 0) {
            modelSelector.value = models[0].name;
            currentModel = models[0].name;
        }
        
        handleModelChange();
    }
    
    function handleModelChange() {
        const selectedModel = modelSelector.value;
        if (!selectedModel) return;
        
        currentModel = selectedModel;
        localStorage.setItem('selectedModel', selectedModel);
        modelInfo.textContent = `Model: ${selectedModel}`;
        
        // Enable input if connected
        if (isConnected) {
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
        }
    }
    
    function saveOllamaUrl() {
        localStorage.setItem('ollamaUrl', ollamaUrlInput.value.trim());
    }
    
    function adjustTextareaHeight() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + 'px';
    }
    
    function handleInputKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }
    
    function createNewChat() {
        const chatId = 'chat_' + Date.now();
        conversations[chatId] = {
            title: 'New Conversation',
            messages: [],
            model: currentModel,
            timestamp: Date.now()
        };
        
        saveConversations();
        updateHistoryList();
        loadChat(chatId);
    }
    
    function loadChat(chatId) {
        if (!conversations[chatId]) return;
        
        currentChatId = chatId;
        
        // Highlight active chat in history
        const historyItems = document.querySelectorAll('#history-list li');
        historyItems.forEach(item => {
            if (item.dataset.id === chatId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Clear chat container and add messages
        chatContainer.innerHTML = '';
        
        // Display messages
        const chatMessages = conversations[chatId].messages;
        chatMessages.forEach(message => {
            appendMessageToChat(message.role, message.content);
        });
        
        scrollToBottom();
        messageInput.focus();
    }
    
    function updateHistoryList() {
        historyList.innerHTML = '';
        
        // Sort conversations by timestamp (newest first)
        const sortedIds = Object.keys(conversations).sort((a, b) => {
            return conversations[b].timestamp - conversations[a].timestamp;
        });
        
        if (sortedIds.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-history';
            emptyState.textContent = 'No conversations yet';
            historyList.appendChild(emptyState);
            return;
        }
        
        sortedIds.forEach(chatId => {
            const chat = conversations[chatId];
            const listItem = document.createElement('li');
            listItem.dataset.id = chatId;
            if (chatId === currentChatId) {
                listItem.classList.add('active');
            }
            
            // Create title span
            const titleSpan = document.createElement('span');
            titleSpan.className = 'history-item-title';
            titleSpan.textContent = chat.title || 'New Conversation';
            listItem.appendChild(titleSpan);
            
            // Create delete button
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-chat-btn';
            deleteButton.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                showConfirmDialog(chatId);
            });
            listItem.appendChild(deleteButton);
            
            // Add click event to load chat
            listItem.addEventListener('click', () => {
                loadChat(chatId);
            });
            
            historyList.appendChild(listItem);
        });
    }
    
    function showConfirmDialog(chatId) {
        pendingDelete = chatId;
        confirmDialog.style.display = 'block';
        dialogBackdrop.style.display = 'block';
    }
    
    function closeConfirmDialog() {
        confirmDialog.style.display = 'none';
        dialogBackdrop.style.display = 'none';
        pendingDelete = null;
    }
    
    function deleteConfirmedChat() {
        if (pendingDelete) {
            delete conversations[pendingDelete];
            saveConversations();
            updateHistoryList();
            
            // If we deleted the current chat, load another one or create new
            if (pendingDelete === currentChatId) {
                const remainingIds = Object.keys(conversations);
                if (remainingIds.length > 0) {
                    loadChat(remainingIds[0]);
                } else {
                    // Show welcome screen instead of creating new chat
                    currentChatId = null;
                    chatContainer.innerHTML = `
                        <div class="welcome-message">
                            <h2>Welcome to Ollama Chat</h2>
                            <p>Connect to your local Ollama instance to start chatting with AI models.</p>
                            <div class="instructions">
                                <p><strong>Important:</strong> This web interface connects directly to your local Ollama instance.</p>
                                <ol>
                                    <li>Make sure <a href="https://ollama.ai" target="_blank">Ollama</a> is installed and running on your computer</li>
                                    <li>Enable CORS in Ollama with this command:
                                        <pre><code>set OLLAMA_ORIGINS=* && ollama serve</code></pre>
                                        <small>(Use <code>OLLAMA_ORIGINS=* ollama serve</code> on Mac/Linux)</small>
                                    </li>
                                    <li>Click "Test Connection" above to verify connection to your local Ollama</li>
                                    <li>Select a model and start chatting!</li>
                                </ol>
                            </div>
                        </div>
                    `;
                }
            }
            
            closeConfirmDialog();
        }
    }
    
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message || !currentModel || !isConnected) return;
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // If no active chat, create one
        if (!currentChatId) {
            createNewChat();
        }
        
        // Add user message to chat
        appendMessageToChat('user', message);
        
        // Save message to conversation
        conversations[currentChatId].messages.push({
            role: 'user',
            content: message
        });
        
        // Update title if this is the first message
        if (conversations[currentChatId].messages.length === 1) {
            // Use first ~25 chars of message as title
            const title = message.length > 25 ? message.substring(0, 25) + '...' : message;
            conversations[currentChatId].title = title;
            updateHistoryList();
        }
        
        saveConversations();
        scrollToBottom();
        
        // Add loading indicator
        const loadingId = addLoadingIndicator();
        
        // Call Ollama API for response
        generateResponse(message, loadingId);
    }
    
    function generateResponse(prompt, loadingId) {
        const url = ollamaUrlInput.value.trim();
        const model = currentModel;
        
        fetch(`${url}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false
            })
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to get response');
            return response.json();
        })
        .then(data => {
            // Remove loading indicator
            removeLoadingIndicator(loadingId);
            
            // Add AI response to chat
            appendMessageToChat('ai', data.response);
            
            // Save response
            conversations[currentChatId].messages.push({
                role: 'ai',
                content: data.response
            });
            
            saveConversations();
            scrollToBottom();
        })
        .catch(error => {
            console.error("API error:", error);
            removeLoadingIndicator(loadingId);
            appendMessageToChat('system', 'Error: Failed to get a response. Please check your connection to Ollama.');
            scrollToBottom();
        });
    }
    
    function addLoadingIndicator() {
        const loadingId = 'loading-' + Date.now();
        const loadingHtml = `
            <div id="${loadingId}" class="loading-indicator">
                <div class="message-wrapper">
                    <div class="message-avatar">AI</div>
                    <div class="loading-bubble">
                        <div class="loading-dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        chatContainer.insertAdjacentHTML('beforeend', loadingHtml);
        scrollToBottom();
        return loadingId;
    }
    
    function removeLoadingIndicator(id) {
        const element = document.getElementById(id);
        if (element) element.remove();
    }
    
    function appendMessageToChat(role, content) {
        // Check if we need to clear the welcome message
        if (chatContainer.querySelector('.welcome-message')) {
            chatContainer.innerHTML = '';
        }
        
        let messageHtml;
        
        if (role === 'user') {
            messageHtml = `
                <div class="message user">
                    <div class="message-wrapper">
                        <div class="message-content">${escapeHtml(content)}</div>
                        <div class="message-avatar">You</div>
                    </div>
                </div>
            `;
        } else if (role === 'ai') {
            // Process content for markdown, code blocks, etc.
            const formattedContent = formatAIResponse(content);
            
            messageHtml = `
                <div class="message ai">
                    <div class="message-wrapper">
                        <div class="message-avatar">AI</div>
                        <div class="message-content">${formattedContent}</div>
                    </div>
                </div>
            `;
        } else if (role === 'system') {
            messageHtml = `
                <div class="message system">
                    <div class="message-content">${escapeHtml(content)}</div>
                </div>
            `;
        }
        
        chatContainer.insertAdjacentHTML('beforeend', messageHtml);
        scrollToBottom();
    }
    
    function formatAIResponse(content) {
        // This is a basic formatter - you can add more markdown formatting later
        // For now, we'll just handle code blocks and line breaks
        
        // Escape HTML first
        let formatted = escapeHtml(content);
        
        // Handle code blocks (```code```)
        formatted = formatted.replace(/```(.*?)\n([\s\S]*?)```/g, (match, language, code) => {
            return `<pre><code class="language-${language || 'text'}">${code}</code></pre>`;
        });
        
        // Handle inline code (`code`)
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Convert line breaks to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    function loadConversations() {
        try {
            const stored = localStorage.getItem('ollamaConversations');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('Failed to load conversations', e);
            return {};
        }
    }
    
    function saveConversations() {
        try {
            localStorage.setItem('ollamaConversations', JSON.stringify(conversations));
        } catch (e) {
            console.error('Failed to save conversations', e);
        }
    }
});