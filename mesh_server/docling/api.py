#!/usr/bin/env python3
"""
Docling API for document processing and RAG pipeline

This module provides API endpoints for the Docling service:
- Document extraction endpoints for processing various document formats
- Chunking endpoints for breaking documents into manageable pieces
- Integration with data_store for storing embeddings
- Uses local-llm-proxy for LLM operations
"""

import os
import json
import logging
import tempfile
import requests
from typing import Dict, List, Any, Optional
from flask import Flask, Blueprint, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from werkzeug.utils import secure_filename

from docling.document_converter import DocumentConverter
from docling.chunking import HybridChunker
from utils.sitemap import get_sitemap_urls
from utils.auth import get_auth_headers, forward_auth_header

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('docling-api')

# Create a Flask Blueprint for the Docling API
docling_api = Blueprint('docling_api', __name__)

# Initialize the document converter
converter = DocumentConverter()

# Configuration for services
LLM_PROXY_URL = os.environ.get('LLM_PROXY_URL', 'http://proxy:3500')
DATA_STORE_URL = os.environ.get('DATA_STORE_URL', 'http://data-store:3550')

# Custom tokenizer that uses the local-llm-proxy
class ProxyTokenizer:
    def __init__(self, max_length=8191, user_id=None, model="gpt-4.1"):
        self.max_length = max_length
        self.user_id = user_id
        self.model = model
        
    def tokenize(self, text):
        try:
            # Prepare the request payload
            payload = {
                "provider": "openai",
                "type": "tokenize",
                "model": self.model,
                "text": text,
                "user_id": self.user_id
            }
            
            # Add user_id if available
            if self.user_id:
                payload["user_id"] = self.user_id
                
            # Use the local-llm-proxy to tokenize the text
            # Forward the Authorization header if available
            headers = get_auth_headers(self.user_id)
            
            response = requests.post(
                f"{LLM_PROXY_URL}/llm",
                json=payload,
                headers=headers
            )
            
            if response.status_code == 200:
                tokens = response.json().get('tokens', [])
                return [str(t) for t in tokens]
            else:
                # Fallback to a simple approximation if the proxy fails
                logger.warning(f"Proxy tokenization failed: {response.status_code} {response.text}")
                return text.split()
        except Exception as e:
            logger.error(f"Error tokenizing text: {str(e)}")
            # Fallback to a simple approximation
            return text.split()

# Initialize default tokenizer and chunker
default_tokenizer = ProxyTokenizer()
MAX_TOKENS = 8191  # text-embedding-3-large's maximum context length

# Function to get a tokenizer for a specific user
def get_tokenizer(user_id=None, model="gpt-4.1"):
    if user_id:
        return ProxyTokenizer(user_id=user_id, model=model)
    return default_tokenizer

# Function to get a chunker for a specific user
def get_chunker(user_id=None):
    tokenizer = get_tokenizer(user_id)
    return HybridChunker(
        tokenizer=tokenizer,
        max_tokens=MAX_TOKENS,
        merge_peers=True,
    )

# Global variable to store temporary files
temp_files = {}

@docling_api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "docling"})

@docling_api.route('/test', methods=['POST'])
def test_connection(params=None):
    """Test endpoint for verifying connectivity and proxy integration"""
    try:
        data = request.get_json() if request.is_json else {}
        user_id = data.get('user_id')
        
        # Test the proxy connection
        proxy_status = "unknown"
        try:
            # Forward the Authorization header if available
            headers = forward_auth_header()
            response = requests.get(f"{LLM_PROXY_URL}/health", headers=headers)
            if response.status_code == 200:
                proxy_status = "connected"
            else:
                proxy_status = f"error: {response.status_code}"
        except Exception as e:
            proxy_status = f"error: {str(e)}"
            
        # Test tokenization via proxy if user_id is provided
        tokenization_test = None
        if user_id:
            try:
                tokenizer = get_tokenizer(user_id)
                test_text = "Hello, this is a test."
                tokens = tokenizer.tokenize(test_text)
                tokenization_test = {
                    "text": test_text,
                    "tokens": tokens,
                    "token_count": len(tokens)
                }
            except Exception as e:
                tokenization_test = {"error": str(e)}
        
        return jsonify({
            "status": "ok",
            "service": "docling",
            "proxy_status": proxy_status,
            "proxy_url": LLM_PROXY_URL,
            "tokenization_test": tokenization_test,
            "user_id": user_id
        })
    except Exception as e:
        logger.error(f"Error in test endpoint: {str(e)}")
        return jsonify({"error": f"Error in test endpoint: {str(e)}"}), 500

