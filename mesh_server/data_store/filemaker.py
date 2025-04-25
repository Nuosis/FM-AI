"""
FileMaker implementation of the Data Store service
"""

import json
import uuid
import logging
import requests
from datetime import datetime
from typing import Dict, List, Any, Optional

from base import DataStoreService

logger = logging.getLogger('data-store-service')

class FileMakerDataStore(DataStoreService):
    """FileMaker implementation of the data store service"""
    
    def __init__(self, url: str, credentials: Optional[Dict[str, Any]] = None):
        super().__init__(url, credentials)
        self.username = credentials.get('username') if credentials else None
        self.password = credentials.get('password') if credentials else None
        self.database = credentials.get('database') if credentials else None
        self.layout = credentials.get('layout') if credentials else self.table_name
        self.token = None
        
    def connect(self) -> bool:
        """Connect to FileMaker Data API"""
        try:
            # Get a session token
            auth_url = f"{self.url}/fmi/data/v1/databases/{self.database}/sessions"
            headers = {
                'Content-Type': 'application/json'
            }
            auth_data = {
                'fmDataSource': [
                    {
                        'database': self.database,
                        'username': self.username,
                        'password': self.password
                    }
                ]
            }
            
            response = requests.post(auth_url, headers=headers, json=auth_data)
            
            if response.status_code == 200:
                response_data = response.json()
                self.token = response_data.get('response', {}).get('token')
                if self.token:
                    logger.info("Successfully connected to FileMaker")
                    return True
                else:
                    logger.error("Failed to get token from FileMaker response")
                    return False
            else:
                logger.error(f"Failed to connect to FileMaker: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error connecting to FileMaker: {str(e)}")
            return False
            
    def disconnect(self) -> None:
        """Disconnect from FileMaker Data API"""
        if self.token:
            try:
                logout_url = f"{self.url}/fmi/data/v1/databases/{self.database}/sessions/{self.token}"
                requests.delete(logout_url)
                self.token = None
            except Exception as e:
                logger.error(f"Error disconnecting from FileMaker: {str(e)}")
        
    def create_record(self, embedding: List[float], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new vector record in FileMaker"""
        try:
            if not self.token:
                if not self.connect():
                    return {}
                    
            record_id = str(uuid.uuid4())
            created_at = datetime.utcnow().isoformat()
            
            # Prepare the record data
            record_data = {
                'fieldData': {
                    'id': record_id,
                    'embedding': json.dumps(embedding),
                    'metadata': json.dumps(metadata),
                    'created_at': created_at
                }
            }
            
            # Create the record
            create_url = f"{self.url}/fmi/data/v1/databases/{self.database}/layouts/{self.layout}/records"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            }
            
            response = requests.post(create_url, headers=headers, json=record_data)
            
            if response.status_code == 200:
                logger.info(f"Created record {record_id} in FileMaker")
                return {
                    'id': record_id,
                    'embedding': embedding,
                    'metadata': metadata,
                    'created_at': created_at
                }
            else:
                logger.error(f"Failed to create record in FileMaker: {response.status_code} {response.text}")
                return {}
        except Exception as e:
            logger.error(f"Error creating record in FileMaker: {str(e)}")
            return {}
            
    def read_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Read a vector record by ID from FileMaker"""
        try:
            if not self.token:
                if not self.connect():
                    return None
                    
            # Build a query to find the record by ID
            query_url = f"{self.url}/fmi/data/v1/databases/{self.database}/layouts/{self.layout}/_find"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            }
            query_data = {
                'query': [
                    {
                        'id': record_id
                    }
                ]
            }
            
            response = requests.post(query_url, headers=headers, json=query_data)
            
            if response.status_code == 200:
                response_data = response.json()
                records = response_data.get('response', {}).get('data', [])
                
                if records and len(records) > 0:
                    record_data = records[0].get('fieldData', {})
                    
                    # Parse the embedding and metadata from JSON strings
                    embedding_str = record_data.get('embedding', '[]')
                    metadata_str = record_data.get('metadata', '{}')
                    
                    try:
                        embedding = json.loads(embedding_str)
                        metadata = json.loads(metadata_str)
                    except json.JSONDecodeError:
                        embedding = []
                        metadata = {}
                    
                    record = {
                        'id': record_data.get('id'),
                        'embedding': embedding,
                        'metadata': metadata,
                        'created_at': record_data.get('created_at')
                    }
                    
                    logger.info(f"Read record {record_id} from FileMaker")
                    return record
                else:
                    logger.warning(f"Record {record_id} not found in FileMaker")
                    return None
            else:
                logger.error(f"Failed to read record from FileMaker: {response.status_code} {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error reading record from FileMaker: {str(e)}")
            return None
            
    def update_record(self, record_id: str, embedding: Optional[List[float]] = None, 
                     metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Update an existing vector record in FileMaker"""
        try:
            if not self.token:
                if not self.connect():
                    return False
                    
            # First, get the record ID in FileMaker's format
            record = self.read_record(record_id)
            if not record:
                logger.warning(f"Record {record_id} not found for update in FileMaker")
                return False
                
            # Prepare the update data
            update_data = {
                'fieldData': {}
            }
            
            if embedding is not None:
                update_data['fieldData']['embedding'] = json.dumps(embedding)
                
            if metadata is not None:
                update_data['fieldData']['metadata'] = json.dumps(metadata)
                
            if not update_data['fieldData']:
                logger.warning("No update data provided")
                return False
                
            # Update the record
            update_url = f"{self.url}/fmi/data/v1/databases/{self.database}/layouts/{self.layout}/records/{record_id}"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            }
            
            response = requests.patch(update_url, headers=headers, json=update_data)
            
            if response.status_code == 200:
                logger.info(f"Updated record {record_id} in FileMaker")
                return True
            else:
                logger.error(f"Failed to update record in FileMaker: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error updating record in FileMaker: {str(e)}")
            return False
            
    def delete_record(self, record_id: str) -> bool:
        """Delete a vector record from FileMaker"""
        try:
            if not self.token:
                if not self.connect():
                    return False
                    
            # Delete the record
            delete_url = f"{self.url}/fmi/data/v1/databases/{self.database}/layouts/{self.layout}/records/{record_id}"
            headers = {
                'Authorization': f'Bearer {self.token}'
            }
            
            response = requests.delete(delete_url, headers=headers)
            
            if response.status_code == 200:
                logger.info(f"Deleted record {record_id} from FileMaker")
                return True
            else:
                logger.error(f"Failed to delete record from FileMaker: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error deleting record from FileMaker: {str(e)}")
            return False
            
    def search_records(self, query_embedding: Optional[List[float]] = None, 
                      metadata_filter: Optional[Dict[str, Any]] = None, 
                      limit: int = 10) -> List[Dict[str, Any]]:
        """Search for vector records by similarity and/or metadata in FileMaker"""
        try:
            if not self.token:
                if not self.connect():
                    return []
                    
            # Build a query to find records by metadata
            query_url = f"{self.url}/fmi/data/v1/databases/{self.database}/layouts/{self.layout}/_find"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            }
            
            # Prepare the query
            query_data = {
                'query': [{}],  # Empty query to match all records
                'limit': limit
            }
            
            # Add metadata filters if provided
            if metadata_filter:
                # FileMaker's Data API doesn't support direct JSON field querying
                # We would need to have separate fields for each metadata property
                # This is a simplified approach
                logger.warning("Metadata filtering in FileMaker is limited in this implementation")
            
            response = requests.post(query_url, headers=headers, json=query_data)
            
            if response.status_code == 200:
                response_data = response.json()
                fm_records = response_data.get('response', {}).get('data', [])
                
                records = []
                for fm_record in fm_records:
                    record_data = fm_record.get('fieldData', {})
                    
                    # Parse the embedding and metadata from JSON strings
                    embedding_str = record_data.get('embedding', '[]')
                    metadata_str = record_data.get('metadata', '{}')
                    
                    try:
                        embedding = json.loads(embedding_str)
                        metadata = json.loads(metadata_str)
                    except json.JSONDecodeError:
                        embedding = []
                        metadata = {}
                    
                    # Check if metadata matches the filter
                    if metadata_filter:
                        match = True
                        for key, value in metadata_filter.items():
                            if metadata.get(key) != value:
                                match = False
                                break
                        
                        if not match:
                            continue
                    
                    record = {
                        'id': record_data.get('id'),
                        'embedding': embedding,
                        'metadata': metadata,
                        'created_at': record_data.get('created_at')
                    }
                    records.append(record)
                
                logger.info(f"Found {len(records)} records in FileMaker search")
                
                # If we have a query embedding, sort by similarity (simplified)
                if query_embedding and records:
                    # This is a very simplified similarity calculation
                    # In a real implementation, you would use cosine similarity or other distance metrics
                    def calculate_similarity(record):
                        record_embedding = record.get('embedding', [])
                        if not record_embedding or len(record_embedding) != len(query_embedding):
                            return 0
                        
                        # Simple dot product for demonstration
                        similarity = sum(a * b for a, b in zip(query_embedding, record_embedding))
                        return similarity
                    
                    records.sort(key=calculate_similarity, reverse=True)
                    records = records[:limit]
                
                return records
            else:
                logger.error(f"Failed to search records in FileMaker: {response.status_code} {response.text}")
                return []
        except Exception as e:
            logger.error(f"Error searching records in FileMaker: {str(e)}")
            return []