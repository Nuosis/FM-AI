import apiService from './apiService';
import llmService from './llmService';

/**
 * Knowledge Service
 * 
 * Provides methods for managing knowledge sources, document processing,
 * and vector operations for the knowledge system.
 */
const knowledgeService = {
  /**
   * Upload and process a file source
   * 
   * @param {string} storeId - The data store ID
   * @param {File} file - The file to upload
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} - The processed document data
   */
  async uploadFileSource(storeId, file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Process document with docling service
    const response = await apiService.uploadFile('/docling/process', formData, onProgress);
    return response.data;
  },
  
  /**
   * Process a URL source
   * 
   * @param {string} storeId - The data store ID
   * @param {string} url - The URL to process
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} - The processed document data
   */
  async processUrlSource(storeId, url, onProgress) {
    const formData = new FormData();
    formData.append('url', url);
    
    // Process URL with docling service
    const response = await apiService.uploadFile('/docling/process', formData, onProgress);
    return response.data;
  },
  
  /**
   * Vectorize document chunks and store them in the vector database
   * 
   * @param {string} storeId - The data store ID
   * @param {string} knowledgeId - The knowledge entity ID
   * @param {string} sourceId - The source ID
   * @param {Array} chunks - Array of document chunks
   * @param {string} sourceMetadata - Metadata about the source
   * @param {Object} embeddingModel - The embedding model to use
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Array>} - Array of processed chunk indices
   */
  async vectorizeChunks(storeId, knowledgeId, sourceId, chunks, sourceMetadata, embeddingModel, onProgress) {
    const totalChunks = chunks.length;
    
    const vectorizePromises = chunks.map(async (chunk, index) => {
      try {
        // Get vector embedding for the chunk
        const embeddingResponse = await apiService.post('/llm/embed', {
          text: chunk.text,
          model: embeddingModel.id
        });
        
        if (!embeddingResponse.data || !embeddingResponse.data.embedding) {
          throw new Error(`Failed to get embedding for chunk ${index}`);
        }
        
        // Push to data store
        await apiService.post('/data_store/records', {
          store_id: storeId,
          vector: embeddingResponse.data.embedding,
          metadata: {
            knowledge_id: knowledgeId,
            source_id: sourceId,
            chunk_index: index,
            chunk_text: chunk.text,
            source: sourceMetadata.filename,
            upload_date: sourceMetadata.upload_date,
            mimetype: sourceMetadata.mimetype,
            ...chunk.metadata
          }
        });
        
        // Update progress if callback provided
        if (onProgress) {
          onProgress(Math.round((index + 1) * 100 / totalChunks));
        }
        
        return index;
      } catch (error) {
        console.error(`Error processing chunk ${index}:`, error);
        throw error;
      }
    });
    
    return Promise.all(vectorizePromises);
  },
  
  /**
   * Delete a source and its associated vector records
   * 
   * @param {string} storeId - The data store ID
   * @param {string} sourceId - The source ID to delete
   * @returns {Promise<Object>} - The deletion response
   */
  async deleteSource(storeId, sourceId) {
    return apiService.delete(`/data_store/records?store_id=${storeId}&source_id=${sourceId}`);
  },
  
  /**
   * Search for relevant documents using vector similarity
   * 
   * @param {string} storeId - The data store ID
   * @param {string} query - The search query
   * @param {string} knowledgeId - Optional knowledge ID to filter by
   * @param {number} limit - Maximum number of results to return
   * @param {Object} embeddingModel - The embedding model to use
   * @returns {Promise<Array>} - Array of search results
   */
  async searchVectors(storeId, query, knowledgeId, limit = 5, embeddingModel) {
    try {
      // Get embedding for the query
      const embeddingResponse = await apiService.post('/llm/embed', {
        text: query,
        model: embeddingModel.id
      });
      
      if (!embeddingResponse.data || !embeddingResponse.data.embedding) {
        throw new Error('Failed to get embedding for search query');
      }
      
      // Build search params
      const searchParams = {
        store_id: storeId,
        vector: embeddingResponse.data.embedding,
        limit
      };
      
      // Add knowledge_id filter if provided
      if (knowledgeId) {
        searchParams.filter = {
          knowledge_id: knowledgeId
        };
      }
      
      // Search the vector database
      const searchResponse = await apiService.post('/data_store/search', searchParams);
      
      return searchResponse.data.results || [];
    } catch (error) {
      console.error('Error searching vectors:', error);
      throw error;
    }
  },
  
  /**
   * Get all knowledge entities
   * 
   * @returns {Promise<Array>} - Array of knowledge entities
   */
  async getKnowledgeEntities() {
    const response = await apiService.get('/knowledge');
    return response.data;
  },
  
  /**
   * Create a new knowledge entity
   * 
   * @param {Object} knowledgeData - The knowledge entity data
   * @returns {Promise<Object>} - The created knowledge entity
   */
  async createKnowledgeEntity(knowledgeData) {
    const response = await apiService.post('/knowledge', knowledgeData);
    return response.data;
  },
  
  /**
   * Update a knowledge entity
   * 
   * @param {string} knowledgeId - The knowledge entity ID
   * @param {Object} knowledgeData - The updated knowledge entity data
   * @returns {Promise<Object>} - The updated knowledge entity
   */
  async updateKnowledgeEntity(knowledgeId, knowledgeData) {
    const response = await apiService.put(`/knowledge/${knowledgeId}`, knowledgeData);
    return response.data;
  },
  
  /**
   * Delete a knowledge entity
   * 
   * @param {string} knowledgeId - The knowledge entity ID
   * @returns {Promise<Object>} - The deletion response
   */
  async deleteKnowledgeEntity(knowledgeId) {
    return apiService.delete(`/knowledge/${knowledgeId}`);
  }
};

export default knowledgeService;