@docling_api.route('/extract', methods=['POST'])
def extract_document(params=None):
    """Extract content from a document URL or uploaded file"""
    try:
        data = request.get_json() if request.is_json else {}
        
        # Check if a URL is provided
        url = data.get('url')
        if url:
            # Extract from URL
            result = converter.convert(url)
            
            if not result.document:
                return jsonify({"error": "Failed to extract document from URL"}), 400
                
            # Return the document in the requested format
            output_format = data.get('format', 'markdown')
            if output_format == 'markdown':
                content = result.document.export_to_markdown()
                return jsonify({"content": content, "format": "markdown"})
            elif output_format == 'json':
                content = result.document.export_to_dict()
                return jsonify({"content": content, "format": "json"})
            else:
                return jsonify({"error": f"Unsupported output format: {output_format}"}), 400
        
        # Check if a file is uploaded
        elif 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "No file selected"}), 400
                
            # Save the file to a temporary location
            filename = secure_filename(file.filename)
            temp_dir = tempfile.mkdtemp()
            file_path = os.path.join(temp_dir, filename)
            file.save(file_path)
            
            # Store the temp file path for cleanup later
            file_id = os.path.basename(temp_dir)
            temp_files[file_id] = temp_dir
            
            # Extract from file
            result = converter.convert(file_path)
            
            if not result.document:
                return jsonify({"error": "Failed to extract document from file"}), 400
                
            # Return the document in the requested format
            output_format = request.form.get('format', 'markdown')
            if output_format == 'markdown':
                content = result.document.export_to_markdown()
                return jsonify({"content": content, "format": "markdown", "file_id": file_id})
            elif output_format == 'json':
                content = result.document.export_to_dict()
                return jsonify({"content": content, "format": "json", "file_id": file_id})
            else:
                return jsonify({"error": f"Unsupported output format: {output_format}"}), 400
        else:
            return jsonify({"error": "No URL or file provided"}), 400
    except Exception as e:
        logger.error(f"Error extracting document: {str(e)}")
        return jsonify({"error": f"Error extracting document: {str(e)}"}), 500

