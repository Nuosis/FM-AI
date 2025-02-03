// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { 
  addFunction, 
  setLoading, 
  setError,
  selectFunctionsLoading,
  selectFunctionsError 
} from '../../redux/slices/functionsSlice';
import axiosInstance from '../../utils/axios';
import { createLog, LogType } from '../../redux/slices/appSlice';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import ProgressText from './ProgressText';

const FUNCTION_PROMPT_TEMPLATE = `Generate a JSON object containing a proposed name, full description, input variables, example input and output for a new function that {{description}}. Ensure the response is a JSON object.

Here's an example for a function that checks if a number is even:
{
    "name": "Is Even",
    "description": "determines if a given number is even",
    "input_variables": [
        {
            "name": "number",
            "type": "number",
            "description": "number to check"
        }
    ],
    "example": {
        "input": {
            "number": 4
        },
        "output": true
    }
}`;

const MAX_RETRIES = 2;

const FunctionCreator = ({ onCancel }) => {
  const [description, setDescription] = useState('');
  const [aiModules, setAiModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [progressStatus, setProgressStatus] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const dispatch = useDispatch();
  const isLoading = useSelector(selectFunctionsLoading);
  const error = useSelector(selectFunctionsError);
  const organizationId = useSelector(state => state.auth.user.org_id);
  const partyId = useSelector(state => state.auth.user.party_id);
  const llmSettings = useSelector(state => state.llm);

  // Reset retry count when description changes
  useEffect(() => {
    setRetryCount(0);
  }, [description]);

  // Fetch AI modules
  useEffect(() => {
    const fetchAIModules = async () => {
      dispatch(setError(null));
      dispatch(createLog('Fetching AI modules...', LogType.INFO));
      try {
        const response = await axiosInstance.get('/api/admin/modules/');
        const moduleArray = Array.isArray(response.data.response.data) ? response.data.response.data : [];
        
        // Filter modules that start with "AI:"
        const aiModules = moduleArray.filter(module => 
          module.fieldData.moduleName.startsWith('AI:')
        ).map(module => {
          const name = module.fieldData.moduleName.replace('AI:', '').trim();
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
        dispatch(setError('Failed to load AI modules. Please try again.'));
      }
    };

    fetchAIModules();
  }, [dispatch, llmSettings.provider]);

  // Fetch available models when AI module is selected
  useEffect(() => {
    if (!selectedModule) return;
    
    const fetchModels = async () => {
      dispatch(setError(null));
      dispatch(createLog('Fetching available models...', LogType.INFO));
      try {
        const selectedModuleData = aiModules.find(m => m.id === selectedModule);
        if (!selectedModuleData) {
          throw new Error('Selected module not found');
        }

        const response = await axiosInstance.get(`/api/llm/${selectedModule}/models`);
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
        dispatch(setError('Failed to load models. Please try again.'));
      }
    };

    fetchModels();
  }, [selectedModule, dispatch, organizationId, llmSettings.model]);

  const validateResponse = (response) => {
    dispatch(createLog(`Validating Response... ${JSON.stringify(response)}`, LogType.INFO));
    const required = ['name', 'description', 'input_variables', 'example'];
    const missing = required.filter(key => !response[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!Array.isArray(response.input_variables)) {
      dispatch(createLog(`Input Variables... input:${JSON.stringify(response.input_variables)}`, LogType.INFO));
      throw new Error('input_variables must be an array');
    }

    if (!response.input_variables.every(v => v.name && v.type && v.description)) {
      dispatch(createLog(`Input Variables... input:${JSON.stringify(response.input_variables)}`, LogType.INFO));
      throw new Error('Each input variable must have name, type, and description');
    }

    if (!('input' in response.example) || !('output' in response.example)) {
      dispatch(createLog(`Example Values... input:${JSON.stringify(response.example.input)}, output: ${JSON.stringify(response.example.output)}`, LogType.INFO));
      throw new Error('Example must contain input and output keys');
    }
  };

  const makeRequest = async (messages) => {
    const response = await axiosInstance.post(
      `/api/llm/${selectedModule}/completion`,
      {
        messages,
        moduleId: selectedModule,
        model: selectedModel,
        temperature: llmSettings.temperature,
        stream: false
      }
    );
    return response;
  };

  const createNewPrompt = (functionData) => {
  // Create example input string with placeholders
  const inputExample = functionData.example.input;
  let inputStr = '';
  
  // Build input section
  Object.keys(inputExample).forEach(key => {
    inputStr += `${key} = {{${key}}}\n`;
  });

  // Create the prompt template
  return `Provide the expected output of a function that ${functionData.description}

// Example input -----
${Object.entries(functionData.example.input).map(([key, value]) => 
  `${key} = ${typeof value === 'object' ? JSON.stringify(value) : value}`
).join('\n')}

// Example output -----
${JSON.stringify(functionData.example.output)}

Provide expected output using the following input:

// Input -----
${inputStr}
// Output -----`;
};

const tryParseJSON = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || !selectedModule || !selectedModel) return;

    dispatch(setLoading(true));
    dispatch(setError(null));
    setRetryCount(0);

    const systemInstructions = "You are an assistant that only responds in JSON format. Every response must be a valid JSON object or array. Do not include any explanations, comments, or text outside of JSON. If you are unsure, output an empty JSON object ({})"
    
    try {
      // Get selected module data
      const selectedModuleData = aiModules.find(m => m.id === selectedModule);
      if (!selectedModuleData) {
        throw new Error('Selected module not found');
      }

      // Initial request
      setProgressStatus('generating function');
      const prompt = FUNCTION_PROMPT_TEMPLATE.replace('{{description}}', description);
      let response = await makeRequest([
        { role: 'system', content: systemInstructions },
        { role: 'user', content: prompt }
      ]);

      let functionData = tryParseJSON(response.data.content);
      
      // If not valid JSON, try to get JSON format
      if (!functionData && retryCount < MAX_RETRIES) {
        setProgressStatus('clarifying response');
        setRetryCount(prev => prev + 1);
        response = await makeRequest([
          { role: 'system', content: systemInstructions },
          { role: 'user', content: prompt },
          { role: 'assistant', content: response.data.content },
          { role: 'user', content: 'Please restructure your last response as valid JSON. Do not include any explanations, comments, or text outside of JSON.' }
        ]);
        functionData = tryParseJSON(response.data.content);
      }

      if (!functionData) {
        throw new Error('Failed to get valid JSON response. Please try again or use a different model.');
      }

      // Validate response and request missing fields if needed
      setRetryCount(0);
      try {
        validateResponse(functionData);
      } catch (validationError) {
        if (retryCount < MAX_RETRIES) {
          setProgressStatus('requesting required information');
          setRetryCount(prev => prev + 1);
          response = await makeRequest([
            { role: 'system', content: systemInstructions },
            { role: 'user', content: prompt },
            { role: 'assistant', content: JSON.stringify(functionData) },
            { role: 'user', content: `Please provide a complete function specification. ${validationError.message}` }
          ]);
          functionData = tryParseJSON(response.data.content);
          validateResponse(functionData); // Validate again
        } else {
          throw new Error(`Invalid response after ${MAX_RETRIES} attempts. Please try again with a different description or model.`);
        }
      }

      // Generate new prompt and save function
      setProgressStatus('compiling function');
      dispatch(createLog('Saving AI function...', LogType.INFO));
      const newPrompt = createNewPrompt(functionData);
      dispatch(createLog(`New Prompt... ${newPrompt}`, LogType.DEBUG));
      const saveResponse = await axiosInstance.post(
        '/api/admin/aifunctions/',
        {
          _orgID: organizationId,
          _partyID: partyId,
          name: functionData.name,
          description: functionData.description,
          input_variables: JSON.stringify(functionData.input_variables.map(v => v.name).join(',')),
          example_input: JSON.stringify(functionData.example.input),
          example_output: JSON.stringify(functionData.example.output),
          provider: selectedModuleData.provider,
          model: selectedModel,
          temperature: llmSettings.temperature,
          prompt_template: newPrompt,
          system_instructions: llmSettings.systemInstructions,
        }
      );

      // Add the saved function to Redux store
      dispatch(addFunction({
        ...functionData,
        id: saveResponse.data.id,
        provider: selectedModuleData.provider,
        model: selectedModel,
        temperature: llmSettings.temperature
      }));
      
      setDescription(''); // Clear form
      setProgressStatus('');
      dispatch(createLog('Function created and saved successfully', LogType.INFO));
      
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      console.error('Error creating function:', err);
      dispatch(createLog(`Failed to create function: ${errorMessage}`, LogType.ERROR));
      dispatch(setError(errorMessage));
      setProgressStatus('');
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Create New Function
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>AI Provider</InputLabel>
          <Select
            value={selectedModule}
            label="AI Provider"
            onChange={(e) => setSelectedModule(e.target.value)}
          >
            {aiModules.map(module => (
              <MenuItem key={module.id} value={module.id}>
                {module.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Model</InputLabel>
          <Select
            value={selectedModel}
            label="Model"
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedModule}
          >
            {models.map(model => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Describe what the function does"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Example: Tells a Dad Joke based on a provided topic"
          required
          disabled={isLoading}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
          {progressStatus && (
            <ProgressText text={progressStatus} />
          )}
          <Button
            onClick={onCancel}
            disabled={isLoading}
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !description.trim() || !selectedModule || !selectedModel}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {isLoading ? 'Creating...' : 'Create Function'}
          </Button>
        </Box>
      </form>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => dispatch(setError(null))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => dispatch(setError(null))}>
          {error}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

FunctionCreator.propTypes = {
  onCancel: PropTypes.func.isRequired
};

export default FunctionCreator;
