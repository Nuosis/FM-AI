"""
LanceDB implementation of the Data Store service
"""

import json
import uuid
import logging
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

import lancedb
import pyarrow as pa

from base import DataStoreService

logger = logging.getLogger('data-store-service')

class LanceDBDataStore(DataStoreService):
    """LanceDB implementation of the data store service"""
    
    def __init__(self, url: str, credentials: Optional[Dict[str, Any]] = None):
        super().__init__(url, credentials)
        self.db_path = url
        self.connection = None
        self.table = None
        
    def connect(self) -> bool:
        """Connect to LanceDB"""
        try:
            # Create the directory if it doesn't exist
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            # Connect to the database
            self.connection = lancedb.connect(self.db_path)
            
            # Check if the table exists, create it if it doesn't
            if self.table_name not in self.connection.table_names():
                logger.info(f"Table {self.table_name} does not exist, creating it")
                
                # Create a schema for the table
                schema = pa.schema([
                    pa.field("id", pa.string()),
                    pa.field("embedding", pa.list_(pa.float32())),
                    pa.field("metadata", pa.string()),  # JSON string for metadata
                    pa.field("created_at", pa.string())
                ])
                
                # Create an empty table with the schema
                self.connection.create_table(self.table_name, schema=schema)
            
            # Get the table
            self.table = self.connection.open_table(self.table_name)
            logger.info(f"Successfully connected to LanceDB at {self.db_path}")
            return True
        except Exception as e:
            logger.error(f"Error connecting to LanceDB: {str(e)}")
            return False
            
    def disconnect(self) -> None:
        """Disconnect from LanceDB"""
        self.connection = None
        self.table = None
        
    def create_record(self, embedding: List[float], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new vector record in LanceDB"""
        try:
            if not self.connection or not self.table:
                if not self.connect():
                    logger.error("Failed to connect to LanceDB")
                    return {}
            
            record_id = str(uuid.uuid4())
            created_at = datetime.utcnow().isoformat()
            
            record = {
                'id': record_id,
                'embedding': embedding,
                'metadata': json.dumps(metadata),
                'created_at': created_at
            }
            
            # Add the record to the table
            self.table.add([record])
            
            logger.info(f"Created record {record_id} in LanceDB")
            
            # Return the record with metadata as a dict
            return {
                'id': record_id,
                'embedding': embedding,
                'metadata': metadata,
                'created_at': created_at
            }
        except Exception as e:
            logger.error(f"Error creating record in LanceDB: {str(e)}")
            return {}
            
    def read_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Read a vector record by ID from LanceDB"""
        try:
            if not self.connection or not self.table:
                if not self.connect():
                    logger.error("Failed to connect to LanceDB")
                    return None
            
            # Query the record by ID
            result = self.table.search().where(f"id = '{record_id}'").to_pandas()
            
            if len(result) > 0:
                record = result.iloc[0].to_dict()
                
                # Parse the metadata JSON string back to a dict
                if 'metadata' in record and record['metadata']:
                    record['metadata'] = json.loads(record['metadata'])
                else:
                    record['metadata'] = {}
                
                logger.info(f"Read record {record_id} from LanceDB")
                return record
            else:
                logger.warning(f"Record {record_id} not found in LanceDB")
                return None
        except Exception as e:
            logger.error(f"Error reading record from LanceDB: {str(e)}")
            return None
            
    def update_record(self, record_id: str, embedding: Optional[List[float]] = None, 
                     metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Update an existing vector record in LanceDB"""
        try:
            if not self.connection or not self.table:
                if not self.connect():
                    logger.error("Failed to connect to LanceDB")
                    return False
            
            # First, read the existing record
            existing_record = self.read_record(record_id)
            if not existing_record:
                logger.warning(f"Record {record_id} not found for update in LanceDB")
                return False
            
            # Prepare the update data
            update_data = {
                'id': record_id,
                'embedding': embedding if embedding is not None else existing_record.get('embedding', []),
                'created_at': existing_record.get('created_at', datetime.utcnow().isoformat())
            }
            
            # Update metadata if provided
            if metadata is not None:
                update_data['metadata'] = json.dumps(metadata)
            else:
                update_data['metadata'] = json.dumps(existing_record.get('metadata', {}))
            
            # Delete the old record and add the new one (LanceDB doesn't support direct updates)
            self.delete_record(record_id)
            self.table.add([update_data])
            
            logger.info(f"Updated record {record_id} in LanceDB")
            return True
        except Exception as e:
            logger.error(f"Error updating record in LanceDB: {str(e)}")
            return False
            
    def delete_record(self, record_id: str) -> bool:
        """Delete a vector record from LanceDB"""
        try:
            if not self.connection or not self.table:
                if not self.connect():
                    logger.error("Failed to connect to LanceDB")
                    return False
            
            # Delete the record by ID
            self.table.delete(f"id = '{record_id}'")
            
            logger.info(f"Deleted record {record_id} from LanceDB")
            return True
        except Exception as e:
            logger.error(f"Error deleting record from LanceDB: {str(e)}")
            return False
            
    def search_records(self, query_embedding: Optional[List[float]] = None, 
                      metadata_filter: Optional[Dict[str, Any]] = None, 
                      limit: int = 10) -> List[Dict[str, Any]]:
        """Search for vector records by similarity and/or metadata in LanceDB"""
        try:
            if not self.connection or not self.table:
                if not self.connect():
                    logger.error("Failed to connect to LanceDB")
                    return []
            
            # Start building the query
            query = self.table.search()
            
            # Add vector similarity search if query_embedding is provided
            if query_embedding:
                query = query.vector_search(query_embedding, "embedding")
            
            # Add metadata filters if provided
            if metadata_filter:
                # Convert metadata filter to a WHERE clause
                # This is a simplified approach - in a real implementation, you would need to handle
                # more complex filtering on the JSON metadata
                filter_conditions = []
                for key, value in metadata_filter.items():
                    # Since metadata is stored as a JSON string, we need to use JSON functions
                    # This is a simplified approach and may not work for all cases
                    if isinstance(value, str):
                        filter_value = f'"{value}"'
                    elif isinstance(value, (int, float, bool)):
                        filter_value = str(value).lower()
                    else:
                        continue
                    
                    # This is a simplified approach - in a real implementation, you would need to
                    # use proper JSON path expressions
                    filter_conditions.append(f"metadata LIKE '%\"{key}\":{filter_value}%'")
                
                if filter_conditions:
                    where_clause = " AND ".join(filter_conditions)
                    query = query.where(where_clause)
            
            # Execute the query and limit results
            result = query.limit(limit).to_pandas()
            
            # Convert the result to a list of dictionaries
            records = []
            for _, row in result.iterrows():
                record = row.to_dict()
                
                # Parse the metadata JSON string back to a dict
                if 'metadata' in record and record['metadata']:
                    try:
                        record['metadata'] = json.loads(record['metadata'])
                    except:
                        record['metadata'] = {}
                else:
                    record['metadata'] = {}
                
                records.append(record)
            
            logger.info(f"Found {len(records)} records in LanceDB search")
            return records
        except Exception as e:
            logger.error(f"Error searching records in LanceDB: {str(e)}")
            return []