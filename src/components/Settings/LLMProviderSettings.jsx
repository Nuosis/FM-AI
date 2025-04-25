import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { updateUserPreferences } from '../../redux/slices/authSlice';
import { setDefaultProvider } from '../../redux/slices/llmSlice';
import { API_STORAGE_TYPES } from '../../utils/apiKeyStorage';
import llmProviderService from '../../services/llmProviderService';
import supabaseService from '../../services/supabaseService';
import supabase from '../../utils/supabase';
import {
  Box,
  Divider,
  CircularProgress,
  Button
} from '@mui/material';

// Import subcomponents
import ApiKeyStorageSelector from './ApiKeyStorageSelector';
import LLMProviderList from './LLMProviderList';
import LLMProviderForm from './LLMProviderForm';

/**
 * LLMProviderSettings component for managing LLM provider configurations
 * Handles default provider, per-provider API key, endpoint, preferred models, storage method
 * Maps to user_preferences table with key = 'llm_preferences' and 'llm_providers'
 * Securely manages API keys according to storage preference
 */
const LLMProviderSettings = ({ onSuccess, onError }) => {
  const dispatch = useDispatch();
  const isInitialized = useRef(false);
  
  // Get user data from Redux
  const currentUser = useSelector(state => state.auth.user, shallowEqual);
  const userId = currentUser?.user_id;
  
  // Get preferences from Redux store using shallowEqual to prevent unnecessary rerenders
  const userPreferences = useSelector(
    state => state.auth.user?.preferences || {},
    shallowEqual
  );
  
  const llmPreferences = useSelector(
    state => state.auth.user?.preferences?.llm_preferences || {},
    shallowEqual
  );
  
  // Check if we should mock auth in development
  const isDevelopment = import.meta.env.VITE_ENVIRONMENT === 'Development';
  const isAuthMock = isDevelopment &&
                    (import.meta.env.VITE_AD_AUTH_MOCK === 'true' ||
                     import.meta.env.VITE_AD_AUTH_MOCK === true);
  
  // Get API key storage preference
  const apiKeyStorage = llmPreferences.apiKeyStorage || API_STORAGE_TYPES.LOCAL;
  
  // Component state
  const [providerConfigs, setProviderConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiKeyVerified, setIsApiKeyVerified] = useState(false);
  const [isVerifyingApiKey, setIsVerifyingApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [showProviderForm, setShowProviderForm] = useState(false);
  
  // State for available models
  const [availableModels, setAvailableModels] = useState([]);
  
  // Form state with nested models structure
  const [formData, setFormData] = useState({
    provider: llmPreferences.defaultProvider || '',
    models: {
      chat: {
        strong: '', // Strong chat model (e.g., "gpt-4")
        weak: ''    // Weak chat model (e.g., "gpt-3.5-turbo")
      },
      embedding: {
        large: '', // Large embedding model (e.g., "text-embedding-3-large")
        small: ''  // Small embedding model (e.g., "text-embedding-3-small")
      }
    },
    apiKey: '',
    baseUrl: '',
    description: '',
    modelType: 'chat', // 'chat' or 'embedding'
    chatModelStrength: 'strong', // 'strong' or 'weak'
    embeddingModelSize: 'large' // 'large' or 'small'
  });
  
  // Load provider configs on mount or user change only
  useEffect(() => {
    // Skip if no user or if already initialized with the same user
    if (!userId) return;
    
    // Get provider configs from user preferences
    const initialProviderConfigs = userPreferences.llm_providers || [];
    
    // Only initialize if not already initialized or if user changed
    if (!isInitialized.current) {
      if (initialProviderConfigs.length > 0) {
        setProviderConfigs(initialProviderConfigs);
        isInitialized.current = true;
      } else {
        // Load provider configs from Supabase
        loadProviderConfigs();
      }
    }
  }, [userId, userPreferences.llm_providers]);
  
  // Load provider configs from Supabase
  const loadProviderConfigs = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      const configs = await llmProviderService.loadProviderConfigs(userId, isAuthMock);
      setProviderConfigs(configs);
      isInitialized.current = true;
      
      if (onSuccess) {
        onSuccess('Provider configurations loaded successfully');
      }
    } catch (error) {
      console.error('[LLMProviderSettings] Error loading provider configs:', error);
      if (onError) {
        onError(`Failed to load provider configurations: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Memoize handleEditConfig to prevent unnecessary re-renders
  const handleEditConfig = useCallback((config) => {
    setSelectedConfig(config);
    setShowProviderForm(true);
    
    // API keys are never stored locally, they're fetched from the database when needed
    // Just set apiKey to empty string for the form
    const apiKey = '';
    console.log('[LLMProviderSettings] Not retrieving API key from local storage');
    
    // Always default to chat models tab when editing
    const modelType = 'chat';
    
    // Update formData with nested models structure
    const newFormData = {
      provider: config.provider,
      models: {
        chat: {
          strong: config.models?.chat?.strong || config.strongChatModel || config.model || '',
          weak: config.models?.chat?.weak || config.weakChatModel || ''
        },
        embedding: {
          large: config.models?.embedding?.large || config.largeEmbeddingModel || '',
          small: config.models?.embedding?.small || config.smallEmbeddingModel || ''
        }
      },
      apiKey: apiKey,
      baseUrl: config.baseUrl || '',
      description: config.description || '',
      modelType: modelType,
      chatModelStrength: config.chatModelStrength || 'strong',
      embeddingModelSize: config.embeddingModelSize || 'large'
    };
    setFormData(newFormData);
    
    // Check if the provider is Ollama (which doesn't require an API key)
    const isOllama = config.provider?.toLowerCase() === 'ollama';
    
    // Log auth mock status to debug
    console.log('[LLMProviderSettings] isAuthMock:', isAuthMock);
    
    // Set loading state
    setIsVerifyingApiKey(true);
    
    // For Ollama, set API key verification to true immediately
    if (isOllama) {
      setIsApiKeyVerified(true);
      
      // Fetch models for Ollama
      llmProviderService.verifyApiKey(
        '', // Empty API key for Ollama
        config.provider,
        config.baseUrl || '',
        userId,
        isAuthMock
      )
        .then(models => {
          // Sort models alphabetically
          const sortedModels = [...models].sort();
          // Set available models
          setAvailableModels(sortedModels);
          setIsVerifyingApiKey(false);
        })
        .catch(err => {
          console.error('[LLMProviderSettings] Error fetching models for Ollama during edit:', err);
          setIsVerifyingApiKey(false);
        });
    } else {
      // For other providers, check if the API key is verified in the database
      console.log('[LLMProviderSettings] Condition check:', {
        isAuthMock,
        hasApiKey: !!apiKey,
        condition: !isAuthMock && !!apiKey
      });
      
      // Always check the database for verification status, even if no API key in local storage
      if (!isAuthMock) {
        console.log('[LLMProviderSettings] Checking API key verification in database');
        // Query the key_store table to check if the API key is verified
        // Use lowercase for provider name to ensure consistent matching
        const providerLower = config.provider.toLowerCase();
        console.log('[LLMProviderSettings] Provider:', providerLower);
        
        // First, check if there are any API keys for this user
        // Only select the verified field, never the api_key field for security
        console.log('[LLMProviderSettings] Checking for any API keys');
        supabase
          .from('key_store')
          .select('provider,verified')
          .then(({ data, error }) => {
            if (error) {
              console.error('[LLMProviderSettings] Error checking all API keys:', error);
              setIsApiKeyVerified(false);
              setIsVerifyingApiKey(false);
              return;
            }
            
            console.log('[LLMProviderSettings] All API keys in database:', data);
            
            // Find the matching provider (case insensitive)
            const apiKeyEntry = data?.find(entry => 
              entry.provider.toLowerCase() === providerLower
            );
            
            console.log('[LLMProviderSettings] Matching API key entry:', apiKeyEntry);
            
            // Set isApiKeyVerified based on the verified field from the database
            const isVerified = apiKeyEntry?.verified === true;
            console.log('[LLMProviderSettings] API key verified:', isVerified);
            setIsApiKeyVerified(isVerified);
            
            // If verified, fetch models
            if (isVerified) {
              // Fetch available models - we don't need to pass the API key
              // The backend will fetch it from the database when needed
              console.log('[LLMProviderSettings] API key is verified, fetching models');
              
              llmProviderService.verifyApiKey(
                '', // Empty API key - backend will fetch it from the database
                config.provider,
                config.baseUrl || '',
                userId,
                isAuthMock
              )
                .then(models => {
                  // Sort models alphabetically
                  const sortedModels = [...models].sort();
                  // Set available models
                  setAvailableModels(sortedModels);
                  setIsVerifyingApiKey(false);
                })
                .catch(err => {
                  console.error('[LLMProviderSettings] Error fetching models during edit:', err);
                  setIsVerifyingApiKey(false);
                  
                  // Fallback: use models from the config to ensure they're at least available
                  const allModels = new Set();
                  if (config.models?.chat?.strong) allModels.add(config.models.chat.strong);
                  if (config.models?.chat?.weak) allModels.add(config.models.chat.weak);
                  if (config.models?.embedding?.large) allModels.add(config.models.embedding.large);
                  if (config.models?.embedding?.small) allModels.add(config.models.embedding.small);
                  
                  if (allModels.size > 0) {
                    // Sort models alphabetically
                    const sortedModels = [...allModels].sort();
                    setAvailableModels(sortedModels);
                  }
                });
            } else {
              setIsVerifyingApiKey(false);
            }
          })
          .catch(err => {
            console.error('[LLMProviderSettings] Error in Supabase query:', err);
            setIsApiKeyVerified(false);
            setIsVerifyingApiKey(false);
          });
      } else {
        // For mock auth or no API key, set verified to false
        setIsApiKeyVerified(false);
        setIsVerifyingApiKey(false);
      }
    }
  }, [apiKeyStorage, isAuthMock, userId]);
  
  // Memoize handleDeleteConfig to prevent unnecessary re-renders
  const handleDeleteConfig = useCallback(async (configId) => {
    console.log('[LLMProviderSettings] handleDeleteConfig called with configId:', configId);
    
    if (!userId) {
      console.error('[LLMProviderSettings] Cannot delete config: No userId available');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('[LLMProviderSettings] Calling deleteProviderConfig with:', {
        configId,
        providerConfigsCount: providerConfigs.length,
        userId,
        isAuthMock
      });
      
      const result = await llmProviderService.deleteProviderConfig(
        configId,
        providerConfigs,
        userId,
        userPreferences,
        isAuthMock
      );
      
      console.log('[LLMProviderSettings] deleteProviderConfig result:', result);
      
      setProviderConfigs(result.updatedConfigs);
      
      if (!isAuthMock && result.updatedLlmPreferences) {
        // Update both llm_providers and llm_preferences in Redux
        dispatch(updateUserPreferences({
          key: 'llm_providers',
          value: result.updatedConfigs
        }));
        
        // Update llm_preferences in Redux
        dispatch(updateUserPreferences({
          key: 'llm_preferences',
          value: result.updatedLlmPreferences
        }));
        
        // Update llmSlice
        dispatch(setDefaultProvider(result.updatedLlmPreferences.defaultProvider));
      }
      
      // If the deleted config was selected, reset the form
      if (selectedConfig && selectedConfig.id === configId) {
        resetForm();
      }
      
      if (onSuccess) {
        onSuccess('Provider configuration deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting provider config:', error);
      if (onError) {
        onError(`Failed to delete provider configuration: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    providerConfigs,
    isAuthMock,
    userPreferences,
    selectedConfig,
    dispatch,
    onSuccess,
    onError
  ]);
  
  // Memoize resetForm to prevent unnecessary re-renders
  const resetForm = useCallback(() => {
    setSelectedConfig(null);
    setShowProviderForm(false);
    // Note: description field is still included in formData even though we removed the input field
    // It will be auto-generated when saving based on provider and model type
    const newFormData = {
      provider: '',
      models: {
        chat: {
          strong: '',
          weak: ''
        },
        embedding: {
          large: '',
          small: ''
        }
      },
      apiKey: '',
      baseUrl: '',
      description: '', // Will be auto-generated when saving
      modelType: 'chat',
      chatModelStrength: 'strong',
      embeddingModelSize: 'large'
    };
    setFormData(newFormData);
    setIsApiKeyVerified(false);
    setApiKeyError('');
    setAvailableModels([]);
  }, []); // No dependencies needed for resetForm
  
  // Function to fetch models for the current provider if API key is verified
  const fetchModels = useCallback(async () => {
    // Only fetch models if API key is verified
    if (!isApiKeyVerified || !formData.provider) {
      return;
    }
    
    console.log('[LLMProviderSettings] Fetching models for', formData.provider);
    
    try {
      // The edge function will handle API key lookup based on user_id
      // We don't need to check for API key presence here
      const models = await llmProviderService.verifyApiKey(
        '', // Empty API key - edge function will handle lookup
        formData.provider,
        formData.baseUrl,
        userId,
        isAuthMock
      );
      
      // Sort models alphabetically
      const sortedModels = [...models].sort();
      setAvailableModels(sortedModels);
    } catch (err) {
      console.error('[LLMProviderSettings] Error fetching models:', err);
    }
  }, [isApiKeyVerified, formData.provider, formData.baseUrl, userId, isAuthMock]);
  
  // Memoize verification function to prevent unnecessary re-renders
  const verifyApiKey = useCallback(async (apiKey) => {
    // Check if the provider is Ollama (which doesn't require an API key)
    const isOllama = formData.provider?.toLowerCase() === 'ollama';
    
    if (!formData.provider) {
      setApiKeyError('Please select a provider first');
      return;
    }
    
    if (!userId) {
      setApiKeyError('User ID is required');
      return;
    }
    
    // For non-Ollama providers, API key is required
    if (!isOllama && (!apiKey || apiKey.trim() === '')) {
      setApiKeyError('API key is required');
      return;
    }
    
    setIsVerifyingApiKey(true);
    setApiKeyError('');
    
    try {
      const models = await llmProviderService.verifyApiKey(
        apiKey, // This will be empty for Ollama, which is fine
        formData.provider,
        formData.baseUrl,
        userId,
        isAuthMock
      );
      
      // Sort models alphabetically
      const sortedModels = [...models].sort();
      setAvailableModels(sortedModels);
      setIsApiKeyVerified(true);
      
      if (onSuccess) {
        if (isOllama) {
          onSuccess('Successfully connected to Ollama');
        } else {
          onSuccess('API key verified successfully');
        }
      }
    } catch (err) {
      setIsApiKeyVerified(false);
      setApiKeyError(err.message || 'Failed to verify API key');
      
      if (onError) {
        onError(`API key verification failed: ${err.message}`);
      }
    } finally {
      setIsVerifyingApiKey(false);
    }
  }, [formData.provider, formData.baseUrl, isAuthMock, userId, onSuccess, onError]);
  
  // Memoize deleteApiKey function to avoid recreating on every render
  const deleteApiKey = useCallback(async () => {
    console.log('[LLMProviderSettings] deleteApiKey called for provider:', formData.provider);
    
    if (!userId || !formData.provider) {
      console.error('[LLMProviderSettings] Cannot delete API key: No userId or provider available');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Delete the API key from the database
      const { error } = await supabase
        .from('key_store')
        .delete()
        .eq('user_id', userId)
        .eq('provider', formData.provider.toLowerCase());
      
      if (error) {
        throw error;
      }
      
      // Reset form state
      setFormData(prev => ({
        ...prev,
        apiKey: ''
      }));
      setIsApiKeyVerified(false);
      
      if (onSuccess) {
        onSuccess('API key deleted successfully');
      }
    } catch (error) {
      console.error('[LLMProviderSettings] Error deleting API key:', error);
      if (onError) {
        onError(`Failed to delete API key: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData.provider, userId, onSuccess, onError]);
  
  // Memoize handleFormDataChange to prevent unnecessary re-renders
  const handleFormDataChange = useCallback((newFormData) => {
    setFormData(newFormData);
  }, []);
  
  // Memoize saveProviderConfig to prevent unnecessary re-renders
  const saveProviderConfig = useCallback(async () => {
    if (!userId) {
      if (onError) {
        onError('User ID is required');
      }
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await llmProviderService.saveProviderConfig(
        formData,
        selectedConfig,
        providerConfigs,
        userId,
        userPreferences,
        apiKeyStorage,
        isAuthMock
      );
      
      setProviderConfigs(result.updatedConfigs);
      
      if (!isAuthMock) {
        // Update both llm_providers and llm_preferences in Redux
        dispatch(updateUserPreferences({
          key: 'llm_providers',
          value: result.updatedConfigs
        }));
        
        if (result.updatedLlmPreferences) {
          // Update llm_preferences in Redux
          dispatch(updateUserPreferences({
            key: 'llm_preferences',
            value: result.updatedLlmPreferences
          }));
          
          // Update llmSlice
          dispatch(setDefaultProvider(result.updatedLlmPreferences.defaultProvider));
        }
      }
      
      // Reset form
      resetForm();
      
      if (onSuccess) {
        onSuccess('Provider configuration saved successfully');
      }
    } catch (error) {
      console.error('[LLMProviderSettings] Error saving provider config:', error);
      if (onError) {
        onError(`Failed to save provider configuration: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    formData,
    selectedConfig,
    providerConfigs,
    userId,
    userPreferences,
    apiKeyStorage,
    isAuthMock,
    dispatch,
    resetForm,
    onSuccess,
    onError
  ]);
  
  // Memoize handleSetDefaultProvider to prevent unnecessary re-renders
  const handleSetDefaultProvider = useCallback(async (provider) => {
    if (!userId) {
      if (onError) {
        onError('User ID is required');
      }
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Update llm_preferences in Redux and Supabase
      const currentLlmPreferences = userPreferences.llm_preferences || {};
      
      // Make sure we preserve the API key storage preference
      const apiKeyStorage = currentLlmPreferences.apiKeyStorage || API_STORAGE_TYPES.LOCAL;
      
      const updatedLlmPreferences = {
        ...currentLlmPreferences,
        defaultProvider: provider,
        default: provider, // Adding 'default' key for backward compatibility
        apiKeyStorage
      };
      
      if (isAuthMock) {
        console.log('[MOCK] Setting default provider to', provider);
      } else {
        // Save to Supabase
        const { error } = await supabaseService.executeQuery(supabase =>
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
          
        if (error) throw error;
        
        // Update Redux
        dispatch(updateUserPreferences({
          key: 'llm_preferences',
          value: updatedLlmPreferences
        }));
        
        // Update llmSlice
        dispatch(setDefaultProvider(provider));
      }
      
      if (onSuccess) {
        onSuccess(`Default provider set to ${provider}`);
      }
    } catch (error) {
      console.error('[LLMProviderSettings] Error setting default provider:', error);
      if (onError) {
        onError(`Failed to set default provider: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, userPreferences, isAuthMock, dispatch, onSuccess, onError]);
  
  // Memoize handleApiKeyStorageChange to prevent unnecessary re-renders
  const handleApiKeyStorageChange = useCallback(async (newStorageType) => {
    if (!userId) {
      if (onError) {
        onError('User ID is required');
      }
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await llmProviderService.updateApiKeyStoragePreference(
        newStorageType,
        userId,
        userPreferences,
        isAuthMock
      );
      
      if (!isAuthMock && result.updatedLlmPreferences) {
        // Update llm_preferences in Redux
        dispatch(updateUserPreferences({
          key: 'llm_preferences',
          value: result.updatedLlmPreferences
        }));
      }
      
      if (onSuccess) {
        onSuccess(`API key storage preference updated to ${newStorageType}`);
      }
    } catch (error) {
      console.error('[LLMProviderSettings] Error updating API key storage preference:', error);
      if (onError) {
        onError(`Failed to update API key storage preference: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, userPreferences, isAuthMock, dispatch, onSuccess, onError]);
  
  // If loading, show loading indicator
  if (isLoading && !providerConfigs.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      {/* API Key Storage Preference */}
      <ApiKeyStorageSelector
        value={apiKeyStorage}
        onChange={handleApiKeyStorageChange}
        isLoading={isLoading}
      />
      
      {/* List of saved provider configs */}
      <LLMProviderList
        providerConfigs={providerConfigs}
        onEdit={handleEditConfig}
        onDelete={handleDeleteConfig}
        isLoading={isLoading}
        defaultProvider={llmPreferences.defaultProvider}
        onSetDefault={handleSetDefaultProvider}
      />
      
      <Divider sx={{ my: 2 }} />
      
      {/* Add Provider Configuration button */}
      {!showProviderForm && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowProviderForm(true)}
            disabled={isLoading}
          >
            Add Provider Configuration
          </Button>
        </Box>
      )}
      
      {/* Form for adding/editing provider config */}
      {showProviderForm && (
        <LLMProviderForm
          formData={formData}
          onFormDataChange={handleFormDataChange}
          selectedConfig={selectedConfig}
          onReset={resetForm}
          onSave={saveProviderConfig}
          isLoading={isLoading}
          isApiKeyVerified={isApiKeyVerified}
          isVerifyingApiKey={isVerifyingApiKey}
          apiKeyError={apiKeyError}
          onVerifyApiKey={verifyApiKey}
          onDeleteApiKey={deleteApiKey}
          availableModels={availableModels}
          apiKeyStorage={apiKeyStorage}
          onFetchModels={fetchModels}
        />
      )}
    </Box>
  );
};

LLMProviderSettings.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func
};

export default LLMProviderSettings;