@docling_api.route('/extract/sitemap', methods=['POST'])
def extract_from_sitemap(params=None):
    """Extract content from multiple pages using a sitemap"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        # Get the base URL
        base_url = data.get('url')
        if not base_url:
            return jsonify({"error": "URL is required"}), 400
            
        # Get the sitemap filename (optional)
        sitemap_filename = data.get('sitemap_filename', 'sitemap.xml')
        
        # Get URLs from sitemap
        try:
            urls = get_sitemap_urls(base_url, sitemap_filename)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
            
        # Extract from URLs
        results = []
        for url in urls:
            try:
                result = converter.convert(url)
                if result.document:
                    # Add the document to the results
                    doc_info = {
                        "url": url,
                        "title": result.document.title if hasattr(result.document, 'title') else "",
                        "content": result.document.export_to_markdown()
                    }
                    results.append(doc_info)
            except Exception as e:
                logger.warning(f"Error extracting document from {url}: {str(e)}")
                continue
                
        return jsonify({"results": results, "total": len(results), "urls_processed": len(urls)})
    except Exception as e:
        logger.error(f"Error extracting from sitemap: {str(e)}")
        return jsonify({"error": f"Error extracting from sitemap: {str(e)}"}), 500

@docling_api.route('/chunk', methods=['POST'])
def chunk_document(params=None):
    """Chunk a document into smaller pieces"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        # Get the document content
        content = data.get('content')
        if not content:
            return jsonify({"error": "Document content is required"}), 400
            
        # Get the document format
        doc_format = data.get('format', 'markdown')
        
        # Create a temporary document
        with tempfile.NamedTemporaryFile(suffix=f".{doc_format}", mode="w", delete=False) as temp:
            temp.write(content)
            temp_path = temp.name
            
        # Extract the document
        result = converter.convert(temp_path)
        
        # Clean up the temporary file
        os.unlink(temp_path)
        
        if not result.document:
            return jsonify({"error": "Failed to process document content"}), 400
            
        # Get user_id from request if available
        user_id = request.form.get('user_id')
        
        # Get chunker for this user
        user_chunker = get_chunker(user_id)
        
        # Chunk the document
        chunk_iter = user_chunker.chunk(dl_doc=result.document)
        chunks = list(chunk_iter)
        
        # Convert chunks to a serializable format
        serialized_chunks = []
        for chunk in chunks:
            serialized_chunk = {
                "text": chunk.text,
                "metadata": {
                    "source": chunk.metadata.get("source", ""),
                    "page": chunk.metadata.get("page", 0),
                    "section": chunk.metadata.get("section", ""),
                    "tokens": len(tokenizer.tokenize(chunk.text))
                }
            }
            serialized_chunks.append(serialized_chunk)
            
        return jsonify({
            "chunks": serialized_chunks,
            "total": len(serialized_chunks)
        })
    except Exception as e:
        logger.error(f"Error chunking document: {str(e)}")
        return jsonify({"error": f"Error chunking document: {str(e)}"}), 500

@docling_api.route('/process', methods=['POST'])
def process_document(params=None):
    """Extract and chunk a document in one step"""
    try:
        data = request.get_json() if request.is_json else {}
        
        # Check if a URL is provided
        url = data.get('url')
        if url:
            # Extract from URL
            result = converter.convert(url)
            
            if not result.document:
                return jsonify({"error": "Failed to extract document from URL"}), 400
                
            # Get user_id from request if available
            user_id = data.get('user_id')
            
            # Get chunker for this user
            user_chunker = get_chunker(user_id)
            
            # Chunk the document
            chunk_iter = user_chunker.chunk(dl_doc=result.document)
            chunks = list(chunk_iter)
            
            # Convert chunks to a serializable format
            serialized_chunks = []
            for chunk in chunks:
                serialized_chunk = {
                    "text": chunk.text,
                    "metadata": {
                        "source": chunk.metadata.get("source", ""),
                        "page": chunk.metadata.get("page", 0),
                        "section": chunk.metadata.get("section", ""),
                        "tokens": len(get_tokenizer(user_id).tokenize(chunk.text))
                    }
                }
                serialized_chunks.append(serialized_chunk)
                
            # Get document metadata
            doc_metadata = {
                "url": url,
                "title": result.document.title if hasattr(result.document, 'title') else "",
                "pages": result.document.num_pages if hasattr(result.document, 'num_pages') else 1
            }
                
            return jsonify({
                "document": doc_metadata,
                "chunks": serialized_chunks,
                "total_chunks": len(serialized_chunks)
            })
        
        # Check if a file is uploaded
        elif 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "No file selected"}), 400
                
            # Save the file to a temporary location
            filename = secure_filename(file.filename)
            temp_dir = tempfile.mkdtemp()
            file_path = os.path.join(temp_dir, filename)
            file.save(file_path)
            
            # Store the temp file path for cleanup later
            file_id = os.path.basename(temp_dir)
            temp_files[file_id] = temp_dir
            
            # Extract from file
            result = converter.convert(file_path)
            
            if not result.document:
                return jsonify({"error": "Failed to extract document from file"}), 400
                
            # Get user_id from request if available
            user_id = request.form.get('user_id')
            
            # Get chunker for this user
            user_chunker = get_chunker(user_id)
            
            # Chunk the document
            chunk_iter = user_chunker.chunk(dl_doc=result.document)
            chunks = list(chunk_iter)
            
            # Convert chunks to a serializable format
            serialized_chunks = []
            for chunk in chunks:
                serialized_chunk = {
                    "text": chunk.text,
                    "metadata": {
                        "source": filename,
                        "page": chunk.metadata.get("page", 0),
                        "section": chunk.metadata.get("section", ""),
                        "tokens": len(get_tokenizer(user_id).tokenize(chunk.text))
                    }
                }
                serialized_chunks.append(serialized_chunk)
                
            # Get document metadata
            doc_metadata = {
                "filename": filename,
                "title": result.document.title if hasattr(result.document, 'title') else "",
                "pages": result.document.num_pages if hasattr(result.document, 'num_pages') else 1
            }
                
            return jsonify({
                "document": doc_metadata,
                "chunks": serialized_chunks,
                "total_chunks": len(serialized_chunks),
                "file_id": file_id
            })
        else:
            return jsonify({"error": "No URL or file provided"}), 400
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        return jsonify({"error": f"Error processing document: {str(e)}"}), 500

