#!/usr/bin/env python3
"""
Unified Local Proxy Server for LLMs and Python Code Execution

This script provides a unified local proxy server that:
1. Proxies requests to local LLMs (Ollama, LM Studio, OpenAI-compatible endpoints)
2. Executes user-supplied Python code securely via a /execute endpoint

Usage:
  python local-llm-proxy.py [options]

Options:
  --port PORT                 Proxy server port (default: 3500)
  --ollama-port PORT          Ollama port (default: 11434)
  --lmstudio-port PORT        LM Studio port (default: 1234)
  --ollama-base-url URL       Custom Ollama base URL
  --lmstudio-base-url URL     Custom LM Studio base URL
  --debug                     Enable debug logging
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import tempfile
from urllib.parse import urlparse

try:
    from flask import Flask, request, jsonify, Response
    import requests
except ImportError:
    print("Required packages not found. Installing flask and requests...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask", "requests"])
    from flask import Flask, request, jsonify, Response
    import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('local-llm-proxy')

# Create Flask app
app = Flask(__name__)

# Default configuration
config = {
    'PROXY_PORT': 3500,
    'OLLAMA_PORT': 11434,
    'LMSTUDIO_PORT': 1234,
    'OLLAMA_BASE_URL': None,
    'LMSTUDIO_BASE_URL': None,
    'DEBUG': False
}

def parse_arguments():
    """Parse command line arguments and update configuration."""
    parser = argparse.ArgumentParser(description='Unified Local Proxy Server for LLMs and Python Code Execution')
    parser.add_argument('--port', type=int, default=config['PROXY_PORT'],
                        help=f'Proxy server port (default: {config["PROXY_PORT"]})')
    parser.add_argument('--ollama-port', type=int, default=config['OLLAMA_PORT'],
                        help=f'Ollama port (default: {config["OLLAMA_PORT"]})')
    parser.add_argument('--lmstudio-port', type=int, default=config['LMSTUDIO_PORT'],
                        help=f'LM Studio port (default: {config["LMSTUDIO_PORT"]})')
    parser.add_argument('--ollama-base-url', type=str,
                        help='Custom Ollama base URL')
    parser.add_argument('--lmstudio-base-url', type=str,
                        help='Custom LM Studio base URL')
    parser.add_argument('--debug', action='store_true',
                        help='Enable debug logging')
    
    args = parser.parse_args()
    
    # Update configuration with command line arguments
    config['PROXY_PORT'] = args.port
    config['OLLAMA_PORT'] = args.ollama_port
    config['LMSTUDIO_PORT'] = args.lmstudio_port
    config['OLLAMA_BASE_URL'] = args.ollama_base_url
    config['LMSTUDIO_BASE_URL'] = args.lmstudio_base_url
    config['DEBUG'] = args.debug
    
    if config['DEBUG']:
        logger.setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")
        logger.debug(f"Configuration: {config}")

@app.after_request
def add_cors_headers(response):
    """Add CORS headers to all responses."""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Origin'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = '86400'
    return response

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return 'ok', 200

@app.route('/execute', methods=['POST'])
def execute():
    """Execute Python code in a subprocess."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided', 'success': False}), 400
        
        code = data.get('code')
        input_data = data.get('input', {})
        
        if not code:
            return jsonify({'error': 'No code provided', 'success': False}), 400
        
        logger.debug(f"Executing code: {code[:100]}...")
        logger.debug(f"Input data: {input_data}")
        
        # Create a temporary file for the code
        with tempfile.NamedTemporaryFile('w', delete=False, suffix='.py') as f:
            f.write(code)
            code_path = f.name
        
        try:
            # Run the code in a subprocess with timeout
            result = subprocess.run(
                [sys.executable, code_path],
                input=json.dumps(input_data),
                capture_output=True,
                text=True,
                timeout=10  # 10 second timeout
            )
            
            logger.debug(f"Execution completed with return code: {result.returncode}")
            if result.stdout:
                logger.debug(f"Stdout: {result.stdout[:100]}...")
            if result.stderr:
                logger.debug(f"Stderr: {result.stderr[:100]}...")
            
            return jsonify({
                'output': result.stdout,
                'error': result.stderr,
                'success': result.returncode == 0
            })
        except subprocess.TimeoutExpired:
            return jsonify({
                'output': '',
                'error': 'Execution timed out after 10 seconds',
                'success': False
            })
        except Exception as e:
            return jsonify({
                'output': '',
                'error': str(e),
                'success': False
            })
        finally:
            # Clean up the temporary file
            try:
                os.remove(code_path)
            except Exception as e:
                logger.error(f"Error removing temporary file: {e}")
    except Exception as e:
        logger.error(f"Error in execute endpoint: {e}")
        return jsonify({
            'output': '',
            'error': f"Server error: {str(e)}",
            'success': False
        }), 500

