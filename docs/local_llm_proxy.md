# Unified Local LLM Proxy Server

This document describes the enhanced local LLM proxy server that provides a unified interface for multiple LLM providers.

## Features

- **Multiple LLM Provider Support**: OpenAI, Anthropic, Gemini, Ollama, LM Studio
- **Unified API**: Single endpoint for chat completions, embeddings, and model listing
- **Authentication**: Optional JWT-based authentication
- **Rate Limiting**: Configurable rate limiting by user or IP
- **Input Validation**: Validates request parameters before proxying
- **Python Code Execution**: Securely executes user-supplied Python code
- **Health Check**: Endpoint for frontend detection

## Installation

1. Install the required dependencies:

```bash
cd scripts
pip install -r requirements.txt
```

## Usage

### Starting the Server

```bash
python local-llm-proxy.py [options]
```

### Command Line Options

- `--port <number>`: Proxy server port (default: 3500)
- `--ollama-port <number>`: Ollama port (default: 11434)
- `--lmstudio-port <number>`: LM Studio port (default: 1234)
- `--ollama-base-url <url>`: Custom Ollama base URL
- `--lmstudio-base-url <url>`: Custom LM Studio base URL
- `--openai-api-key <key>`: OpenAI API key
- `--anthropic-api-key <key>`: Anthropic API key
- `--gemini-api-key <key>`: Gemini API key
- `--jwt-secret <secret>`: Secret for JWT verification
- `--enable-auth`: Enable JWT authentication
- `--debug`: Enable debug logging

### Environment Variables

You can also set API keys using environment variables:

- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `GEMINI_API_KEY`: Gemini API key
- `JWT_SECRET`: Secret for JWT verification

## API Endpoints

### LLM Proxy Endpoint

```
POST /llm
```

This unified endpoint handles requests for chat completions, embeddings, and model listing across all supported providers.

#### Request Format

```json
{
  "provider": "openai",
  "type": "chat",
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "options": {
    "temperature": 0.7,
    "max_tokens": 100
  }
}
```

#### Provider-specific Parameters

- **OpenAI**:
  - Chat: `model`, `messages`, `options`
  - Embeddings: `model`, `input`, `options`
  - Models: No additional parameters

- **Anthropic**:
  - Chat: `model`, `messages`, `options`
  - Embeddings: `model`, `input`, `options`
  - Models: No additional parameters

- **Gemini**:
  - Chat: `model`, `messages`, `options`
  - Embeddings: `model`, `input`, `options`
  - Models: No additional parameters

- **LM Studio**:
  - Chat: `model`, `messages`, `options`
  - Embeddings: `model`, `input`, `options`
  - Models: No additional parameters

- **Ollama**:
  - Chat: `model`, `messages`, `options`
  - Embeddings: `model`, `input`, `options`
  - Models: No additional parameters

### Python Code Execution

```
POST /execute
```

Executes user-supplied Python code securely.

#### Request Format

```json
{
  "code": "def add(a, b):\n    return a + b",
  "input": {
    "a": 1,
    "b": 2
  }
}
```

### Health Check

```
GET /health
```

Returns "ok" if the server is running.

### Direct Provider Endpoints

The following endpoints proxy requests directly to the respective providers:

- `/ollama/<path>`: Proxies to Ollama
- `/lmstudio/<path>`: Proxies to LM Studio
- `/v1/<path>`: Proxies to OpenAI-compatible endpoints (LM Studio)

## Authentication

When authentication is enabled (`--enable-auth`), requests to the `/llm` endpoint must include a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Examples

### Chat Completion with OpenAI

```bash
curl -X POST http://localhost:3500/llm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "provider": "openai",
    "type": "chat",
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'
```

### Embeddings with Anthropic

```bash
curl -X POST http://localhost:3500/llm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "provider": "anthropic",
    "type": "embeddings",
    "model": "claude-2",
    "input": "Hello, world!"
  }'
```

### List Models with Ollama

```bash
curl -X POST http://localhost:3500/llm \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ollama",
    "type": "models"
  }'
```

### Execute Python Code

```bash
curl -X POST http://localhost:3500/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def add(a, b):\n    return a + b",
    "input": {
      "a": 1,
      "b": 2
    }
  }'
```

## Security Considerations

- The server executes arbitrary Python code. Only run code you trust.
- When using JWT authentication, use a strong secret key.
- API keys are sensitive information. Use environment variables or command-line arguments to provide them securely.
