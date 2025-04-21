import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { updateUserPreferences } from '../../redux/slices/authSlice';
import { setDefaultProvider } from '../../redux/slices/llmSlice';
import { storeApiKey, getApiKey, API_STORAGE_TYPES } from '../../utils/apiKeyStorage';
import supabaseService from '../../services/supabaseService';
import {
  Box,
  Button,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Divider,
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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
  const userId = currentUser?.id;
  
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
  
  // Local state for API Key and Description input fields (for onBlur commit)
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    provider: llmPreferences.defaultProvider || '',
    model: '',
    apiKey: '',
    baseUrl: '',
    description: ''
  });
  
  // Sync local input state with formData only when selectedConfig changes or form reset
  useEffect(() => {
    // Only sync when selectedConfig changes or during reset
    setApiKeyInput(formData.apiKey);
    // For description, we need to be careful to avoid triggering API calls
    if (selectedConfig) {
      setDescriptionInput(formData.description);
    }
  }, [selectedConfig, formData.apiKey]); // Only depend on selectedConfig and apiKey
  
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
    
    //console.log('[LLMProviderSettings] Loading provider configs for user:', userId);
    setIsLoading(true);
    
    try {
      if (isAuthMock) {
        // Mock data for development
        setProviderConfigs([
          { id: '1', provider: 'openAI', model: 'gpt-4-turbo', baseUrl: '', description: 'OpenAI GPT-4' },
          { id: '2', provider: 'anthropic', model: 'claude-3-opus', baseUrl: '', description: 'Anthropic Claude' }
        ]);
      } else {
        // Fetch from Supabase if not already in user preferences
        //console.log('[LLMProviderSettings] Executing Supabase query for llm_providers');
        const data = await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .eq('preference_key', 'llm_providers')
            .maybeSingle()
        );
        
        if (data && data.preference_value) {
          console.log('[LLMProviderSettings] Found preference_value:', {
            type: typeof data.preference_value,
            isString: typeof data.preference_value === 'string',
            value: data.preference_value
          });
          
          // Parse the JSON value
          let configs;
          try {
            configs = typeof data.preference_value === 'string'
              ? JSON.parse(data.preference_value)
              : data.preference_value;
              
            console.log('[LLMProviderSettings] Parsed configs:', {
              isArray: Array.isArray(configs),
              length: Array.isArray(configs) ? configs.length : 'not an array',
              value: configs
            });
            
            setProviderConfigs(Array.isArray(configs) ? configs : []);
          } catch (parseError) {
            console.error('[LLMProviderSettings] Error parsing preference_value:', parseError);
            setProviderConfigs([]);
          }
        } else {
          //console.log('[LLMProviderSettings] No preference_value found, using empty array');
          setProviderConfigs([]);
        }
      }
    } catch (error) {
      //console.error('Error loading provider configs:', error);
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
    const description = config.description || '';
    
    // Update both formData and local input states
    const newFormData = {
      provider: config.provider,
      model: config.model,
      apiKey: apiKey,
      baseUrl: config.baseUrl || '',
      description: description
    };
    setFormData(newFormData);
    
    // Directly set local input states to avoid dependency on useEffect
    setApiKeyInput(apiKey);
    setDescriptionInput(description);
    
    // Reset API key verification
    setIsApiKeyVerified(!!apiKey);
  }, [apiKeyStorage, isAuthMock]);
  
  // Memoize handleDeleteConfig to prevent unnecessary re-renders
  const handleDeleteConfig = useCallback(async (configId) => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      // Filter out the config to delete
      const updatedConfigs = providerConfigs.filter(config => config.id !== configId);
      setProviderConfigs(updatedConfigs);
      
      if (isAuthMock) {
        console.log('[MOCK] Deleting provider config from user_preferences', configId);
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
        
        // Update both llm_providers and llm_preferences in Redux
        dispatch(updateUserPreferences({
          key: 'llm_providers',
          value: updatedConfigs
        }));
        
        // If we're deleting the current default provider, update llm_preferences
        const currentLlmPreferences = userPreferences.llm_preferences || {};
        const deletedConfig = providerConfigs.find(config => config.id === configId);
        
        if (deletedConfig && deletedConfig.provider === currentLlmPreferences.defaultProvider) {
          // Find a new default provider or set to empty
          const newDefaultProvider = updatedConfigs.length > 0 ? updatedConfigs[0].provider : '';
          
          const updatedLlmPreferences = {
            ...currentLlmPreferences,
            defaultProvider: newDefaultProvider
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
            
          // Update Redux store
          dispatch(updateUserPreferences({
            key: 'llm_preferences',
            value: updatedLlmPreferences
          }));
          
          // Update llmSlice
          dispatch(setDefaultProvider(newDefaultProvider));
        }
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
    const newFormData = {
      provider: '',
      model: '',
      apiKey: '',
      baseUrl: '',
      description: ''
    };
    setFormData(newFormData);
    setApiKeyInput('');
    setDescriptionInput('');
    setIsApiKeyVerified(false);
    setApiKeyError('');
  }, []); // No dependencies needed for resetForm
  
  // Memoize field handlers to prevent unnecessary re-renders
  const handleProviderChange = useCallback((event) => {
    const newProvider = event.target.value;
    setFormData(prev => ({
      ...prev,
      provider: newProvider
    }));
    
    // Reset API key verification when provider changes
    setIsApiKeyVerified(false);
    setApiKeyError('');
  }, []);
  
  // Handlers for model and baseUrl fields
  const handleModelChange = useCallback((event) => {
    setFormData(prev => ({
      ...prev,
      model: event.target.value
    }));
  }, []);
  
  const handleBaseUrlChange = useCallback((event) => {
    setFormData(prev => ({
      ...prev,
      baseUrl: event.target.value
    }));
  }, []);
  
  // Memoize verification function to prevent unnecessary re-renders
  const verifyApiKey = useCallback(async () => {
    if (!apiKeyInput || apiKeyInput.trim() === '') {
      setApiKeyError('API key is required');
      return;
    }
    
    setIsVerifyingApiKey(true);
    setApiKeyError('');
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Mock logic: accept any non-empty key, but you can add real checks here
      if (apiKeyInput.length < 8) {
        throw new Error('API key is invalid or too short.');
      }
      
      // Update formData only after successful verification
      setFormData(prev => ({
        ...prev,
        apiKey: apiKeyInput
      }));
      
      // Optionally, add provider-specific checks here
      // For real implementation, call the provider's endpoint to verify
      
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
  }, [apiKeyInput, onSuccess, onError]);
  
  // Memoize save function to avoid recreating on every render
  const saveProviderConfig = useCallback(async () => {
    if (!userId) {
      if (onError) {
        onError('User ID is required to save provider configuration');
      }
      return;
    }
    
    if (!formData.provider || !formData.model) {
      if (onError) {
        onError('Provider and model are required');
      }
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Store API key if provided
      if (formData.apiKey) {
        storeApiKey(formData.provider, formData.apiKey, apiKeyStorage, isAuthMock);
      }
      
      // Create config object (without API key)
      // Use descriptionInput directly instead of formData.description
      const configToSave = {
        id: selectedConfig?.id || Date.now().toString(),
        provider: formData.provider,
        model: formData.model,
        baseUrl: formData.baseUrl || '',
        description: descriptionInput || `${formData.provider} ${formData.model}`
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
      
      setProviderConfigs(updatedConfigs);
      
      if (isAuthMock) {
        console.log('[MOCK] Saving provider configs to user_preferences', updatedConfigs);
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
        
        // Update the Redux store with the new preferences
        dispatch(updateUserPreferences({
          key: 'llm_providers',
          value: updatedConfigs
        }));
        
        // Also update the llm_preferences with the default provider
        const defaultProvider = formData.provider;
        const currentLlmPreferences = userPreferences.llm_preferences || {};
        
        const updatedLlmPreferences = {
          ...currentLlmPreferences,
          defaultProvider: defaultProvider
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
          
        // Update Redux store
        dispatch(updateUserPreferences({
          key: 'llm_preferences',
          value: updatedLlmPreferences
        }));
        
        // Update llmSlice
        dispatch(setDefaultProvider(defaultProvider));
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
    descriptionInput,
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
  const handleApiKeyStorageChange = useCallback(async (event) => {
    const newStorageType = event.target.value;
    setIsLoading(true);
    
    try {
      // Update llm_preferences in Redux and Supabase
      const currentLlmPreferences = userPreferences.llm_preferences || {};
      
      const updatedLlmPreferences = {
        ...currentLlmPreferences,
        apiKeyStorage: newStorageType
      };
      
      if (isAuthMock) {
        console.log('[MOCK] Updating API key storage preference to', newStorageType);
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
          
        // Update Redux store
        dispatch(updateUserPreferences({
          key: 'llm_preferences',
          value: updatedLlmPreferences
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
  
  return (
    <Box>
      
      {/* API Key Storage Preference */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>API Key Storage</InputLabel>
        <Select
          value={apiKeyStorage}
          onChange={handleApiKeyStorageChange}
          label="API Key Storage"
          disabled={isLoading}
        >
          <MenuItem value={API_STORAGE_TYPES.LOCAL}>Local Storage (persists across sessions)</MenuItem>
          <MenuItem value={API_STORAGE_TYPES.SESSION}>Session Storage (cleared when browser is closed)</MenuItem>
          <MenuItem value={API_STORAGE_TYPES.SAVED}>Secure Server Storage (recommended)</MenuItem>
        </Select>
      </FormControl>
      
      {/* List of saved provider configs */}
      {providerConfigs.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Saved Provider Configurations
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
            <List dense>
              {providerConfigs.map((config) => (
                <ListItem key={config.id}>
                  <ListItemText
                    primary={config.description || `${config.provider} ${config.model}`}
                    secondary={`Provider: ${config.provider}, Model: ${config.model}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleEditConfig(config)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDeleteConfig(config.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      )}
      
      <Divider sx={{ my: 2 }} />
      
      {/* Form for adding/editing provider config */}
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        {selectedConfig ? 'Edit Provider Configuration' : 'Add Provider Configuration'}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Provider selection */}
        <FormControl fullWidth>
          <InputLabel>Provider</InputLabel>
          <Select
            value={formData.provider}
            onChange={handleProviderChange}
            label="Provider"
            disabled={isLoading}
          >
            <MenuItem value="openAI">OpenAI</MenuItem>
            <MenuItem value="anthropic">Anthropic</MenuItem>
            <MenuItem value="gemini">Gemini</MenuItem>
            <MenuItem value="lmStudio">LM Studio</MenuItem>
            <MenuItem value="ollama">Ollama</MenuItem>
          </Select>
        </FormControl>
        
        {/* Description field (always visible, directly under Provider) */}
        <TextField
          label='Description (eg "Strong Model") [recommended] ...'
          value={descriptionInput}
          onChange={(e) => {
            // Only update local state, not formData
            setDescriptionInput(e.target.value);
          }}
          // No onBlur handler - don't update formData until save
          fullWidth
          placeholder='Description (eg "Strong Model") [recommended] ...'
          disabled={isLoading}
        />
        
        {/* API Key input and verification */}
        <TextField
          label="API Key"
          value={apiKeyInput}
          onChange={(e) => {
            const newValue = e.target.value;
            setApiKeyInput(newValue);
          }}
          onBlur={() => {
            // Only update formData on blur
            if (apiKeyInput !== formData.apiKey) {
              setFormData(prev => ({
                ...prev,
                apiKey: apiKeyInput
              }));
              setIsApiKeyVerified(false);
              setApiKeyError('');
            }
          }}
          fullWidth
          type="password"
          placeholder="Enter API key"
          disabled={isLoading || isVerifyingApiKey}
          helperText={
            apiKeyError
              ? apiKeyError
              : `API key will be stored using ${apiKeyStorage} storage`
          }
          error={!!apiKeyError}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            color={isApiKeyVerified ? 'success' : 'primary'}
            onClick={verifyApiKey}
            disabled={
              isLoading ||
              isVerifyingApiKey ||
              !apiKeyInput ||
              !formData.provider ||
              isApiKeyVerified
            }
            startIcon={isVerifyingApiKey ? <CircularProgress size={20} /> : null}
          >
            {isVerifyingApiKey
              ? 'Verifying...'
              : isApiKeyVerified
                ? 'Verified'
                : 'Verify API Key'}
          </Button>
          {isApiKeyVerified && (
            <Typography variant="body2" color="success.main">
              API key verified
            </Typography>
          )}
        </Box>
        
        {/* Reveal model and baseUrl only if API key is verified */}
        {isApiKeyVerified && (
          <>
            <TextField
              label="Model"
              value={formData.model}
              onChange={handleModelChange}
              fullWidth
              placeholder="e.g., gpt-4-turbo, claude-3-opus"
              disabled={isLoading}
            />
            <TextField
              label="Base URL (Optional)"
              value={formData.baseUrl}
              onChange={handleBaseUrlChange}
              fullWidth
              placeholder="e.g., https://api.openai.com"
              disabled={isLoading}
              helperText="Leave empty for default provider endpoint"
            />
          </>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          {selectedConfig && (
            <Button
              variant="outlined"
              onClick={resetForm}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          
          <Button
            variant="contained"
            color="primary"
            onClick={saveProviderConfig}
            disabled={
              isLoading ||
              !formData.provider ||
              !isApiKeyVerified ||
              (isApiKeyVerified && !formData.model)
            }
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
            sx={{ ml: 'auto' }}
          >
            Save Provider Config
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

LLMProviderSettings.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func
};

export default LLMProviderSettings;