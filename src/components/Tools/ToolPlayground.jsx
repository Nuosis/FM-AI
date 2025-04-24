import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  executeToolCode,
  selectIsExecuting,
  selectExecutionResult,
  selectExecutionError,
  clearExecutionResult
} from '../../redux/slices/toolsSlice';
import { selectLlmPreferences } from '../../redux/slices/llmSlice';
import llmProviderService from '../../services/llmProviderService';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Slide
} from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ToolPlayground = ({ tool }) => {
  const [inputJson, setInputJson] = useState('{}');
  const [isValidJson, setIsValidJson] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const dispatch = useDispatch();
  const isExecuting = useSelector(selectIsExecuting);
  const executionResult = useSelector(selectExecutionResult);
  const executionError = useSelector(selectExecutionError);
  const llmPreferences = useSelector(selectLlmPreferences);

  // Check if tool is valid
  const isToolValid = tool && typeof tool === 'object' && tool.id;

  // Handle closing the error snackbar
  const handleCloseSnackbar = () => {
    setErrorMessage(null);
  };

  // Generate input parameters using LLM when tool changes
  useEffect(() => {
    if (!isToolValid) return;

    const generateInputWithLLM = async () => {
      try {
        console.log('preferences in state: ', llmPreferences);
        
        // Get provider and model from preferences
        const provider = llmPreferences.defaultProvider.toLowerCase();
        const model = llmPreferences.defaultStrongModel;
        const baseUrl = llmPreferences.baseUrl;
        
        console.log('Using provider:', provider, 'model:', model, 'baseUrl:', baseUrl);
        
        // Check if provider and model are set
        if (!provider) {
          console.warn('No default LLM provider configured');
          return;
        }
        
        if (!model) {
          console.warn(`No strong chat model configured for ${provider}`);
          return;
        }

        // Create prompt with tool metadata
        const prompt = `
          Suggest a valid JSON input object for this tool:
          
          Tool name: ${tool.name || 'Unnamed Tool'}
          Description: ${tool.description || 'No description available'}
          Parameter schema: ${tool.parameterSchema || '{}'}
        `;

        // Call LLM to generate input
        const llmResponse = await llmProviderService.generateToolInputWithLLM({
          prompt,
          provider,
          model,
          baseUrl
        });

        // Try to parse the response as JSON
        try {
          // Extract JSON from the response (in case the LLM includes explanatory text)
          const jsonMatch = llmResponse.match(/```json\n([\s\S]*?)\n```/) ||
                           llmResponse.match(/```\n([\s\S]*?)\n```/) ||
                           llmResponse.match(/({[\s\S]*})/);
          
          const jsonString = jsonMatch ? jsonMatch[1] : llmResponse;
          
          // Validate by parsing
          JSON.parse(jsonString);
          
          // Set the input JSON field
          setInputJson(jsonString);
          setIsValidJson(true);
        } catch (parseError) {
          console.error('LLM returned invalid JSON:', parseError);
          setErrorMessage('Could not generate input from LLM. Please enter parameters manually.');
          
          // Fallback to empty parameter structure based on schema
          try {
            const emptyParams = tool.parameterSchema ?
              JSON.stringify(JSON.parse(tool.parameterSchema), null, 2) :
              '{}';
            setInputJson(emptyParams);
          } catch {
            setInputJson('{}');
          }
        }
      } catch (error) {
        console.error('Error generating input with LLM:', error);
        setErrorMessage('Could not generate input from LLM. Please enter parameters manually.');
      }
    };

    generateInputWithLLM();
  }, [tool, llmPreferences.defaultProvider, llmPreferences.defaultStrongModel]);

  const validateJson = (jsonString) => {
    try {
      JSON.parse(jsonString);
      setIsValidJson(true);
      return true;
    } catch {
      setIsValidJson(false);
      return false;
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputJson(value);
    validateJson(value);
  };

  const handleExecute = async () => {
    if (!validateJson(inputJson) || !isToolValid) return;
    
    const input = JSON.parse(inputJson);
    dispatch(clearExecutionResult());
    await dispatch(executeToolCode({ id: tool.id, input }));
  };

  // Prepare content based on tool validity
  const content = !isToolValid ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="error">
          Tool data is not available or invalid
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Please select a valid tool to use the playground
        </Typography>
      </Paper>
    </Box>
  ) : (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Tool Code
        </Typography>
        <SyntaxHighlighter
          language="python"
          style={materialDark}
          customStyle={{ maxHeight: '200px', overflow: 'auto' }}
        >
          {tool.code || '# No code available'}
        </SyntaxHighlighter>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Input JSON
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={inputJson}
          onChange={handleInputChange}
          error={!isValidJson}
          helperText={!isValidJson && "Invalid JSON format"}
          sx={{ fontFamily: 'monospace' }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleExecute}
            disabled={isExecuting || !isValidJson}
            startIcon={isExecuting ? <CircularProgress size={20} /> : null}
          >
            {isExecuting ? 'Running...' : 'Run Test'}
          </Button>
        </Box>
      </Paper>

      {(executionResult || executionError) && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Result
          </Typography>
          
          {executionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {executionError}
            </Alert>
          )}
          
          {executionResult && (
            <>
              {executionResult.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {executionResult.error}
                </Alert>
              )}
              
              {executionResult.output && (
                <Box>
                  <Typography variant="caption" display="block" gutterBottom>
                    Output:
                  </Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'background.default',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}
                  >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {executionResult.output}
                    </pre>
                  </Paper>
                </Box>
              )}
            </>
          )}
        </Paper>
      )}
    </Box>
  );

  // Render final component with error snackbar
  return (
    <>
      {/* Error Snackbar */}
      {errorMessage && (
        <Snackbar
          open={Boolean(errorMessage)}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          TransitionComponent={Slide}
          TransitionProps={{ direction: "left" }}
        >
          <Alert onClose={handleCloseSnackbar} severity="error">
            {errorMessage}
          </Alert>
        </Snackbar>
      )}

      {/* Main Content */}
      {content}
    </>
  );
};

ToolPlayground.propTypes = {
  tool: PropTypes.shape({
    id: PropTypes.string,
    code: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    parameterSchema: PropTypes.string
  })
};

ToolPlayground.defaultProps = {
  tool: null
};

export default ToolPlayground;