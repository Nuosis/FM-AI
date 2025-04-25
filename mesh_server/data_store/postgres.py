"""
PostgreSQL implementation of the Data Store service
"""

import json
import uuid
import logging
import psycopg2
from datetime import datetime
from typing import Dict, List, Any, Optional

from .base import DataStoreService

logger = logging.getLogger('data-store-service')

class PostgresDataStore(DataStoreService):
    """PostgreSQL implementation of the data store service"""
    
    def __init__(self, url: str, credentials: Optional[Dict[str, Any]] = None):
        super().__init__(url, credentials)
        
    def connect(self) -> bool:
        """Connect to PostgreSQL"""
        try:
            self.connection = psycopg2.connect(self.url)
            
            # Create the table if it doesn't exist
            with self.connection.cursor() as cursor:
                # Create the table with the fixed schema
                schema_fields = []
                for field_name, field_type in self.schema.items():
                    schema_fields.append(f"{field_name} {field_type.upper()}")
                
                create_table_sql = f"""
                CREATE TABLE IF NOT EXISTS {self.table_name} (
                    {', '.join(schema_fields)}
                );
                """
                cursor.execute(create_table_sql)
                self.connection.commit()
                
            logger.info("Successfully connected to PostgreSQL")
            return True
        except Exception as e:
            logger.error(f"Error connecting to PostgreSQL: {str(e)}")
            return False
            
    def disconnect(self) -> None:
        """Disconnect from PostgreSQL"""
        if self.connection:
            self.connection.close()
            self.connection = None
            
    def create_record(self, embedding: List[float], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new vector record in PostgreSQL"""
        try:
            if not self.connection:
                if not self.connect():
                    return {}
                    
            record_id = str(uuid.uuid4())
            created_at = datetime.utcnow()
            
            with self.connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    INSERT INTO {self.table_name} (id, embedding, metadata, created_at)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, embedding, metadata, created_at
                    """,
                    (record_id, embedding, json.dumps(metadata), created_at)
                )
                self.connection.commit()
                
                # Get the inserted record
                result = cursor.fetchone()
                if result:
                    id_val, emb_val, meta_val, created_val = result
                    record = {
                        'id': id_val,
                        'embedding': emb_val,
                        'metadata': json.loads(meta_val),
                        'created_at': created_val.isoformat()
                    }
                    logger.info(f"Created record {record_id} in PostgreSQL")
                    return record
                else:
                    logger.error("Failed to retrieve created record from PostgreSQL")
                    return {}
        except Exception as e:
            logger.error(f"Error creating record in PostgreSQL: {str(e)}")
            if self.connection:
                self.connection.rollback()
            return {}
            
    def read_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Read a vector record by ID from PostgreSQL"""
        try:
            if not self.connection:
                if not self.connect():
                    return None
                    
            with self.connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT id, embedding, metadata, created_at
                    FROM {self.table_name}
                    WHERE id = %s
                    """,
                    (record_id,)
                )
                
                result = cursor.fetchone()
                if result:
                    id_val, emb_val, meta_val, created_val = result
                    record = {
                        'id': id_val,
                        'embedding': emb_val,
                        'metadata': json.loads(meta_val),
                        'created_at': created_val.isoformat()
                    }
                    logger.info(f"Read record {record_id} from PostgreSQL")
                    return record
                else:
                    logger.warning(f"Record {record_id} not found in PostgreSQL")
                    return None
        except Exception as e:
            logger.error(f"Error reading record from PostgreSQL: {str(e)}")
            return None
            
    def update_record(self, record_id: str, embedding: Optional[List[float]] = None, 
                     metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Update an existing vector record in PostgreSQL"""
        try:
            if not self.connection:
                if not self.connect():
                    return False
                    
            # Build the update query
            update_parts = []
            params = []
            
            if embedding is not None:
                update_parts.append("embedding = %s")
                params.append(embedding)
                
            if metadata is not None:
                update_parts.append("metadata = %s")
                params.append(json.dumps(metadata))
                
            if not update_parts:
                logger.warning("No update data provided")
                return False
                
            # Add the record ID to params
            params.append(record_id)
            
            with self.connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    UPDATE {self.table_name}
                    SET {", ".join(update_parts)}
                    WHERE id = %s
                    """,
                    params
                )
                
                if cursor.rowcount > 0:
                    self.connection.commit()
                    logger.info(f"Updated record {record_id} in PostgreSQL")
                    return True
                else:
                    self.connection.rollback()
                    logger.warning(f"Record {record_id} not found for update in PostgreSQL")
                    return False
        except Exception as e:
            logger.error(f"Error updating record in PostgreSQL: {str(e)}")
            if self.connection:
                self.connection.rollback()
            return False
            
    def delete_record(self, record_id: str) -> bool:
        """Delete a vector record from PostgreSQL"""
        try:
            if not self.connection:
                if not self.connect():
                    return False
                    
            with self.connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    DELETE FROM {self.table_name}
                    WHERE id = %s
                    """,
                    (record_id,)
                )
                
                if cursor.rowcount > 0:
                    self.connection.commit()
                    logger.info(f"Deleted record {record_id} from PostgreSQL")
                    return True
                else:
                    self.connection.rollback()
                    logger.warning(f"Record {record_id} not found for deletion in PostgreSQL")
                    return False
        except Exception as e:
            logger.error(f"Error deleting record from PostgreSQL: {str(e)}")
            if self.connection:
                self.connection.rollback()
            return False
            
    def search_records(self, query_embedding: Optional[List[float]] = None, 
                      metadata_filter: Optional[Dict[str, Any]] = None, 
                      limit: int = 10) -> List[Dict[str, Any]]:
        """Search for vector records by similarity and/or metadata in PostgreSQL"""
        try:
            if not self.connection:
                if not self.connect():
                    return []
                    
            # Build the query
            query = f"SELECT id, embedding, metadata, created_at FROM {self.table_name}"
            where_clauses = []
            params = []
            
            # Add metadata filters if provided
            if metadata_filter:
                for key, value in metadata_filter.items():
                    where_clauses.append(f"metadata->>{key} = %s")
                    params.append(str(value))
            
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
            
            # Add limit
            query += f" LIMIT {limit}"
            
            with self.connection.cursor() as cursor:
                cursor.execute(query, params)
                
                results = cursor.fetchall()
                records = []
                
                for result in results:
                    id_val, emb_val, meta_val, created_val = result
                    record = {
                        'id': id_val,
                        'embedding': emb_val,
                        'metadata': json.loads(meta_val),
                        'created_at': created_val.isoformat()
                    }
                    records.append(record)
                
                logger.info(f"Found {len(records)} records in PostgreSQL search")
                
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
        except Exception as e:
            logger.error(f"Error searching records in PostgreSQL: {str(e)}")
            return []