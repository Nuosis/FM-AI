# Knowledge System

This module implements the Knowledge system as described in the knowledge_system_plan.md file. The Knowledge system allows users to create, manage, and query knowledge entities that link multiple sources to specific data store backends.

## Components

### KnowledgeList

The main component that displays a list of Knowledge entities and allows users to create, edit, and delete them. It also provides tabs to switch between the Sources view and the Chat view for a selected Knowledge entity.

### KnowledgeDetail

Displays the details of a selected Knowledge entity, including its sources. Users can add new sources and delete existing ones.

### SourceUpload

Handles the upload of files or URLs as sources for a Knowledge entity. It processes the files/URLs through the docling service, vectorizes the chunks using the selected embedding model, and stores the vectors in the selected data store.

### KnowledgeChat

Allows users to query a Knowledge entity using semantic search. It vectorizes the query using the selected embedding model and searches for relevant chunks in the data store.

### DataStoreSelector

A reusable component for selecting a data store backend for a Knowledge entity.

## Data Flow

1. User creates a Knowledge entity by selecting a data store backend.
2. User uploads sources (files/URLs) to the Knowledge entity.
3. Sources are processed by the docling service to extract chunks.
4. Chunks are vectorized using the selected embedding model.
5. Vectors are stored in the selected data store with metadata.
6. User can query the Knowledge entity using semantic search.

## Integration Points

- **Docling Service**: `/docling/process` for file extraction/chunking.
- **Data Store Service**: `/data_store/records` for CRUD, `/data_store/search` for semantic search.
- **LLM Service**: `/llm/embed` for vectorizing text using the selected embedding model.

## Redux State

The Knowledge system uses the `knowledge` slice in the Redux store to manage Knowledge entities. The slice provides actions for creating, updating, and deleting Knowledge entities, as well as adding and removing sources.

## Usage

1. Navigate to the Knowledge tab in the sidebar.
2. Create a new Knowledge entity by clicking the "Create" button.
3. Select a data store backend and provide a name for the Knowledge entity.
4. Upload sources (files/URLs) to the Knowledge entity.
5. Switch to the Chat tab to query the Knowledge entity.