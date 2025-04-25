"""
Factory module for creating Data Store service instances
"""

import logging
from typing import Dict, Any, Optional
from urllib.parse import urlparse

from .base import DataStoreService
from .supabase import SupabaseDataStore
from .postgres import PostgresDataStore
from .filemaker import FileMakerDataStore
from .lancedb import LanceDBDataStore

logger = logging.getLogger('data-store-service')

def create_data_store(
    data_source_type: str,
    url: str,
    credentials: Optional[Dict[str, Any]] = None,
    table_name: str = 'vector_records'
) -> Optional[DataStoreService]:
    """
    Factory function to create a data store service based on the type
    
    Args:
        data_source_type: Type of data source ('supabase', 'postgres', 'filemaker', 'lancedb')
        url: URL of the data source
        credentials: Optional credentials for the data source
        table_name: Name of the table to use for vector records
        
    Returns:
        A DataStoreService instance or None if the type is not supported
    """
    data_source_type = data_source_type.lower()
    
    try:
        if data_source_type == 'supabase':
            logger.info(f"Creating Supabase data store with URL: {url}, table: {table_name}")
            data_store = SupabaseDataStore(url, credentials)
            data_store.table_name = table_name
            return data_store
        elif data_source_type == 'postgres':
            logger.info(f"Creating PostgreSQL data store with URL: {url}, table: {table_name}")
            data_store = PostgresDataStore(url, credentials)
            data_store.table_name = table_name
            return data_store
        elif data_source_type == 'filemaker':
            logger.info(f"Creating FileMaker data store with URL: {url}, table: {table_name}")
            data_store = FileMakerDataStore(url, credentials)
            data_store.table_name = table_name
            return data_store
        elif data_source_type == 'lancedb':
            logger.info(f"Creating LanceDB data store with URL: {url}, table: {table_name}")
            data_store = LanceDBDataStore(url, credentials)
            data_store.table_name = table_name
            return data_store
        else:
            logger.error(f"Unsupported data source type: {data_source_type}")
            return None
    except Exception as e:
        logger.error(f"Error creating data store: {str(e)}")
        return None

def create_data_store_from_url(
    url: str,
    credentials: Optional[Dict[str, Any]] = None,
    table_name: str = 'vector_records'
) -> Optional[DataStoreService]:
    """
    Factory function to create a data store service based on the URL
    
    Args:
        url: URL of the data source
        credentials: Optional credentials for the data source
        table_name: Name of the table to use for vector records
        
    Returns:
        A DataStoreService instance or None if the type cannot be determined
    """
    try:
        parsed_url = urlparse(url)
        
        # Determine the data source type from the URL
        if 'supabase.co' in parsed_url.netloc:
            logger.info(f"Detected Supabase data store from URL: {url}, table: {table_name}")
            data_store = SupabaseDataStore(url, credentials)
            data_store.table_name = table_name
            return data_store
        elif parsed_url.scheme == 'postgresql' or parsed_url.scheme == 'postgres':
            logger.info(f"Detected PostgreSQL data store from URL: {url}, table: {table_name}")
            data_store = PostgresDataStore(url, credentials)
            data_store.table_name = table_name
            return data_store
        elif 'fmi/data' in parsed_url.path or 'filemaker' in parsed_url.netloc:
            logger.info(f"Detected FileMaker data store from URL: {url}, table: {table_name}")
            data_store = FileMakerDataStore(url, credentials)
            data_store.table_name = table_name
            return data_store
        elif parsed_url.scheme == 'file' or url.endswith('.lance'):
            logger.info(f"Detected LanceDB data store from URL: {url}, table: {table_name}")
            data_store = LanceDBDataStore(url, credentials)
            data_store.table_name = table_name
            return data_store
        else:
            logger.error(f"Could not determine data source type from URL: {url}")
            return None
    except Exception as e:
        logger.error(f"Error creating data store from URL: {str(e)}")
        return None