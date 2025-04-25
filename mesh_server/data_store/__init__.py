"""
Data Store Service for Vector Records

This package provides services for managing vector records in different database backends:
- Supabase
- Local PostgreSQL
- FileMaker
- LanceDB

It supports CRUD operations and vector similarity search.
"""

from .base import DataStoreService
from .supabase import SupabaseDataStore
from .postgres import PostgresDataStore
from .filemaker import FileMakerDataStore
from .lancedb import LanceDBDataStore
from .factory import create_data_store, create_data_store_from_url
from .api import data_store_api

__all__ = [
    'DataStoreService',
    'SupabaseDataStore',
    'PostgresDataStore',
    'FileMakerDataStore',
    'LanceDBDataStore',
    'create_data_store',
    'create_data_store_from_url',
    'data_store_api'
]