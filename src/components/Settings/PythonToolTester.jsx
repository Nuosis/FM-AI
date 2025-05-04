import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Divider,
  Alert,
  TextField
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import supabase from '../../utils/supabase';

/**
 * Component for testing the Python code execution functionality of the unified proxy server
 * Allows users to enter Python code, provide input data, and execute it
 */
const PythonToolTester = () => {
  // Component state
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
  
  // Loading and error states
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState(null);
  const [executionSuccess, setExecutionSuccess] = useState(false);
  
  // Handle code execution
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
      
      // Get auth token for the mesh server
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Call the proxy server's execute endpoint
      const response = await fetch('http://localhost:3500/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
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
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <CodeIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Python Code Execution Tester</Typography>
      </Box>
      
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
    </Paper>
  );
};

export default PythonToolTester;