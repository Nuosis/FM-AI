#!/usr/bin/env python3
"""
Data Store API for the local proxy server

This module provides API endpoints for the Data Store service:
- Configuration endpoints for setting the data source
- CRUD endpoints for vector records
- Search endpoints for vector similarity search
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from flask import Blueprint, request, jsonify

# Use absolute import
from factory import create_data_store, create_data_store_from_url

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('data-store-api')

# Create a Flask Blueprint for the Data Store API
data_store_api = Blueprint('data_store_api', __name__)

# Global variable to store the current data store configuration
current_data_store_config = {
    'type': None,
    'url': None,
    'tableName': 'vector_records',
    'credentials': None
}

# Global variable to store the current data store instance
current_data_store = None

@data_store_api.route('/config', methods=['GET'])
def get_config():
    """Get the current data store configuration"""
    # Remove sensitive information from the response
    config = {
        'type': current_data_store_config['type'],
        'url': current_data_store_config['url'],
        'tableName': current_data_store_config['tableName'],
        'isConnected': current_data_store is not None
    }
    return jsonify(config)

@data_store_api.route('/config', methods=['POST'])
def set_config():
    """Set the data store configuration"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        # Extract configuration parameters
        data_source_type = data.get('type')
        url = data.get('url')
        table_name = data.get('tableName', 'vector_records')
        credentials = data.get('credentials')
        
        if not data_source_type or not url:
            return jsonify({'error': 'Type and URL are required'}), 400
            
        # Update the current configuration
        current_data_store_config['type'] = data_source_type
        current_data_store_config['url'] = url
        current_data_store_config['tableName'] = table_name
        current_data_store_config['credentials'] = credentials
        
        # Create a new data store instance
        global current_data_store
        current_data_store = create_data_store(
            data_source_type,
            url,
            credentials,
            table_name=table_name
        )
        
        if not current_data_store:
            return jsonify({'error': 'Failed to create data store'}), 500
            
        # Test the connection
        if not current_data_store.connect():
            return jsonify({'error': 'Failed to connect to data store'}), 500
            
        return jsonify({'message': 'Data store configuration updated successfully'})
    except Exception as e:
        logger.error(f"Error setting data store configuration: {str(e)}")
        return jsonify({'error': f'Error setting data store configuration: {str(e)}'}), 500

@data_store_api.route('/records', methods=['POST'])
def create_record():
    """Create a new vector record"""
    try:
        if not current_data_store:
            return jsonify({'error': 'Data store not configured'}), 400
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        embedding = data.get('embedding')
        metadata = data.get('metadata', {})
        
        if not embedding:
            return jsonify({'error': 'Embedding is required'}), 400
            
        record = current_data_store.create_record(embedding, metadata)
        
        if not record:
            return jsonify({'error': 'Failed to create record'}), 500
            
        return jsonify(record)
    except Exception as e:
        logger.error(f"Error creating record: {str(e)}")
        return jsonify({'error': f'Error creating record: {str(e)}'}), 500

@data_store_api.route('/records/<record_id>', methods=['GET'])
def read_record(record_id):
    """Read a vector record by ID"""
    try:
        if not current_data_store:
            return jsonify({'error': 'Data store not configured'}), 400
            
        record = current_data_store.read_record(record_id)
        
        if not record:
            return jsonify({'error': 'Record not found'}), 404
            
        return jsonify(record)
    except Exception as e:
        logger.error(f"Error reading record: {str(e)}")
        return jsonify({'error': f'Error reading record: {str(e)}'}), 500

@data_store_api.route('/records/<record_id>', methods=['PUT', 'PATCH'])
def update_record(record_id):
    """Update an existing vector record"""
    try:
        if not current_data_store:
            return jsonify({'error': 'Data store not configured'}), 400
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        embedding = data.get('embedding')
        metadata = data.get('metadata')
        
        if not embedding and not metadata:
            return jsonify({'error': 'Embedding or metadata is required'}), 400
            
        success = current_data_store.update_record(record_id, embedding, metadata)
        
        if not success:
            return jsonify({'error': 'Failed to update record'}), 500
            
        return jsonify({'message': 'Record updated successfully'})
    except Exception as e:
        logger.error(f"Error updating record: {str(e)}")
        return jsonify({'error': f'Error updating record: {str(e)}'}), 500

@data_store_api.route('/records/<record_id>', methods=['DELETE'])
def delete_record(record_id):
    """Delete a vector record"""
    try:
        if not current_data_store:
            return jsonify({'error': 'Data store not configured'}), 400
            
        success = current_data_store.delete_record(record_id)
        
        if not success:
            return jsonify({'error': 'Failed to delete record'}), 500
            
        return jsonify({'message': 'Record deleted successfully'})
    except Exception as e:
        logger.error(f"Error deleting record: {str(e)}")
        return jsonify({'error': f'Error deleting record: {str(e)}'}), 500

@data_store_api.route('/search', methods=['POST'])
def search_records():
    """Search for vector records by similarity and/or metadata"""
    try:
        if not current_data_store:
            return jsonify({'error': 'Data store not configured'}), 400
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        query_embedding = data.get('embedding')
        metadata_filter = data.get('metadata')
        limit = data.get('limit', 10)
        
        if not query_embedding and not metadata_filter:
            return jsonify({'error': 'Embedding or metadata filter is required'}), 400
            
        records = current_data_store.search_records(query_embedding, metadata_filter, limit)
        
        return jsonify(records)
    except Exception as e:
        logger.error(f"Error searching records: {str(e)}")
        return jsonify({'error': f'Error searching records: {str(e)}'}), 500