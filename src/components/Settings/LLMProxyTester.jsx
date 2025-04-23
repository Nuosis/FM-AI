import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import supabase from '../../utils/supabase';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Paper,
  Divider,
  Alert,
  TextField
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

/**
 * Component for testing the llmProxyHandler edge function
 * Allows testing getting models and chat completions
 */
const LLMProxyTester = () => {
  // Get user data and preferences from Redux
  const currentUser = useSelector(state => state.auth.user);
  const userId = currentUser?.user_id;
  const llmProviders = useSelector(state => state.auth.user?.preferences?.llm_providers || []);
  
  // Component state
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  
  // Loading and error states
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState(null);
  const [modelsSuccess, setModelsSuccess] = useState(false);
  
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [chatSuccess, setChatSuccess] = useState(false);
  
  // Check if API key is verified for the selected provider
  const [isApiKeyVerified, setIsApiKeyVerified] = useState(false);
  
  // Effect to check if API key is verified when provider changes
  useEffect(() => {
    if (!selectedProvider || !userId) {
      setIsApiKeyVerified(false);
      return;
    }
    
    // Check if API key is verified in the database
    const checkApiKeyVerification = async () => {
      try {
        // Find the provider config
        const providerConfig = llmProviders.find(p => 
          p.provider.toLowerCase() === selectedProvider.toLowerCase()
        );
        
        if (!providerConfig) {
          setIsApiKeyVerified(false);
          return;
        }
        
        // Check if it's Ollama (which doesn't require an API key)
        const isOllama = selectedProvider.toLowerCase() === 'ollama';
        if (isOllama) {
          setIsApiKeyVerified(true);
          return;
        }
        
        // Query the llm_api_keys table to check if the API key is verified
        const { data, error } = await supabase
          .from('llm_api_keys')
          .select('verified')
          .eq('user_id', userId)
          .eq('provider', selectedProvider.toLowerCase())
          .single();
        
        if (error) {
          console.error('Error checking API key verification:', error);
          setIsApiKeyVerified(false);
          return;
        }
        
        setIsApiKeyVerified(data?.verified === true);
      } catch (error) {
        console.error('Error checking API key verification:', error);
        setIsApiKeyVerified(false);
      }
    };
    
    checkApiKeyVerification();
  }, [selectedProvider, userId, llmProviders]);
  
  // Handle provider change
  const handleProviderChange = (event) => {
    const provider = event.target.value;
    setSelectedProvider(provider);
    setSelectedModel('');
    setModels([]);
    setModelsSuccess(false);
    setModelsError(null);
    setChatSuccess(false);
    setChatError(null);
    setChatResponse('');
  };
  
  // Handle model change
  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
    setChatSuccess(false);
    setChatError(null);
    setChatResponse('');
  };
  
  // Handle getting models
  const handleGetModels = async () => {
    if (!selectedProvider || !isApiKeyVerified) return;
    
    setIsLoadingModels(true);
    setModelsError(null);
    setModelsSuccess(false);
    
    try {
      // Get auth token for the edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('llmProxyHandler', {
        body: {
          provider: selectedProvider.toLowerCase(),
          type: 'models',
          baseUrl: null
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to get models');
      }
      
      // Parse the response if it's a string
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Extract models based on provider
      let modelList = [];
      if (Array.isArray(parsedData)) {
        modelList = parsedData;
      } else if (parsedData.data && Array.isArray(parsedData.data)) {
        modelList = parsedData.data.map(model => model.id || model.name || model);
      } else if (parsedData.models && Array.isArray(parsedData.models)) {
        modelList = parsedData.models.map(model => model.id || model.name || model);
      }
      
      // Sort models alphabetically
      modelList.sort();
      
      setModels(modelList);
      setModelsSuccess(true);
      
      // If we have models, select the first one
      if (modelList.length > 0) {
        setSelectedModel(modelList[0]);
      }
    } catch (error) {
      console.error('Error getting models:', error);
      setModelsError(error.message);
    } finally {
      setIsLoadingModels(false);
    }
  };
  
  // Handle chat completion
  const handleChatCompletion = async () => {
    if (!selectedProvider || !selectedModel || !isApiKeyVerified) return;
    
    setIsLoadingChat(true);
    setChatError(null);
    setChatSuccess(false);
    
    try {
      // Get auth token for the edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Use default message if none provided
      const message = chatMessage.trim() || 'Hello, who are you?';
      
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('llmProxyHandler', {
        body: {
          provider: selectedProvider.toLowerCase(),
          type: 'chat',
          model: selectedModel,
          baseUrl: null,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: message }
          ],
          options: {
            temperature: 0.7,
            max_tokens: 500
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to get chat completion');
      }
      
      // Parse the response if it's a string
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      setChatResponse(parsedData.content || 'No response content');
      setChatSuccess(true);
    } catch (error) {
      console.error('Error getting chat completion:', error);
      setChatError(error.message);
    } finally {
      setIsLoadingChat(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="body2" color="text.secondary" paragraph>
        Test the LLM Proxy Handler with real API calls to get models and chat completions.
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Provider Selection */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel id="provider-select-label">Provider</InputLabel>
          <Select
            labelId="provider-select-label"
            value={selectedProvider}
            onChange={handleProviderChange}
            label="Provider"
          >
            <MenuItem value="">
              <em>Select a provider</em>
            </MenuItem>
            {llmProviders.map((provider) => (
              <MenuItem key={provider.id} value={provider.provider}>
                {provider.provider}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {/* API Key Verification Status */}
      {selectedProvider && (
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          {isApiKeyVerified ? (
            <>
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              <Typography color="success.main">
                API key verified for {selectedProvider}
              </Typography>
            </>
          ) : (
            <>
              <ErrorIcon color="error" sx={{ mr: 1 }} />
              <Typography color="error">
                API key not verified for {selectedProvider}. Please verify the API key in the LLM Provider Settings.
              </Typography>
            </>
          )}
        </Box>
      )}
      
      {/* Get Models Section */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          onClick={handleGetModels}
          disabled={!selectedProvider || !isApiKeyVerified || isLoadingModels}
          startIcon={isLoadingModels ? <CircularProgress size={20} /> : null}
          sx={{ mb: 2 }}
        >
          {isLoadingModels ? 'Getting Models...' : 'Get Models'}
        </Button>
        
        {modelsSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully retrieved {models.length} models
          </Alert>
        )}
        
        {modelsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error: {modelsError}
          </Alert>
        )}
        
        {models.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="model-select-label">Model</InputLabel>
              <Select
                labelId="model-select-label"
                value={selectedModel}
                onChange={handleModelChange}
                label="Model"
              >
                {models.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>
      
      {/* Chat Completion Section */}
      {selectedModel && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Test Chat Completion
          </Typography>
          
          <TextField
            label="Message (optional)"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            fullWidth
            placeholder="Enter a message or leave blank for default"
            sx={{ mb: 2 }}
          />
          
          <Button
            variant="outlined"
            onClick={handleChatCompletion}
            disabled={!selectedModel || isLoadingChat}
            startIcon={isLoadingChat ? <CircularProgress size={20} /> : null}
            sx={{ mb: 2 }}
          >
            {isLoadingChat ? 'Getting Response...' : 'Test Chat'}
          </Button>
          
          {chatSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Successfully received chat completion
            </Alert>
          )}
          
          {chatError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error: {chatError}
            </Alert>
          )}
          
          {chatResponse && (
            <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {chatResponse}
              </Typography>
            </Paper>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default LLMProxyTester;