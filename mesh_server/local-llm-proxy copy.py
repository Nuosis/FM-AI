#!/usr/bin/env python3
"""
Unified Local Proxy Server for AI Tools

This script provides a unified local proxy server that:
1. Proxies requests to local LLMs (Ollama, LM Studio, OpenAI-compatible endpoints)
2. Executes user-supplied Python code securely via a /execute endpoint
3. Provides a /health endpoint for frontend detection

Usage:
  python local-llm-proxy.py [options]

Options:
  --port <number>            Proxy server port (default: 3500)
  --ollama-port <number>     Ollama port (default: 11434)
  --lmstudio-port <number>   LM Studio port (default: 1234)
  --ollama-base-url <url>    Custom Ollama base URL
  --lmstudio-base-url <url>  Custom LM Studio base URL
  --debug                    Enable debug logging
"""

from flask import Flask, request, jsonify, Response
import requests
import subprocess
import tempfile
import os
import argparse
import sys
import logging
import re
import json
import ast
import inspect

app = Flask(__name__)

# Default configuration
PROXY_PORT = 3500
OLLAMA_PORT = 11434
LMSTUDIO_PORT = 1234
OLLAMA_BASE_URL = None
LMSTUDIO_BASE_URL = None
DEBUG = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('local-llm-proxy')

@app.after_request
def add_cors_headers(response):
    """Add CORS headers to all responses"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Origin'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = '86400'
    return response

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for frontend detection"""
    return 'ok', 200

def extract_function_info(code):
    """
    Extract function name and parameters from Python code.
    Returns a tuple of (function_name, parameters_list, has_tool_decorator)
    """
    try:
        # Parse the code into an AST
        tree = ast.parse(code)
        
        # Look for function definitions
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Check if the function has a @tool() decorator
                has_tool_decorator = False
                for decorator in node.decorator_list:
                    if isinstance(decorator, ast.Call) and getattr(decorator.func, 'id', '') == 'tool':
                        has_tool_decorator = True
                    elif isinstance(decorator, ast.Name) and decorator.id == 'tool':
                        has_tool_decorator = True
                
                # Get function name
                function_name = node.name
                
                # Get parameters
                params = []
                for arg in node.args.args:
                    if arg.arg != 'self':  # Skip 'self' parameter for methods
                        params.append(arg.arg)
                
                # Return the first function we find (assuming there's only one main function)
                return function_name, params, has_tool_decorator
        
        # If no function definition found
        return None, [], False
    except SyntaxError as e:
        logger.error(f"Syntax error in code: {e}")
        return None, [], False
    except Exception as e:
        logger.error(f"Error parsing code: {e}")
        return None, [], False

def generate_wrapper_code(tool_module_path, function_name, params, input_data):
    """
    Generate a wrapper script that imports the function and calls it with the input data.
    """
    # Get the module name from the file path (without .py extension)
    module_name = os.path.basename(tool_module_path).replace('.py', '')
    
    # Create the wrapper code
    wrapper_code = f"""
import sys
import json
import importlib.util

# Load the module from file
spec = importlib.util.spec_from_file_location("{module_name}", "{tool_module_path}")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

# Get the function
func = getattr(module, "{function_name}")

# Prepare arguments
input_data = {json.dumps(input_data)}
args = []
kwargs = {{}}

# Match input data to function parameters
if isinstance(input_data, dict):
    # For named parameters
    kwargs = {{k: v for k, v in input_data.items() if k in {params}}}
    
    # For positional parameters (if any)
    for param in {params}:
        if param in input_data:
            args.append(input_data[param])
            # Remove from kwargs to avoid duplicate
            kwargs.pop(param, None)
else:
    # If input is not a dict, pass it as the first argument
    args = [input_data]

# Call the function
try:
    result = func(*args, **kwargs)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({{"error": str(e)}}))
"""
    return wrapper_code

