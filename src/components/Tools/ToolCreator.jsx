import { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { saveTool } from '../../redux/slices/toolsSlice';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ToolCreator = ({ onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !code.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const toolData = {
        name,
        description,
        code,
        created_by: user.id, // Required field according to data model
        // user_id is optional and user_name doesn't exist in the schema
        // created_at and updated_at have default values in the database
      };

      await dispatch(saveTool(toolData)).unwrap();
      onCancel(); // Close the form after successful creation
    } catch (error) {
      console.error('Error creating tool:', error);
      setError(error.message || 'Failed to create tool');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Create New Tool
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
            {code && (
              <Typography variant="caption" color="text.secondary">
                Preview:
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading || !name.trim() || !description.trim() || !code.trim()}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Creating...' : 'Create Tool'}
            </Button>
          </Box>
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

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

ToolCreator.propTypes = {
  onCancel: PropTypes.func.isRequired
};

export default ToolCreator;