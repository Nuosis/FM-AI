#!/usr/bin/env python3
"""
Authentication middleware for the Data Store API

This module provides JWT validation middleware for the Data Store API:
- Validates JWT tokens from the Authorization header
- Extracts user_id and other claims from the JWT payload
- Makes user information available in the request context
"""

import os
import logging
import jwt
from functools import wraps
from flask import request, jsonify

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('data-store-auth')

# Get JWT secret from environment variable
JWT_SECRET = os.environ.get("JWT_SECRET")
ENABLE_AUTH = os.environ.get("ENABLE_AUTH", "false").lower() in ["true", "1", "yes"]

def jwt_required(f):
    """
    Decorator to require JWT authentication for API endpoints
    
    This decorator:
    1. Checks if authentication is enabled
    2. Validates the JWT token from the Authorization header
    3. Extracts user_id and other claims from the JWT payload
    4. Makes user information available in the request context
    """
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
            if not JWT_SECRET:
                logger.error("JWT_SECRET environment variable not set")
                return jsonify({'error': 'Server configuration error', 'message': 'JWT_SECRET not configured'}), 500
                
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            
            # Add user info to request context
            request.user_id = payload.get('sub')
            request.user_email = payload.get('email')
            
            # Check if this is a service-to-service call
            request.is_service = payload.get('is_service', False)
            request.service_name = payload.get('service_name') if request.is_service else None
            
            # If this is a service call with a user_id claim, extract it
            if request.is_service and 'user_id' in payload:
                request.user_id = payload.get('user_id')
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Unauthorized', 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Unauthorized', 'message': 'Invalid token'}), 401
            
        return f(*args, **kwargs)
    return decorated

def create_service_token(service_name, user_id=None):
    """
    Create a service-to-service JWT token
    
    Args:
        service_name: Name of the service making the request
        user_id: Optional user_id to include in the token for user-scoped operations
        
    Returns:
        JWT token string
    """
    if not JWT_SECRET:
        logger.error("JWT_SECRET environment variable not set")
        raise ValueError("JWT_SECRET not configured")
        
    payload = {
        'is_service': True,
        'service_name': service_name
    }
    
    # Include user_id if provided
    if user_id:
        payload['user_id'] = user_id
        
    # Create the JWT token
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    
    return token