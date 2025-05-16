# Ollama Chat Web Interface

A clean web interface to chat with your locally hosted [Ollama](https://ollama.ai/) models.

## Features

- Connect to your local Ollama instance
- Chat with any model available in your Ollama installation
- Store chat history in your browser's local storage
- Clean, responsive user interface with light/dark mode support

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

## Setup Instructions

### 1. Enable CORS on your Ollama server

You need to enable CORS on your Ollama server to allow this web interface to connect to it:

**Windows:**
```
set OLLAMA_ORIGINS=*
ollama serve
```

**Linux/Mac:**
```
OLLAMA_ORIGINS=* ollama serve
```

For security, you may want to specify the exact origin instead of using `*`.

### 2. Open the web interface

Open the web interface, enter your Ollama URL (default is http://localhost:11434), and click "Test Connection".

### 3. Select a model and start chatting

Select one of your installed models and start chatting!

## Hosting on GitHub Pages

1. Create a GitHub repository
2. Upload the frontend folder contents
3. Go to repository Settings > Pages
4. Under "Source", select "main" branch
5. Click "Save" to publish your site

## Privacy and Security

- This is a client-side only application
- All conversations are stored locally in your browser
- No data is sent to any server other than your local Ollama instance
- The web interface only connects to the Ollama URL you specify

## Development

To modify or extend this interface:

1. Clone the repository
2. Make your changes to the HTML, CSS, or JavaScript
3. Test locally by opening the index.html file in your browser
4. Push changes to GitHub to update the public site

## License

MIT