@app.route('/execute', methods=['POST'])
def execute():
    """Execute user-supplied Python code"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data provided', 'success': False}), 400
    
    code = data.get('code')
    input_data = data.get('input', {})
    
    if not code:
        return jsonify({'error': 'No code provided', 'success': False}), 400
    
    logger.info(f"Executing code with input: {input_data}")
    
    # Create a temporary directory to work in
    temp_dir = tempfile.mkdtemp()
    tool_code_path = os.path.join(temp_dir, "tool_code.py")
    wrapper_code_path = os.path.join(temp_dir, "wrapper.py")
    
    try:
        # Save the tool code to a file
        with open(tool_code_path, 'w') as f:
            f.write(code)
        
        # Extract function information
        function_name, params, has_tool_decorator = extract_function_info(code)
        
        if not function_name:
            return jsonify({
                'output': '',
                'error': 'Could not find a valid function definition in the code',
                'success': False
            })
        
        logger.info(f"Found function: {function_name} with parameters: {params}")
        
        # Generate wrapper code
        wrapper_code = generate_wrapper_code(tool_code_path, function_name, params, input_data)
        
        # Save wrapper code to a file
        with open(wrapper_code_path, 'w') as f:
            f.write(wrapper_code)
        
        # Execute the wrapper code
        result = subprocess.run(
            ['python3', wrapper_code_path],
            capture_output=True,
            text=True,
            timeout=10  # 10 second timeout
        )
        
        # Parse the output
        output = result.stdout.strip()
        error = result.stderr.strip()
        
        # Try to parse the output as JSON
        try:
            if output:
                parsed_output = json.loads(output)
                # If the output is a dict with an 'error' key, treat it as an error
                if isinstance(parsed_output, dict) and 'error' in parsed_output:
                    error = parsed_output['error']
                    output = ''
                else:
                    # Convert back to string for consistent return format
                    output = json.dumps(parsed_output)
        except json.JSONDecodeError:
            # If output is not valid JSON, keep it as is
            pass
        
        return jsonify({
            'output': output,
            'error': error,
            'success': result.returncode == 0 and not error
        })
    except subprocess.TimeoutExpired:
        return jsonify({
            'output': '',
            'error': 'Execution timed out after 10 seconds',
            'success': False
        })
    except Exception as e:
        logger.error(f"Error executing code: {str(e)}")
        return jsonify({
            'output': '',
            'error': str(e),
            'success': False
        })
    finally:
        # Clean up the temporary files
        if os.path.exists(tool_code_path):
            os.remove(tool_code_path)
        if os.path.exists(wrapper_code_path):
            os.remove(wrapper_code_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)

def proxy_request(target_url):
    """Proxy a request to a target URL"""
    method = request.method
    headers = {key: value for key, value in request.headers if key.lower() != 'host'}
    data = request.get_data()
    
    logger.debug(f"Proxying {method} request to {target_url}")
    
    try:
        resp = requests.request(
            method, 
            target_url, 
            headers=headers, 
            data=data, 
            stream=True,
            timeout=30
        )
        
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.raw.headers.items() 
                  if name.lower() not in excluded_headers]
        
        return Response(resp.content, resp.status_code, headers)
    except requests.RequestException as e:
        logger.error(f"Proxy error: {str(e)}")
        return jsonify({
            'error': f"Failed to proxy request: {str(e)}",
            'status': 'error'
        }), 502

@app.route('/ollama/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def proxy_ollama(path):
    """Proxy requests to Ollama"""
    base = OLLAMA_BASE_URL or f'http://localhost:{OLLAMA_PORT}'
    return proxy_request(f'{base}/{path}')

@app.route('/lmstudio/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def proxy_lmstudio(path):
    """Proxy requests to LM Studio"""
    base = LMSTUDIO_BASE_URL or f'http://localhost:{LMSTUDIO_PORT}'
    return proxy_request(f'{base}/{path}')

@app.route('/v1/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def proxy_v1(path):
    """Proxy requests to OpenAI-compatible endpoints (LM Studio)"""
    base = LMSTUDIO_BASE_URL or f'http://localhost:{LMSTUDIO_PORT}'
    return proxy_request(f'{base}/v1/{path}')

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Unified Local Proxy Server for AI Tools')
    
    parser.add_argument('--port', type=int, default=PROXY_PORT,
                        help=f'Proxy server port (default: {PROXY_PORT})')
    parser.add_argument('--ollama-port', type=int, default=OLLAMA_PORT,
                        help=f'Ollama port (default: {OLLAMA_PORT})')
    parser.add_argument('--lmstudio-port', type=int, default=LMSTUDIO_PORT,
                        help=f'LM Studio port (default: {LMSTUDIO_PORT})')
    parser.add_argument('--ollama-base-url', type=str,
                        help='Custom Ollama base URL')
    parser.add_argument('--lmstudio-base-url', type=str,
                        help='Custom LM Studio base URL')
    parser.add_argument('--debug', action='store_true',
                        help='Enable debug logging')
    
    return parser.parse_args()

def print_startup_message(port):
    """Print a startup message with ASCII art"""
    print("\n" + "=" * 80)
    print("""
    _    _       _  __ _          _   _    _       _____                      
   | |  | |     (_)/ _(_)        | | | |  | |     |  __ \                     
   | |  | |_ __  _| |_ _  ___  __| | | |  | |_ __ | |__) | __ _____  ___   _ 
   | |  | | '_ \| |  _| |/ _ \/ _` | | |  | | '_ \|  ___/ '__/ _ \ \/ / | | |
   | |__| | | | | | | | |  __/ (_| | | |__| | |_) | |   | | | (_) >  <| |_| |
    \____/|_| |_|_|_| |_|\___|\__,_|  \____/| .__/|_|   |_|  \___/_/\_\\__, |
                                            | |                         __/ |
                                            |_|                        |___/ 
    """)
    print("=" * 80)
    print(f"\n🚀 Unified Local Proxy Server running at http://localhost:{port}")
    print("\n🔄 Proxying requests to:")
    print(f"   - Ollama: {OLLAMA_BASE_URL or f'http://localhost:{OLLAMA_PORT}'}")
    print(f"   - LM Studio: {LMSTUDIO_BASE_URL or f'http://localhost:{LMSTUDIO_PORT}'}")
    print("\n⚠️  WARNING: This server executes arbitrary Python code. Only run code you trust.")
    print("\n💡 Use Ctrl+C to stop the server")
    print("\n" + "=" * 80 + "\n")

if __name__ == '__main__':
    # Parse command line arguments
    args = parse_arguments()
    
    # Update configuration from arguments
    PROXY_PORT = args.port
    OLLAMA_PORT = args.ollama_port
    LMSTUDIO_PORT = args.lmstudio_port
    OLLAMA_BASE_URL = args.ollama_base_url
    LMSTUDIO_BASE_URL = args.lmstudio_base_url
    DEBUG = args.debug
    
    # Set logging level based on debug flag
    if DEBUG:
        logger.setLevel(logging.DEBUG)
        app.logger.setLevel(logging.DEBUG)
    
    # Print startup message
    print_startup_message(PROXY_PORT)
    
    # Run the Flask app
    app.run(host='localhost', port=PROXY_PORT, debug=DEBUG)