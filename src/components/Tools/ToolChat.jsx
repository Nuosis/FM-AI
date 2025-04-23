import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveTool } from '../../redux/slices/toolsSlice';
import { createLog, LogType } from '../../redux/slices/appSlice';
import supabase from '../../utils/supabase';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
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
  Close as CloseIcon,
  DeleteOutline as DeleteIcon
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ToolChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableProviders, setAvailableProviders] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  
  // Get user preferences
  const llmPreferences = useSelector(state => state.auth.user?.preferences?.llm_preferences || {});
  const llmProviders = useSelector(state => state.auth.user?.preferences?.llm_providers || []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize provider and model from user preferences
  useEffect(() => {
    if (llmPreferences && llmProviders.length > 0) {
      const defaultProvider = llmPreferences.defaultProvider || '';
      
      // Find the provider config that matches the default provider
      const providerConfig = llmProviders.find(p => p.provider === defaultProvider);
      
      if (providerConfig) {
        // Set available providers
        setAvailableProviders(llmProviders);
        
        // Set selected provider
        setSelectedProvider(defaultProvider);
        
        // Set available models for this provider
        if (providerConfig.models && providerConfig.models.chat) {
          const models = [];
          if (providerConfig.models.chat.strong) models.push(providerConfig.models.chat.strong);
          if (providerConfig.models.chat.weak) models.push(providerConfig.models.chat.weak);
          setAvailableModels(models);
          
          // Check if we have defaultWeakModel or defaultStrongModel in preferences
          if (llmPreferences.defaultWeakModel) {
            setSelectedModel(llmPreferences.defaultWeakModel);
          } else if (llmPreferences.defaultStrongModel) {
            setSelectedModel(llmPreferences.defaultStrongModel);
          } else {
            // Fallback to the provider's models
            setSelectedModel(providerConfig.models.chat.strong || providerConfig.models.chat.weak || '');
          }
        }
      }
    }
  }, [llmPreferences, llmProviders]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Add a thinking message
      const thinkingMessage = { role: 'assistant', content: 'Thinking...', isLoading: true };
      setMessages(prev => [...prev, thinkingMessage]);

      // Get auth token for the edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      // Call the Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('llmProxyHandler', {
        body: {
          provider: selectedProvider.toLowerCase(),
          type: 'chat',
          model: selectedModel,
          baseUrl: null,
          messages: [
            { role: 'system', content: 'You are a helpful assistant that generates Python code with @tool() decorators. When asked to create a tool, respond with valid Python code that includes a function with a @tool() decorator, proper docstrings, and implementation.' },
            ...messages.filter(m => !m.isLoading),
            userMessage
          ],
          options: {
            temperature: 0.7,
            max_tokens: 2000
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to get response from edge function');
      }

      // Remove the thinking message
      setMessages(prev => prev.filter(m => !m.isLoading));

      // Parse the response if it's a string
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      // Extract Python code if it exists
      const pythonCodeMatch = parsedData.content ? parsedData.content.match(/```python([\s\S]*?)```/) : null;
      let extractedCode = null;
      
      if (pythonCodeMatch && pythonCodeMatch[1]) {
        extractedCode = pythonCodeMatch[1].trim();
      }

      // Add the assistant's response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: parsedData.content || 'No response received',
        code: extractedCode
      }]);

    } catch (error) {
      console.error('Error in chat:', error);
      
      // Remove the thinking message
      setMessages(prev => prev.filter(m => !m.isLoading));
      
      // Add error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}. Please try again.`
      }]);
      
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderChange = (event) => {
    const provider = event.target.value;
    setSelectedProvider(provider);
    
    // Update available models for this provider
    const providerConfig = llmProviders.find(p => p.provider === provider);
    if (providerConfig && providerConfig.models && providerConfig.models.chat) {
      const models = [];
      if (providerConfig.models.chat.strong) models.push(providerConfig.models.chat.strong);
      if (providerConfig.models.chat.weak) models.push(providerConfig.models.chat.weak);
      setAvailableModels(models);
      
      // Check if we have defaultWeakModel in preferences for this provider
      const defaultWeakModel = llmPreferences.defaultWeakModel;
      const defaultStrongModel = llmPreferences.defaultStrongModel;
      
      if (defaultWeakModel && models.includes(defaultWeakModel)) {
        setSelectedModel(defaultWeakModel);
      } else if (defaultStrongModel && models.includes(defaultStrongModel)) {
        setSelectedModel(defaultStrongModel);
      } else {
        // Fallback to the provider's models
        setSelectedModel(providerConfig.models.chat.weak || providerConfig.models.chat.strong || '');
      }
    } else {
      setAvailableModels([]);
      setSelectedModel('');
    }
  };

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
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

  const handleSaveCode = async (code) => {
    if (!code || !user) return;
    
    try {
      // Extract name and description from the code
      const nameMatch = code.match(/@tool\(\)\s*\ndef\s+([a-zA-Z0-9_]+)/);
      const docstringMatch = code.match(/"""([\s\S]*?)"""/);
      
      const name = nameMatch ? nameMatch[1].replace(/_/g, ' ') : 'Unnamed Tool';
      const description = docstringMatch ? docstringMatch[1].trim().split('\n')[0] : 'No description';
      
      const toolData = {
        name,
        description,
        code,
        user_id: user.id,
        user_name: user.email || user.username || 'Unknown',
        created_at: new Date().toISOString()
      };
      
      await dispatch(saveTool(toolData));
      dispatch(createLog('Tool saved successfully', LogType.INFO));
      
      // Add system message
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: 'Tool saved successfully!'
      }]);
      
    } catch (error) {
      console.error('Error saving tool:', error);
      setError(error.message || 'Failed to save tool');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Settings toggle button */}
      <IconButton
        onClick={toggleSettings}
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1100,
          backgroundColor: 'background.paper',
          boxShadow: 1,
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        {settingsOpen ? <CloseIcon /> : <MenuIcon />}
      </IconButton>
      
      {/* Settings panel */}
      <Collapse in={settingsOpen}>
        <Paper
          sx={{
            p: 2,
            mb: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            borderRadius: 0,
            boxShadow: 2
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="provider-select-label">AI Provider</InputLabel>
              <Select
                labelId="provider-select-label"
                value={selectedProvider}
                onChange={handleProviderChange}
                label="AI Provider"
                size="small"
              >
                {availableProviders.map((provider) => (
                  <MenuItem key={provider.provider} value={provider.provider}>
                    {provider.provider}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="model-select-label">Model</InputLabel>
              <Select
                labelId="model-select-label"
                value={selectedModel}
                onChange={handleModelChange}
                label="Model"
                size="small"
                disabled={availableModels.length === 0}
              >
                {availableModels.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>
      </Collapse>
      
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
        {messages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: 'text.secondary'
          }}>
            <Typography variant="h6" gutterBottom>
              Tool Creation Assistant
            </Typography>
            <Typography variant="body2">
              Describe the tool you want to create. For example:
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 1 }}>
              &ldquo;Create a tool to summarize text that takes a long text input and returns a concise summary.&rdquo;
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => (
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
                  backgroundColor: message.role === 'user' 
                    ? 'primary.main' 
                    : message.role === 'system'
                      ? 'success.light'
                      : 'background.paper',
                  color: message.role === 'user' || message.role === 'system'
                    ? 'primary.contrastText' 
                    : 'text.primary'
                }}
              >
                {message.isLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    <Typography>{message.content}</Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content.replace(/```python[\s\S]*?```/g, '')}
                    </Typography>
                    
                    {message.code && (
                      <Box sx={{ mt: 2 }}>
                        <SyntaxHighlighter language="python" style={materialDark}>
                          {message.code}
                        </SyntaxHighlighter>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleSaveCode(message.code)}
                          >
                            Save Tool
                          </IconButton>
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Paper>
            </Box>
          ))
        )}
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
          placeholder="Describe the tool you want to create..."
          disabled={isLoading}
        />
        <IconButton
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          color="primary"
        >
          <SendIcon />
        </IconButton>
        <IconButton
          onClick={handleClearConfirm}
          color="error"
          size="small"
          disabled={messages.length === 0 || isLoading}
          sx={{ alignSelf: 'center' }}
          title="Clear chat"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={3000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionProps={{
          direction: 'right',
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
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

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
  );
};

export default ToolChat;