"""
Base class for Data Store services
"""

import logging
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('data-store-service')

class DataStoreService:
    """Base class for data store services"""
    
    def __init__(self, url: str, credentials: Optional[Dict[str, Any]] = None):
        self.url = url
        self.credentials = credentials or {}
        self.connection = None
        self.table_name = 'vector_records'
        # Fixed schema that's not configurable from the UI
        self._schema = {
            'id': 'uuid',
            'embedding': 'float[]',
            'metadata': 'jsonb',
            'created_at': 'timestamp'
        }
        
    @property
    def schema(self):
        """Get the schema for the data store"""
        return self._schema
        
    def connect(self) -> bool:
        """Connect to the data store"""
        raise NotImplementedError("Subclasses must implement connect()")
        
    def disconnect(self) -> None:
        """Disconnect from the data store"""
        raise NotImplementedError("Subclasses must implement disconnect()")
        
    def create_record(self, embedding: List[float], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new vector record"""
        raise NotImplementedError("Subclasses must implement create_record()")
        
    def read_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Read a vector record by ID"""
        raise NotImplementedError("Subclasses must implement read_record()")
        
    def update_record(self, record_id: str, embedding: Optional[List[float]] = None, 
                     metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Update an existing vector record"""
        raise NotImplementedError("Subclasses must implement update_record()")
        
    def delete_record(self, record_id: str) -> bool:
        """Delete a vector record"""
        raise NotImplementedError("Subclasses must implement delete_record()")
        
    def search_records(self, query_embedding: Optional[List[float]] = None, 
                      metadata_filter: Optional[Dict[str, Any]] = None, 
                      limit: int = 10) -> List[Dict[str, Any]]:
        """Search for vector records by similarity and/or metadata"""
        raise NotImplementedError("Subclasses must implement search_records()")