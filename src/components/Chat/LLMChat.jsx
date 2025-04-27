import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Snackbar, CircularProgress } from '@mui/material';
import ProgressText from './ProgressText';
import { createLog, LogType } from '../../redux/slices/appSlice';
import llmService from '../../services/llmService';
import {
  setTemperature,
  setSystemInstructions,
  selectLlmPreferences,
  syncLlmWithPreferences,
  selectProviderOptions,
  selectModelOptions,
  selectActiveProvider,
  //selectWeakModel,
  selectIsLlmReady,
  selectActiveModel,
  setActiveModelThunk,
  setActiveProviderThunk
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
  Stack,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import {
  Send as SendIcon,
  Menu as MenuIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const LLMChat = () => {
  const dispatch = useDispatch();
  const llmSettings = useSelector(state => state.llm);
  const llmPreferences = useSelector(selectLlmPreferences);
  const isLlmReady = useSelector(selectIsLlmReady);
  
  // Use Redux selectors for provider/model options
  const providerOptions = useSelector(selectProviderOptions);
  const modelOptions = useSelector(selectModelOptions);
  const activeProvider = useSelector(selectActiveProvider);
  const activeModel = useSelector(selectActiveModel);
  //const weakModel = useSelector(selectWeakModel);
  
  // Get user preferences from auth state
  // const userPreferences = useSelector(state => state.auth.user?.preferences || {});
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPanelWidth, setSettingsPanelWidth] = useState(0);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Sync LLM state with preferences on mount
  useEffect(() => {
    dispatch(syncLlmWithPreferences());
  }, [llmPreferences]);
  
  // // Set active model to weak model on mount
  // useEffect(() => {
  //   if (weakModel) {
  //     dispatch(setActiveModelThunk(weakModel));
  //   }
  // }, [weakModel, dispatch]);
  
  // // Log LLM preferences when they change
  // useEffect(() => {
  //   console.log('llmPreferences:', llmPreferences);
  // }, [llmPreferences]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleProviderChange = (event) => {
    const provider = event.target.value;
    // Use the thunk to update the active provider in the UI
    dispatch(setActiveProviderThunk(provider));
    // The thunk will handle updating the Redux state
  };

  const handleModelChange = (event) => {
    const model = event.target.value;
    
    // Set the active model
    dispatch(setActiveModelThunk(model));
  };

  const handleSubmit = async () => {
    if (!input.trim() || !activeProvider || !activeModel) return;
  
    const newMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      let assistantMessage = { role: 'assistant', content: <ProgressText text="Thinking..." /> };
      setMessages(prev => [...prev, assistantMessage]);

      // Create a clean messages array without React components and avoiding duplicates
      // Only include messages up to the point before adding the new message and assistant placeholder
      const previousMessages = messages.slice(0, messages.length - 1);
      
      // Log the payload for debugging
      console.log('Chat payload:', {
        provider: activeProvider,
        model: activeModel,
        messagesCount: previousMessages.length + 2, // system + user message
        newMessage
      });

      // Prepare the complete messages array with system instructions
      const completeMessages = [
        { role: 'system', content: llmPreferences.systemInstructions || llmSettings.systemInstructions },
        ...previousMessages.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : 'Thinking...'
        })),
        { role: newMessage.role, content: newMessage.content }
      ];

      // Set options for the chat request
      const options = {
        temperature: llmPreferences.temperature || llmSettings.temperature,
        max_tokens: 500,
        stream: false,
        baseUrl: llmPreferences.baseUrl || null
      };

      // Use llmService to send the chat request
      const response = await llmService.chat(
        activeProvider,
        activeModel,
        completeMessages,
        options
      );

      // Update the messages with the response
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: response.content || 'No response received'
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

  // Handle clear chat confirmation
  const handleClearConfirm = () => {
    if (messages.length > 0) {
      setClearConfirmOpen(true);
    } else {
      // If no messages, just clear without confirmation
      setMessages([]);
    }
  };

  // Clear chat messages
  const clearChat = () => {
    setMessages([]);
    setClearConfirmOpen(false);
  };

  // Cancel clear chat
  const cancelClearChat = () => {
    setClearConfirmOpen(false);
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
      {/* Loading state when LLM is not ready */}
      {!isLlmReady && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <CircularProgress />
          <Typography variant="body1">Loading LLM settings...</Typography>
        </Box>
      )}
      
      {/* Only render the chat UI when LLM is ready */}
      {isLlmReady && (
        <>
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
                value={activeProvider}
                label="AI Provider"
                onChange={handleProviderChange}
              >
                {providerOptions.length > 0 ? (
                  providerOptions.map(provider => (
                    <MenuItem
                      key={`provider-${provider}`}
                      value={provider}
                    >
                      {provider}
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
                value={activeModel}
                label="Model"
                onChange={handleModelChange}
                disabled={!activeProvider}
              >
                {modelOptions.length > 0 ? (
                  modelOptions.map(model => (
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
              value={llmPreferences.systemInstructions || llmSettings.systemInstructions}
              onChange={(e) => dispatch(setSystemInstructions(e.target.value))}
            />
            
            <Box>
              <Typography gutterBottom>Temperature: {llmPreferences.temperature || llmSettings.temperature}</Typography>
              <Slider
                value={llmPreferences.temperature || llmSettings.temperature}
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
            
            <Button
              variant="outlined"
              color="error"
              onClick={clearChat}
              fullWidth
              sx={{ mt: 2 }}
            >
              Clear Chat
            </Button>
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
          flexDirection: 'column',
          justifyContent: 'flex-end' // Align content to the bottom
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
            {/* Confirmation Dialog for clearing chat */}
            <Dialog
              open={clearConfirmOpen}
              onClose={cancelClearChat}
              aria-labelledby="clear-chat-dialog-title"
            >
              <DialogTitle id="clear-chat-dialog-title">
                Clear Chat History
              </DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Are you sure you want to clear all chat messages? This action cannot be undone.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={cancelClearChat} color="primary">
                  Cancel
                </Button>
                <Button onClick={clearChat} color="error" autoFocus>
                  Clear
                </Button>
              </DialogActions>
            </Dialog>
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
          onClick={handleClearConfirm}
          color="error"
          title="Clear chat"
          sx={{ alignSelf: 'center' }}
        >
          <CloseIcon />
        </IconButton>
        <IconButton
          onClick={handleSubmit}
          disabled={!input.trim() || !activeProvider || !activeModel}
          color="primary"
          title="Send message"
          sx={{ alignSelf: 'center' }}
        >
          <SendIcon />
        </IconButton>
      </Box>

        </>
      )}
    </Box>
  );
};

export default LLMChat;
