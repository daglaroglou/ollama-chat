// server.js - Backend API server for Ollama Chat

const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');

// Check if we're using node-fetch v2 and ensure it's properly configured for streams
if (fetch && typeof fetch === 'function' && !globalThis.fetch) {
    console.log('Using node-fetch - ensuring stream support');
    
    // node-fetch v2 requires these options for proper stream handling
    const originalFetch = fetch;
    global.fetch = async function(url, options) {
        if (!options) options = {};
        if (options.stream === true) {
            if (!options.headers) options.headers = {};
            options.headers['Accept'] = 'text/event-stream';
        }
        return originalFetch(url, options);
    };
}

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API to get available models
app.get('/api/models', async (req, res) => {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`);
        if (!response.ok) {
            throw new Error(`Error fetching models: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        res.json({ models: data.models });
    } catch (error) {
        console.error('Error fetching models:', error);
        res.status(500).json({ error: 'Failed to fetch models from Ollama' });
    }
});

// API for chat completion
app.post('/api/chat', async (req, res) => {
    try {
        const { model, message } = req.body;
        
        if (!model || !message) {
            return res.status(400).json({ error: 'Model and message are required' });
        }
        
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                prompt: message,
                stream: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error getting response: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        res.json({ response: data.response });
    } catch (error) {
        console.error('Error in chat API:', error);
        res.status(500).json({ error: 'Failed to get response from Ollama' });
    }
});

// Fixed implementation of the streaming API endpoint

// API for streaming chat completion
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { model, message } = req.body;
        
        if (!model || !message) {
            return res.status(400).json({ error: 'Model and message are required' });
        }
        
        console.log(`Streaming request: model=${model}, message="${message.substring(0, 50)}..."`);
        
        // Set appropriate headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Make request to Ollama API
        const ollama_response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                prompt: message,
                stream: true
            })
        });
        
        if (!ollama_response.ok) {
            const errorText = await ollama_response.text();
            console.error(`Ollama API error: ${ollama_response.status} - ${errorText}`);
            throw new Error(`Error from Ollama: ${ollama_response.status} ${ollama_response.statusText}`);
        }
        
        // Stream the response
        const reader = ollama_response.body.getReader();
        
        // Process the stream
        async function processStream() {
            try {
                const decoder = new TextDecoder();
                let buffer = '';
                
                while (true) {
                    const { value, done } = await reader.read();
                    
                    if (done) {
                        console.log('Stream complete');
                        if (buffer) {
                            try {
                                const parsed = JSON.parse(buffer);
                                if (parsed.response) res.write(parsed.response);
                            } catch (e) {
                                console.error('Error parsing final buffer:', e);
                            }
                        }
                        break;
                    }
                    
                    // Decode this chunk
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;
                    
                    // Process complete JSON objects from the buffer
                    let newlineIndex;
                    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.slice(0, newlineIndex).trim();
                        buffer = buffer.slice(newlineIndex + 1);
                        
                        if (!line) continue;
                        
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.response) {
                                res.write(parsed.response);
                            }
                        } catch (e) {
                            console.error('Error parsing JSON line:', e, line);
                        }
                    }
                }
                
                // End the response stream
                res.end();
                
            } catch (error) {
                console.error('Error processing stream:', error);
                
                // Only try to send an error if headers haven't been sent yet
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream processing error' });
                } else {
                    res.end();
                }
            }
        }
        
        // Start processing
        await processStream();
    } catch (error) {
        console.error('Error in streaming chat API:', error);
        
        // If we haven't sent a response yet, send an error
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to get response from Ollama' });
        } else {
            // Otherwise, just end the stream
            res.end();
        }
    }
});

// Log the versions of packages we're using
console.log(`Node version: ${process.version}`);
console.log(`Express version: ${require('express/package.json').version}`);
console.log(`node-fetch version: ${require('node-fetch/package.json').version}`);
console.log(`Ollama URL: ${OLLAMA_URL}`);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
