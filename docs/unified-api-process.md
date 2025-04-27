# Unified API Call Process

This document outlines the unified approach to making API calls throughout the application. The goal is to provide a consistent, maintainable, and testable way to interact with various APIs and services.

## Architecture Overview

The unified API call process is built around a service-oriented architecture with three main layers:

1. **Base API Service Layer** - Provides core functionality for making HTTP requests
2. **Domain-Specific Service Layer** - Organizes API calls by domain/feature
3. **Component/Redux Layer** - Consumes services to perform business logic

```
┌─────────────────────┐
│ Components / Redux  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Domain Services     │
│ (LLM, Knowledge,    │
│  Tool, etc.)        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Base API Service    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ External APIs       │
└─────────────────────┘
```

## Base API Service

The `apiService.js` provides a foundation for all API calls with:

- Consistent authentication handling
- Centralized error handling
- Logging of requests and responses
- Support for different types of endpoints:
  - REST API calls
  - File uploads with progress tracking
  - Edge function calls
  - Local service calls
  - LLM provider calls

### Key Methods

```javascript
// Standard REST methods
apiService.get(url, options)
apiService.post(url, data, options)
apiService.put(url, data, options)
apiService.delete(url, options)

// File upload with progress
apiService.uploadFile(url, formData, onProgress)

// Edge function calls
apiService.callEdgeFunction(functionName, body)

// LLM provider calls
apiService.callLLMProvider(provider, type, model, data, options)

// Local service calls
apiService.callLocalService(endpoint, data)
```

## Domain-Specific Services

Domain services organize API calls by feature area and provide a higher-level abstraction:

### LLM Service

Handles interactions with language model providers:

```javascript
// Send a chat completion request
llmService.chat(provider, model, messages, options)

// Generate embeddings for text
llmService.embed(provider, model, text)

// List available models for a provider
llmService.listModels(provider)

// Verify an API key with a provider
llmService.verifyApiKey(provider, apiKey, baseUrl)
```

### Knowledge Service

Manages document processing and vector operations:

```javascript
// Upload and process a file
knowledgeService.uploadFileSource(storeId, file, onProgress)

// Process a URL source
knowledgeService.processUrlSource(storeId, url, onProgress)

// Vectorize document chunks
knowledgeService.vectorizeChunks(storeId, knowledgeId, sourceId, chunks, sourceMetadata, embeddingModel, onProgress)

// Search for relevant documents
knowledgeService.searchVectors(storeId, query, knowledgeId, limit, embeddingModel)
```

### Tool Service

Handles tool management and execution:

```javascript
// Get all tools
toolService.getTools()

// Create a new tool
toolService.createTool(toolData)

// Execute a tool
toolService.executeTool(id, input)
```

## Usage Patterns

### Direct Service Usage in Components

For simple components that don't need Redux state management:

```javascript
import toolService from '../../services/toolService';

const ToolTesting = () => {
  const handleSubmit = async () => {
    try {
      const toolData = {
        name,
        description,
        code,
        created_by: user.user_id
      };
      
      await toolService.createTool(toolData);
      // Handle success...
    } catch (error) {
      // Handle error...
    }
  };
  
  // Rest of component...
};
```

### Redux Integration

For components that need Redux state management:

```javascript
// In Redux slice
export const fetchTools = createAsyncThunk(
  'tools/fetchTools',
  async (_, { rejectWithValue }) => {
    try {
      const tools = await toolService.getTools();
      return tools;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// In component
const ToolList = () => {
  const dispatch = useDispatch();
  const tools = useSelector(selectTools);
  
  useEffect(() => {
    dispatch(fetchTools());
  }, [dispatch]);
  
  // Rest of component...
};
```

## Benefits

1. **Consistency**: All API calls follow the same pattern
2. **Centralized Authentication**: Auth token handling in one place
3. **Unified Error Handling**: Consistent approach to errors
4. **Logging**: All API calls are automatically logged
5. **Testability**: Services can be easily mocked for testing
6. **Domain Organization**: API calls are organized by domain/feature
7. **Abstraction**: Components don't need to know API implementation details

## Best Practices

1. **Use the appropriate service** for the domain you're working in
2. **Don't bypass the service layer** by making direct API calls
3. **Keep business logic in Redux thunks** or components, not in services
4. **Services should be stateless** and focused on data operations
5. **Handle errors at the appropriate level**:
   - Service layer: Technical errors (network, parsing)
   - Redux/Component layer: Business logic errors
6. **Use TypeScript interfaces** to document service method parameters and return types
7. **Write unit tests** for services using mocks for the underlying API calls

## Migration Guide

When migrating existing code to use the new service layer:

1. Identify the domain of the API call (LLM, Knowledge, Tool, etc.)
2. Find or create the appropriate service method
3. Replace direct API calls with service calls
4. Update error handling to use the consistent pattern
5. Test thoroughly to ensure the behavior is unchanged

## Example: Before and After

### Before:

```javascript
const handleSubmit = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('llmProxyHandler', {
      body: {
        provider: activeProvider.toLowerCase(),
        type: 'chat',
        model: activeModel,
        messages: [
          { role: 'system', content: systemInstructions },
          ...messages,
          { role: 'user', content: input }
        ],
        options: { temperature: 0.7 }
      }
    });
    
    if (error) throw error;
    setMessages([...messages, { role: 'assistant', content: data.content }]);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### After:

```javascript
const handleSubmit = async () => {
  try {
    const completeMessages = [
      { role: 'system', content: systemInstructions },
      ...messages,
      { role: 'user', content: input }
    ];
    
    const response = await llmService.chat(
      activeProvider,
      activeModel,
      completeMessages,
      { temperature: 0.7 }
    );
    
    setMessages([...messages, { role: 'assistant', content: response.content }]);
  } catch (error) {
    console.error('Error:', error);
  }
};