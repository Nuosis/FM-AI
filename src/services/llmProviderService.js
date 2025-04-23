import supabaseService from './supabaseService';
import { storeApiKey } from '../utils/apiKeyStorage';
import supabase from '../utils/supabase';

/**
 * Service for managing LLM provider configurations
 */
const llmProviderService = {
  /**
   * Load provider configurations for a user
   * @param {string} userId - The user ID
   * @param {boolean} isAuthMock - Whether to use mock data
   * @returns {Promise<Array>} - Array of provider configurations
   */
  loadProviderConfigs: async (userId, isAuthMock) => {
    if (!userId) {
      console.log('[llmProviderService] No userId available, skipping loadProviderConfigs');
      return [];
    }
    
    try {
      if (isAuthMock) {
        // Mock data for development
        return [
          {
            id: '1',
            provider: 'openAI',
            models: {
              chat: {
                strong: 'gpt-4-turbo',
                weak: 'gpt-3.5-turbo'
              },
              embedding: {
                large: 'text-embedding-3-large',
                small: 'text-embedding-3-small'
              }
            },
            baseUrl: '',
            description: 'OpenAI GPT-4',
            modelType: 'chat',
            chatModelStrength: 'strong',
            embeddingModelSize: 'large'
          },
          {
            id: '2',
            provider: 'anthropic',
            models: {
              chat: {
                strong: 'claude-3-opus',
                weak: 'claude-3-haiku'
              },
              embedding: {
                large: '',
                small: ''
              }
            },
            baseUrl: '',
            description: 'Anthropic Claude',
            modelType: 'chat',
            chatModelStrength: 'strong',
            embeddingModelSize: 'large'
          }
        ];
      } else {
        // Fetch from Supabase
        const data = await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .eq('preference_key', 'llm_providers')
            .maybeSingle()
        );
        
        if (data && data.preference_value) {
          // Parse the JSON value
          let configs;
          try {
            configs = typeof data.preference_value === 'string'
              ? JSON.parse(data.preference_value)
              : data.preference_value;
              
            return Array.isArray(configs) ? configs : [];
          } catch (parseError) {
            console.error('[llmProviderService] Error parsing preference_value:', parseError);
            return [];
          }
        } else {
          return [];
        }
      }
    } catch (error) {
      console.error('[llmProviderService] Error loading provider configs:', error);
      throw error;
    }
  },

  /**
   * Delete a provider configuration
   * @param {string} configId - The configuration ID to delete
   * @param {Array} providerConfigs - Current provider configurations
   * @param {string} userId - The user ID
   * @param {Object} userPreferences - Current user preferences
   * @param {boolean} isAuthMock - Whether to use mock data
   * @returns {Promise<Object>} - Updated configurations and preferences
   */
  deleteProviderConfig: async (configId, providerConfigs, userId, userPreferences, isAuthMock) => {
    console.log('[llmProviderService] deleteProviderConfig called with:', {
      configId,
      providerConfigsCount: providerConfigs?.length || 0,
      userId,
      isAuthMock
    });
    
    if (!userId) {
      console.error('[llmProviderService] Error: User ID is required');
      throw new Error('User ID is required');
    }
    
    try {
      // Filter out the config to delete
      const configToDelete = providerConfigs.find(config => config.id === configId);
      console.log('[llmProviderService] Config to delete:', configToDelete);
      
      const updatedConfigs = providerConfigs.filter(config => config.id !== configId);
      console.log('[llmProviderService] Updated configs count:', updatedConfigs.length);
      
      if (isAuthMock) {
        console.log('[MOCK] Deleting provider config from user_preferences', configId);
        return { updatedConfigs };
      } else {
        // Update in Supabase
        console.log('[llmProviderService] Updating Supabase with new configs');
        const { error } = await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_preferences')
            .upsert({
              user_id: userId,
              preference_key: 'llm_providers',
              preference_value: updatedConfigs
            }, {
              onConflict: 'user_id,preference_key'
            })
            .select()
        );
          
        if (error) {
          console.error('[llmProviderService] Error updating configs in Supabase:', error);
          throw error;
        }
        
        // Check if we're deleting the current default provider
        const currentLlmPreferences = userPreferences.llm_preferences || {};
        const deletedConfig = providerConfigs.find(config => config.id === configId);
        console.log('[llmProviderService] Deleted config:', deletedConfig);
        console.log('[llmProviderService] Current default provider:', currentLlmPreferences.defaultProvider);
        
        let updatedLlmPreferences = currentLlmPreferences;
        
        if (deletedConfig && deletedConfig.provider === currentLlmPreferences.defaultProvider) {
          console.log('[llmProviderService] Deleted config was the default provider, updating default provider');
          // Find a new default provider or set to empty
          const newDefaultProvider = updatedConfigs.length > 0 ? updatedConfigs[0].provider : '';
          
          updatedLlmPreferences = {
            ...currentLlmPreferences,
            defaultProvider: newDefaultProvider,
            default: newDefaultProvider // Adding 'default' key for backward compatibility
          };
          
          // Save to Supabase
          await supabaseService.executeQuery(supabase =>
            supabase
              .from('user_preferences')
              .upsert({
                user_id: userId,
                preference_key: 'llm_preferences',
                preference_value: updatedLlmPreferences
              }, {
                onConflict: 'user_id,preference_key'
              })
          );
        }
        
        console.log('[llmProviderService] Successfully deleted provider config');
        return {
          updatedConfigs,
          updatedLlmPreferences
        };
      }
    } catch (error) {
      console.error('[llmProviderService] Error deleting provider config:', error);
      console.error('[llmProviderService] Error details:', error.message, error.stack);
      throw error;
    }
  },

  /**
   * Save a provider configuration
   * @param {Object} formData - The form data to save
   * @param {Object} selectedConfig - The selected configuration (if editing)
   * @param {Array} providerConfigs - Current provider configurations
   * @param {string} userId - The user ID
   * @param {Object} userPreferences - Current user preferences
   * @param {string} apiKeyStorage - API key storage preference
   * @param {boolean} isAuthMock - Whether to use mock data
   * @returns {Promise<Object>} - Updated configurations and preferences
   */
  saveProviderConfig: async (formData, selectedConfig, providerConfigs, userId, userPreferences, apiKeyStorage, isAuthMock) => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    try {
      // Check if the provider is Ollama (which doesn't require an API key)
      const isOllama = formData.provider?.toLowerCase() === 'ollama';
      
      // Store API key if provided and not Ollama
      if (formData.apiKey && !isOllama) {
        storeApiKey(formData.provider, formData.apiKey, apiKeyStorage, isAuthMock);
      }
      
      // Generate description automatically based on which models are set
      let autoDescription = '';
      
      // Check if chat models are set
      const hasChatModels = formData.models.chat.strong || formData.models.chat.weak;
      
      // Check if embedding models are set
      const hasEmbeddingModels = formData.models.embedding.large || formData.models.embedding.small;
      
      if (hasChatModels && hasEmbeddingModels) {
        autoDescription = `${formData.provider} - chat models and embedding models set`;
      } else if (hasChatModels) {
        autoDescription = `${formData.provider} - chat models`;
      } else if (hasEmbeddingModels) {
        autoDescription = `${formData.provider} - embedding models`;
      } else {
        autoDescription = `${formData.provider}`;
      }
      
      const configToSave = {
        id: selectedConfig?.id || Date.now().toString(),
        provider: formData.provider,
        models: {
          chat: {
            strong: formData.models.chat.strong || '',
            weak: formData.models.chat.weak || ''
          },
          embedding: {
            large: formData.models.embedding.large || '',
            small: formData.models.embedding.small || ''
          }
        },
        baseUrl: formData.baseUrl || '',
        description: autoDescription
      };
      
      // Update or add to the configs array
      let updatedConfigs;
      if (selectedConfig) {
        // Update existing config
        updatedConfigs = providerConfigs.map(config =>
          config.id === selectedConfig.id ? configToSave : config
        );
      } else {
        // Add new config
        updatedConfigs = [...providerConfigs, configToSave];
      }
      
      if (isAuthMock) {
        console.log('[MOCK] Saving provider configs to user_preferences', updatedConfigs);
        return { updatedConfigs };
      } else {
        // Save to Supabase
        const { error } = await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_preferences')
            .upsert({
              user_id: userId,
              preference_key: 'llm_providers',
              preference_value: updatedConfigs
            }, {
              onConflict: 'user_id,preference_key'
            })
            .select()
        );
          
        if (error) throw error;
        
        // Also update the llm_preferences with the default provider
        const defaultProvider = formData.provider;
        const currentLlmPreferences = userPreferences.llm_preferences || {};
        
        const updatedLlmPreferences = {
          ...currentLlmPreferences,
          defaultProvider: defaultProvider,
          default: defaultProvider // Adding 'default' key for backward compatibility
        };
        
        // Save to Supabase
        await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_preferences')
            .upsert({
              user_id: userId,
              preference_key: 'llm_preferences',
              preference_value: updatedLlmPreferences
            }, {
              onConflict: 'user_id,preference_key'
            })
            .select()
        );
        
        return { 
          updatedConfigs,
          updatedLlmPreferences
        };
      }
    } catch (error) {
      console.error('[llmProviderService] Error saving provider config:', error);
      throw error;
    }
  },

  /**
   * Verify an API key
   * @param {string} apiKey - The API key to verify
   * @param {string} provider - The provider
   * @param {string} baseUrl - Optional base URL
   * @param {string} userId - The user ID
   * @param {boolean} isAuthMock - Whether to use mock data
   * @returns {Promise<Array>} - Array of available models
   */
  verifyApiKey: async (apiKey, provider, baseUrl, userId, isAuthMock) => {
    // Check if provider is specified
    if (!provider) {
      throw new Error('Please select a provider first');
    }
    
    // Check if userId is specified
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Convert provider to lowercase for consistent comparison
    const providerLower = provider.toLowerCase();
    
    // Special handling for Ollama - no API key required
    const isOllama = providerLower === 'ollama';
    
    // Special handling for LM Studio - API key required but direct call
    const isLMStudio = providerLower === 'lmstudio';
    
    // For non-Ollama providers with direct API key verification, API key is required
    // But for edge function calls, the API key will be looked up based on user_id
    // So we don't need to check for API key presence here
    // The edge function will handle the API key lookup
    
    try {
      if (isAuthMock) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Mock logic: accept any non-empty key, but you can add real checks here
        if (!isOllama && apiKey.length < 8) {
          throw new Error('API key is invalid or too short.');
        }
        
        // Mock models list
        return ['gpt-3.5-turbo', 'gpt-4', 'claude-3-opus', 'claude-3-sonnet'];
      } else if (isOllama || isLMStudio) {
        // For Ollama and LM Studio, make direct calls to localhost
        
        // Save API key for LM Studio (not needed for Ollama)
        if (isLMStudio && apiKey) {
          const { error: saveError } = await supabase
            .from('llm_api_keys')
            .upsert({
              user_id: userId,
              provider: providerLower,
              api_key: apiKey,
              verified: true
            }, {
              onConflict: 'user_id,provider'
            });
            
          if (saveError) {
            throw new Error(`Failed to save API key: ${saveError.message}`);
          }
        }
        
        // Get provider config from providerEndpoints.js
        const { getProviderConfig } = await import('../utils/providerEndpoints');
        const providerConfig = getProviderConfig(provider);
        
        if (!providerConfig) {
          throw new Error(`Provider configuration not found for ${provider}`);
        }
        
        // We don't need to use the endpoint variable directly since we're using specific endpoints for each provider
        
        // For Ollama, fetch models directly from localhost
        if (isOllama) {
          try {
            console.log('[llmProviderService] Attempting to verify Ollama connection');
            
            // Ollama uses a different endpoint for listing models
            // Always use the proxy server to avoid CORS issues
            let modelsEndpoint = 'http://localhost:3500/ollama/api/tags';
            
            // If a custom base URL is provided, pass it as a query parameter
            if (baseUrl && baseUrl.trim() !== '') {
              console.log(`[llmProviderService] Using custom base URL for Ollama: ${baseUrl}`);
              modelsEndpoint = `http://localhost:3500/ollama/api/tags?baseUrl=${encodeURIComponent(baseUrl.trim())}`;
            }
            
            console.log('[llmProviderService] Fetching Ollama models from:', modelsEndpoint);
            
            const response = await fetch(modelsEndpoint);
            console.log('[llmProviderService] Ollama response status:', response.status, response.statusText);
            
            if (!response.ok) {
              console.error('[llmProviderService] Failed response from Ollama:', response.status, response.statusText);
              throw new Error(`Failed to fetch models from Ollama: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('[llmProviderService] Ollama response data:', data);
            
            const models = data.models || [];
            console.log('[llmProviderService] Extracted models array:', models);
            
            // Extract model names from Ollama response
            const modelNames = models.map(model => model.name || model);
            console.log('[llmProviderService] Extracted model names:', modelNames);
            
            if (!modelNames || modelNames.length === 0) {
              console.error('[llmProviderService] No models found in Ollama response');
              throw new Error('No models found for Ollama. Make sure Ollama is running.');
            }
            
            console.log('[llmProviderService] Successfully verified Ollama connection with', modelNames.length, 'models');
            return modelNames;
          } catch (error) {
            console.error('[llmProviderService] Error fetching Ollama models:', error);
            console.error('[llmProviderService] Error details:', error.message);
            throw new Error(`Failed to connect to Ollama: ${error.message}. Make sure Ollama is running and the local LLM proxy server is active.`);
          }
        }
        
        // For LM Studio, fetch models directly from localhost
        if (isLMStudio) {
          try {
            // LM Studio is OpenAI-compatible, so we use the models endpoint
            // Always use the proxy server to avoid CORS issues
            let modelsEndpoint = 'http://localhost:3500/lmstudio/v1/models';
            
            // If a custom base URL is provided, pass it as a query parameter
            if (baseUrl && baseUrl.trim() !== '') {
              console.log(`[llmProviderService] Using custom base URL for LM Studio: ${baseUrl}`);
              modelsEndpoint = `http://localhost:3500/lmstudio/v1/models?baseUrl=${encodeURIComponent(baseUrl.trim())}`;
            }
            
            console.log(`[llmProviderService] Connecting to LM Studio at: ${modelsEndpoint}`);
            
            const headers = {
              'Content-Type': 'application/json'
            };
            
            // Add authorization header if API key is provided
            if (apiKey) {
              headers['Authorization'] = `Bearer ${apiKey}`;
            }
            
            const response = await fetch(modelsEndpoint, { headers });
            
            if (!response.ok) {
              throw new Error(`Failed to fetch models from LM Studio: ${response.statusText}`);
            }
            
            const data = await response.json();
            const models = data.data || [];
            
            // Extract model IDs from LM Studio response (OpenAI format)
            const modelIds = models.map(model => model.id);
            
            if (!modelIds || modelIds.length === 0) {
              throw new Error('No models found for LM Studio. Make sure LM Studio is running.');
            }
            
            return modelIds;
          } catch (error) {
            console.error('[llmProviderService] Error fetching LM Studio models:', error);
            throw new Error(`Failed to connect to LM Studio: ${error.message}. Make sure LM Studio is running and the local LLM proxy server is active.`);
          }
        }
      } else {
        // For other providers, use the existing edge function approach
        
        // Step 1: Save the API key to the llm_api_keys table
        const { error: saveError } = await supabase
          .from('llm_api_keys')
          .upsert({
            user_id: userId,
            provider: providerLower,
            api_key: apiKey,
            verified: true // Set verified to true on successful verification
          }, {
            onConflict: 'user_id,provider'
          });
          
        if (saveError) {
          throw new Error(`Failed to save API key: ${saveError.message}`);
        }
        
        // Step 2: Get the current user's JWT token
        const { data: authData } = await supabase.auth.getSession();
        const token = authData?.session?.access_token;
        
        if (!token) {
          throw new Error('Authentication required');
        }
        
        // Step 3: Call the llmProxyHandler edge function to verify the key and get models
        const { data: stringResponseData, error } = await supabase.functions.invoke('llmProxyHandler', {
          body: {
            provider: providerLower,
            type: 'models',
            baseUrl: baseUrl || null
          }
        });
        
        if (error) {
          throw new Error(error.message || 'Failed to verify API key');
        }
        
        // Make parsing more robust by checking if stringResponseData is a string
        const responseData = typeof stringResponseData === 'string'
          ? JSON.parse(stringResponseData)
          : stringResponseData;
        
        // Extract models from the response based on provider
        let models = [];
        
        if (providerLower === 'openai') {
          // For OpenAI, handle both chat and embedding models
          models = responseData.data?.map(model => model.id) || [];
        } else if (providerLower === 'anthropic') {
          models = responseData.data?.map(model => model.id) || [];
        } else if (providerLower === 'gemini') {
          // For Gemini, extract model names from the response
          if (responseData.models) {
            models = responseData.models.map(model => model.name) || [];
          } else if (Array.isArray(responseData)) {
            models = responseData.map(model => typeof model === 'string' ? model : model.name || '') || [];
          } else if (responseData.data) {
            models = responseData.data.map(model => typeof model === 'string' ? model : model.name || '') || [];
          } else {
            models = [];
          }
          // Filter out any empty strings or undefined values
          models = models.filter(Boolean);
        } else {
          // Generic fallback
          models = Array.isArray(responseData) ? responseData :
                  responseData.models || responseData.data || [];
        }
        
        // Ensure we have models before returning them
        if (!models || models.length === 0) {
          throw new Error('No models found for this provider');
        }
        
        return models;
      }
    } catch (error) {
      console.error('[llmProviderService] Error verifying API key:', error);
      throw error;
    }
  },

  /**
   * Update API key storage preference
   * @param {string} newStorageType - The new storage type
   * @param {string} userId - The user ID
   * @param {Object} userPreferences - Current user preferences
   * @param {boolean} isAuthMock - Whether to use mock data
   * @returns {Promise<Object>} - Updated preferences
   */
  updateApiKeyStoragePreference: async (newStorageType, userId, userPreferences, isAuthMock) => {
    try {
      // Update llm_preferences in Redux and Supabase
      const currentLlmPreferences = userPreferences.llm_preferences || {};
      
      // Make sure we preserve the default provider
      const defaultProvider = currentLlmPreferences.defaultProvider || '';
      
      const updatedLlmPreferences = {
        ...currentLlmPreferences,
        apiKeyStorage: newStorageType,
        defaultProvider: defaultProvider,
        default: defaultProvider // Adding 'default' key for backward compatibility
      };
      
      if (isAuthMock) {
        console.log('[MOCK] Updating API key storage preference to', newStorageType);
        return { updatedLlmPreferences };
      } else {
        // Save to Supabase
        await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_preferences')
            .upsert({
              user_id: userId,
              preference_key: 'llm_preferences',
              preference_value: updatedLlmPreferences
            }, {
              onConflict: 'user_id,preference_key'
            })
            .select()
        );
        
        return { updatedLlmPreferences };
      }
    } catch (error) {
      console.error('[llmProviderService] Error updating API key storage preference:', error);
      throw error;
    }
  },

  /**
   * Generate tool input parameters using LLM
   * @param {Object} options
   * @param {string} options.prompt - The prompt to send to the LLM
   * @param {string} options.provider - The LLM provider (e.g., 'openai')
   * @param {string} options.model - The model to use (e.g., 'gpt-4-turbo')
   * @param {string} [options.baseUrl] - Optional base URL for local providers
   * @returns {Promise<string>} - The LLM's response (JSON string)
   */
  generateToolInputWithLLM: async ({ prompt, provider, model, baseUrl }) => {
    try {
      const providerLower = provider.toLowerCase();
      const messages = [
        { role: 'system', content: 'You are an expert at generating valid JSON input objects for tool APIs.' },
        { role: 'user', content: prompt }
      ];

      // Get auth token for the edge function
      const { data: authData } = await supabase.auth.getSession();
      const session = authData?.session;
      
      if (!session) {
        throw new Error('Authentication required');
      }

      // Call the Supabase Edge Function with auth header
      const { data, error } = await supabase.functions.invoke('llmProxyHandler', {
        body: {
          provider: providerLower,
          type: 'chat',
          model,
          baseUrl: baseUrl || null,
          messages,
          options: {
            temperature: 0.7,
            max_tokens: 500
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // Parse the response if it's a string
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Extract content based on response format
      let content = '';
      if (parsedData.choices && parsedData.choices[0] && parsedData.choices[0].message) {
        // OpenAI format
        content = parsedData.choices[0].message.content;
      } else if (parsedData.content) {
        // Direct content format
        content = parsedData.content;
      } else {
        throw new Error('Invalid LLM response format');
      }
      
      return content;
    } catch (err) {
      console.error('[llmProviderService] Error generating tool input with LLM:', err);
      throw err;
    }
  }
};

export default llmProviderService;