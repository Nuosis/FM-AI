# Unified Local Proxy Server

This is a unified local proxy server implemented in Python that serves two purposes:

1. **Proxying requests to local LLMs** (Ollama, LM Studio, OpenAI-compatible endpoints)
2. **Executing user-supplied Python code** securely

## Installation

No installation is required beyond having Python 3 installed on your system. The script uses Flask, which will be installed automatically if needed.

## Usage

1. Download the `local-llm-proxy.py` script
2. Run the script:

```bash
# MacOS/Linux
python3 local-llm-proxy.py

# Windows
python local-llm-proxy.py
```

The server will start on port 3500 by default.

## Command-Line Options

The script supports the following command-line options:

- `--port <number>`: Proxy server port (default: 3500)
- `--ollama-port <number>`: Ollama port (default: 11434)
- `--lmstudio-port <number>`: LM Studio port (default: 1234)
- `--ollama-base-url <url>`: Custom Ollama base URL
- `--lmstudio-base-url <url>`: Custom LM Studio base URL
- `--debug`: Enable debug logging

Example:

```bash
python3 local-llm-proxy.py --port 3501 --ollama-port 11435 --debug
```

## Endpoints

### Health Check

- `GET /health`: Returns "ok" for frontend detection

### LLM Proxy Endpoints

- `/ollama/*`: Proxies to Ollama (default port 11434, or custom base URL)
- `/lmstudio/*`: Proxies to LM Studio (default port 1234, or custom base URL)
- `/v1/*`: Proxies to LM Studio (default port 1234, or custom base URL)

### Tool Code Execution Endpoint

- `POST /execute`: Executes user-supplied Python code
  - Body: `{ "code": "...", "input": {...} }`
  - Returns: `{ "output": "...", "error": "...", "success": true/false }`

## Security Considerations

- The server only listens on `localhost` to prevent remote access
- Code execution is limited to a 10-second timeout
- The server warns users about the risks of executing arbitrary code
- Temporary files are cleaned up after execution

## Examples

### Executing Python Code

```javascript
// JavaScript example
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
input_data = sys.stdin.read()
print(f"Received input: {input_data}")

# Return a result
result = {"message": "Hello from Python!"}
print(json.dumps(result))
    `,
    input: {"name": "User"}
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

### Proxying to Ollama

```javascript
// JavaScript example
fetch('http://localhost:3500/ollama/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: "llama2",
    prompt: "Hello, how are you?"
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Troubleshooting

- If the server fails to start, check if port 3500 is already in use
- If LLM proxying fails, ensure Ollama or LM Studio is running
- If code execution fails, check the error message for details

## License

This software is provided as-is under the MIT License.