import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
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
  Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { storeApiKey, getApiKey } from '../../utils/apiKeyStorage';
import supabase from '../../utils/supabase';

const LLMProviderConfigSection = ({ userId, isAuthMock, apiKeyStorage, showNotification }) => {
  const [providerConfigs, setProviderConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    provider: '',
    model: '',
    apiKey: '',
    baseUrl: '',
    description: ''
  });

  // Load provider configs on mount
  useEffect(() => {
    loadProviderConfigs();
  }, [userId]);

  const loadProviderConfigs = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      if (isAuthMock) {
        console.log('[MOCK] Loading provider configs from user_preferences');
        // Mock data for development
        setProviderConfigs([
          { id: '1', provider: 'openAI', model: 'gpt-4-turbo', baseUrl: '', description: 'OpenAI GPT-4' },
          { id: '2', provider: 'anthropic', model: 'claude-3-opus', baseUrl: '', description: 'Anthropic Claude' }
        ]);
      } else {
        // Fetch from Supabase
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .eq('preference_key', 'llm_providers')
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          throw error;
        }
        
        if (data && data.preference_value) {
          // Parse the JSON value
          const configs = typeof data.preference_value === 'string' 
            ? JSON.parse(data.preference_value) 
            : data.preference_value;
            
          setProviderConfigs(Array.isArray(configs) ? configs : []);
        }
      }
    } catch (error) {
      console.error('Error loading provider configs:', error);
      showNotification(`Failed to load provider configurations: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProviderConfig = async () => {
    if (!userId) {
      showNotification('User ID is required to save provider configuration', 'error');
      return;
    }
    
    if (!formData.provider || !formData.model) {
      showNotification('Provider and model are required', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Store API key if provided
      if (formData.apiKey) {
        storeApiKey(formData.provider, formData.apiKey, apiKeyStorage, isAuthMock);
      }
      
      // Create config object (without API key)
      const configToSave = {
        id: selectedConfig?.id || Date.now().toString(),
        provider: formData.provider,
        model: formData.model,
        baseUrl: formData.baseUrl || '',
        description: formData.description || `${formData.provider} ${formData.model}`
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
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'llm_providers',
            preference_value: updatedConfigs
          }, {
            onConflict: 'user_id,preference_key'
          });
          
        if (error) throw error;
      }
      
      // Reset form and selection
      resetForm();
      showNotification('Provider configuration saved successfully', 'success');
    } catch (error) {
      console.error('Error saving provider config:', error);
      showNotification(`Failed to save provider configuration: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditConfig = (config) => {
    setSelectedConfig(config);
    
    // Try to get the API key from storage
    const apiKey = getApiKey(config.provider, apiKeyStorage, isAuthMock) || '';
    
    setFormData({
      provider: config.provider,
      model: config.model,
      apiKey: apiKey,
      baseUrl: config.baseUrl || '',
      description: config.description || ''
    });
  };

  const handleDeleteConfig = async (configId) => {
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
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'llm_providers',
            preference_value: updatedConfigs
          }, {
            onConflict: 'user_id,preference_key'
          });
          
        if (error) throw error;
      }
      
      // If the deleted config was selected, reset the form
      if (selectedConfig && selectedConfig.id === configId) {
        resetForm();
      }
      
      showNotification('Provider configuration deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting provider config:', error);
      showNotification(`Failed to delete provider configuration: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedConfig(null);
    setFormData({
      provider: '',
      model: '',
      apiKey: '',
      baseUrl: '',
      description: ''
    });
  };

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  return (
    <Box>
      {/* List of saved provider configs */}
      {providerConfigs.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
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
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        {selectedConfig ? 'Edit Provider Configuration' : 'Add Provider Configuration'}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Provider</InputLabel>
          <Select
            value={formData.provider}
            onChange={handleInputChange('provider')}
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
        
        <TextField
          label="Model"
          value={formData.model}
          onChange={handleInputChange('model')}
          fullWidth
          placeholder="e.g., gpt-4-turbo, claude-3-opus"
          disabled={isLoading}
        />
        
        <TextField
          label="API Key"
          value={formData.apiKey}
          onChange={handleInputChange('apiKey')}
          fullWidth
          type="password"
          placeholder="Enter API key"
          disabled={isLoading}
          helperText={`API key will be stored using ${apiKeyStorage} storage`}
        />
        
        <TextField
          label="Base URL (Optional)"
          value={formData.baseUrl}
          onChange={handleInputChange('baseUrl')}
          fullWidth
          placeholder="e.g., https://api.openai.com"
          disabled={isLoading}
          helperText="Leave empty for default provider endpoint"
        />
        
        <TextField
          label="Description (Optional)"
          value={formData.description}
          onChange={handleInputChange('description')}
          fullWidth
          placeholder="e.g., OpenAI GPT-4 Production"
          disabled={isLoading}
        />
        
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
            disabled={isLoading || !formData.provider || !formData.model}
            sx={{ ml: 'auto' }}
          >
            Save Provider Config
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

LLMProviderConfigSection.propTypes = {
  userId: PropTypes.string,
  isAuthMock: PropTypes.bool.isRequired,
  apiKeyStorage: PropTypes.string.isRequired,
  showNotification: PropTypes.func.isRequired
};

export default LLMProviderConfigSection;