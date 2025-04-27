#!/usr/bin/env python3
"""
Authentication utilities for Docling

This module provides utilities for handling authentication:
- Functions for forwarding JWT tokens to other services
- Functions for creating service-to-service tokens
"""

import os
import logging
import jwt
import requests
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('docling-auth')

# Get JWT secret from environment variable
JWT_SECRET = os.environ.get("JWT_SECRET")

def forward_auth_header(headers=None):
    """
    Forward the Authorization header from the current request to another service
    
    Args:
        headers: Optional existing headers dictionary to add the Authorization header to
        
    Returns:
        Dictionary with headers including the Authorization header if available
    """
    from flask import request
    
    if headers is None:
        headers = {}
        
    # Forward the Authorization header if it exists
    auth_header = request.headers.get('Authorization')
    if auth_header:
        headers['Authorization'] = auth_header
        
    return headers

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
        'service_name': 'docling',
        'exp': datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    }
    
    # Include user_id if provided
    if user_id:
        payload['user_id'] = user_id
        
    # Create the JWT token
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    
    return token

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
    from flask import request
    
    headers = {'Content-Type': 'application/json'}
    
    # Try to forward the existing Authorization header
    auth_header = request.headers.get('Authorization')
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