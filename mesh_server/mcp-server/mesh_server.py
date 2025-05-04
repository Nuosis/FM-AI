#!/usr/bin/env python3
"""
Vector Storage and Document Processing MCP Server

This server provides MCP tools for:
- Storing and searching vector embeddings in a vector database
- Processing and extracting content from documents, URLs, and sitemaps
- Chunking documents for efficient processing
- Managing document processing workflows

Core Services:
- LLM Proxy: Generates vector embeddings from content
- Data Store: Vector database for similarity search operations
- Docling: Document processing and content extraction

Usage:
    This is an ephemeral MCP server that:
    1. Spins up when vector/document operations are needed
    2. Executes the requested operation (store/search/process)
    3. Returns structured results
    4. Exits cleanly to conserve resources
"""

import os
import json
import logging
import requests
from typing import Dict, Any, Optional
import anyio
import mcp.types as types
from mcp.server.lowlevel import Server

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('mesh-mcp')

class ServiceConfig:
    """Configuration for mesh_server services"""
    def __init__(self):
        # Get service URLs from environment with defaults
        self.llm_proxy_url = os.environ.get('LLM_PROXY_URL', 'http://localhost:3500')
        self.data_store_url = os.environ.get('DATA_STORE_URL', 'http://localhost:3550')
        self.docling_url = os.environ.get('DOCLING_URL', 'http://localhost:3600')
        
        # Validate URLs
        self._validate_urls()
        
    def _validate_urls(self):
        """Validate that service URLs are properly formatted"""
        for name, url in [
            ('LLM_PROXY_URL', self.llm_proxy_url),
            ('DATA_STORE_URL', self.data_store_url),
            ('DOCLING_URL', self.docling_url)
        ]:
            if not url.startswith(('http://', 'https://')):
                raise ValueError(f"{name} must start with http:// or https://")

class ServiceError(Exception):
    """Custom exception for service-related errors"""
    def __init__(self, service: str, message: str, status_code: Optional[int] = None):
        self.service = service
        self.status_code = status_code
        super().__init__(f"{service} error: {message}")

