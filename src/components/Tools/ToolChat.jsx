import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveTool } from '../../redux/slices/toolsSlice';
import { createLog, LogType } from '../../redux/slices/appSlice';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Send as SendIcon
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ToolChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Add a thinking message
      const thinkingMessage = { role: 'assistant', content: 'Thinking...', isLoading: true };
      setMessages(prev => [...prev, thinkingMessage]);

      // Make API call to OpenAI or other LLM service
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a helpful assistant that generates Python code with @tool() decorators. When asked to create a tool, respond with valid Python code that includes a function with a @tool() decorator, proper docstrings, and implementation.' },
            ...messages.filter(m => !m.isLoading),
            userMessage
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      
      // Remove the thinking message
      setMessages(prev => prev.filter(m => !m.isLoading));

      // Extract Python code if it exists
      const pythonCodeMatch = data.content.match(/```python([\s\S]*?)```/);
      let extractedCode = null;
      
      if (pythonCodeMatch && pythonCodeMatch[1]) {
        extractedCode = pythonCodeMatch[1].trim();
      }

      // Add the assistant's response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.content,
        code: extractedCode
      }]);

    } catch (error) {
      console.error('Error in chat:', error);
      
      // Remove the thinking message
      setMessages(prev => prev.filter(m => !m.isLoading));
      
      // Add error message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}. Please try again.`
      }]);
      
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCode = async (code) => {
    if (!code || !user) return;
    
    try {
      // Extract name and description from the code
      const nameMatch = code.match(/@tool\(\)\s*\ndef\s+([a-zA-Z0-9_]+)/);
      const docstringMatch = code.match(/"""([\s\S]*?)"""/);
      
      const name = nameMatch ? nameMatch[1].replace(/_/g, ' ') : 'Unnamed Tool';
      const description = docstringMatch ? docstringMatch[1].trim().split('\n')[0] : 'No description';
      
      const toolData = {
        name,
        description,
        code,
        user_id: user.id,
        user_name: user.email || user.username || 'Unknown',
        created_at: new Date().toISOString()
      };
      
      await dispatch(saveTool(toolData));
      dispatch(createLog('Tool saved successfully', LogType.INFO));
      
      // Add system message
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: 'Tool saved successfully!'
      }]);
      
    } catch (error) {
      console.error('Error saving tool:', error);
      setError(error.message || 'Failed to save tool');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
        {messages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: 'text.secondary'
          }}>
            <Typography variant="h6" gutterBottom>
              Tool Creation Assistant
            </Typography>
            <Typography variant="body2">
              Describe the tool you want to create. For example:
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 1 }}>
              &ldquo;Create a tool to summarize text that takes a long text input and returns a concise summary.&rdquo;
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => (
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
                  backgroundColor: message.role === 'user' 
                    ? 'primary.main' 
                    : message.role === 'system'
                      ? 'success.light'
                      : 'background.paper',
                  color: message.role === 'user' || message.role === 'system'
                    ? 'primary.contrastText' 
                    : 'text.primary'
                }}
              >
                {message.isLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    <Typography>{message.content}</Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content.replace(/```python[\s\S]*?```/g, '')}
                    </Typography>
                    
                    {message.code && (
                      <Box sx={{ mt: 2 }}>
                        <SyntaxHighlighter language="python" style={materialDark}>
                          {message.code}
                        </SyntaxHighlighter>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleSaveCode(message.code)}
                          >
                            Save Tool
                          </IconButton>
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Paper>
            </Box>
          ))
        )}
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
          placeholder="Describe the tool you want to create..."
          disabled={isLoading}
        />
        <IconButton 
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          color="primary"
        >
          <SendIcon />
        </IconButton>
      </Box>

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
    </Box>
  );
};

export default ToolChat;