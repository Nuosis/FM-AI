# Knowledge System Documentation

## Overview

The Knowledge System redesign provides a structured approach to managing knowledge entities linked to multiple sources and backed by configurable vector data stores. It enables users to create, manage, and query knowledge bases with semantic search capabilities, supporting various backend data stores such as Lancedb, Postgres, and Supabase.

This documentation serves as a comprehensive guide for developers and maintainers, covering architecture, components, API contracts, Redux state management, usage instructions, and key design considerations.

---

## High-Level Architecture and Workflow

The Knowledge System consists of three main layers:

1. **Frontend**: React components for managing knowledge entities, sources, and querying via a chat interface.
2. **Backend API**: Flask-based API providing endpoints for knowledge and source management, data store configuration, vector record CRUD, and semantic search.
3. **Redux State Management**: Centralized state handling knowledge entities, sources, and integration with LLM provider and embedding model selections.

### Workflow Summary

- Users create a **Knowledge** entity by naming it and selecting/configuring a data store backend.
- Users upload **Sources** (files or URLs) linked to a Knowledge. Uploaded sources are processed by the docling service to extract chunks.
- Chunks are vectorized using the selected embedding model/provider and stored in the configured data store with rich metadata.
- Users can query Knowledge entities via a dedicated chat component that performs semantic search filtered by knowledge ID.
- Users can manage Knowledge and Sources with CRUD operations, with deletion constraints enforced (e.g., Knowledge can only be deleted if it has no sources).

---

## Component and Module Breakdown

### Frontend Components (src/components/Knowledge)

- **KnowledgeList**: Lists all Knowledge entities; supports creation, renaming, and deletion.
- **KnowledgeDetail**: Displays sources for a selected Knowledge; supports uploading new sources and deleting existing ones.
- **SourceUpload**: Handles file uploads, integration with docling service for chunk extraction, and vectorization.
- **KnowledgeChat**: Chat interface for querying a selected Knowledge with semantic search and retrieval-augmented generation (RAG) verification.
- **DataStoreSelector**: UI component for selecting and configuring the data store backend when creating or editing Knowledge.

### Backend API (mesh_server/data_store/api.py)

- **Knowledge Endpoints**:
  - `GET /knowledge`: List all Knowledge entities.
  - `POST /knowledge`: Create a new Knowledge entity with name and store configuration.
  - `PATCH /knowledge/<id>`: Rename a Knowledge entity.
  - `DELETE /knowledge/<id>`: Delete a Knowledge entity (only if it has no sources).

- **Source Endpoints**:
  - `GET /sources?knowledge_id=<id>`: List all sources for a Knowledge.
  - `POST /sources`: Upload a new source; triggers docling processing, vectorization, and storage of chunks.
  - `DELETE /sources/<id>`: Delete a source and all associated vector records.

- **Data Store Configuration**:
  - `GET /config`: Get current data store configuration.
  - `POST /config`: Set or update data store configuration (type, URL, credentials, table name).

- **Vector Record CRUD**:
  - `POST /records`: Create a new vector record with embedding and metadata.
  - `GET /records/<id>`: Read a vector record by ID.
  - `PUT/PATCH /records/<id>`: Update an existing vector record.
  - `DELETE /records/<id>`: Delete a vector record.

- **Search Endpoint**:
  - `POST /search`: Perform semantic search by embedding and/or metadata filter (supports filtering by knowledge_id).

### Redux State (src/redux/slices/knowledgeSlice.js)

- **State Structure**:
  ```js
  {
    items: [ // Array of Knowledge entities
      {
        id: string,
        name: string,
        dataStoreId: string,
        sourceIds: string[],
        // Additional metadata as needed
      }
    ],
    activeKnowledgeId: string | null, // Currently selected Knowledge
  }
  ```

- **Reducers and Actions**:
  - `addKnowledge`: Add a new Knowledge entity.
  - `renameKnowledge`: Rename an existing Knowledge.
  - `deleteKnowledge`: Delete a Knowledge (only if no sources).
  - `linkSourceToKnowledge`: Link a Source ID to a Knowledge.
  - `unlinkSourceFromKnowledge`: Unlink a Source from a Knowledge.
  - `setActiveKnowledge`: Set the currently active Knowledge.
  - `setKnowledges`: Set the full list of Knowledge entities (e.g., after fetch).

- **Async Thunks**:
  - `fetchKnowledges`: Fetch all Knowledge entities from backend.
  - `createKnowledgeAsync`: Create a new Knowledge via backend API.
  - `renameKnowledgeAsync`: Rename a Knowledge via backend API.
  - `deleteKnowledgeAsync`: Delete a Knowledge via backend API.

---

## API Contracts and Integration Points

### Docling Service

- `POST /docling/process`: Accepts file or URL uploads, returns processed chunks for vectorization.

### Data Store Service

- `POST /config`: Configure the data store backend.
- `POST /records`: Add vectorized chunks with metadata.
- `DELETE /records/<id>`: Delete vector records.
- `POST /search`: Perform semantic search filtered by knowledge_id.

### Frontend Integration

- Frontend components interact with backend APIs using Axios.
- Redux manages state for Knowledge entities and sources.
- Embedding model and LLM provider selections are stored in Redux and used during vectorization and querying.

---

## Usage Instructions

### Creating Knowledge

1. Use **KnowledgeList** to create a new Knowledge.
2. Select and configure the data store backend via **DataStoreSelector**.
3. The backend creates a Knowledge entity with linked store configuration.

### Uploading Sources

1. Select a Knowledge in **KnowledgeDetail**.
2. Use **SourceUpload** to upload files or URLs.
3. The source is sent to the docling service for chunk extraction.
4. Chunks are vectorized and stored in the configured data store with metadata.

### Querying Knowledge

1. Open **KnowledgeChat** for a selected Knowledge.
2. Enter a query; it is vectorized using the selected embedding model.
3. Semantic search is performed on the data store filtered by knowledge_id.
4. Relevant chunks and metadata are returned and displayed for RAG verification.

### Configuring Data Store

1. Use backend API `/config` endpoints to set or update data store type, URL, credentials, and table name.
2. Frontend UI allows selection and configuration during Knowledge creation.

---

## Key Considerations and Design Decisions

- **Knowledge as Named Entity**: Knowledge is distinct from the data store instance; it links multiple sources to a specific backend.
- **No Migration**: Existing data store records are not migrated; this is a clean break.
- **CRUD for Sources**: Users can add, view, and delete sources; metadata editing is not supported.
- **Chat Component**: A new dedicated chat UI is implemented for querying Knowledge, separate from the general LLMChat.
- **Rich Metadata**: Vector records include extensive metadata (user_id, store_id, knowledge_id, source_id, original text, chunk index, document title, upload date, mimetype) to support filtering and RAG.
- **Backend In-Memory Models**: Knowledge and Source entities are currently stored in-memory; persistent storage is planned for production.
- **Extensible Data Store Support**: Multiple backends supported via a factory pattern; configuration is dynamic.
- **Error Handling**: Backend API returns appropriate HTTP status codes and error messages for invalid operations.

---

This documentation reflects the current implementation and design of the Knowledge System redesign, providing a foundation for ongoing development and maintenance.