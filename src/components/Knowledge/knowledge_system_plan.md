# Knowledge System Redesign: Plan & Architecture

## Key Principles
- **Knowledge** is a named entity that links multiple sources to a specific data store backend.
- **Sources** are the original files/documents, each processed and vectorized, and associated with a Knowledge.
- **Data Store** is the vector database backend (lancedb, postgres, supabase, etc.)—all supported.
- **No migration** of existing DataStore records; this is a clean break.
- **CRUD for sources**: add, view, delete (no metadata editing).
- **Chat element**: new component, inspired by the Tool implementation, for querying a selected Knowledge.

---

## Workflow Overview

### 1. Knowledge Management
- User can create, rename, and delete Knowledge entities.
- Each Knowledge is linked to a specific data store backend (user selects backend and configures connection).
- Knowledge can only be deleted if all sources are removed.

### 2. Source Management
- User defines a Knowledge By naming it, selecting a data source, and then uploading one or more sources (files/URLs).
- On upload:
  - File is sent to the docling service (`/docling/process`).
  - Docling returns processed chunks.
  - Chunks are vectorized using the user’s selected embedding model/provider (from Redux state).
  - Each chunk is pushed to the selected data store (`/records`), with metadata:
    - `knowledge_id`, `source_id`, original filename, upload date, etc.
- User can view and delete sources from a Knowledge.
- Deleting a source removes all its associated vector records from the data store.

### 3. Chat & Semantic Search
- User selects a Knowledge(s) to query.
- New chat component (inspired by Tool UI) allows user to enter a query.
- Query is vectorized using the selected embedding model/provider.
- Semantic search is performed via the data store’s `/search` endpoint, filtered by `knowledge_id`.
- Relevant chunks and metadata are returned and displayed, allowing user to verify RAG flow.

---

## Component/Module Breakdown

### Frontend
- **KnowledgeList**: List, create, rename, delete Knowledge entities.
- **KnowledgeDetail**: View sources for a selected Knowledge, upload new sources, delete sources.
- **SourceUpload**: Handles file upload, docling integration, and vectorization.
- **KnowledgeChat**: New chat component for querying a Knowledge (semantic search, RAG verification).
- **DataStoreSelector**: UI for selecting/configuring data store backend when creating Knowledge.

### Backend (mesh_server)
- **docling**: `/docling/process` for file extraction/chunking.
- **data_store**: `/config` for backend selection, `/records` for CRUD, `/search` for semantic search.
- **Metadata**:
  - All vector records must include `user_id`, `store_id` (the store_id of the data_store) and `source_id` (defined on upload) for filtering and management.
  - The `metadata` field should also include:
    - `source`: the original file name or URL
    - `original_text` or `chunk_text`: the text/content the vector represents
    - `chunk_index` or position within the source
    - `document_title` (if available)
    - `upload_date`
    - `mimetype`
    - any other relevant information typical for vector store records (e.g., page number, section, tags)
  - The goal is to provide rich, useful metadata for RAG, filtering, and management.

---

## Mermaid Diagram: High-Level Workflow

```mermaid
flowchart TD
    A[User: Create Knowledge] --> B[Select Data Store Backend]
    B --> C[Knowledge Entity Created]
    C --> D[Upload Source File]
    D --> E[Send to Docling Service]
    E --> F[Docling returns Chunks]
    F --> G[Vectorize Chunks (Embedding Model)]
    G --> H[Push Chunks to Data Store with Metadata]
    H --> I[Source Linked to Knowledge]
    I --> J[User Can Add More Sources or Delete Sources]
    J --> K[User Opens KnowledgeChat]
    K --> L[User Enters Query]
    L --> M[Query Vectorized]
    M --> N[Semantic Search in Data Store (by knowledge_id)]
    N --> O[Relevant Chunks & Metadata Returned]
    O --> P[User Verifies RAG Flow]
```

---

## API Integration Points

- **Docling Service**
  - `POST /docling/process` (file upload or URL, returns chunks)
- **Data Store Service**
  - `POST /config` (set backend)
  - `POST /records` (add vectorized chunk with metadata)
  - `DELETE /records/<id>` (delete chunk)
  - `POST /search` (semantic search, filter by `store_id`)
- **Frontend State**
  - Use Redux for LLM provider/embedding model selection.
  - Store Knowledge and Source metadata in Redux or local state as needed.

---

## Key Considerations
- **All data store backends** supported via mesh_server.
- **No metadata editing** for sources (add/view/delete only).
- **Knowledge** is a named entity, not just a data store instance.
- **No migration** of old DataStore records.
- **Chat** is a new component, not integrated into LLMChat.