"""
Supabase implementation of the Data Store service
"""

import json
import uuid
import logging
import requests
from datetime import datetime
from typing import Dict, List, Any, Optional

from .base import DataStoreService

logger = logging.getLogger('data-store-service')

class SupabaseDataStore(DataStoreService):
    """Supabase implementation of the data store service"""
    
    def __init__(self, url: str, credentials: Optional[Dict[str, Any]] = None):
        super().__init__(url, credentials)
        self.api_key = credentials.get('api_key') if credentials else None
        
    def connect(self) -> bool:
        """Connect to Supabase"""
        try:
            # Test connection with a simple request
            headers = {
                'apikey': self.api_key,
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            response = requests.get(
                f"{self.url}/rest/v1/{self.table_name}?limit=1",
                headers=headers
            )
            
            if response.status_code in (200, 201, 204, 206):
                logger.info("Successfully connected to Supabase")
                return True
            else:
                logger.error(f"Failed to connect to Supabase: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error connecting to Supabase: {str(e)}")
            return False
            
    def disconnect(self) -> None:
        """Disconnect from Supabase (no-op for REST API)"""
        pass
        
    def create_record(self, embedding: List[float], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new vector record in Supabase"""
        try:
            record_id = str(uuid.uuid4())
            created_at = datetime.utcnow().isoformat()
            
            record = {
                'id': record_id,
                'embedding': embedding,
                'metadata': metadata,
                'created_at': created_at
            }
            
            headers = {
                'apikey': self.api_key,
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
            
            response = requests.post(
                f"{self.url}/rest/v1/{self.table_name}",
                headers=headers,
                json=record
            )
            
            if response.status_code in (200, 201, 204):
                logger.info(f"Created record {record_id} in Supabase")
                return record
            else:
                logger.error(f"Failed to create record in Supabase: {response.status_code} {response.text}")
                return {}
        except Exception as e:
            logger.error(f"Error creating record in Supabase: {str(e)}")
            return {}
            
    def read_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Read a vector record by ID from Supabase"""
        try:
            headers = {
                'apikey': self.api_key,
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{self.url}/rest/v1/{self.table_name}?id=eq.{record_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                records = response.json()
                if records and len(records) > 0:
                    logger.info(f"Read record {record_id} from Supabase")
                    return records[0]
                else:
                    logger.warning(f"Record {record_id} not found in Supabase")
                    return None
            else:
                logger.error(f"Failed to read record from Supabase: {response.status_code} {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error reading record from Supabase: {str(e)}")
            return None
            
    def update_record(self, record_id: str, embedding: Optional[List[float]] = None, 
                     metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Update an existing vector record in Supabase"""
        try:
            update_data = {}
            if embedding is not None:
                update_data['embedding'] = embedding
            if metadata is not None:
                update_data['metadata'] = metadata
                
            if not update_data:
                logger.warning("No update data provided")
                return False
                
            headers = {
                'apikey': self.api_key,
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.patch(
                f"{self.url}/rest/v1/{self.table_name}?id=eq.{record_id}",
                headers=headers,
                json=update_data
            )
            
            if response.status_code in (200, 201, 204):
                logger.info(f"Updated record {record_id} in Supabase")
                return True
            else:
                logger.error(f"Failed to update record in Supabase: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error updating record in Supabase: {str(e)}")
            return False
            
    def delete_record(self, record_id: str) -> bool:
        """Delete a vector record from Supabase"""
        try:
            headers = {
                'apikey': self.api_key,
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.delete(
                f"{self.url}/rest/v1/{self.table_name}?id=eq.{record_id}",
                headers=headers
            )
            
            if response.status_code in (200, 201, 204):
                logger.info(f"Deleted record {record_id} from Supabase")
                return True
            else:
                logger.error(f"Failed to delete record from Supabase: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error deleting record from Supabase: {str(e)}")
            return False
            
    def search_records(self, query_embedding: Optional[List[float]] = None, 
                      metadata_filter: Optional[Dict[str, Any]] = None, 
                      limit: int = 10) -> List[Dict[str, Any]]:
        """Search for vector records by similarity and/or metadata in Supabase"""
        try:
            headers = {
                'apikey': self.api_key,
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            # Build the query
            query_params = []
            
            # Add metadata filters if provided
            if metadata_filter:
                for key, value in metadata_filter.items():
                    # For Supabase, we need to use the containment operator for JSONB
                    json_filter = json.dumps({key: value})
                    query_params.append(f"metadata@>'{json_filter}'")
            
            # Construct the query URL
            query_url = f"{self.url}/rest/v1/{self.table_name}"
            if query_params:
                query_url += "?" + "&".join(query_params)
            
            # Add limit
            if "?" in query_url:
                query_url += f"&limit={limit}"
            else:
                query_url += f"?limit={limit}"
            
            # If query_embedding is provided, we need to use a function call
            # This is a simplified approach - in a real implementation, you would use pgvector's similarity search
            if query_embedding:
                # For demonstration purposes, we're just fetching records and will sort them client-side
                # In a real implementation, you would use a stored procedure or SQL function for vector similarity
                pass
            
            response = requests.get(query_url, headers=headers)
            
            if response.status_code == 200:
                records = response.json()
                logger.info(f"Found {len(records)} records in Supabase search")
                
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
                logger.error(f"Failed to search records in Supabase: {response.status_code} {response.text}")
                return []
        except Exception as e:
            logger.error(f"Error searching records in Supabase: {str(e)}")
            return []