import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Snackbar } from '@mui/material';
import axiosInstance from '../../utils/axios';
import { createLog, LogType } from '../../redux/slices/appSlice';
import { 
  setTemperature, 
  setSystemInstructions, 
  setProvider, 
  setModel 
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  Stack
} from '@mui/material';
import {
  Send as SendIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const LLMChat = () => {
  const dispatch = useDispatch();
  const organizationId = useSelector(state => state.auth.user?.org_id);
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const llmSettings = useSelector(state => state.llm);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [aiModules, setAiModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch AI modules
  useEffect(() => {
    const fetchAIModules = async () => {
      setError(null);
      dispatch(createLog('Fetching AI modules...', LogType.INFO));
      try {
        const response = await axiosInstance.get('/api/admin/modules/');
        const moduleArray = Array.isArray(response.data.response.data) ? response.data.response.data : [];
        
        // Filter modules that start with "AI:"
        const aiModules = moduleArray.filter(module => 
          module.fieldData.moduleName.startsWith('AI:')
        ).map(module => {
          const name = module.fieldData.moduleName.replace('AI:', '').trim();
          // Extract provider name from module name (e.g., "OpenAI GPT-4" -> "openai")
          const provider = name.split(' ')[0].toLowerCase();
          return {
            id: module.fieldData.__ID,
            name,
            provider
          };
        });
        
        setAiModules(aiModules);
        
        // Set selected module if provider is stored
        if (llmSettings.provider) {
          const storedModule = aiModules.find(m => m.provider === llmSettings.provider);
          if (storedModule) {
            setSelectedModule(storedModule.id);
          }
        }
      } catch (err) {
        const errorMessage = err.response?.data?.error || err.message;
        console.error('Error fetching AI modules:', err);
        dispatch(createLog(`Failed to fetch AI modules: ${errorMessage}`, LogType.ERROR));
        setError('Failed to load AI modules. Please try again.');
      }
    };

    fetchAIModules();
  }, [dispatch, llmSettings.provider]);

  // Fetch available models when AI module is selected
  useEffect(() => {
    if (!selectedModule) return;
    
    const fetchModels = async () => {
      setError(null);
      dispatch(createLog('Fetching available models...', LogType.INFO));
      try {
        const selectedModuleData = aiModules.find(m => m.id === selectedModule);
        if (!selectedModuleData) {
          throw new Error('Selected module not found');
        }

        const response = await axiosInstance.get(`/api/llm/${selectedModule}/models`, {
          headers: {
            'X-Organization-Id': organizationId
          }
        });
        const availableModels = response.data?.models || [];
        setModels(availableModels);
        
        // Set selected model if stored
        if (llmSettings.model && availableModels.includes(llmSettings.model)) {
          setSelectedModel(llmSettings.model);
        } else if (availableModels.length > 0) {
          setSelectedModel(availableModels[0]);
        }
      } catch (err) {
        const errorMessage = err.response?.data?.error || err.message;
        console.error('Error fetching models:', err);
        dispatch(createLog(`Failed to fetch models: ${errorMessage}`, LogType.ERROR));
        setError('Failed to load models. Please try again.');
      }
    };

    fetchModels();
  }, [selectedModule, dispatch, organizationId, llmSettings.model]);

  const handleModuleChange = (event) => {
    const moduleId = event.target.value;
    setSelectedModule(moduleId);
    setSelectedModel('');
    setModels([]);
    
    // Store provider
    const selectedModuleData = aiModules.find(m => m.id === moduleId);
    if (selectedModuleData) {
      dispatch(setProvider(selectedModuleData.provider));
    }
  };

  const handleModelChange = (event) => {
    const model = event.target.value;
    setSelectedModel(model);
    dispatch(setModel(model));
  };

  const handleSubmit = async () => {
    if (!input.trim() || !selectedModule || !selectedModel) return;

    const newMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      const selectedModuleData = aiModules.find(m => m.id === selectedModule);
      if (!selectedModuleData) {
        throw new Error('Selected module not found');
      }

      let assistantMessage = { role: 'assistant', content: 'Thinking...' };
      setMessages(prev => [...prev, assistantMessage]);

      const response = await axiosInstance.post(
        `/api/llm/${selectedModule}/completion`,
        {
          messages: [
            { role: 'system', content: llmSettings.systemInstructions },
            ...messages,
            newMessage
          ],
          moduleId: selectedModule,
          model: selectedModel,
          temperature: llmSettings.temperature,
          stream: false
        },
        {
          headers: {
            'X-Organization-Id': organizationId
          }
        }
      );

      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: response.data.content || 'No response received'
      }]);

    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      console.error('Error in chat completion:', err);
      dispatch(createLog(`Chat completion error: ${errorMessage}`, LogType.ERROR));
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: `Error: ${errorMessage}. Please try again.`
      }]);
    }
  };

  return (
    <Box sx={{ 
      p: 4,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        message={error}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>AI Provider</InputLabel>
          <Select
            value={selectedModule}
            label="AI Provider"
            onChange={handleModuleChange}
          >
            {aiModules.map(module => (
              <MenuItem key={module.id} value={module.id}>
                {module.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Model</InputLabel>
          <Select
            value={selectedModel}
            label="Model"
            onChange={handleModelChange}
            disabled={!selectedModule}
          >
            {models.map(model => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <IconButton onClick={() => setSettingsOpen(true)}>
          <SettingsIcon />
        </IconButton>
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
              <Typography>{message.content}</Typography>
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
          disabled={!input.trim() || !selectedModule || !selectedModel}
          color="primary"
        >
          <SendIcon />
        </IconButton>
      </Box>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Chat Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2, minWidth: 300 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="System Instructions"
              value={llmSettings.systemInstructions}
              onChange={(e) => dispatch(setSystemInstructions(e.target.value))}
            />
            
            <Box>
              <Typography gutterBottom>Temperature: {llmSettings.temperature}</Typography>
              <Slider
                value={llmSettings.temperature}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LLMChat;
