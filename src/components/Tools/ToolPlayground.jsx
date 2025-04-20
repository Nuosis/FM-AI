import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  executeToolCode,
  selectIsExecuting,
  selectExecutionResult,
  selectExecutionError,
  clearExecutionResult
} from '../../redux/slices/toolsSlice';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ToolPlayground = ({ tool }) => {
  const [inputJson, setInputJson] = useState('{}');
  const [isValidJson, setIsValidJson] = useState(true);
  const dispatch = useDispatch();
  const isExecuting = useSelector(selectIsExecuting);
  const executionResult = useSelector(selectExecutionResult);
  const executionError = useSelector(selectExecutionError);

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
    if (!validateJson(inputJson)) return;
    
    const input = JSON.parse(inputJson);
    dispatch(clearExecutionResult());
    await dispatch(executeToolCode({ id: tool.id, input }));
  };

  return (
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
};

ToolPlayground.propTypes = {
  tool: PropTypes.shape({
    id: PropTypes.string.isRequired,
    code: PropTypes.string
  }).isRequired
};

export default ToolPlayground;