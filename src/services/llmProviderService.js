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
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    try {
      // Filter out the config to delete
      const updatedConfigs = providerConfigs.filter(config => config.id !== configId);
      
      if (isAuthMock) {
        console.log('[MOCK] Deleting provider config from user_preferences', configId);
        return { updatedConfigs };
      } else {
        // Update in Supabase
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
        
        // Check if we're deleting the current default provider
        const currentLlmPreferences = userPreferences.llm_preferences || {};
        const deletedConfig = providerConfigs.find(config => config.id === configId);
        let updatedLlmPreferences = currentLlmPreferences;
        
        if (deletedConfig && deletedConfig.provider === currentLlmPreferences.defaultProvider) {
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
        
        return { 
          updatedConfigs,
          updatedLlmPreferences
        };
      }
    } catch (error) {
      console.error('[llmProviderService] Error deleting provider config:', error);
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
      // Store API key if provided
      if (formData.apiKey) {
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
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required');
    }
    
    if (!provider) {
      throw new Error('Please select a provider first');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    try {
      if (isAuthMock) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Mock logic: accept any non-empty key, but you can add real checks here
        if (apiKey.length < 8) {
          throw new Error('API key is invalid or too short.');
        }
        
        // Mock models list
        return ['gpt-3.5-turbo', 'gpt-4', 'claude-3-opus', 'claude-3-sonnet'];
      } else {
        // Step 1: Save the API key to the llm_api_keys table
        const { error: saveError } = await supabase
          .from('llm_api_keys')
          .upsert({
            user_id: userId,
            provider: provider.toLowerCase(),
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
            provider: provider.toLowerCase(),
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
        
        if (provider.toLowerCase() === 'openai') {
          // For OpenAI, handle both chat and embedding models
          models = responseData.data?.map(model => model.id) || [];
        } else if (provider.toLowerCase() === 'anthropic') {
          models = responseData.data?.map(model => model.id) || [];
        } else if (provider.toLowerCase() === 'gemini') {
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
  }
};

export default llmProviderService;