def create_server():
    """Create and configure the MCP server"""
    
    # Initialize service configuration
    try:
        config = ServiceConfig()
        logger.info("Service configuration loaded successfully")
    except ValueError as e:
        logger.error(f"Service configuration error: {str(e)}")
        raise
    
    # Create server instance
    app = Server("mesh-mcp")

    # Data Store Tool Schemas
    store_record_schema = {
        "type": "object",
        "properties": {
            "embedding": {"type": "array", "items": {"type": "number"}},
            "metadata": {"type": "object"},
            "user_id": {"type": "string", "description": "Optional user ID"}
        },
        "required": ["embedding", "metadata"]
    }

    search_records_schema = {
        "type": "object",
        "properties": {
            "query_embedding": {"type": "array", "items": {"type": "number"}},
            "metadata_filter": {"type": "object"},
            "limit": {"type": "integer", "default": 10},
            "user_id": {"type": "string", "description": "Optional user ID"}
        },
        "required": ["query_embedding"]
    }

    # Docling Tool Schemas
    extract_url_schema = {
        "type": "object",
        "properties": {
            "url": {"type": "string", "description": "URL of document to extract"},
            "format": {"type": "string", "enum": ["markdown", "json"], "default": "markdown"}
        },
        "required": ["url"]
    }

    extract_file_schema = {
        "type": "object",
        "properties": {
            "file_path": {"type": "string", "description": "Path to file to extract"},
            "format": {"type": "string", "enum": ["markdown", "json"], "default": "markdown"}
        },
        "required": ["file_path"]
    }

    sitemap_schema = {
        "type": "object",
        "properties": {
            "url": {"type": "string", "description": "Base URL for sitemap"},
            "sitemap_filename": {"type": "string", "default": "sitemap.xml"}
        },
        "required": ["url"]
    }

    chunk_schema = {
        "type": "object",
        "properties": {
            "content": {"type": "string", "description": "Document content to chunk"},
            "format": {"type": "string", "enum": ["markdown", "json"], "default": "markdown"},
            "user_id": {"type": "string", "description": "Optional user ID for tokenization"}
        },
        "required": ["content"]
    }

    process_url_schema = {
        "type": "object",
        "properties": {
            "url": {"type": "string", "description": "URL of document to process"},
            "user_id": {"type": "string", "description": "Optional user ID"}
        },
        "required": ["url"]
    }

    process_file_schema = {
        "type": "object",
        "properties": {
            "file_path": {"type": "string", "description": "Path to file to process"},
            "user_id": {"type": "string", "description": "Optional user ID"}
        },
        "required": ["file_path"]
    }

    cleanup_schema = {
        "type": "object",
        "properties": {
            "file_id": {"type": "string", "description": "ID of temporary files to clean up"}
        },
        "required": ["file_id"]
    }

    async def call_service(service: str, method: str, url: str, **kwargs) -> Dict:
        """Helper function to call mesh_server services with error handling"""
        try:
            response = requests.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.ConnectionError:
            raise ServiceError(service, f"Could not connect to {url}")
        except requests.exceptions.HTTPError as e:
            raise ServiceError(service, str(e), e.response.status_code)
        except requests.exceptions.RequestException as e:
            raise ServiceError(service, str(e))
        except json.JSONDecodeError:
            raise ServiceError(service, "Invalid JSON response")

    # Data Store Tools
    @app.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
        try:
            if name == "store_record":
                result = await call_service(
                    "Data Store",
                    "POST",
                    f"{config.data_store_url}/api/data-store/records",
                    json=arguments
                )
                return [types.TextContent(type="text", text=json.dumps(result))]

            elif name == "search_records":
                result = await call_service(
                    "Data Store",
                    "POST",
                    f"{config.data_store_url}/api/data-store/search",
                    json=arguments
                )
                return [types.TextContent(type="text", text=json.dumps(result))]

            elif name == "extract_from_url":
                result = await call_service(
                    "Docling",
                    "POST",
                    f"{config.docling_url}/extract",
                    json=arguments
                )
                return [types.TextContent(type="text", text=json.dumps(result))]

            elif name == "extract_from_file":
                with open(arguments["file_path"], "rb") as f:
                    result = await call_service(
                        "Docling",
                        "POST",
                        f"{config.docling_url}/extract",
                        files={"file": f},
                        data={"format": arguments.get("format", "markdown")}
                    )
                return [types.TextContent(type="text", text=json.dumps(result))]

            elif name == "extract_from_sitemap":
                result = await call_service(
                    "Docling",
                    "POST",
                    f"{config.docling_url}/extract/sitemap",
                    json=arguments
                )
                return [types.TextContent(type="text", text=json.dumps(result))]

            elif name == "chunk_document":
                result = await call_service(
                    "Docling",
                    "POST",
                    f"{config.docling_url}/chunk",
                    json=arguments
                )
                return [types.TextContent(type="text", text=json.dumps(result))]

            elif name == "process_url":
                result = await call_service(
                    "Docling",
                    "POST",
                    f"{config.docling_url}/process",
                    json=arguments
                )
                return [types.TextContent(type="text", text=json.dumps(result))]

            elif name == "process_file":
                with open(arguments["file_path"], "rb") as f:
                    result = await call_service(
                        "Docling",
                        "POST",
                        f"{config.docling_url}/process",
                        files={"file": f},
                        data={"user_id": arguments.get("user_id")} if "user_id" in arguments else {}
                    )
                return [types.TextContent(type="text", text=json.dumps(result))]

            elif name == "cleanup_temp_files":
                result = await call_service(
                    "Docling",
                    "DELETE",
                    f"{config.docling_url}/cleanup/{arguments['file_id']}"
                )
                return [types.TextContent(type="text", text=json.dumps(result))]

            else:
                raise ValueError(f"Unknown tool: {name}")

        except ServiceError as e:
            logger.error(f"Service error in {name}: {str(e)}")
            return [types.TextContent(type="text", text=f"Error: {str(e)}")]
        except Exception as e:
            logger.error(f"Unexpected error in {name}: {str(e)}")
            return [types.TextContent(type="text", text=f"Error: {str(e)}")]

    @app.list_tools()
    async def list_tools() -> list[types.Tool]:
        return [
            types.Tool(
                name="store_record",
                description="Store a record in the data store",
                inputSchema=store_record_schema
            ),
            types.Tool(
                name="search_records",
                description="Search records in the data store",
                inputSchema=search_records_schema
            ),
            types.Tool(
                name="extract_from_url",
                description="Extract content from a URL",
                inputSchema=extract_url_schema
            ),
            types.Tool(
                name="extract_from_file",
                description="Extract content from a file",
                inputSchema=extract_file_schema
            ),
            types.Tool(
                name="extract_from_sitemap",
                description="Extract content from a sitemap",
                inputSchema=sitemap_schema
            ),
            types.Tool(
                name="chunk_document",
                description="Chunk a document into smaller pieces",
                inputSchema=chunk_schema
            ),
            types.Tool(
                name="process_url",
                description="Process a document from a URL",
                inputSchema=process_url_schema
            ),
            types.Tool(
                name="process_file",
                description="Process a document from a file",
                inputSchema=process_file_schema
            ),
            types.Tool(
                name="cleanup_temp_files",
                description="Clean up temporary files",
                inputSchema=cleanup_schema
            )
        ]

    return app

import sys

def main():
    """Main entry point supporting both stdio and SSE transports."""
    import argparse

    parser = argparse.ArgumentParser(description="Mesh MCP Server")
    parser.add_argument("--transport", choices=["stdio", "sse"], default="stdio", help="Transport type (stdio or sse)")
    parser.add_argument("--port", type=int, default=8000, help="Port for SSE transport (default: 8000)")
    args = parser.parse_args()

    try:
        logger.info(f"Starting MCP server with transport: {args.transport}")
        app = create_server()

        if args.transport == "sse":
            from mcp.server.sse import SseServerTransport
            from starlette.applications import Starlette
            from starlette.routing import Mount, Route
            import uvicorn

            sse = SseServerTransport("/messages/")

            async def handle_sse(request):
                async with sse.connect_sse(
                    request.scope, request.receive, request._send
                ) as streams:
                    await app.run(
                        streams[0], streams[1], app.create_initialization_options()
                    )

            starlette_app = Starlette(
                debug=True,
                routes=[
                    Route("/sse", endpoint=handle_sse),
                    Mount("/messages/", app=sse.handle_post_message),
                ],
            )

            uvicorn.run(starlette_app, host="0.0.0.0", port=args.port)
            return 0
        else:
            from mcp.server.stdio import stdio_server

            async def run_stdio():
                async with stdio_server() as streams:
                    await app.run(
                        streams[0], streams[1], app.create_initialization_options()
                    )

            anyio.run(run_stdio)
            return 0

    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        raise

if __name__ == "__main__":
    sys.exit(main())