# Local LLM Proxy Server

This proxy server allows you to forward requests from your browser to local LLM instances (Ollama or LM Studio) while adding necessary CORS headers to avoid browser CORS issues. It also provides a Python code execution endpoint.

> **Note:** A new unified Python implementation is now available that replaces the Node.js version. See the [Unified Python Implementation](#unified-python-implementation) section below.

## Why Use This Proxy?

When using local LLM services like Ollama or LM Studio directly from a browser-based application, you may encounter CORS (Cross-Origin Resource Sharing) errors. This happens because these local services typically don't include the necessary CORS headers in their responses, which browsers require for security reasons.

This proxy server sits between your browser application and the local LLM services, adding the required CORS headers to make the communication work seamlessly.

## Installation

### Node.js Version
No installation is required for the Node.js version. The script is ready to use as long as you have Node.js installed on your system.

### Python Version
The Python version requires Python 3 and will automatically install its dependencies (Flask and requests) if they are not already installed.

## Usage

### Starting the Proxy Server

Run the script from the command line:

```bash
python scripts/local-llm-proxy.py
```

### Command Line Options

#### Python Version
The Python proxy server accepts similar command line options:

```
--port PORT                 Proxy server port (default: 3500)
--ollama-port PORT          Ollama port (default: 11434)
--lmstudio-port PORT        LM Studio port (default: 1234)
--ollama-base-url URL       Custom Ollama base URL
--lmstudio-base-url URL     Custom LM Studio base URL
--debug                     Enable debug logging
```

Example with custom ports:

```bash
python scripts/local-llm-proxy.py --port 8000 --ollama-port 11435 --lmstudio-port 5000
```

### Connecting to the Proxy

Once the proxy is running, you can send requests to it instead of directly to Ollama or LM Studio. The proxy will forward your requests to the appropriate service and add CORS headers to the responses.

#### URL Patterns

The proxy uses URL patterns to determine which LLM service to route to:

- **Ollama**: `http://localhost:3500/ollama/*`
  - Example: `http://localhost:3500/ollama/api/chat`

- **LM Studio**: `http://localhost:3500/lmstudio/*`
  - Example: `http://localhost:3500/lmstudio/v1/chat/completions`

- **OpenAI-compatible**: `http://localhost:3500/v1/*`
  - Example: `http://localhost:3500/v1/chat/completions`

- **Python Code Execution** (Python version only): `http://localhost:3500/execute`
  - POST endpoint for executing Python code

- **Health Check** (Python version only): `http://localhost:3500/health`
  - Returns "ok" for frontend detection

### Example: Configuring Your Application

Update your application's API endpoints to use the proxy instead of connecting directly to the LLM services:

```javascript
// Instead of this (direct connection to Ollama)
const ollamaEndpoint = 'http://localhost:11434/api/chat';

// Use this (connection through the proxy)
const ollamaEndpoint = 'http://localhost:3500/ollama/api/chat';

// Instead of this (direct connection to LM Studio)
const lmStudioEndpoint = 'http://localhost:1234/v1/chat/completions';

// Use this (connection through the proxy)
const lmStudioEndpoint = 'http://localhost:3500/lmstudio/v1/chat/completions';
```

## Troubleshooting

### Proxy Cannot Connect to LLM Service

If you see an error like "Failed to connect to localhost:11434", make sure:

1. Your LLM service (Ollama or LM Studio) is running
2. You've specified the correct port if it's not using the default

### CORS Errors Still Occurring

If you're still seeing CORS errors:

1. Make sure you're connecting to the proxy (port 3500 by default) and not directly to the LLM service
2. Check that your request URL follows the correct pattern (/ollama/* or /lmstudio/*)
3. Try enabling debug mode with `--debug` to see more information about the requests

## Security Considerations

This proxy is intended for local development use only. It adds permissive CORS headers that allow any origin to access the LLM services. Do not use this in a production environment without proper security measures.

## Unified Python Implementation

A new unified Python implementation is now available that combines:
1. LLM proxying functionality (same as the Node.js version)
2. Python code execution via a `/execute` endpoint

### Features

- **Cross-platform**: Works on Windows, Mac, and Linux with Python 3
- **No dependencies**: Automatically installs required packages (Flask and requests)
- **LLM Proxying**: Same functionality as the Node.js version
- **Python Code Execution**: Run Python code directly from the frontend
- **Health Check**: Endpoint for frontend detection

### Python Code Execution

The Python implementation adds a new `/execute` endpoint for running Python code:

```javascript
// Example: Execute Python code
fetch('http://localhost:3500/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: `
import json
import sys

# Get input from stdin
input_data = json.loads(sys.stdin.read())

# Process the input
result = {
    "message": f"Hello, {input_data.get('name', 'World')}!",
    "timestamp": input_data.get('timestamp')
}

# Output the result as JSON
print(json.dumps(result))
    `,
    input: {
      name: "User",
      timestamp: Date.now()
    }
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

The response will be in this format:

```json
{
  "output": "...", // Standard output from the Python code
  "error": "...",  // Standard error or exception message (null if successful)
  "success": true  // Boolean indicating if execution was successful
}
```

### Security Considerations

The Python code execution feature runs code directly on your machine. Only use it with code you trust and understand the risks. The server:

- Only listens on localhost for security
- Limits execution time to 10 seconds
- Cleans up temporary files after execution