@docling_api.route('/cleanup/<file_id>', methods=['DELETE'])
def cleanup_temp_files(file_id):
    """Clean up temporary files"""
    try:
        if file_id in temp_files:
            temp_dir = temp_files[file_id]
            import shutil
            shutil.rmtree(temp_dir)
            del temp_files[file_id]
            return jsonify({"message": f"Temporary files for {file_id} cleaned up"})
        else:
            return jsonify({"error": f"No temporary files found for {file_id}"}), 404
    except Exception as e:
        logger.error(f"Error cleaning up temporary files: {str(e)}")
        return jsonify({"error": f"Error cleaning up temporary files: {str(e)}"}), 500

# Function to store embeddings in the data store
def store_embedding_in_data_store(embedding, metadata, user_id=None):
    """
    Store an embedding in the data store
    
    Args:
        embedding: The embedding vector
        metadata: Metadata for the embedding
        user_id: Optional user ID for authentication
        
    Returns:
        The stored record or None if failed
    """
    try:
        # Get authentication headers
        headers = get_auth_headers(user_id)
        
        # Prepare the payload
        payload = {
            "embedding": embedding,
            "metadata": metadata
        }
        
        # Send the request to the data store
        response = requests.post(
            f"{DATA_STORE_URL}/api/data-store/records",
            json=payload,
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Error storing embedding: {response.status_code} {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error storing embedding: {str(e)}")
        return None

# Function to search embeddings in the data store
def search_embeddings_in_data_store(query_embedding, metadata_filter=None, limit=10, user_id=None):
    """
    Search for similar embeddings in the data store
    
    Args:
        query_embedding: The query embedding vector
        metadata_filter: Optional metadata filter
        limit: Maximum number of results to return
        user_id: Optional user ID for authentication
        
    Returns:
        List of similar records or None if failed
    """
    try:
        # Get authentication headers
        headers = get_auth_headers(user_id)
        
        # Prepare the payload
        payload = {
            "embedding": query_embedding,
            "metadata_filter": metadata_filter,
            "limit": limit
        }
        
        # Send the request to the data store
        response = requests.post(
            f"{DATA_STORE_URL}/api/data-store/search",
            json=payload,
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Error searching embeddings: {response.status_code} {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error searching embeddings: {str(e)}")
        return []

# Create a Flask app for standalone usage
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Enable CORS for all routes
app.register_blueprint(docling_api)  # Remove url_prefix to keep /mcp at root

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Docling API Server')
    parser.add_argument('--port', type=int, default=3600, help='Port to run the server on')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to run the server on')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    print(f"Starting Docling API server on {args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)