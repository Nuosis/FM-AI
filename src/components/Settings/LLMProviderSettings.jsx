import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { updateUserPreferences } from '../../redux/slices/authSlice';
import { setDefaultProvider } from '../../redux/slices/llmSlice';
import { getApiKey, API_STORAGE_TYPES } from '../../utils/apiKeyStorage';
import llmProviderService from '../../services/llmProviderService';
import supabase from '../../utils/supabase';
import {
  Box,
  Divider,
  CircularProgress
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
        loadProviderConfigs();
        isInitialized.current = true;
      }
    }
    
    // Reset initialization flag if user changes
    return () => {
      if (userId) {
        isInitialized.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only depend on userId, not on userPreferences or user.id
  
  const loadProviderConfigs = async () => {
    if (!userId) {
      console.log('[LLMProviderSettings] No userId available, skipping loadProviderConfigs');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const configs = await llmProviderService.loadProviderConfigs(userId, isAuthMock);
      setProviderConfigs(configs);
    } catch (error) {
      console.error('Error loading provider configs:', error);
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
    
    // Try to get the API key from storage
    const apiKey = getApiKey(config.provider, apiKeyStorage, isAuthMock) || '';
    
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
    
    // Reset API key verification
    setIsApiKeyVerified(!!apiKey);
    
    // If we have a valid API key, fetch all available models from the provider
    if (apiKey) {
      // Set loading state
      setIsVerifyingApiKey(true);
      
      // Fetch available models
      llmProviderService.verifyApiKey(
        apiKey,
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
    }
  }, [apiKeyStorage, isAuthMock]);
  
  // Memoize handleDeleteConfig to prevent unnecessary re-renders
  const handleDeleteConfig = useCallback(async (configId) => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      const result = await llmProviderService.deleteProviderConfig(
        configId,
        providerConfigs,
        userId,
        userPreferences,
        isAuthMock
      );
      
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
  
  // Memoize verification function to prevent unnecessary re-renders
  const verifyApiKey = useCallback(async (apiKey) => {
    if (!apiKey || apiKey.trim() === '') {
      setApiKeyError('API key is required');
      return;
    }
    
    if (!formData.provider) {
      setApiKeyError('Please select a provider first');
      return;
    }
    
    if (!userId) {
      setApiKeyError('User ID is required');
      return;
    }
    
    setIsVerifyingApiKey(true);
    setApiKeyError('');
    
    try {
      const models = await llmProviderService.verifyApiKey(
        apiKey,
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
        onSuccess('API key verified successfully');
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
  
  // Memoize save function to avoid recreating on every render
  const saveProviderConfig = useCallback(async () => {
    if (!userId) {
      if (onError) {
        onError('User ID is required to save provider configuration');
      }
      return;
    }
    
    // Validate required fields based on model type
    if (!formData.provider) {
      if (onError) {
        onError('Provider is required');
      }
      return;
    }
    
    // For chat models, we need a strong chat model
    if (formData.modelType === 'chat' && !formData.models.chat.strong) {
      if (onError) {
        onError('Strong Chat Model is required');
      }
      return;
    }
    
    // For embedding models, we need a large embedding model
    if (formData.modelType === 'embedding' && !formData.models.embedding.large) {
      if (onError) {
        onError('Large Embedding Model is required');
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
        // Update the Redux store with the new preferences
        dispatch(updateUserPreferences({
          key: 'llm_providers',
          value: result.updatedConfigs
        }));
        
        if (result.updatedLlmPreferences) {
          // Update Redux store
          dispatch(updateUserPreferences({
            key: 'llm_preferences',
            value: result.updatedLlmPreferences
          }));
          
          // Update llmSlice
          dispatch(setDefaultProvider(result.updatedLlmPreferences.defaultProvider));
        }
      }
      
      // Reset form and selection
      resetForm();
      
      if (onSuccess) {
        onSuccess('Provider configuration saved successfully');
      }
    } catch (error) {
      console.error('Error saving provider config:', error);
      if (onError) {
        onError(`Failed to save provider configuration: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    formData,
    selectedConfig,
    providerConfigs,
    isAuthMock,
    apiKeyStorage,
    userPreferences,
    dispatch,
    resetForm,
    onSuccess,
    onError
  ]);
  
  // Handle API key storage preference change
  const handleApiKeyStorageChange = useCallback(async (newStorageType) => {
    setIsLoading(true);
    
    try {
      const result = await llmProviderService.updateApiKeyStoragePreference(
        newStorageType,
        userId,
        userPreferences,
        isAuthMock
      );
      
      if (!isAuthMock && result.updatedLlmPreferences) {
        // Update Redux store
        dispatch(updateUserPreferences({
          key: 'llm_preferences',
          value: result.updatedLlmPreferences
        }));
      }
      
      if (onSuccess) {
        onSuccess('API key storage preference updated successfully');
      }
    } catch (error) {
      console.error('Error updating API key storage preference:', error);
      if (onError) {
        onError(`Failed to update API key storage preference: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, userPreferences, isAuthMock, dispatch, onSuccess, onError]);
  
  // Handle setting a provider as the default
  const handleSetDefaultProvider = useCallback(async (providerName) => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      // Update the llm_preferences with the new default provider
      const currentLlmPreferences = userPreferences.llm_preferences || {};
      
      const updatedLlmPreferences = {
        ...currentLlmPreferences,
        defaultProvider: providerName,
        default: providerName // Adding 'default' key for backward compatibility
      };
      
      if (isAuthMock) {
        console.log('[MOCK] Setting default provider to', providerName);
      } else {
        // Save to Supabase
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'llm_preferences',
            preference_value: updatedLlmPreferences
          }, {
            onConflict: 'user_id,preference_key'
          })
          .select();
        
        if (error) throw error;
        
        // Update Redux store
        dispatch(updateUserPreferences({
          key: 'llm_preferences',
          value: updatedLlmPreferences
        }));
        
        // Update llmSlice
        dispatch(setDefaultProvider(providerName));
      }
      
      if (onSuccess) {
        onSuccess(`${providerName} set as default provider`);
      }
    } catch (error) {
      console.error('Error setting default provider:', error);
      if (onError) {
        onError(`Failed to set default provider: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, userPreferences, isAuthMock, dispatch, onSuccess, onError]);
  
  // Handle form data changes
  const handleFormDataChange = useCallback((newFormData) => {
    const providerChanged = newFormData.provider !== formData.provider;
    
    setFormData(newFormData);
    
    // If the provider changed, check for existing verified API key
    if (providerChanged && newFormData.provider) {
      checkExistingApiKey(newFormData.provider);
    }
  }, [formData.provider]);
  
  // Check if there's already a verified API key for this provider
  const checkExistingApiKey = useCallback(async (provider) => {
    if (!userId || !provider) return;
    
    try {
      const { data, error } = await supabase
        .from('llm_api_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider.toLowerCase())
        .maybeSingle();
        
      if (error) {
        console.error('[LLMProviderSettings] Error checking API key:', error);
        return;
      }
      
      if (data) {
        // If we have a key, update the form data
        setFormData(prev => ({
          ...prev,
          apiKey: data.api_key || ''
        }));
        
        // Track if the key is verified
        let keyIsVerified = false;
        
        // If the key is verified, update the UI accordingly
        if (data.verified) {
          setIsApiKeyVerified(true);
          setApiKeyError('');
          keyIsVerified = true;
        } else {
          // If we have a key but it's not verified, update it to verified if it's valid
          try {
            // Update the key's verified status in the database
            const { error: updateError } = await supabase
              .from('llm_api_keys')
              .upsert({
                user_id: userId,
                provider: provider.toLowerCase(),
                api_key: data.api_key,
                verified: true
              }, {
                onConflict: 'user_id,provider'
              });
              
            if (!updateError) {
              setIsApiKeyVerified(true);
              keyIsVerified = true;
            }
          } catch (err) {
            console.error('[LLMProviderSettings] Error updating API key verified status:', err);
          }
        }
        
        // If the key is verified, fetch models
        if (keyIsVerified) {
          try {
            const models = await llmProviderService.verifyApiKey(
              data.api_key,
              provider,
              formData.baseUrl,
              userId,
              isAuthMock
            );
            setAvailableModels(models);
          } catch (err) {
            console.error('[LLMProviderSettings] Error fetching models:', err);
          }
        }
      } else {
        // If no API key is set for this provider, reset verification state
        setIsApiKeyVerified(false);
        setApiKeyError('');
        setAvailableModels([]);
      }
    } catch (err) {
      console.error('[LLMProviderSettings] Error in provider change:', err);
    }
  }, [userId, formData.baseUrl, isAuthMock]);
  
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
      
      {/* Form for adding/editing provider config */}
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
        availableModels={availableModels}
        apiKeyStorage={apiKeyStorage}
      />
    </Box>
  );
};

LLMProviderSettings.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func
};

export default LLMProviderSettings;