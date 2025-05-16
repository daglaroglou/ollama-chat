# Ollama Chat UI

A modern chat interface for Ollama LLM models with a clean, responsive design.

## Features

- Clean, intuitive UI with social media-style chat bubbles
- Support for multiple Ollama models
- Chat history with delete functionality
- Code block formatting and syntax highlighting
- Animated typing effect for AI responses
- Dark mode support

## Project Structure

```
ollama/
├── frontend/            # Frontend web client 
│   ├── index.html       # Main HTML file
│   ├── styles.css       # Stylesheet
│   └── script.js        # Client-side JavaScript
│
└── backend/             # Node.js API server
    ├── server.js        # Express.js server
    └── package.json     # Backend dependencies
```

## Setup

1. Install and run Ollama: https://ollama.ai/
2. Clone this repository
3. Run `npm install` to install dependencies
4. Run `npm start` to start the application
5. Open http://localhost:3000 in your browser

## Environment Variables

- `PORT` - Port for the backend server (default: 3000)
- `OLLAMA_URL` - URL for Ollama API (default: http://localhost:11434)

## Technologies

- Node.js and Express for the backend
- Vanilla JavaScript, HTML, and CSS for the frontend
- Connects to local Ollama API

## License

MIT
