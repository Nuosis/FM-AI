#!/usr/bin/env python3
"""
Unified Local Proxy Server for AI Tools

This script provides a unified local proxy server that:
1. Proxies requests to multiple LLM providers (OpenAI, Anthropic, Gemini, Ollama, LM Studio)
2. Executes user-supplied Python code securely via a /execute endpoint
3. Provides a /health endpoint for frontend detection
4. Supports authentication, input validation, and rate limiting
5. Provides a Data Store API for vector storage and retrieval

Usage:
  python local-llm-proxy.py [options]

Options:
  --port <number>            Proxy server port (default: 3500)
  --ollama-port <number>     Ollama port (default: 11434)
  --lmstudio-port <number>   LM Studio port (default: 1234)
  --ollama-base-url <url>    Custom Ollama base URL
  --lmstudio-base-url <url>  Custom LM Studio base URL
  --openai-api-key <key>     OpenAI API key
  --anthropic-api-key <key>  Anthropic API key
  --gemini-api-key <key>     Gemini API key
  --jwt-secret <secret>      Secret for JWT verification (optional)
  --enable-auth              Enable JWT authentication
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
import time
import jwt
from functools import wraps
from datetime import datetime, timedelta
import supabase
from flask_cors import CORS

# Supabase client for API key management
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase_client = None

# Initialize Supabase client if credentials are available
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("Supabase client initialized successfully")
    except ImportError:
        print("Warning: supabase-py package not installed. Run 'pip install supabase' to enable Supabase integration.")
    except Exception as e:
        print(f"Error initializing Supabase client: {str(e)}")

# Import the Data Store API
try:
    from data_store import data_store_api
except ImportError:
    # If the data_store module is not found, create a placeholder
    from flask import Blueprint
    data_store_api = Blueprint('data_store_api', __name__)
    print("Warning: data_store module not found. Data Store API will not be available.")

# Configuration for Data Store
DATA_STORE_URL = os.environ.get('DATA_STORE_URL', 'http://data-store:3550')

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Default configuration
PROXY_PORT = 3500
OLLAMA_PORT = 11434
LMSTUDIO_PORT = 1234
OLLAMA_BASE_URL = None
LMSTUDIO_BASE_URL = None
JWT_SECRET = os.environ.get("JWT_SECRET")
ENABLE_AUTH = False
DEBUG = False

# Provider configuration
PROVIDER_CONFIG = {
    "openai": {
        "endpoint": "https://api.openai.com/v1",
        "key": None,  # Will be fetched from Supabase or request
    },
    "anthropic": {
        "endpoint": "https://api.anthropic.com/v1",
        "key": None,  # Will be fetched from Supabase or request
    },
    "gemini": {
        "endpoint": "https://generativelanguage.googleapis.com/v1",
        "key": None,  # Will be fetched from Supabase or request
    },
    "lmstudio": {
        "endpoint": None,  # Will be set based on command line args
        "key": None,  # Local, no key
    },
    "ollama": {
        "endpoint": None,  # Will be set based on command line args
        "key": None,  # Local, no key
    },
}

# Rate limiting configuration
RATE_LIMIT = 60  # requests per minute per user/IP
rate_limit_map = {}  # Maps user/IP to {count, last_reset}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('local-llm-proxy')

#
# UTILITY FUNCTIONS
#

# Function to get API key from Supabase key_store table
def get_api_key_from_supabase(user_id, provider):
    """
    Fetch API key for a specific provider from Supabase based on user_id
    Returns the API key if found, None otherwise
    """
    logger.debug(f"get_api_key_from_supabase called with user_id={user_id}, provider={provider}")
    
    if not supabase_client:
        logger.debug("supabase_client is not initialized")
        logger.warning("Supabase client not initialized, cannot fetch API keys")
        return None
        
    try:
        # Query the key_store table for the user's API key
        logger.debug(f"Querying key_store table for user_id={user_id}, provider={provider}")
        response = supabase_client.table('key_store').select('api_key').eq('user_id', user_id).eq('provider', provider).execute()
        
        logger.debug(f"Raw response type: {type(response)}")
        logger.debug(f"Raw response: {response}")
        
        # Handle case where response might be a string
        if isinstance(response, str):
            logger.debug(f"Response is a string, attempting to parse as JSON")
            try:
                response_data = json.loads(response)
                logger.debug(f"Parsed JSON type: {type(response_data)}")
                logger.debug(f"Parsed JSON: {response_data}")
                if isinstance(response_data, dict) and 'data' in response_data:
                    response = type('obj', (object,), {'data': response_data['data']})
                    logger.debug(f"Created response object with data: {response.data}")
                else:
                    logger.debug(f"Unexpected response format after parsing")
                    logger.warning(f"Unexpected response format from Supabase: {response}")
                    return None
            except json.JSONDecodeError:
                logger.debug(f"Failed to parse response as JSON")
                logger.warning(f"Failed to parse response as JSON: {response}")
                return None
        
        # Now safely access response.data
        logger.debug(f"Checking if response has data attribute: {hasattr(response, 'data')}")
        if hasattr(response, 'data'):
            logger.debug(f"response.data type: {type(response.data)}")
            logger.debug(f"response.data: {response.data}")
        
        if hasattr(response, 'data') and response.data and len(response.data) > 0:
            logger.debug(f"response.data[0] type: {type(response.data[0])}")
            logger.debug(f"response.data[0]: {response.data[0]}")
            
            if isinstance(response.data[0], dict) and 'api_key' in response.data[0]:
                api_key = response.data[0]['api_key']
                # Mask the API key in logs for security
                masked_key = f"{api_key[:4]}{'*' * (len(api_key) - 8)}{api_key[-4:]}" if len(api_key) > 8 else "****"
                logger.debug(f"Found API key: {masked_key}")
                return api_key
            else:
                logger.debug(f"Response data does not contain api_key")
                logger.warning(f"Response data does not contain api_key: {response.data}")
                return None
        else:
            logger.debug(f"No API key found for user {user_id} and provider {provider}")
            logger.warning(f"No API key found for user {user_id} and provider {provider}")
            return None
    except Exception as e:
        logger.error(f"Error fetching API key from Supabase: {str(e)}")
        return None

# Authentication decorator
def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not ENABLE_AUTH:
            return f(*args, **kwargs)
            
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized', 'message': 'Missing or invalid Authorization header'}), 401
            
        token = auth_header.replace('Bearer ', '')
        
        try:
            # Verify the JWT token
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            # Add user info to request context
            request.user_id = payload.get('sub')
            request.user_email = payload.get('email')
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Unauthorized', 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Unauthorized', 'message': 'Invalid token'}), 401
            
        return f(*args, **kwargs)
    return decorated

# Function to create a service-to-service JWT token
def create_service_token(user_id=None):
    """
    Create a service-to-service JWT token
    
    Args:
        user_id: Optional user_id to include in the token for user-scoped operations
        
    Returns:
        JWT token string
    """
    if not JWT_SECRET:
        logger.error("JWT_SECRET environment variable not set")
        raise ValueError("JWT_SECRET not configured")
        
    payload = {
        'is_service': True,
        'service_name': 'llm-proxy',
        'exp': datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    }
    
    # Include user_id if provided
    if user_id:
        payload['user_id'] = user_id
        
    # Create the JWT token
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    
    return token

# Function to get authentication headers for service-to-service calls
def get_auth_headers(user_id=None):
    """
    Get headers with Authorization for service-to-service calls
    
    This function:
    1. Tries to forward the existing Authorization header if available
    2. Falls back to creating a service token if no Authorization header is available
    
    Args:
        user_id: Optional user_id to include in the service token
        
    Returns:
        Dictionary with headers including the Authorization header
    """
    headers = {'Content-Type': 'application/json'}
    
    # Try to forward the existing Authorization header
    auth_header = request.headers.get('Authorization') if request else None
    if auth_header:
        headers['Authorization'] = auth_header
        return headers
        
    # If no Authorization header is available, create a service token
    try:
        token = create_service_token(user_id)
        headers['Authorization'] = f'Bearer {token}'
    except Exception as e:
        logger.error(f"Error creating service token: {str(e)}")
        # Continue without Authorization header
        
    return headers

# Function to create a service-to-service JWT token
def create_service_token(user_id=None):
    """
    Create a service-to-service JWT token
    
    Args:
        user_id: Optional user_id to include in the token for user-scoped operations
        
    Returns:
        JWT token string
    """
    if not JWT_SECRET:
        logger.error("JWT_SECRET environment variable not set")
        raise ValueError("JWT_SECRET not configured")
        
    payload = {
        'is_service': True,
        'service_name': 'llm-proxy',
        'exp': datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    }
    
    # Include user_id if provided
    if user_id:
        payload['user_id'] = user_id
        
    # Create the JWT token
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    
    return token

# Function to get authentication headers for service-to-service calls
def get_auth_headers(user_id=None):
    """
    Get headers with Authorization for service-to-service calls
    
    This function:
    1. Tries to forward the existing Authorization header if available
    2. Falls back to creating a service token if no Authorization header is available
    
    Args:
        user_id: Optional user_id to include in the service token
        
    Returns:
        Dictionary with headers including the Authorization header
    """
    headers = {'Content-Type': 'application/json'}
    
    # Try to forward the existing Authorization header
    auth_header = request.headers.get('Authorization') if request else None
    if auth_header:
        headers['Authorization'] = auth_header
        return headers
        
    # If no Authorization header is available, create a service token
    try:
        token = create_service_token(user_id)
        headers['Authorization'] = f'Bearer {token}'
    except Exception as e:
        logger.error(f"Error creating service token: {str(e)}")
        # Continue without Authorization header
        
    return headers

# Rate limiting function
def rate_limit(identifier):
    """
    Check if the request exceeds rate limits
    Returns True if request is allowed, False if rate limit exceeded
    """
    now = time.time()
    window_seconds = 60  # 1 minute window
    
    if identifier not in rate_limit_map:
        rate_limit_map[identifier] = {'count': 1, 'last_reset': now}
        return True
        
    entry = rate_limit_map[identifier]
    
    # Reset counter if window has passed
    if now - entry['last_reset'] > window_seconds:
        entry['count'] = 1
        entry['last_reset'] = now
    else:
        entry['count'] += 1
        
    rate_limit_map[identifier] = entry
    
    # Check if rate limit exceeded
    return entry['count'] <= RATE_LIMIT

# Input validation function
def validate_llm_input(provider, body):
    """
    Validate the input for LLM requests
    Returns error message if invalid, None if valid
    """
    if not provider or provider not in PROVIDER_CONFIG:
        return "Invalid provider"
        
    if not body:
        return "Missing request body"
        
    if 'type' not in body or body['type'] not in ["chat", "embeddings", "models", "tokenize"]:
        return "Invalid type (must be 'chat', 'embeddings', 'models', or 'tokenize')"
        
    if body['type'] == "chat" and 'messages' not in body:
        return "Missing 'messages' for chat request"
        
    if body['type'] == "embeddings" and 'input' not in body:
        return "Missing 'input' for embeddings request"
        
    if (body['type'] == "chat" or body['type'] == "embeddings") and 'model' not in body:
        return "Missing 'model' parameter"
        
    if body['type'] == "tokenize" and 'text' not in body:
        return "Missing 'text' for tokenize request"
        
    if body['type'] == "tokenize" and 'model' not in body:
        return "Missing 'model' parameter for tokenize request"
        
    return None

# Format LLM response based on provider and request type
def format_llm_response(provider, req_type, data):
    """Format the response from the provider API"""
    if req_type == "chat":
        if provider == "openai":
            return {
                'content': data.get('choices', [{}])[0].get('message', {}).get('content', "No response")
            }
        elif provider == "anthropic":
            return {
                'content': data.get('content', [{}])[0].get('text', "No response")
            }
        elif provider == "gemini":
            return {
                'content': data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', "No response")
            }
        elif provider in ["lmstudio", "ollama"]:
            content = data.get('choices', [{}])[0].get('message', {}).get('content')
            if content is None:
                content = data.get('message', {}).get('content', "No response")
            return {'content': content}
    
    # For embeddings and models, return the raw response
    return data

# Proxy request to LLM provider
def proxy_llm_request(provider, req_type, body, api_key=None):
    """Proxy a request to an LLM provider"""
    config = PROVIDER_CONFIG[provider]
    url = config['endpoint']
    method = "POST"
    req_body = {}
    headers = {'Content-Type': 'application/json'}
    
    # Use provided API key - no fallback to environment variables
    if not api_key and provider not in ["lmstudio", "ollama"]:
        raise ValueError(f"No API key provided for {provider}")
        
    provider_key = api_key
    
    # Configure request based on provider and request type
    if provider == "openai":
        if req_type == "chat":
            url += "/chat/completions"
            req_body = {
                "model": body.get('model'),
                "messages": body.get('messages'),
                **(body.get('options', {}))
            }
        elif req_type == "embeddings":
            url += "/embeddings"
            req_body = {
                "model": body.get('model'),
                "input": body.get('input'),
                **(body.get('options', {}))
            }
        elif req_type == "tokenize":
            url += "/tokenize"
            req_body = {
                "model": body.get('model'),
                "text": body.get('text'),
                **(body.get('options', {}))
            }
            # For OpenAI, we'll use their tiktoken library on the proxy side
            # This is a special case that doesn't actually call the OpenAI API
            # but uses their tokenizer locally
            try:
                import tiktoken
                encoding = tiktoken.encoding_for_model(body.get('model', 'gpt-4.1'))
                tokens = encoding.encode(body.get('text', ''))
                # Return early with the tokenization result
                return {
                    "status": 200,
                    "data": {
                        "tokens": tokens,
                        "token_count": len(tokens)
                    }
                }
            except ImportError:
                logger.warning("tiktoken not installed, falling back to approximate tokenization")
                # Simple fallback if tiktoken is not available
                tokens = body.get('text', '').split()
                return {
                    "status": 200,
                    "data": {
                        "tokens": tokens,
                        "token_count": len(tokens)
                    }
                }
        elif req_type == "models":
            url += "/models"
            method = "GET"
        
        headers["Authorization"] = f"Bearer {provider_key}"
        headers["OpenAI-Beta"] = "assistants=v1"
        
    elif provider == "anthropic":
        if req_type == "chat":
            url += "/messages"
            req_body = {
                "model": body.get('model'),
                "messages": body.get('messages'),
                **(body.get('options', {}))
            }
        elif req_type == "embeddings":
            url += "/embeddings"
            req_body = {
                "model": body.get('model'),
                "input": body.get('input'),
                **(body.get('options', {}))
            }
        elif req_type == "tokenize":
            # For Anthropic, we'll use a simple tokenization approach
            # as they don't have a public tokenization endpoint
            tokens = body.get('text', '').split()
            return {
                "status": 200,
                "data": {
                    "tokens": tokens,
                    "token_count": len(tokens)
                }
            }
        elif req_type == "models":
            url += "/models"
            method = "GET"
        
        headers["x-api-key"] = provider_key
        headers["anthropic-version"] = "2023-06-01"
        
    elif provider == "gemini":
        if req_type == "chat":
            url += f"/models/{body.get('model')}:generateContent?key={provider_key}"
            req_body = {
                "contents": [
                    {
                        "role": msg.get('role'),
                        "parts": [{"text": msg.get('content')}]
                    } for msg in body.get('messages', [])
                ],
                "generationConfig": {
                    "temperature": body.get('options', {}).get('temperature', 0.7),
                    **(body.get('options', {}))
                }
            }
        elif req_type == "embeddings":
            url += f"/models/{body.get('model')}:embedContent?key={provider_key}"
            req_body = {
                "content": {"parts": [{"text": body.get('input')}]},
                **(body.get('options', {}))
            }
        elif req_type == "tokenize":
            # For Gemini, we'll use a simple tokenization approach
            # as they don't have a public tokenization endpoint
            tokens = body.get('text', '').split()
            return {
                "status": 200,
                "data": {
                    "tokens": tokens,
                    "token_count": len(tokens)
                }
            }
        elif req_type == "models":
            url += f"/models?key={provider_key}"
            method = "GET"
            
    elif provider == "lmstudio":
        if req_type == "chat":
            url += "/chat/completions"
            req_body = {
                "model": body.get('model'),
                "messages": body.get('messages'),
                **(body.get('options', {}))
            }
        elif req_type == "embeddings":
            url += "/embeddings"
            req_body = {
                "model": body.get('model'),
                "input": body.get('input'),
                **(body.get('options', {}))
            }
        elif req_type == "tokenize":
            # For LM Studio, we'll use a simple tokenization approach
            tokens = body.get('text', '').split()
            return {
                "status": 200,
                "data": {
                    "tokens": tokens,
                    "token_count": len(tokens)
                }
            }
        elif req_type == "models":
            url += "/models"
            method = "GET"
            
    elif provider == "ollama":
        if req_type == "chat":
            url += "/chat"
            req_body = {
                "model": body.get('model'),
                "messages": body.get('messages'),
                **(body.get('options', {}))
            }
        elif req_type == "embeddings":
            url += "/embeddings"
            req_body = {
                "model": body.get('model'),
                "input": body.get('input'),
                **(body.get('options', {}))
            }
        elif req_type == "tokenize":
            # For Ollama, we'll use a simple tokenization approach
            tokens = body.get('text', '').split()
            return {
                "status": 200,
                "data": {
                    "tokens": tokens,
                    "token_count": len(tokens)
                }
            }
        elif req_type == "models":
            url += "/tags"
            method = "GET"
    
    # Make the request
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        else:
            response = requests.post(url, headers=headers, json=req_body, timeout=30)
        
        # Parse the response
        try:
            data = response.json()
        except:
            data = {"error": "Failed to parse JSON response"}
        
        # Log errors
        if response.status_code >= 400:
            logger.error(f"Provider API Error ({provider}): Status {response.status_code}, {data}")
        
        return {"status": response.status_code, "data": data}
    except Exception as e:
        logger.error(f"Request error: {str(e)}")
        return {"status": 500, "data": {"error": {"message": str(e)}}}

# Generic proxy request for endpoints
def proxy_endpoint_request(target_url):
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

# Python code execution functions
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

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for the proxy server"""
    return jsonify({
        "status": "healthy",
        "service": "llm-proxy",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/execute', methods=['POST'])
@jwt_required
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
        # Clean up the temporary directory and all its contents
        import shutil
        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                logger.error(f"Error cleaning up temporary directory: {str(e)}")

@app.route('/llm', methods=['POST'])
@jwt_required
def llm_proxy():
    """Unified endpoint for LLM requests (chat, embeddings, models)"""
    # Get client IP for rate limiting
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    user_id = getattr(request, 'user_id', None)
    
    # Use user_id for rate limiting if available, otherwise use IP
    rate_limit_id = user_id if user_id else client_ip
    
    # Check rate limit
    if not rate_limit(rate_limit_id):
        return jsonify({
            'error': 'Rate limit exceeded',
            'message': 'Too many requests, please try again later'
        }), 429
    
    # Parse request body
    try:
        body = request.json
    except Exception:
        return jsonify({'error': 'Invalid JSON'}), 400
    
    # Extract provider and validate input
    provider = body.get('provider', '').lower()
    rest_body = {k: v for k, v in body.items() if k != 'provider'}
    
    validation_error = validate_llm_input(provider, rest_body)
    if validation_error:
        return jsonify({'error': validation_error}), 400
    
    # Get API key priority:
    # 1. From Supabase based on user_id
    api_key = None
    
    # For local providers (ollama, lmstudio), no API key is needed
    if provider in ["ollama", "lmstudio"]:
        logger.debug(f"No API key needed for local provider {provider}")
    elif not api_key and not PROVIDER_CONFIG[provider]['key']:
        if user_id:
            logger.info(f"Fetching API key from Supabase for user {user_id} and provider {provider}")
            api_key = get_api_key_from_supabase(user_id, provider)
            if api_key:
                logger.info(f"Successfully retrieved API key from Supabase for user {user_id} and provider {provider}")
            else:
                logger.warning(f"No API key found in Supabase for user {user_id} and provider {provider}")
        else:
            logger.warning("No user_id found in request, cannot fetch API key from Supabase")
            return jsonify({
                'error': f'user_id required but not found in request',
                'message': 'Please provide a user_id in the request for testing'
            }), 400
        logger.warning(f"No API key returned for provider {provider}")
        return jsonify({
            'error': f'No API key returned for {provider}',
            'message': 'Please verify your API key is set for the provider'
        }), 400
    
    try:
        # Proxy the request to the appropriate provider
        result = proxy_llm_request(provider, rest_body['type'], rest_body, api_key)
        
        if result['status'] >= 400:
            return jsonify({
                'error': result.get('data', {}).get('error', {}).get('message', 'Provider API error'),
                'details': result.get('data', {}).get('error', result.get('data', {})),
                'provider': provider,
                'model': rest_body.get('model')
            }), result['status']
        
        # Format the response based on the provider and request type
        formatted_response = format_llm_response(provider, rest_body['type'], result['data'])
        
        return jsonify(formatted_response), result['status']
    except Exception as e:
        logger.error(f"Error in LLM proxy: {str(e)}")
        return jsonify({
            'error': str(e),
            'provider': provider,
            'model': rest_body.get('model')
        }), 500

@app.route('/ollama/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
@jwt_required
def proxy_ollama(path):
    """Proxy requests to Ollama"""
    base = OLLAMA_BASE_URL or f'http://localhost:{OLLAMA_PORT}'
    return proxy_endpoint_request(f'{base}/{path}')

@app.route('/lmstudio/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
@jwt_required
def proxy_lmstudio(path):
    """Proxy requests to LM Studio"""
    base = LMSTUDIO_BASE_URL or f'http://localhost:{LMSTUDIO_PORT}'
    return proxy_endpoint_request(f'{base}/{path}')

@app.route('/v1/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
@jwt_required
def proxy_v1(path):
    """Proxy requests to OpenAI-compatible endpoints (LM Studio)"""
    base = LMSTUDIO_BASE_URL or f'http://localhost:{LMSTUDIO_PORT}'
    return proxy_endpoint_request(f'{base}/v1/{path}')

# Function to call the Data Store API
def call_data_store_api(endpoint, method='GET', data=None, user_id=None):
    """
    Call the Data Store API with proper authentication
    
    Args:
        endpoint: API endpoint path (without leading slash)
        method: HTTP method (GET, POST, PUT, DELETE)
        data: Optional data to send in the request body
        user_id: Optional user_id for authentication
        
    Returns:
        Response object or None if failed
    """
    try:
        # Get authentication headers
        headers = get_auth_headers(user_id)
        
        # Build the URL
        url = f"{DATA_STORE_URL}/api/data-store/{endpoint}"
        
        # Send the request
        if method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers)
        elif method == 'PUT':
            response = requests.put(url, json=data, headers=headers)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        else:
            logger.error(f"Unsupported HTTP method: {method}")
            return None
            
        return response
    except Exception as e:
        logger.error(f"Error calling Data Store API: {str(e)}")
        return None

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Unified Local Proxy Server for AI Tools')
    
    # Server configuration
    parser.add_argument('--port', type=int, default=PROXY_PORT,
                        help=f'Proxy server port (default: {PROXY_PORT})')
    parser.add_argument('--host', type=str, default="0.0.0.0",
                        help='Host to bind to (default: 0.0.0.0)')
    
    # Local LLM providers configuration
    parser.add_argument('--ollama-port', type=int, default=OLLAMA_PORT,
                        help=f'Ollama port (default: {OLLAMA_PORT})')
    parser.add_argument('--lmstudio-port', type=int, default=LMSTUDIO_PORT,
                        help=f'LM Studio port (default: {LMSTUDIO_PORT})')
    parser.add_argument('--ollama-base-url', type=str,
                        help='Custom Ollama base URL (e.g., http://ollama:11434)')
    parser.add_argument('--lmstudio-base-url', type=str,
                        help='Custom LM Studio base URL (e.g., http://lmstudio:1234)')
    
    # No API key arguments - keys are fetched from Supabase only
    
    # Authentication and security
    parser.add_argument('--jwt-secret', type=str,
                        help='Secret for JWT verification')
    parser.add_argument('--enable-auth', action='store_true',
                        help='Enable JWT authentication')
    
    # Supabase configuration for API key management
    parser.add_argument('--supabase-url', type=str,
                        help='Supabase URL for API key management')
    parser.add_argument('--supabase-key', type=str,
                        help='Supabase service role key for API key management')
    
    # Logging and debugging
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
    print(f"\n🚀 Unified LLM Proxy Server running at http://localhost:{port}")
    
    print("\n🔄 Available Endpoints:")
    print("   - /health - Health check endpoint")
    print("   - /llm - Unified LLM proxy endpoint (chat, embeddings, models)")
    print("   - /execute - Python code execution endpoint")
    print("   - /datastore/* - Data Store API endpoints")
    print("   - /ollama/<path> - Direct Ollama proxy")
    print("   - /lmstudio/<path> - Direct LM Studio proxy")
    print("   - /v1/<path> - OpenAI-compatible endpoint proxy")
    
    print("\n🔄 Configured LLM Providers:")
    # Show configured providers
    for provider, config in PROVIDER_CONFIG.items():
        if config['endpoint']:
            status = "✅ Configured" if config['key'] or provider in ['lmstudio', 'ollama'] else "⚠️ No API key"
            print(f"   - {provider.capitalize()}: {config['endpoint']} {status}")
    
    if ENABLE_AUTH:
        print("\n🔒 Authentication: Enabled (JWT)")
    else:
        print("\n🔓 Authentication: Disabled")
    
    print("\n⚠️  WARNING: This server executes arbitrary Python code. Only run code you trust.")
    print("\n💡 Use Ctrl+C to stop the server")
    print("\n" + "=" * 80 + "\n")

if __name__ == '__main__':
    # Parse command line arguments
    args = parse_arguments()
    
    # Update configuration from arguments
    PROXY_PORT = args.port
    HOST = args.host
    OLLAMA_PORT = args.ollama_port
    LMSTUDIO_PORT = args.lmstudio_port
    OLLAMA_BASE_URL = args.ollama_base_url
    LMSTUDIO_BASE_URL = args.lmstudio_base_url
    DEBUG = args.debug
    ENABLE_AUTH = args.enable_auth
    
    # Update JWT secret if provided
    if args.jwt_secret:
        JWT_SECRET = args.jwt_secret
        
    # Initialize Supabase client if credentials are provided
    if args.supabase_url and args.supabase_key:
        try:
            from supabase import create_client
            # Use the module-level supabase_client variable
            supabase_client = create_client(args.supabase_url, args.supabase_key)
            logger.info("Supabase client initialized successfully from command line arguments")
        except ImportError:
            logger.warning("supabase-py package not installed. Run 'pip install supabase' to enable Supabase integration.")
        except Exception as e:
            logger.error(f"Error initializing Supabase client: {str(e)}")
    
    # Set endpoints for local providers
    PROVIDER_CONFIG['ollama']['endpoint'] = OLLAMA_BASE_URL or f'http://localhost:{OLLAMA_PORT}/api'
    PROVIDER_CONFIG['lmstudio']['endpoint'] = LMSTUDIO_BASE_URL or f'http://localhost:{LMSTUDIO_PORT}/v1'
    
    # Set logging level based on debug flag
    if DEBUG:
        logger.setLevel(logging.DEBUG)
        app.logger.setLevel(logging.DEBUG)
    
    # Check if JWT authentication is enabled but no secret is provided
    if ENABLE_AUTH and not JWT_SECRET:
        logger.warning("JWT authentication is enabled but no secret is provided. Using an insecure default secret.")
        JWT_SECRET = "insecure-default-secret"
    
    # Register the Data Store API blueprint
    app.register_blueprint(data_store_api, url_prefix='/datastore')
    
    # Print startup message
    print_startup_message(PROXY_PORT)
    
    # Run the Flask app
    app.run(host=HOST, port=PROXY_PORT, debug=DEBUG)