import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Snackbar } from '@mui/material';
import ProgressText from './ProgressText';
import supabase from '../../utils/supabase';
import { createLog, LogType } from '../../redux/slices/appSlice';
import {
  setTemperature,
  setSystemInstructions,
  setProvider,
  setModel,
} from '../../redux/slices/llmSlice';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Stack
} from '@mui/material';
import {
  Send as SendIcon,
  Menu as MenuIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const LLMChat = () => {
  const dispatch = useDispatch();
  // const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const llmSettings = useSelector(state => state.llm);
  // Get user preferences for LLM
  const userLlmPreferences = useSelector(state => state.auth.user?.preferences?.llm_preferences || {});
  const userLlmProviders = useSelector(state => state.auth.user?.preferences?.llm_providers || []);
  const [providers, setProviders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  // Removed legacy AI module fetching state
  const [selectedProvider, setSelectedProvider] = useState(userLlmPreferences.defaultProvider?.toLowerCase() || '');
  const [selectedModel, setSelectedModel] = useState('');
  const [providerModels, setProviderModels] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPanelWidth, setSettingsPanelWidth] = useState(0);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update local providers state when userLlmProviders changes
  useEffect(() => {
    setProviders(userLlmProviders);
  }, [userLlmProviders]);

  // Set initial provider from user preferences only if it exists in providers
  useEffect(() => {
    if (userLlmPreferences?.defaultProvider && providers.length > 0) {
      // Check if the default provider exists in the available providers
      const providerExists = providers.some(
        p => p.provider.toLowerCase() === userLlmPreferences.defaultProvider.toLowerCase()
      );
      
      if (providerExists) {
        setSelectedProvider(userLlmPreferences.defaultProvider);
        dispatch(setProvider(userLlmPreferences.defaultProvider));
      } else {
        // If default provider doesn't exist, set to the first available provider
        setSelectedProvider(providers[0].provider);
        dispatch(setProvider(providers[0].provider));
      }
    }
  }, [dispatch, userLlmPreferences, providers]);

  // Update models when provider is selected
  useEffect(() => {
    if (!selectedProvider) return;
    
    setError(null);
    
    // Find the provider object in providers array that matches the selected provider
    const providerConfig = providers.find(p => p.provider.toLowerCase() === selectedProvider.toLowerCase());
    
    // If provider config exists, use its models
    if (providerConfig && providerConfig.models && providerConfig.models.chat) {
      // Get all models from the provider (both strong and weak)
      const providerChatModels = [
        providerConfig.models.chat.strong,
        providerConfig.models.chat.weak
      ].filter(Boolean); // Filter out empty values
      
      // Set the provider models directly from user preferences
      setProviderModels(providerChatModels);
      
      // Automatically select the appropriate model
      if (providerChatModels.length > 0) {
        // First try to use the weak chat model
        if (providerConfig.models.chat.weak) {
          setSelectedModel(providerConfig.models.chat.weak);
          dispatch(setModel(providerConfig.models.chat.weak));
        }
        // If weak model is not available, try the strong chat model
        else if (providerConfig.models.chat.strong) {
          setSelectedModel(providerConfig.models.chat.strong);
          dispatch(setModel(providerConfig.models.chat.strong));
        }
      } else {
        setSelectedModel('');
        setError('No chat models are available for this provider.');
      }
    } else {
      // If no provider config found or no chat models defined
      setProviderModels([]);
      setSelectedModel('');
      setError('No chat models are configured for this provider.');
    }
  }, [selectedProvider, dispatch, providers]);

  const handleProviderChange = (event) => {
    const provider = event.target.value;
    setSelectedProvider(provider);
    dispatch(setProvider(provider));
    
    // Find the provider configuration
    const providerConfig = providers.find(p => p.provider.toLowerCase() === provider.toLowerCase());
    
    // Check if the provider has chat models
    if (providerConfig && providerConfig.models && providerConfig.models.chat) {
      // Get all models from the provider (both strong and weak)
      const providerChatModels = [
        providerConfig.models.chat.strong,
        providerConfig.models.chat.weak
      ].filter(Boolean); // Filter out empty values
      
      // Set the provider models directly from user preferences
      setProviderModels(providerChatModels);
      
      // Check for weak chat model first
      if (providerConfig.models.chat.weak) {
        setSelectedModel(providerConfig.models.chat.weak);
        dispatch(setModel(providerConfig.models.chat.weak));
      }
      // If no weak model, check for strong chat model
      else if (providerConfig.models.chat.strong) {
        setSelectedModel(providerConfig.models.chat.strong);
        dispatch(setModel(providerConfig.models.chat.strong));
      }
      // If neither weak nor strong model is available
      else {
        setSelectedModel('');
        setError('No chat models are available for this provider.');
      }
    } else {
      setSelectedModel('');
      setProviderModels([]);
      setError('No chat models are available for this provider.');
    }
  };

  const handleModelChange = (event) => {
    const model = event.target.value;
    setSelectedModel(model);
    dispatch(setModel(model));
  };

  const handleSubmit = async () => {
    if (!input.trim() || !selectedProvider || !selectedModel) return;
  
    // Validate that the selected model is in the list of available models from user preferences
    const providerConfig = providers.find(p => p.provider.toLowerCase() === selectedProvider.toLowerCase());
    const providerChatModels = providerConfig?.models?.chat ?
      [providerConfig.models.chat.strong, providerConfig.models.chat.weak].filter(Boolean) : [];
    
    if (providerChatModels.length > 0 && !providerChatModels.includes(selectedModel)) {
      setError('Selected model is not available in your preferences. Please select a different model.');
      return;
    }

    const newMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      let assistantMessage = { role: 'assistant', content: <ProgressText text="Thinking..." /> };
      setMessages(prev => [...prev, assistantMessage]);

      // Get auth token for the edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      // Create a clean messages array without React components and avoiding duplicates
      // Only include messages up to the point before adding the new message and assistant placeholder
      const previousMessages = messages.slice(0, messages.length - 1);
      
      // Log the payload for debugging
      console.log('Chat payload:', {
        provider: selectedProvider,
        type: 'chat',
        model: selectedModel,
        messagesCount: previousMessages.length + 2, // system + user message
        newMessage
      });

      // Call the Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('llmProxyHandler', {
        body: {
          provider: selectedProvider,
          type: 'chat',
          model: selectedModel,
          messages: [
            { role: 'system', content: userLlmPreferences?.systemInstructions || llmSettings.systemInstructions },
            ...previousMessages.map(msg => ({
              role: msg.role,
              content: typeof msg.content === 'string' ? msg.content : 'Thinking...'
            })),
            { role: newMessage.role, content: newMessage.content }
          ],
          options: {
            temperature: userLlmPreferences?.temperature || llmSettings.temperature,
            stream: false
          }
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        
        // Extract detailed error information if available
        const errorDetails = functionError.details ?
          JSON.stringify(functionError.details, null, 2) : '';
        
        // Log more detailed error information
        console.error('Error details:', {
          message: functionError.message,
          details: functionError.details,
          provider: selectedProvider,
          model: selectedModel
        });
        
        throw new Error(
          `${functionError.message || 'Failed to get response from edge function'}\n` +
          `Provider: ${selectedProvider}, Model: ${selectedModel}\n` +
          (errorDetails ? `Details: ${errorDetails}` : '')
        );
      }

      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: data.content || 'No response received'
      }]);

    } catch (err) {
      const errorMessage = err.message || 'An error occurred';
      console.error('Error in chat completion:', err);
      dispatch(createLog(`Chat completion error: ${errorMessage}`, LogType.ERROR));
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: `Error: ${errorMessage}. Please try again.`
      }]);
    }
  };


  // Toggle settings panel
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
    setSettingsPanelWidth(settingsOpen ? 0 : 350); // Set width when opening/closing
  };

  return (
    <Box sx={{
      p: 4,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative' // For absolute positioning of hamburger menu
    }}>
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={3000}
        onClose={() => setError(null)}
        message={error}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionProps={{
          direction: 'left',
          timeout: {
            enter: 500,
            exit: 500
          }
        }}
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: 'error.main',
            color: 'error.contrastText'
          }
        }}
      />

      {/* Hamburger menu button - floating in top right corner */}
      <IconButton
        onClick={toggleSettings}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1100,
          backgroundColor: 'background.paper',
          boxShadow: 2,
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        {settingsOpen ? <CloseIcon /> : <MenuIcon />}
      </IconButton>

      {/* Slide-out settings panel */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: settingsPanelWidth,
          backgroundColor: 'background.paper',
          boxShadow: 3,
          zIndex: 1000,
          transition: 'width 0.3s ease-in-out',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ p: 3, pt: 8 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>Chat Settings</Typography>
          
          <Stack spacing={3}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>AI Provider</InputLabel>
              <Select
                value={selectedProvider}
                label="AI Provider"
                onChange={handleProviderChange}
              >
                {providers.length > 0 ? (
                  providers.map(provider => (
                    <MenuItem
                      key={provider.id || `provider-${provider.provider}`}
                      value={provider.provider}
                    >
                      {provider.provider}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    No providers available
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Model</InputLabel>
              <Select
                value={selectedModel}
                label="Model"
                onChange={handleModelChange}
                disabled={!selectedProvider}
              >
                {providerModels.length > 0 ? (
                  providerModels.map(model => (
                    <MenuItem key={model} value={model}>
                      {model}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    No models available
                  </MenuItem>
                )}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="System Instructions"
              value={userLlmPreferences?.systemInstructions || llmSettings.systemInstructions}
              onChange={(e) => dispatch(setSystemInstructions(e.target.value))}
            />
            
            <Box>
              <Typography gutterBottom>Temperature: {userLlmPreferences?.temperature || llmSettings.temperature}</Typography>
              <Slider
                value={userLlmPreferences?.temperature || llmSettings.temperature}
                onChange={(e, value) => dispatch(setTemperature(value))}
                min={0}
                max={2}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 1, label: '1' },
                  { value: 2, label: '2' }
                ]}
              />
            </Box>
          </Stack>
        </Box>
      </Box>

      <Paper 
        sx={{ 
          flex: 1, 
          mb: 2, 
          p: 2, 
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {messages.map((message, index) => (
          <Box 
            key={index}
            sx={{
              mb: 2,
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%'
            }}
          >
            <Paper
              elevation={1}
              sx={{
                p: 2,
                backgroundColor: message.role === 'user' ? 'primary.main' : 'background.paper',
                color: message.role === 'user' ? 'primary.contrastText' : 'text.primary'
              }}
            >
              <Box>{message.content}</Box>
            </Paper>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Paper>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Type your message..."
        />
        <IconButton 
          onClick={handleSubmit}
          disabled={!input.trim() || !selectedProvider || !selectedModel}
          color="primary"
        >
          <SendIcon />
        </IconButton>
      </Box>

    </Box>
  );
};

export default LLMChat;
