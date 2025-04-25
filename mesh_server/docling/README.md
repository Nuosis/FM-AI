# Docling Service

A containerized service for document processing, extraction, and chunking using the [Docling](https://github.com/DS4SD/docling) library. This service provides a REST API for processing documents from various formats (PDF, DOCX, HTML, etc.) and preparing them for RAG (Retrieval-Augmented Generation) applications.

This service is designed to work with the local-llm-proxy for LLM operations, eliminating the need for direct OpenAI API access and leveraging the proxy's authentication, rate limiting, and provider management capabilities.

The service supports user-specific API key management by accepting a `user_id` parameter in requests, which is passed to the local-llm-proxy to fetch the appropriate API key from Supabase.

## Features

- **Document Extraction**: Process documents from URLs or file uploads
- **Document Chunking**: Break documents into semantically meaningful chunks
- **Sitemap Processing**: Extract content from multiple pages using a sitemap
- **REST API**: Simple HTTP interface for integration with frontend applications
- **Docker Support**: Easy deployment as a containerized service

## API Endpoints

### Health Check

```
GET /docling/health
```

Returns the health status of the service.

### Test Connection

```
POST /docling/test
```

Tests the connection to the local-llm-proxy and verifies tokenization functionality.

**Parameters:**
- `user_id` (string, optional): User ID to test user-specific tokenization

**Response:**
```json
{
  "status": "ok",
  "service": "docling",
  "proxy_status": "connected",
  "proxy_url": "http://proxy:3500",
  "tokenization_test": {
    "text": "Hello, this is a test.",
    "tokens": ["Hello", ",", "this", "is", "a", "test", "."],
    "token_count": 7
  },
  "user_id": "user-123"
}
```

### Document Extraction

```
POST /docling/extract
```

Extract content from a document URL or uploaded file.

**Parameters:**
- `url` (string): URL of the document to extract (for JSON requests)
- `file` (file): Document file to upload (for multipart/form-data requests)
- `format` (string): Output format, either "markdown" or "json" (default: "markdown")

### Sitemap Extraction

```
POST /docling/extract/sitemap
```

Extract content from multiple pages using a sitemap.

**Parameters:**
- `url` (string): Base URL of the website
- `sitemap_filename` (string): Filename of the sitemap (default: "sitemap.xml")

### Document Chunking

```
POST /docling/chunk
```

Chunk a document into smaller pieces.

**Parameters:**
- `content` (string): Document content to chunk
- `format` (string): Format of the content, either "markdown" or "html" (default: "markdown")

### Document Processing

```
POST /docling/process
```

Extract and chunk a document in one step.

**Parameters:**
- `url` (string): URL of the document to process (for JSON requests)
- `file` (file): Document file to upload (for multipart/form-data requests)

### Cleanup

```
DELETE /docling/cleanup/{file_id}
```

Clean up temporary files created during processing.

## Docker Deployment

### Building the Docker Image

```bash
cd mesh_server/docling
docker build -t docling-service .
```

### Running the Docker Container

```bash
docker run -p 3600:3600 -e OPENAI_API_KEY=your_api_key docling-service
```

### Environment Variables

- `LLM_PROXY_URL`: URL of the local-llm-proxy service (default: http://proxy:3500)

### User Authentication

All API endpoints accept an optional `user_id` parameter, which is used to fetch the appropriate API key from the local-llm-proxy service. This allows the docling service to use the correct API key for each user without having to manage API keys directly.

Example with user_id:
```json
{
  "url": "https://example.com/document.pdf",
  "user_id": "user-123"
}
```

## Integration with Frontend

The Docling service is designed to work with your frontend application. Here's how to integrate it:

### Example: Processing a Document

```javascript
// Example using fetch API
async function processDocument(fileInput) {
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  
  const response = await fetch('http://localhost:3600/docling/process', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  // Process the chunks
  const chunks = result.chunks;
  
  // Clean up temporary files when done
  if (result.file_id) {
    await fetch(`http://localhost:3600/docling/cleanup/${result.file_id}`, {
      method: 'DELETE'
    });
  }
  
  return chunks;
}
```

### Example: Processing a URL

```javascript
// Example using fetch API
async function processUrl(url) {
  const response = await fetch('http://localhost:3600/docling/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  });
  
  const result = await response.json();
  return result.chunks;
}
```

## 3-Container Architecture

The Docling service is part of a 3-container architecture:

1. **LLM Proxy + Tool Execution Container**: Handles LLM API proxying and dynamic tool execution.
2. **Data Store Container**: Manages vector embedding storage and retrieval.
3. **Docling RAG Container**: Handles document ingestion, chunking, and embedding.

This architecture allows for:
- Centralized LLM API access through the proxy
- Consistent authentication and rate limiting
- Separation of concerns for easier maintenance and scaling

### Docker Compose Setup

The root directory contains a `docker-compose.yml` file that sets up all three containers:

```yaml
version: '3'
services:
  # LLM Proxy + Tool Execution Container
  proxy:
    build: .
    ports:
      - "3500:3500"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - proxy_data:/app/data

  # Data Store Container
  data_store:
    build: ./data_store
    ports:
      - "3550:3550"
    environment:
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - data_store_data:/app/data

  # Docling RAG Container
  docling:
    build: ./docling
    ports:
      - "3600:3600"
    environment:
      - LLM_PROXY_URL=http://proxy:3500
    volumes:
      - docling_temp:/app/temp
    depends_on:
      - proxy

volumes:
  proxy_data:
  data_store_data:
  docling_temp:
```

## Development

### Running Locally

```bash
cd mesh_server/docling
pip install -r requirements.txt
export LLM_PROXY_URL=http://localhost:3500  # Point to your local proxy
python api.py --port 3600 --debug
```

Note: When running locally, make sure the local-llm-proxy is running and accessible at the URL specified in the LLM_PROXY_URL environment variable.

## Frontend Integration

The docling service is ready to be tested by your frontend. Here's what you need to know:

### CORS Support

The API includes CORS support, allowing cross-origin requests from your frontend application.

### Testing the Connection

Before using the service, you can test the connection using the `/docling/test` endpoint:

```javascript
// Example using fetch API
async function testConnection(userId) {
  const response = await fetch('http://localhost:3600/docling/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: userId })
  });
  
  const result = await response.json();
  console.log('Connection test result:', result);
  
  // Check if proxy is connected
  if (result.proxy_status === 'connected') {
    console.log('Successfully connected to proxy!');
  } else {
    console.error('Failed to connect to proxy:', result.proxy_status);
  }
  
  // Check tokenization test if user_id was provided
  if (result.tokenization_test && !result.tokenization_test.error) {
    console.log('Tokenization test successful!');
  }
  
  return result;
}
```

### Error Handling

All API endpoints return appropriate HTTP status codes and error messages in a consistent format:

```json
{
  "error": "Error message here"
}
```

Your frontend should handle these error responses appropriately.

### Testing the API

You can test the API using curl or any API testing tool:

```bash
# Health check
curl http://localhost:3600/docling/health

# Process a URL
curl -X POST http://localhost:3600/docling/process \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/document.pdf"}'

# Process a file
curl -X POST http://localhost:3600/docling/process \
  -F "file=@/path/to/your/document.pdf"