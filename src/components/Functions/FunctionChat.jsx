// eslint-disable-next-line no-unused-vars
import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Paper } from '@mui/material';

// Placeholder component that replaces the legacy AI module fetching implementation
const FunctionChat = ({ initialPrompt, provider, model, temperature }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="body1" gutterBottom>
          <strong>Prompt:</strong> {initialPrompt.split('\n\n')[0]}
        </Typography>
      </Paper>
      
      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="body1" gutterBottom>
          <strong>Response:</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The AI module fetching feature has been removed.
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Provider: {provider}, Model: {model}, Temperature: {temperature}
        </Typography>
      </Paper>
    </Box>
  );
};

FunctionChat.propTypes = {
  initialPrompt: PropTypes.string.isRequired,
  provider: PropTypes.string.isRequired,
  model: PropTypes.string.isRequired,
  temperature: PropTypes.number.isRequired,
  systemInstructions: PropTypes.string
};

export default FunctionChat;
