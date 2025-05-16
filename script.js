document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const modelSelector = document.getElementById('model-selector');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatContainer = document.getElementById('chat-container');
    const currentModelSpan = document.getElementById('current-model');
    const historyList = document.getElementById('history-list');
    const newChatButton = document.getElementById('new-chat');
    
    // State
    let currentModel = '';
    let currentChatId = generateChatId();
    let chatHistory = loadChatHistory();
    
    // Debug localStorage availability
    console.log('localStorage available:', checkLocalStorage());
    
    // Check if localStorage has chatHistory
    const storedHistory = localStorage.getItem('chatHistory');
    console.log('Stored chat history exists:', !!storedHistory);
    if (storedHistory) {
        try {
            const parsed = JSON.parse(storedHistory);
            console.log('Chat history entries:', Object.keys(parsed).length);
        } catch (e) {
            console.error('Error parsing stored chat history:', e);
        }
    }
    
    // Check if history is empty and update UI accordingly
    if (Object.keys(chatHistory).length === 0) {
        console.log('Chat history is empty, showing empty state');
        updateChatHistoryUI();
        startNewChat();
    }
    
    // Enhanced auto-resize and input handling for textarea
    messageInput.addEventListener('input', () => {
        // Auto resize
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
        
        // Enable/disable send button based on input
        const sendButton = document.querySelector('.send-button');
        if (sendButton) {
            if (messageInput.value.trim() === '') {
                sendButton.setAttribute('disabled', 'true');
                sendButton.style.opacity = '0.5';
            } else {
                sendButton.removeAttribute('disabled');
                sendButton.style.opacity = '1';
            }
        }
    });

    // Initialize send button state
    window.addEventListener('DOMContentLoaded', () => {
        const sendButton = document.querySelector('.send-button');
        if (sendButton && (!messageInput.value || messageInput.value.trim() === '')) {
            sendButton.setAttribute('disabled', 'true');
            sendButton.style.opacity = '0.5';
        }
    });
    
    // Handle keyboard shortcuts for message input
    messageInput.addEventListener('keydown', (e) => {
        // Get current cursor position
        const cursorPosition = messageInput.selectionStart;
        const messageText = messageInput.value;
        
        // Handle Space key to send message (but only if not empty)
        if (e.key === 'Enter' && !e.shiftKey && messageText.trim() !== '') {
            e.preventDefault(); // Prevent default behavior (new line)
            chatForm.dispatchEvent(new Event('submit')); // Submit the form
        }
        
        // Handle Shift+Space for new line
        if (e.key === ' ' && e.shiftKey) {
            e.preventDefault(); // Prevent space character
            
            // Insert a new line at cursor position
            const beforeCursor = messageText.substring(0, cursorPosition);
            const afterCursor = messageText.substring(cursorPosition);
            messageInput.value = beforeCursor + '\n' + afterCursor;
            
            // Move cursor position after the new line
            setTimeout(() => {
                messageInput.selectionStart = messageInput.selectionEnd = cursorPosition + 1;
            }, 0);
            
            // Trigger the input event to adjust textarea height
            messageInput.dispatchEvent(new Event('input'));
        }
    });
    
    // Add visual indicator in the UI to show these shortcuts
    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
        const shortcutsInfo = document.createElement('div');
        shortcutsInfo.className = 'shortcuts-info';
        shortcutsInfo.innerHTML = '<span title="Press Space to send">Space = Send</span> · <span title="Press Shift+Space for new line">Shift+Space = New line</span>';
        statusIndicator.appendChild(shortcutsInfo);
    }
    
    // Load available models
    fetchModels();
    
    // Update UI with chat history
    updateChatHistoryUI();
    
    // Event Listeners
    modelSelector.addEventListener('change', handleModelChange);
    chatForm.addEventListener('submit', handleChatSubmit);
    newChatButton.addEventListener('click', startNewChat);
    
    // Enhanced model selector functionality
    function enhanceModelSelector() {
        const modelSelector = document.getElementById('model-selector');
        
        // Add loading state
        modelSelector.classList.add('loading');
        
        // Focus effect for dropdown icon
        modelSelector.addEventListener('focus', () => {
            document.querySelector('.select-icon').classList.add('focused');
        });
        
        modelSelector.addEventListener('blur', () => {
            document.querySelector('.select-icon').classList.remove('focused');
        });
        
        // On mobile, improve the native select experience
        if (window.innerWidth < 768) {
            modelSelector.addEventListener('touchstart', () => {
                modelSelector.blur();
                setTimeout(() => modelSelector.focus(), 10);
            });
        }
    }
    
    // Call this function after DOM is loaded
    enhanceModelSelector();
    
    // Load models from Ollama
    async function fetchModels() {
        const modelSelector = document.getElementById('model-selector');
        
        // Show loading state
        modelSelector.classList.add('loading');
        
        try {
            const response = await fetch('/api/models');
            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }
            
            const data = await response.json();
            
            // Remove loading state
            modelSelector.classList.remove('loading');
            
            // Check if we have models
            if (data.models && data.models.length > 0) {
                populateModelSelector(data.models);
            } else {
                modelSelector.classList.add('empty');
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "No models available";
                option.disabled = true;
                option.selected = true;
                modelSelector.innerHTML = '';
                modelSelector.appendChild(option);
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            
            // Remove loading state and add empty state
            modelSelector.classList.remove('loading');
            modelSelector.classList.add('empty');
            
            // Show error option
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Error loading models";
            option.disabled = true;
            option.selected = true;
            modelSelector.innerHTML = '';
            modelSelector.appendChild(option);
            
            showErrorMessage('Failed to fetch available models. Please make sure Ollama is running.');
        }
    }
    
    // Populate model dropdown
    function populateModelSelector(models) {
        // Clear existing options except the placeholder
        while (modelSelector.options.length > 1) {
            modelSelector.remove(1);
        }
        
        // Add models to selector
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            modelSelector.appendChild(option);
        });
        
        // Check if we have a stored preference
        const lastUsedModel = localStorage.getItem('lastUsedModel');
        if (lastUsedModel && modelSelector.querySelector(`option[value="${lastUsedModel}"]`)) {
            modelSelector.value = lastUsedModel;
            currentModel = lastUsedModel;
            currentModelSpan.textContent = lastUsedModel;
        }
    }
    
    // Handle model selection change
    function handleModelChange() {
        currentModel = modelSelector.value;
        currentModelSpan.textContent = currentModel || 'no model selected';
        localStorage.setItem('lastUsedModel', currentModel);
    }
    
    // Submit message and get response (non-streaming version with typing animation)
    async function handleChatSubmit(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message || !currentModel) return;
        
        // Add user message to chat
        appendMessage(message, 'user');
        
        // Clear and reset input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        messageInput.focus();
        
        // Save to chat history
        saveMessageToHistory(message, 'user');
        
        try {
            // Create an AI message container with empty content
            const aiMessageElement = appendEmptyAIMessage();
            
            console.log(`Sending message to model ${currentModel}: "${message.substring(0, 50)}..."`);
            
            // Use the regular non-streaming endpoint
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: currentModel,
                    message: message
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Request failed: ${response.status} - ${errorText}`);
                throw new Error('Failed to get response');
            }
            
            // Get the complete response
            const data = await response.json();
            const aiResponse = data.response;
            
            console.log(`Got response, length: ${aiResponse.length}`);
            
            // Simulate typing effect
            await simulateTypingEffect(aiMessageElement, aiResponse);
            
            // Save complete response to chat history
            saveMessageToHistory(aiResponse, 'ai');
            
            // Update chat history UI
            updateChatHistoryUI();
            
        } catch (error) {
            console.error('Error sending message:', error);
            showErrorMessage('Failed to get response from Ollama.');
        }
    }
    
    // Simulate typing effect
    async function simulateTypingEffect(messageElement, fullText) {
        // Calculate typing speed based on text length
        // Longer responses should appear faster to avoid too much waiting
        const baseDelay = 15; // Base milliseconds per character
        const minDelay = 5;   // Minimum delay for very long responses
        
        // Adjust typing speed based on content length
        // Longer text gets faster typing to keep the overall time reasonable
        const charDelay = Math.max(minDelay, baseDelay - (fullText.length / 1000));
        
        // Get display length based on visible characters (ignoring markdown)
        const displayLength = fullText.replace(/```[\s\S]*?```/g, '[code block]').length;
        
        // Estimate total typing time to log
        const estimatedTime = (displayLength * charDelay) / 1000;
        console.log(`Simulating typing: ~${estimatedTime.toFixed(1)}s at ${charDelay.toFixed(1)}ms/char`);
        
        let displayText = '';
        let currentIndex = 0;
        let isInCodeBlock = false;
        
        // Remove typing class when we start
        messageElement.classList.remove('typing');
        
        while (currentIndex < fullText.length) {
            // Check for code block markers
            if (fullText.substring(currentIndex, currentIndex + 3) === '```') {
                isInCodeBlock = !isInCodeBlock;
                // When entering or exiting a code block, add the whole marker at once
                displayText += '```';
                currentIndex += 3;
                
                if (isInCodeBlock) {
                    // If entering a code block, capture the language specifier (until newline)
                    let languageEnd = fullText.indexOf('\n', currentIndex);
                    if (languageEnd !== -1) {
                        let language = fullText.substring(currentIndex, languageEnd);
                        displayText += language;
                        currentIndex = languageEnd;
                    }
                }
            }
            
            // When inside a code block, add characters faster or in chunks
            if (isInCodeBlock) {
                // Determine the end of the current line or the code block
                const nextNewline = fullText.indexOf('\n', currentIndex);
                const blockEnd = fullText.indexOf('```', currentIndex);
                
                // If there's a newline before the end of the block, add the line
                if (nextNewline !== -1 && (blockEnd === -1 || nextNewline < blockEnd)) {
                    const line = fullText.substring(currentIndex, nextNewline + 1);
                    displayText += line;
                    currentIndex = nextNewline + 1;
                } 
                // If we're at the last line of the block, add remaining code
                else if (blockEnd !== -1) {
                    const remainder = fullText.substring(currentIndex, blockEnd);
                    displayText += remainder;
                    currentIndex = blockEnd;
                } 
                // Otherwise, just add the next character
                else {
                    displayText += fullText[currentIndex];
                    currentIndex++;
                }
            } 
            // Regular text, add character by character
            else {
                displayText += fullText[currentIndex];
                currentIndex++;
            }
            
            // Format and display the current text
            messageElement.innerHTML = formatAIResponse(displayText);
            
            // Add back the cursor
            const cursor = document.createElement('span');
            cursor.className = 'typing-cursor';
            messageElement.appendChild(cursor);
            
            // Scroll as new text appears
            scrollToBottom();
            
            // Adjust delay based on whether we're in a code block
            const delay = isInCodeBlock ? charDelay / 3 : charDelay;
            
            // Wait before adding the next character
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Finalize the message - remove cursor
        finalizeStreamingMessage(messageElement, fullText);
        
        console.log('Typing animation completed');
    }
    
    // Create an empty AI message to be filled with streaming content
    function appendEmptyAIMessage() {
        // Remove welcome message if present
        const welcomeMessage = chatContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai';
        
        // Create wrapper for bubble and avatar
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'message-wrapper';
        
        // Create avatar element
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'AI';
        
        // Create message content bubble
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content typing';
        
        // Add a blinking cursor
        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        messageContent.appendChild(cursor);
        
        // Add elements to DOM
        messageWrapper.appendChild(avatar);
        messageWrapper.appendChild(messageContent);
        messageDiv.appendChild(messageWrapper);
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
        
        return messageContent;
    }
    
    // Update the streaming message with new content
    function updateStreamingMessage(messageElement, text) {
        // Remove the typing class when we have content
        messageElement.classList.remove('typing');
        
        // Format the response (code blocks, etc.)
        messageElement.innerHTML = formatAIResponse(text);
        
        // Add back the cursor
        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        messageElement.appendChild(cursor);
        
        // Scroll as new text appears
        scrollToBottom();
    }
    
    // Finalize the message when streaming is done
    function finalizeStreamingMessage(messageElement, text) {
        // Remove any existing cursor
        const existingCursor = messageElement.querySelector('.typing-cursor');
        if (existingCursor) {
            existingCursor.remove();
        }
        
        // Format the final response
        messageElement.innerHTML = formatAIResponse(text);
        
        // Scroll to bottom
        scrollToBottom();
    }
    
    // Remove the old appendMessage function and replace it with this version for non-AI messages
    function appendMessage(content, sender) {
        if (sender === 'ai') {
            // AI messages should use the streaming approach
            console.warn('AI messages should use appendEmptyAIMessage and updateStreamingMessage');
            return;
        }
        
        // Remove welcome message if present
        const welcomeMessage = chatContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        // Create wrapper for bubble and avatar
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'message-wrapper';
        
        // Create avatar element
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? 'You' : 'AI';
        
        // Create message content bubble
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        // Add elements to DOM
        messageWrapper.appendChild(avatar);
        messageWrapper.appendChild(messageContent);
        messageDiv.appendChild(messageWrapper);
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }
    
    // Format AI response with markdown-like syntax
    function formatAIResponse(text) {
        // Convert code blocks
        text = text.replace(/```([a-z]*)([\s\S]*?)```/g, (match, language, code) => {
            return `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
        });
        
        // Convert inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Convert line breaks
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }
    
    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Update the loading indicator to match bubble style
    function appendLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        
        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'loading-bubble';
        
        const loadingDots = document.createElement('div');
        loadingDots.className = 'loading-dots';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            loadingDots.appendChild(dot);
        }
        
        loadingBubble.appendChild(loadingDots);
        loadingDiv.appendChild(loadingBubble);
        chatContainer.appendChild(loadingDiv);
        scrollToBottom();
        
        return loadingDiv;
    }
    
    // Update the error message to match bubble style
    function showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message system';
        
        // Create wrapper for bubble and avatar
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'message-wrapper';
        
        // Create avatar element
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        avatar.style.backgroundColor = "#ef4444";
        avatar.style.color = "#ffffff";
        
        // Create message content bubble
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
        messageContent.style.color = "#ef4444";
        messageContent.textContent = message;
        
        // Add elements to DOM
        messageWrapper.appendChild(avatar);
        messageWrapper.appendChild(messageContent);
        errorDiv.appendChild(messageWrapper);
        chatContainer.appendChild(errorDiv);
        scrollToBottom();
    }
    
    // Scroll to bottom of chat container
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Generate a unique chat ID
    function generateChatId() {
        return 'chat_' + Date.now();
    }
    
    // Start a new chat
    function startNewChat() {
        // Generate a new chat ID
        currentChatId = generateChatId();
        
        // Reset the chat container
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to L0C4L Chat</h2>
                <p>Select a model and start a conversation</p>
            </div>
        `;
        
        // Always create a new entry in chat history (even if it's empty)
        // This ensures there's always at least one entry for the current chat
        if (!chatHistory[currentChatId]) {
            chatHistory[currentChatId] = {
                title: 'New Chat',
                model: currentModel,
                timestamp: Date.now(),
                messages: []
            };
            
            saveChatHistory();
            updateChatHistoryUI();
        }
        
        console.log('Started new chat:', currentChatId);
    }
    
    // Save message to history
    function saveMessageToHistory(content, sender) {
        if (!chatHistory[currentChatId]) {
            chatHistory[currentChatId] = {
                title: content.substring(0, 20) + '...',
                model: currentModel,
                timestamp: Date.now(),
                messages: []
            };
        }
        
        chatHistory[currentChatId].messages.push({
            sender,
            content,
            timestamp: Date.now()
        });
        
        // Update chat title on first user message
        if (sender === 'user' && chatHistory[currentChatId].messages.length === 1) {
            chatHistory[currentChatId].title = content.substring(0, 20) + (content.length > 20 ? '...' : '');
        }
        
        saveChatHistory();
    }
    
    // Load chat history from localStorage
    function loadChatHistory() {
        try {
            const history = localStorage.getItem('chatHistory');
            if (history) {
                return JSON.parse(history);
            }
        } catch (error) {
            console.error('Error loading chat history from localStorage:', error);
            // If there's an error, clear corrupted data
            localStorage.removeItem('chatHistory');
        }
        return {};
    }
    
    // Save chat history to localStorage with better error handling
    function saveChatHistory() {
        try {
            const serialized = JSON.stringify(chatHistory);
            localStorage.setItem('chatHistory', serialized);
            
            // Verify the data was saved correctly
            const verification = localStorage.getItem('chatHistory');
            if (!verification || verification !== serialized) {
                console.warn('localStorage save verification failed');
            }
        } catch (error) {
            console.error('Error saving chat history to localStorage:', error);
            // Handle storage quota exceeded or other errors
            showErrorMessage('Could not save chat history. Local storage may be full.');
        }
    }
    
    // Update chat history UI
    function updateChatHistoryUI() {
        // Clear existing items
        historyList.innerHTML = '';
        
        try {
            // Get all history entries
            const historyEntries = Object.entries(chatHistory);
            console.log('Total history entries:', historyEntries.length);
            
            // Handle empty history case
            if (historyEntries.length === 0) {
                const emptyMessage = document.createElement('li');
                emptyMessage.className = 'empty-history';
                emptyMessage.textContent = 'No chat history';
                historyList.appendChild(emptyMessage);
                // Don't return here - we should still proceed with the rest of the function
            }
            
            // Sort history by timestamp (newest first)
            const sortedHistory = historyEntries
                .sort(([, a], [, b]) => b.timestamp - a.timestamp)
                .slice(0, 10); // Limit to 10 most recent
            
            sortedHistory.forEach(([chatId, chat]) => {
                const li = document.createElement('li');
                
                // Create span for the chat title
                const titleSpan = document.createElement('span');
                titleSpan.className = 'history-item-title';
                titleSpan.textContent = chat.title || 'Untitled Chat';
                li.appendChild(titleSpan);
                
                // Create delete button with proper event handler
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-chat-btn';
                deleteBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
                deleteBtn.title = "Delete chat";
                
                // Add the delete button click event - capture chatId in closure
                const chatIdForDelete = chatId;
                deleteBtn.onclick = function(e) {
                    e.stopPropagation();
                    confirmDeleteChat(chatIdForDelete, chat.title);
                    return false;
                };
                
                li.appendChild(deleteBtn);
                
                // Set chat ID data attribute
                li.dataset.chatId = chatId;
                
                // Add click event for loading chat
                const chatIdForLoad = chatId;
                titleSpan.onclick = function(e) {
                    e.stopPropagation();
                    loadChat(chatIdForLoad);
                    return false;
                };
                
                // Highlight current chat
                if (chatId === currentChatId) {
                    li.classList.add('active');
                }
                
                historyList.appendChild(li);
            });
        } catch (error) {
            console.error('Error updating chat history UI:', error);
            
            // Show error in the UI
            const errorItem = document.createElement('li');
            errorItem.className = 'error-history';
            errorItem.textContent = 'Error loading chat history';
            historyList.appendChild(errorItem);
        }
    }
    
    // Function to show a confirmation dialog before deleting
    function confirmDeleteChat(chatId, chatTitle) {
        if (!chatId || !chatHistory[chatId]) {
            console.error('Invalid chat ID or chat not found for deletion:', chatId);
            return;
        }
        
        // Create dialog elements
        const backdrop = document.createElement('div');
        backdrop.className = 'dialog-backdrop';
        
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        
        dialog.innerHTML = `
            <h3 class="dialog-title">Delete Chat</h3>
            <p class="dialog-message">Are you sure you want to delete "${chatTitle || 'this chat'}"? This action cannot be undone.</p>
            <div class="dialog-actions">
                <button class="dialog-btn dialog-btn-cancel">Cancel</button>
                <button class="dialog-btn dialog-btn-delete">Delete</button>
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(backdrop);
        document.body.appendChild(dialog);
        
        // Capture chatId in a local variable to ensure it's available in closures
        const chatIdToDelete = chatId;
        
        // Set up event listeners
        const cancelBtn = dialog.querySelector('.dialog-btn-cancel');
        const deleteBtn = dialog.querySelector('.dialog-btn-delete');
        
        cancelBtn.onclick = function() {
            backdrop.remove();
            dialog.remove();
        };
        
        deleteBtn.onclick = function() {
            // Call the delete function with the captured chat ID
            deleteChat(chatIdToDelete);
            backdrop.remove();
            dialog.remove();
        };
        
        // Close dialog if backdrop is clicked
        backdrop.onclick = function() {
            backdrop.remove();
            dialog.remove();
        };
        
        // ESC key to cancel
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                backdrop.remove();
                dialog.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        
        document.addEventListener('keydown', escHandler);
    }
    
    // Delete a chat from history
    function deleteChat(chatId) {
        if (!chatId || !chatHistory[chatId]) {
            console.error('Invalid chat ID or chat not found:', chatId);
            return;
        }
        
        console.log('Deleting chat:', chatId);
        
        // Store if this was the current chat
        const wasCurrentChat = (chatId === currentChatId);
        
        // Delete the chat from history object
        delete chatHistory[chatId];
        
        // Save updated history to localStorage
        saveChatHistory();
        
        // Check if we have any chats left
        const remainingChats = Object.keys(chatHistory).length;
        console.log('Remaining chats after deletion:', remainingChats);
        
        // Update the UI with fresh data
        updateChatHistoryUI();
        
        // If it was the current chat or there are no chats left, start a new chat
        if (wasCurrentChat || remainingChats === 0) {
            startNewChat();
        } else if (wasCurrentChat && remainingChats > 0) {
            // If it was the current chat and we have other chats, load the most recent one
            const newestChatId = Object.keys(chatHistory)
                .sort((a, b) => chatHistory[b].timestamp - chatHistory[a].timestamp)[0];
            if (newestChatId) {
                loadChat(newestChatId);
            }
        }
        
        console.log('Chat deleted successfully. Updated history:', chatHistory);
    }
});

// Debug function to check if localStorage is available and working
function checkLocalStorage() {
    try {
        const testKey = '__test__';
        localStorage.setItem(testKey, testKey);
        const result = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        return result === testKey;
    } catch (e) {
        console.error('localStorage check failed:', e);
        return false;
    }
}
