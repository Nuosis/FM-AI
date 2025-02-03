// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { updateFunction } from '../../redux/slices/functionsSlice';
import axiosInstance from '../../utils/axios';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from '@mui/material';
import { Close as CloseIcon, ExpandMore as ExpandMoreIcon, Save as SaveIcon } from '@mui/icons-material';
import FunctionChat from './FunctionChat';

const FunctionForm = ({ function: func, onClose }) => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const organizationId = user?.org_id;
  const isOwner = user?.party_id === func._partyId;
  
  const [error, setError] = useState(null);
  const [aiModules, setAiModules] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showEditSection, setShowEditSection] = useState(false);
  const [saveExampleDialog, setSaveExampleDialog] = useState({
    open: false,
    output: ''
  });

  // Initialize form data with saved values
  const [formData, setFormData] = useState({
    name: func.name,
    description: func.description,
    system_instructions: func.system_instructions || '',
    provider: func.provider,
    model: '',  // Start empty and set after models are fetched
    temperature: Number(func.temperature),
    input_values: {},
    showResponse: false,
    testPrompt: ''
  });

  // Set the model once models are fetched
  useEffect(() => {
    if (models.length > 0) {
      const modelExists = models.includes(func.model);
      setFormData(prev => ({
        ...prev,
        model: modelExists ? func.model : models[0]
      }));
    }
  }, [models, func.model]);

  // Reset model when provider changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      model: ''
    }));
  }, [formData.provider]);

  // Initialize input values from input_variables
  useEffect(() => {
    const initialInputs = {};
    func.input_variables.forEach(variable => {
      initialInputs[variable] = '';
    });
    setFormData(prev => ({
      ...prev,
      input_values: initialInputs
    }));
  }, [func.input_variables]);

  // Load AI modules and initialize provider
  useEffect(() => {
    const fetchAIModules = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get('/api/admin/modules/');
        const moduleArray = Array.isArray(response.data.response.data) ? response.data.response.data : [];
        
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
        
        // Set module based on saved function data
        const moduleForProvider = aiModules.find(m => m.provider === func.provider);
        if (moduleForProvider) {
          setSelectedModule(moduleForProvider.id);
        } else if (aiModules.length > 0) {
          // If saved provider not found, use first available
          const firstModule = aiModules[0];
          setFormData(prev => ({
            ...prev,
            provider: firstModule.provider,
            model: '' // Reset model since provider changed
          }));
          setSelectedModule(firstModule.id);
        }
      } catch (error) {
        console.error('Error loading AI modules:', error);
        setError('Failed to load AI modules');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAIModules();
  }, []); // Run once on mount

  // Fetch models when module is selected
  useEffect(() => {
    if (!selectedModule) return;

    const fetchModels = async () => {
      try {
        const response = await axiosInstance.get(`/api/llm/${selectedModule}/models`);
        const availableModels = response.data?.models || [];
        setModels(availableModels);

        // If current model isn't in available models, reset it
        if (formData.model && !availableModels.includes(formData.model)) {
          setFormData(prev => ({
            ...prev,
            model: availableModels[0] || '' // Use first available model or empty string
          }));
        }
      } catch (error) {
        console.error('Error loading models:', error);
        setError('Failed to load models');
      }
    };

    fetchModels();
  }, [selectedModule, organizationId]);

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Update selected module and reset model when provider changes
    if (field === 'provider') {
      const moduleForProvider = aiModules.find(m => m.provider === value);
      if (moduleForProvider) {
        setSelectedModule(moduleForProvider.id);
        // Reset model when changing providers
        setFormData(prev => ({
          ...prev,
          model: ''  // Reset model selection
        }));
      }
    }
  };

  const handleInputValueChange = (variable) => (event) => {
    setFormData(prev => ({
      ...prev,
      input_values: {
        ...prev.input_values,
        [variable]: event.target.value
      }
    }));
  };

  const handleSave = async () => {
    try {
      // Extract only the fields we want to update
      const { 
        name, 
        description, 
        system_instructions, 
        provider, 
        model, 
        temperature 
      } = formData;

      await axiosInstance.patch(`/api/admin/aifunctions/${func.recordId}`, {
        name,
        description,
        system_instructions,
        provider,
        model,
        temperature
      });
      
      dispatch(updateFunction({
        ...func,
        name,
        description,
        system_instructions,
        provider,
        model,
        temperature,
        recordId: func.recordId
      }));
      
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      setError('Failed to save changes');
    }
  };

  const handleSaveExample = async () => {
    const currentInputs = {
      jsonArray: formData.input_values.jsonArray,
      key: formData.input_values.key,
      value: formData.input_values.value
    };

    // Create new example section
    const newExample = `
// Example input -----
jsonArray = ${currentInputs.jsonArray}
key = ${currentInputs.key}
value = ${currentInputs.value}

// Example output -----
${saveExampleDialog.output}
`;

    // Find the position to insert the new example
    const templateParts = func.prompt_template.split('Provide expected output using the following input:');
    const updatedTemplate = templateParts[0] + newExample + '\nProvide expected output using the following input:' + templateParts[1];

    try {
      await axiosInstance.patch(`/api/admin/aifunctions/${func.recordId}`, {
        prompt_template: updatedTemplate
      });
      
      dispatch(updateFunction({
        ...func,
        prompt_template: updatedTemplate
      }));
      
      setSaveExampleDialog({ open: false, output: '' });
    } catch (error) {
      console.error('Error saving example:', error);
      setError('Failed to save example');
    }
  };

  const handleTest = async () => {
    try {
      // Validate prompt template exists
      if (!func.prompt_template) {
        setError('Prompt template is missing');
        return;
      }

      // Replace variables in prompt template with actual values
      const prompt = func.prompt_template;
      const filledPrompt = Object.entries(formData.input_values).reduce(
        (p, [key, value]) => {
          if (!p) return p;
          return p.replace(`{{${key}}}`, value || '');
        },
        prompt
      );

      if (!filledPrompt) {
        setError('Error processing prompt template');
        return;
      }

      setError(null); // Clear any previous errors
      setFormData(prev => ({
        ...prev,
        showResponse: true,
        testPrompt: filledPrompt
      }));
    } catch (error) {
      console.error('Error in test:', error);
      setError('Failed to process test: ' + error.message);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconButton
            onClick={() => setShowEditSection(!showEditSection)}
            sx={{
              transform: showEditSection ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
              '&:focus': { outline: 'none' }
            }}
            size="small"
            disableRipple
          >
            <ExpandMoreIcon />
          </IconButton>
          <Typography variant="h6">
            Edit Function
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: -12,
            top: -12,
            color: (theme) => theme.palette.grey[500]
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {showEditSection && (
          <>
            <TextField
              label="Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              disabled={!isOwner}
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              multiline
              rows={2}
              disabled={!isOwner}
            />

            <TextField
              label="System Instructions"
              value={formData.system_instructions}
              onChange={handleInputChange('system_instructions')}
              multiline
              rows={3}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={formData.provider}
                  label="Provider"
                  onChange={handleInputChange('provider')}
                  disabled={isLoading}
                >
                  {aiModules.map(module => (
                    <MenuItem key={module.id} value={module.provider}>
                      {module.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Model</InputLabel>
                <Select
                  value={formData.model}
                  label="Model"
                  onChange={handleInputChange('model')}
                  disabled={isLoading || !formData.provider}
                >
                  {models.length === 0 && (
                    <MenuItem value="">
                      <em>Loading models...</em>
                    </MenuItem>
                  )}
                  {models.map(model => (
                    <MenuItem key={model} value={model}>
                      {model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {isOwner && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2, mb: 2 }}>
                <Button onClick={handleSave} variant="contained">
                  Save Changes
                </Button>
              </Box>
            )}
          </>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Test Function
        </Typography>

        {func.input_variables.map(variable => (
          <TextField
            key={variable}
            label={variable}
            value={formData.input_values[variable] || ''}
            onChange={handleInputValueChange(variable)}
          />
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button variant="outlined" onClick={() => setSaveExampleDialog({ open: true, output: '' })}>
            Save As Example
          </Button>
          <Button onClick={handleTest} variant="contained" color="primary">
            Test
          </Button>
        </Box>

        <Dialog
          open={saveExampleDialog.open}
          onClose={() => setSaveExampleDialog({ open: false, output: '' })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Save As Example
            <IconButton
              aria-label="close"
              onClick={() => setSaveExampleDialog({ open: false, output: '' })}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Typography variant="subtitle1">Current Template:</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {func.prompt_template}
                </pre>
              </Paper>

              <Typography variant="subtitle1">New Example:</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{`// Example input -----
jsonArray = ${formData.input_values.jsonArray}
key = ${formData.input_values.key}
value = ${formData.input_values.value}

// Example output -----`}
                </pre>
                <TextField
                  multiline
                  fullWidth
                  rows={3}
                  value={saveExampleDialog.output}
                  onChange={(e) => setSaveExampleDialog(prev => ({ ...prev, output: e.target.value }))}
                  placeholder="Enter the expected output for this example"
                  variant="outlined"
                  sx={{ mt: 1 }}
                />
              </Paper>

              <Typography variant="subtitle1">Preview:</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {func.prompt_template.split('Provide expected output using the following input:')[0] +
                    `
// Example input -----
jsonArray = ${formData.input_values.jsonArray}
key = ${formData.input_values.key}
value = ${formData.input_values.value}

// Example output -----
${saveExampleDialog.output}

Provide expected output using the following input:` +
                    func.prompt_template.split('Provide expected output using the following input:')[1]}
                </pre>
              </Paper>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button onClick={() => setSaveExampleDialog({ open: false, output: '' })}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveExample}
                  startIcon={<SaveIcon />}
                  disabled={!saveExampleDialog.output.trim()}
                >
                  Save Example
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        <Dialog 
          open={formData.showResponse} 
          onClose={() => setFormData(prev => ({ ...prev, showResponse: false }))}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Test Response
            <IconButton
              aria-label="close"
              onClick={() => setFormData(prev => ({ ...prev, showResponse: false }))}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ height: 300, mt: 2 }}>
              <FunctionChat
                initialPrompt={formData.testPrompt}
                provider={formData.provider}
                model={formData.model}
                temperature={Number(formData.temperature)}
                systemInstructions={formData.system_instructions}
              />
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    </Paper>
  );
};

FunctionForm.propTypes = {
  function: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    input_variables: PropTypes.arrayOf(PropTypes.string).isRequired,
    system_instructions: PropTypes.string,
    provider: PropTypes.string.isRequired,
    model: PropTypes.string.isRequired,
    temperature: PropTypes.number.isRequired,
    _partyId: PropTypes.string.isRequired,
    prompt_template: PropTypes.string.isRequired,
    recordId: PropTypes.string.isRequired
  }).isRequired,
  onClose: PropTypes.func.isRequired
};

export default FunctionForm;
