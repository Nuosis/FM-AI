// Updated to work with the unified Python proxy server

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
  TextField,
  Tabs,
  Tab
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

/**
 * Component for testing the unified local proxy server
 * Allows testing both LLM proxy functionality and Python code execution
 */
const LLMProxyTester = () => {
  // Check if LLM testing is enabled in environment variables
  const isLLMTestEnabled = import.meta.env.VITE_LLM_TEST === 'true';
  
  // Get user data and preferences from Redux
  const currentUser = useSelector(state => state.auth.user);
  const userId = currentUser?.user_id;
  const llmProviders = useSelector(state => state.auth.user?.preferences?.llm_providers || []);
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // LLM Proxy testing state
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  
  // Loading and error states for LLM testing
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState(null);
  const [modelsSuccess, setModelsSuccess] = useState(false);
  
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [chatSuccess, setChatSuccess] = useState(false);
  
  // Check if API key is verified for the selected provider
  const [isApiKeyVerified, setIsApiKeyVerified] = useState(false);
  
  // Python code execution testing state
  const [pythonCode, setPythonCode] = useState(`
import json
import sys

# Get input from stdin
input_data = json.loads(sys.stdin.read())

# Process the input
result = {
    "message": f"Hello, {input_data.get('name', 'World')}!",
    "timestamp": input_data.get('timestamp')
}

# Output the result as JSON
print(json.dumps(result))
  `.trim());
  
  const [inputData, setInputData] = useState(JSON.stringify({
    name: "User",
    timestamp: new Date().toISOString()
  }, null, 2));
  
  const [executionResult, setExecutionResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState(null);
  const [executionSuccess, setExecutionSuccess] = useState(false);
  
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
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle Python code execution
  const handleExecuteCode = async () => {
    setIsExecuting(true);
    setExecutionError(null);
    setExecutionSuccess(false);
    setExecutionResult(null);
    
    try {
      // Parse the input data
      let parsedInput;
      try {
        parsedInput = JSON.parse(inputData);
      } catch (error) {
        throw new Error(`Invalid JSON input: ${error.message}`);
      }
      
      // Call the proxy server's execute endpoint
      const response = await fetch('http://localhost:3500/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: pythonCode,
          input: parsedInput
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Execution failed with no error message');
      }
      
      setExecutionResult(result);
      setExecutionSuccess(true);
    } catch (error) {
      console.error('Error executing Python code:', error);
      setExecutionError(error.message);
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Try to parse the output as JSON for better display
  const getParsedOutput = () => {
    if (!executionResult || !executionResult.output) return null;
    
    try {
      return JSON.parse(executionResult.output);
    } catch {
      // If it's not valid JSON, return the raw output
      return null;
    }
  };
  
  const parsedOutput = getParsedOutput();
  
  // Render LLM Proxy Testing Tab
  const renderLLMProxyTab = () => (
    <>
      <Typography variant="body2" color="text.secondary" paragraph>
        Test the LLM Proxy functionality with real API calls to get models and chat completions.
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
    </>
  );
  
  // Render Python Code Execution Tab
  const renderPythonExecutionTab = () => (
    <>
      <Typography variant="body2" color="text.secondary" paragraph>
        Test the Python code execution functionality of the unified proxy server.
        Enter Python code, provide input data as JSON, and execute it to see the results.
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Python Code Input */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Python Code
        </Typography>
        
        <TextField
          label="Python Code"
          value={pythonCode}
          onChange={(e) => setPythonCode(e.target.value)}
          fullWidth
          multiline
          rows={10}
          variant="outlined"
          sx={{ fontFamily: 'monospace' }}
        />
      </Box>
      
      {/* Input Data */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Input Data (JSON)
        </Typography>
        
        <TextField
          label="Input Data"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          sx={{ fontFamily: 'monospace' }}
        />
      </Box>
      
      {/* Execute Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExecuteCode}
          disabled={isExecuting}
          startIcon={isExecuting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isExecuting ? 'Executing...' : 'Execute Code'}
        </Button>
      </Box>
      
      {/* Execution Results */}
      {executionSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Code executed successfully
        </Alert>
      )}
      
      {executionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {executionError}
        </Alert>
      )}
      
      {executionResult && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Execution Result
          </Typography>
          
          {executionResult.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Execution Error: {executionResult.error}
            </Alert>
          )}
          
          {executionResult.output && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Output:
              </Typography>
              
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto'
                }}
              >
                {parsedOutput ? (
                  <pre>{JSON.stringify(parsedOutput, null, 2)}</pre>
                ) : (
                  executionResult.output
                )}
              </Paper>
            </>
          )}
        </Box>
      )}
    </>
  );
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      {!isLLMTestEnabled ? (
        <Alert severity="info">
          Proxy Tester is disabled. Set VITE_LLM_TEST=true in your .env file to enable it.
        </Alert>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            Unified Local Proxy Server Tester
          </Typography>
          
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{ mb: 2 }}
            variant="fullWidth"
          >
            <Tab label="LLM Proxy Testing" />
            <Tab label="Python Code Execution" />
          </Tabs>
          
          {activeTab === 0 && renderLLMProxyTab()}
          {activeTab === 1 && renderPythonExecutionTab()}
        </>
      )}
    </Paper>
  );
};

export default LLMProxyTester;