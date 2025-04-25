"""
Data Store Service for Vector Records

This package provides services for managing vector records in different database backends:
- Supabase
- Local PostgreSQL
- FileMaker

It supports CRUD operations and vector similarity search.
"""

from .base import DataStoreService
from .supabase import SupabaseDataStore
from .postgres import PostgresDataStore
from .filemaker import FileMakerDataStore
from .factory import create_data_store

__all__ = [
    'DataStoreService',
    'SupabaseDataStore',
    'PostgresDataStore',
    'FileMakerDataStore',
    'create_data_store'
]