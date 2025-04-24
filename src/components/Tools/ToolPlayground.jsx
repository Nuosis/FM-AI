import { useState, useEffect, useRef, useCallback } from 'react';
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
  Slide,
  Modal,
  Link,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ToolPlayground = ({ tool = null }) => {
  const [inputJson, setInputJson] = useState('{}');
  const [isValidJson, setIsValidJson] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [proxyStatus, setProxyStatus] = useState({
    checking: false,
    connected: false,
    error: null
  });
  const [showDeployModal, setShowDeployModal] = useState(false);
  
  const dispatch = useDispatch();
  const isExecuting = useSelector(selectIsExecuting);
  const executionResult = useSelector(selectExecutionResult);
  const executionError = useSelector(selectExecutionError);
  const llmPreferences = useSelector(selectLlmPreferences);

  // Check if tool is valid
  const isToolValid = tool && typeof tool === 'object' && tool.id;
  
  // Check if the proxy server is running
  const checkProxyServer = useCallback(async () => {
    console.log('[ToolPlayground] Checking proxy server health');
    setProxyStatus(prev => ({ ...prev, checking: true, error: null }));
    
    try {
      // Try to connect to the proxy server health endpoint
      const proxyUrl = 'http://localhost:3500/health';
      console.log('[ToolPlayground] Attempting to connect to proxy health endpoint at', proxyUrl);
      const response = await fetch(proxyUrl, { method: 'GET' });
      
      // Check if response is ok and the text is exactly 'ok'
      if (response.ok) {
        const responseText = await response.text();
        if (responseText === 'ok') {
          console.log('[ToolPlayground] Proxy server health check successful');
          setProxyStatus({
            checking: false,
            connected: true,
            error: null
          });
        } else {
          throw new Error(`Proxy server health check failed: unexpected response "${responseText}"`);
        }
      } else {
        throw new Error(`Proxy server health check failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('[ToolPlayground] Proxy server health check error:', error);
      setProxyStatus({
        checking: false,
        connected: false,
        error: 'Could not connect to the local LLM proxy server health endpoint'
      });
    }
  }, []);
  
  // Check proxy server when component mounts
  useEffect(() => {
    checkProxyServer();
  }, [checkProxyServer]);

  // Handle closing the error snackbar
  const handleCloseSnackbar = () => {
    setErrorMessage(null);
  };

  // Generate input parameters using LLM when tool changes
  const hasRun = useRef(false);
  useEffect(() => {
    if (!isToolValid || hasRun.current) return;
    
    const generateInputWithLLM = async () => {
      hasRun.current = true;
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

        // Extract parameter schema from code if available
        let parameterSchema = '{}';
        if (tool.code) {
          try {
            // Extract function signature parameters
            const functionMatch = tool.code.match(/def\s+\w+\s*\((.*?)\)/);
            const signatureParams = {};
            
            if (functionMatch && functionMatch[1]) {
              const params = functionMatch[1].split(',').map(param => param.trim());
              
              params.forEach(param => {
                if (param && !param.startsWith('*') && param !== 'self') {
                  // Extract parameter name and type hint
                  const parts = param.split(':');
                  const paramName = parts[0].split('=')[0].trim();
                  let paramType = "string";
                  
                  // Try to determine type from type hint
                  if (parts.length > 1) {
                    const typeHint = parts[1].split('=')[0].trim();
                    if (typeHint.includes('int') || typeHint.includes('float') || typeHint.includes('number')) {
                      paramType = "number";
                    } else if (typeHint.includes('bool')) {
                      paramType = "boolean";
                    } else if (typeHint.includes('list') || typeHint.includes('array') || typeHint.includes('List')) {
                      paramType = "array";
                    } else if (typeHint.includes('dict') || typeHint.includes('Dict')) {
                      paramType = "object";
                    }
                  }
                  
                  if (paramName) {
                    signatureParams[paramName] = {
                      type: paramType,
                      description: `Parameter: ${paramName}`
                    };
                  }
                }
              });
            }
            
            // Extract docstring and parse parameter descriptions
            const docstringMatch = tool.code.match(/"""([\s\S]*?)"""/);
            if (docstringMatch && docstringMatch[1]) {
              const docstring = docstringMatch[1];
              
              // Look for Parameters section in docstring
              const paramsSection = docstring.match(/Parameters:([\s\S]*?)(?:Returns:|$)/);
              if (paramsSection && paramsSection[1]) {
                // Extract individual parameter descriptions
                const paramLines = paramsSection[1].trim().split('\n');
                
                paramLines.forEach(line => {
                  const paramMatch = line.match(/\s*([a-zA-Z0-9_]+)\s*:\s*(.*)/);
                  if (paramMatch) {
                    const paramName = paramMatch[1].trim();
                    const paramDesc = paramMatch[2].trim();
                    
                    // Update existing parameter or add new one
                    if (signatureParams[paramName]) {
                      signatureParams[paramName].description = paramDesc;
                    } else {
                      signatureParams[paramName] = {
                        type: "string",
                        description: paramDesc
                      };
                    }
                  }
                });
              }
            }
            
            // Create OpenAPI-compliant schema
            const schemaObj = {
              type: "object",
              properties: signatureParams,
              required: Object.keys(signatureParams)
            };
            
            parameterSchema = Object.keys(signatureParams).length > 0 ?
              JSON.stringify(schemaObj, null, 2) : '{}';
          } catch (error) {
            console.error('Error parsing parameter schema:', error);
            parameterSchema = '{}';
          }
        }
        
        // Create prompt with tool metadata
        const prompt = `
          Suggest a valid JSON input object for this tool:
          
          Tool name: ${tool.name || 'Unnamed Tool'}
          Description: ${tool.description || 'No description available'}
          Parameter schema: ${parameterSchema}
        `;

        console.log('Generated prompt:', prompt);

        // Call LLM to generate input
        const llmResponse = await llmProviderService.generateToolInputWithLLM({
          prompt,
          provider,
          model,
          baseUrl
        });

        console.log('LLM response:', llmResponse);

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
  }, []);

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
    
    // Check if proxy server is running
    if (!proxyStatus.connected) {
      setShowDeployModal(true);
      return;
    }
    
    console.log('Executing tool with ID:', tool.id);
    console.log('Tool object:', tool);
    
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="subtitle1">
              Tool Code
            </Typography>
            {proxyStatus.checking ? (
              <CircularProgress size={16} sx={{ ml: 1 }} />
            ) : proxyStatus.connected ? (
              <Tooltip title="Proxy server is running">
                <CheckCircleIcon color="success" sx={{ ml: 1, fontSize: 16 }} />
              </Tooltip>
            ) : (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<ErrorIcon />}
                onClick={() => setShowDeployModal(true)}
                sx={{ ml: 2 }}
              >
                Deploy server to run tools
              </Button>
            )}
          </Box>
        </Box>
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
      
      {/* Deploy Server Modal */}
      <Modal
        open={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        aria-labelledby="deploy-server-modal-title"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 1,
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <Typography id="deploy-server-modal-title" variant="h6" component="h2" gutterBottom>
            Deploy Local Proxy Server
          </Typography>
          
          <Typography variant="body1" paragraph>
            The local proxy server is required to run Python tools. Follow these steps to deploy it:
          </Typography>
          
          <Typography variant="subtitle2" gutterBottom>
            1. Download the proxy script:
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Link
              href="/scripts/local-llm-proxy.py"
              download="local-llm-proxy.py"
            >
              Download proxy script
            </Link>
          </Box>
          
          <Typography variant="subtitle2" gutterBottom>
            2. Run the script:
          </Typography>
          
          <Typography variant="body2" gutterBottom>
            MacOS/Linux:
          </Typography>
          <Paper variant="outlined" sx={{ p: 1, mb: 2, bgcolor: 'background.default' }}>
            <code>cd ~/Downloads && python3 -m venv venv && source venv/bin/activate && python local-llm-proxy.py</code>
          </Paper>
          
          <Typography variant="body2" gutterBottom>
            Windows Command Prompt:
          </Typography>
          <Paper variant="outlined" sx={{ p: 1, mb: 3, bgcolor: 'background.default' }}>
            <code>cd %USERPROFILE%\Downloads && python -m venv venv && venv\Scripts\activate && python local-llm-proxy.py</code>
          </Paper>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={() => setShowDeployModal(false)}
            >
              Close
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                checkProxyServer();
                if (proxyStatus.connected) {
                  setShowDeployModal(false);
                }
              }}
              startIcon={proxyStatus.checking ? <CircularProgress size={20} /> : null}
            >
              {proxyStatus.checking ? 'Checking...' : 'Check Connection'}
            </Button>
          </Box>
        </Box>
      </Modal>
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

export default ToolPlayground;