def proxy_request(target_url):
    """Proxy a request to the target URL."""
    method = request.method
    headers = {key: value for key, value in request.headers.items() if key.lower() != 'host'}
    data = request.get_data()
    
    logger.debug(f"Proxying {method} request to {target_url}")
    logger.debug(f"Headers: {headers}")
    
    try:
        resp = requests.request(
            method=method,
            url=target_url,
            headers=headers,
            data=data,
            stream=True,
            timeout=60  # 60 second timeout
        )
        
        # Filter out headers that might cause issues
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for name, value in resp.raw.headers.items() 
                  if name.lower() not in excluded_headers]
        
        logger.debug(f"Received response from {target_url} with status code: {resp.status_code}")
        
        return Response(resp.content, resp.status_code, headers)
    except requests.RequestException as e:
        logger.error(f"Error proxying request to {target_url}: {e}")
        return jsonify({
            'error': f"Failed to connect to target: {str(e)}"
        }), 502

@app.route('/ollama/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def proxy_ollama(path):
    """Proxy requests to Ollama."""
    base = config['OLLAMA_BASE_URL'] or f'http://localhost:{config["OLLAMA_PORT"]}'
    target_url = f'{base}/{path}'
    logger.info(f"Proxying Ollama request to: {target_url}")
    return proxy_request(target_url)

@app.route('/lmstudio/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def proxy_lmstudio(path):
    """Proxy requests to LM Studio."""
    base = config['LMSTUDIO_BASE_URL'] or f'http://localhost:{config["LMSTUDIO_PORT"]}'
    target_url = f'{base}/{path}'
    logger.info(f"Proxying LM Studio request to: {target_url}")
    return proxy_request(target_url)

@app.route('/v1/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def proxy_v1(path):
    """Proxy OpenAI-compatible API requests (typically to LM Studio)."""
    base = config['LMSTUDIO_BASE_URL'] or f'http://localhost:{config["LMSTUDIO_PORT"]}'
    target_url = f'{base}/v1/{path}'
    logger.info(f"Proxying OpenAI-compatible request to: {target_url}")
    return proxy_request(target_url)

def print_banner():
    """Print a banner with server information."""
    ollama_url = config['OLLAMA_BASE_URL'] or f'http://localhost:{config["OLLAMA_PORT"]}'
    lmstudio_url = config['LMSTUDIO_BASE_URL'] or f'http://localhost:{config["LMSTUDIO_PORT"]}'
    
    banner = f"""
╔════════════════════════════════════════════════════════════════╗
║                Unified Local Proxy Server                      ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Proxy server running on http://localhost:{config['PROXY_PORT']}                ║
║                                                                ║
║  Routes:                                                       ║
║    - Ollama:    http://localhost:{config['PROXY_PORT']}/ollama/*                ║
║    - LM Studio: http://localhost:{config['PROXY_PORT']}/lmstudio/*              ║
║    - OpenAI:    http://localhost:{config['PROXY_PORT']}/v1/*                    ║
║    - Execute:   http://localhost:{config['PROXY_PORT']}/execute                 ║
║    - Health:    http://localhost:{config['PROXY_PORT']}/health                  ║
║                                                                ║
║  Target Services:                                              ║
║    - Ollama:    {ollama_url}
║    - LM Studio: {lmstudio_url}
║                                                                ║
║  The proxy will automatically add CORS headers to all responses.║
║                                                                ║
║  WARNING: The /execute endpoint runs Python code on your machine.║
║           Only use with code you trust!                        ║
║                                                                ║
║  Press Ctrl+C to stop the server.                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"""
    print(banner)

def main():
    """Main function to run the proxy server."""
    # Parse command line arguments
    parse_arguments()
    
    # Print warning about code execution
    print("\n⚠️  WARNING: This server can execute arbitrary Python code on your machine.")
    print("⚠️  Only use with code you trust and understand the risks!\n")
    
    # Print the banner
    print_banner()
    
    # Run the Flask app
    app.run(
        host='localhost',  # Only listen on localhost for security
        port=config['PROXY_PORT'],
        debug=config['DEBUG'],
        use_reloader=False,  # Disable reloader to avoid duplicate processes
        threaded=True  # Enable threading for concurrent requests
    )

if __name__ == '__main__':
    main()