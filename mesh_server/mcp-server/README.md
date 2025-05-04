# Vector Storage and Document Processing MCP Server

This is an MCP (Model Context Protocol) server that provides tools for:
- Storing and searching vector embeddings in a vector database
- Processing and extracting content from documents, URLs, and sitemaps
- Chunking documents for efficient processing
- Managing document processing workflows

It follows the MCP design principles of being an ephemeral tool that spins up when needed, performs its task, and exits cleanly.

## Architecture

This MCP server connects to three core services:
- LLM Proxy (default: http://localhost:3500) - For vector embedding generation
- Data Store (default: http://localhost:3550) - Vector database for similarity search
- Docling (default: http://localhost:3600) - Document processing and extraction

## Usage

The server provides MCP tools that can be called on-demand. It follows the standard MCP lifecycle:
1. Spins up when a tool is requested
2. Executes the requested operation
3. Returns the result and exits cleanly

### Environment Variables

Configure service URLs using environment variables:
```bash
LLM_PROXY_URL=http://localhost:3500
DATA_STORE_URL=http://localhost:3550
DOCLING_URL=http://localhost:3600
```

### Development Setup

For local development/testing:
```bash
# Start mesh_server services first
cd mesh_server
docker-compose up -d

# Then run the MCP server (it will connect to the services)
cd /mcp-server
docker-compose up
```

### Available Tools

1. Vector Database Operations:
   - `store_record`: Store document embeddings with metadata
   - `search_records`: Find similar documents using vector similarity

2. Document Processing:
   - `extract_from_url`: Extract and structure content from web pages
   - `extract_from_file`: Parse and extract content from local documents
   - `extract_from_sitemap`: Bulk extract content from website sitemaps
   - `chunk_document`: Split documents into semantic chunks
   - `process_url`: Generate embeddings from web content
   - `process_file`: Generate embeddings from local files
   - `cleanup_temp_files`: Manage processing artifacts

### Error Handling

The server includes robust error handling:
- Service connection errors
- HTTP errors with status codes
- Invalid responses
- General exceptions

All errors are logged and returned in a consistent format.

## Integration

To use this MCP server in your application:

1. Ensure mesh_server services are running
2. Configure service URLs via environment variables
3. Call MCP tools as needed - the server will:
   - Start up
   - Execute the requested operation
   - Return results
   - Exit cleanly

The ephemeral nature of the server means it only consumes resources when actually performing operations.

## Example Client Configuration

See `example-client.json` for a complete example of how to use this MCP server, including:
- Tool configurations and schemas
- Example arguments for each tool
- Environment variable setup
- Transport configuration

This example shows how to:
1. Store and search vector embeddings for semantic similarity
2. Extract structured content from various sources
3. Process documents into vector representations
4. Manage document processing workflows

The example assumes local development setup (localhost URLs), but you can modify the environment variables to point to your deployed services.