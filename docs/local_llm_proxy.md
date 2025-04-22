# Local LLM Proxy Server

This proxy server allows you to forward requests from your browser to local LLM instances (Ollama or LM Studio) while adding necessary CORS headers to avoid browser CORS issues.

## Why Use This Proxy?

When using local LLM services like Ollama or LM Studio directly from a browser-based application, you may encounter CORS (Cross-Origin Resource Sharing) errors. This happens because these local services typically don't include the necessary CORS headers in their responses, which browsers require for security reasons.

This proxy server sits between your browser application and the local LLM services, adding the required CORS headers to make the communication work seamlessly.

## Installation

No installation is required. The script is ready to use as long as you have Node.js installed on your system.

## Usage

### Starting the Proxy Server

Run the script from the command line:

```bash
# Basic usage with default settings
node scripts/local-llm-proxy.cjs

# Or make it executable and run directly
chmod +x scripts/local-llm-proxy.cjs
./scripts/local-llm-proxy.cjs
```

### Command Line Options

The proxy server accepts several command line options:

```
--port <number>           Port to run the proxy server on (default: 3500)
--ollama-port <number>    Port for Ollama (default: 11434)
--lmstudio-port <number>  Port for LM Studio (default: 1234)
--debug                   Enable debug logging
--help                    Show help message
```

Example with custom ports:

```bash
node scripts/local-llm-proxy.cjs --port 8000 --ollama-port 11435 --lmstudio-port 5000
```

### Connecting to the Proxy

Once the proxy is running, you can send requests to it instead of directly to Ollama or LM Studio. The proxy will forward your requests to the appropriate service and add CORS headers to the responses.

#### URL Patterns

The proxy uses URL patterns to determine which LLM service to route to:

- **Ollama**: `http://localhost:3500/ollama/*`
  - Example: `http://localhost:3500/ollama/api/chat`

- **LM Studio**: `http://localhost:3500/lmstudio/*`
  - Example: `http://localhost:3500/lmstudio/v1/chat/completions`

- **Auto-routing**:
  - Paths starting with `/v1/` are automatically routed to LM Studio (OpenAI-compatible)
  - Paths containing `api/chat` or `api/tags` are automatically routed to Ollama

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