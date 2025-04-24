# Unified Local Proxy Server

This is a Python implementation of a unified local proxy server that serves two purposes:
1. Proxying requests to local LLMs (Ollama, LM Studio, OpenAI-compatible endpoints) with CORS support
2. Executing user-supplied Python code securely on the user's machine via a `/execute` endpoint

## Installation

The script requires Python 3 and will automatically install its dependencies (Flask and requests) if they are not already installed.

## Usage

```bash
python scripts/local-llm-proxy.py [options]
```

### Command-Line Options

- `--port <number>`: Proxy server port (default: 3500)
- `--ollama-port <number>`: Ollama port (default: 11434)
- `--lmstudio-port <number>`: LM Studio port (default: 1234)
- `--ollama-base-url <url>`: Custom Ollama base URL
- `--lmstudio-base-url <url>`: Custom LM Studio base URL
- `--debug`: Enable debug logging

## Endpoints

### LLM Proxy Endpoints

- `/ollama/*` → Proxies to Ollama (default port 11434, or custom base URL)
- `/lmstudio/*` and `/v1/*` → Proxies to LM Studio (default port 1234, or custom base URL)
- **CORS:** Adds `Access-Control-Allow-Origin: *` and other necessary headers to all responses.
- **OPTIONS:** Handles preflight requests for CORS.

### Tool Code Execution Endpoint

- `POST /execute`
  - Body: `{ "code": "...", "input": {...} }`
  - Runs the provided Python code in a subprocess (with resource/time limits).
  - Returns: `{ "output": "...", "error": "...", "success": true/false }`

### Health Check

- `GET /health` → Returns "ok" for frontend detection.

## Security Considerations

- The server only listens on `localhost` for security.
- The `/execute` endpoint runs Python code on your machine. Only use with code you trust!
- Code execution is limited to a 10-second timeout.
- Temporary files are created for code execution and cleaned up afterward.

## Examples

### Starting the Server

```bash
# Start with default settings
python scripts/local-llm-proxy.py

# Start with custom ports
python scripts/local-llm-proxy.py --port 4000 --ollama-port 12000 --lmstudio-port 2000

# Start with custom base URLs
python scripts/local-llm-proxy.py --ollama-base-url http://remote-ollama:11434 --lmstudio-base-url http://remote-lmstudio:1234
```

### Using the Execute Endpoint

```javascript
// Example JavaScript code to call the execute endpoint
fetch('http://localhost:3500/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: `
import sys
import json

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

## Migration from Node.js Proxy

This Python script replaces the previous Node.js `local-llm-proxy.cjs` script, providing all the same functionality plus the ability to execute Python code. The command-line options and endpoints are compatible with the previous version, so existing integrations should continue to work.