import apiService from './apiService';

/**
 * LLM Service
 * 
 * Provides methods for interacting with LLM providers through a unified interface.
 * Handles chat completions, embeddings, and model listing.
 */
const llmService = {
  /**
   * Send a chat completion request to an LLM provider
   * 
   * @param {string} provider - The LLM provider (e.g., 'openai', 'anthropic', 'gemini')
   * @param {string} model - The model to use (e.g., 'gpt-4', 'claude-3-opus')
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options like temperature, max_tokens, etc.
   * @returns {Promise<Object>} - The LLM response
   */
  async chat(provider, model, messages, options = {}) {
    return apiService.callLLMProvider(provider, 'chat', model, {
      messages
    }, options);
  },
  
  /**
   * Generate embeddings for text using an LLM provider
   * 
   * @param {string} provider - The LLM provider
   * @param {string} model - The embedding model to use
   * @param {string|Array<string>} text - Text to embed (string or array of strings)
   * @returns {Promise<Object>} - The embedding response
   */
  async embed(provider, model, text) {
    return apiService.callLLMProvider(provider, 'embeddings', model, {
      input: text
    });
  },
  
  /**
   * List available models for an LLM provider
   * 
   * @param {string} provider - The LLM provider
   * @returns {Promise<Array>} - Array of available models
   */
  async listModels(provider) {
    return apiService.callLLMProvider(provider, 'models');
  },
  
  /**
   * Verify an API key with an LLM provider
   * 
   * @param {string} provider - The LLM provider
   * @param {string} apiKey - The API key to verify
   * @param {string} baseUrl - Optional base URL for the provider
   * @returns {Promise<Array>} - Array of available models if verification succeeds
   */
  async verifyApiKey(provider, apiKey, baseUrl = null) {
    // For local providers like Ollama and LM Studio, use direct calls
    if (provider.toLowerCase() === 'ollama' || provider.toLowerCase() === 'lmstudio') {
      const endpoint = provider.toLowerCase() === 'ollama' 
        ? '/ollama/api/tags' 
        : '/lmstudio/v1/models';
      
      const url = baseUrl 
        ? `${endpoint}?baseUrl=${encodeURIComponent(baseUrl.trim())}` 
        : endpoint;
      
      const headers = {};
      if (provider.toLowerCase() === 'lmstudio' && apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      try {
        const response = await apiService.get(`http://localhost:3500${url}`, { headers });
        
        // Extract models based on provider
        if (provider.toLowerCase() === 'ollama') {
          const models = response.data.models || [];
          return models.map(model => model.name || model);
        } else {
          const models = response.data.data || [];
          return models.map(model => model.id);
        }
      } catch (error) {
        throw new Error(`Failed to connect to ${provider}: ${error.message}`);
      }
    } else {
      // For cloud providers, use the edge function
      return apiService.callEdgeFunction('llmProxyHandler', {
        provider: provider.toLowerCase(),
        type: 'models',
        baseUrl: baseUrl || null
      });
    }
  },
  
  /**
   * Generate tool input parameters using LLM
   * 
   * @param {Object} options - Options for the generation
   * @param {string} options.prompt - The prompt to send to the LLM
   * @param {string} options.provider - The LLM provider
   * @param {string} options.model - The model to use
   * @param {string} options.baseUrl - Optional base URL for local providers
   * @returns {Promise<string>} - The LLM's response (JSON string)
   */
  async generateToolInput({ prompt, provider, model, baseUrl = null }) {
    const messages = [
      { role: 'system', content: 'You are an expert at generating valid JSON input objects for tool APIs.' },
      { role: 'user', content: prompt }
    ];
    
    const response = await this.chat(provider, model, messages, {
      temperature: 0.7,
      max_tokens: 500,
      baseUrl
    });
    
    return response.content;
  }
};

export default llmService;