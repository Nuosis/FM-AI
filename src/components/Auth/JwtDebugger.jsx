import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import supabase from '../../utils/supabase';

/**
 * JwtDebugger component for inspecting the JWT token and its claims
 * This is a development tool to help debug JWT-related issues
 */
const JwtDebugger = () => {
  const [jwtData, setJwtData] = useState(null);
  const [error, setError] = useState(null);

  const decodeJwt = async () => {
    try {
      setError(null);
      
      // Get the current session
      const { data } = await supabase.auth.getSession();
      
      if (!data || !data.session || !data.session.access_token) {
        setError('No active session found. Please log in first.');
        return;
      }
      
      // Decode the JWT token (it's base64 encoded)
      const token = data.session.access_token;
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        setError('Invalid JWT token format');
        return;
      }
      
      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1]));
      
      setJwtData({
        header: JSON.parse(atob(parts[0])),
        payload,
        // Don't decode signature
        signature: parts[2].substring(0, 10) + '...',
        // Extract key information
        summary: {
          sub: payload.sub,
          role: payload.user_metadata?.role || 'No role found in user_metadata',
          email: payload.email,
          exp: new Date(payload.exp * 1000).toLocaleString(),
          iat: new Date(payload.iat * 1000).toLocaleString()
        }
      });
    } catch (err) {
      console.error('Error decoding JWT:', err);
      setError(`Error decoding JWT: ${err.message}`);
    }
  };

  useEffect(() => {
    // Automatically decode JWT on component mount
    decodeJwt();
  }, []);

  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        JWT Debugger
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={decodeJwt}
        sx={{ mb: 2 }}
      >
        Refresh JWT Data
      </Button>
      
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      {jwtData && (
        <>
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              JWT Summary
            </Typography>
            <Box component="pre" sx={{ 
              bgcolor: 'background.paper', 
              p: 2, 
              borderRadius: 1,
              overflow: 'auto'
            }}>
              {Object.entries(jwtData.summary).map(([key, value]) => (
                <Box key={key} sx={{ mb: 1 }}>
                  <strong>{key}:</strong> {value}
                </Box>
              ))}
            </Box>
          </Paper>
          
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Full JWT Payload
            </Typography>
            <Box component="pre" sx={{ 
              bgcolor: 'background.paper', 
              p: 2, 
              borderRadius: 1,
              overflow: 'auto'
            }}>
              {JSON.stringify(jwtData.payload, null, 2)}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default JwtDebugger;