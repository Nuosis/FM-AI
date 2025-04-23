import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { saveTool } from '../../redux/slices/toolsSlice';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Alert
} from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Component for testing tool creation
 * Creates a tool record in the functions table in Supabase
 * Only renders when VITE_TOOL_TESTING is true
 */
const ToolTesting = ({ onSuccess, onError }) => {
  // Check if Tool testing is enabled in environment variables
  const isToolTestingEnabled = import.meta.env.VITE_TOOL_TEST === 'true';
  
  // Component state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  
  // Generate default code template
  const generateDefaultCode = () => {
    if (!name.trim() || !description.trim()) return;

    const functionName = name.toLowerCase().replace(/\s+/g, '_');
    const defaultCode = `from typing import Any

@tool()
def ${functionName}(input_text: Any) -> Any:
    """${description}
    
    Parameters:
        input_text: The input to process
        
    Returns:
        The processed result
    """
    # Your implementation here
    return input_text
`;

    setCode(defaultCode);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !code.trim()) return;

    setIsLoading(true);
    setSuccess(false);

    try {
      const toolData = {
        name,
        description,
        code,
        created_by: user.user_id, // Required field according to data model
        user_id: user.user_id  // is optional required 
      };

      console.log("Tool data being saved:", toolData);

      await dispatch(saveTool(toolData)).unwrap();
      setSuccess(true);
      
      // Clear form after successful creation
      setName('');
      setDescription('');
      setCode('');
      
      // Call parent success handler if provided
      if (onSuccess) {
        onSuccess('Tool created successfully');
      }
    } catch (error) {
      console.error('Error creating tool:', error);
      
      // Call parent error handler if provided
      if (onError) {
        onError(error.message || 'Failed to create tool');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      {!isToolTestingEnabled ? (
        <Alert severity="info">
          Tool Testing is disabled. Set VITE_TOOL_TESTING=true in your .env file to enable it.
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" paragraph>
            Test creating tools directly in the functions table. This is a simplified version of the ToolCreator.
          </Typography>
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Tool Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={isLoading}
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="outlined"
                onClick={generateDefaultCode}
                disabled={!name.trim() || !description.trim() || isLoading}
              >
                Generate Template
              </Button>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom>
              Python Code:
            </Typography>
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={10}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isLoading}
                sx={{ 
                  '& .MuiInputBase-root': { 
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }
                }}
                placeholder="Enter Python code with @tool() decorator"
              />
            </Paper>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                {success && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Tool created successfully
                  </Alert>
                )}
              </Box>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading || !name.trim() || !description.trim() || !code.trim()}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
              >
                {isLoading ? 'Creating...' : 'Create Test Tool'}
              </Button>
            </Box>
            
            {code && (
              <Box sx={{ mt: 2 }}>
                <SyntaxHighlighter 
                  language="python" 
                  style={materialDark}
                  customStyle={{ maxHeight: '200px', overflow: 'auto' }}
                >
                  {code}
                </SyntaxHighlighter>
              </Box>
            )}
          </form>
          
          {/* Error messages are handled by the parent component via onError callback */}
        </>
      )}
    </Paper>
  );
};

ToolTesting.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func
};

export default ToolTesting;