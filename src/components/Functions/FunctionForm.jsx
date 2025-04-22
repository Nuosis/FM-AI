// eslint-disable-next-line no-unused-vars
import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Typography, Button, Box } from '@mui/material';

// Placeholder component that replaces the legacy AI module fetching implementation
const FunctionForm = ({ function: func, onClose }) => {
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Function Editor Disabled
        </Typography>
        <Button onClick={onClose}>
          Close
        </Button>
      </Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        The AI module fetching feature has been removed.
      </Typography>
      <Typography variant="body2">
        Function: {func.name}
      </Typography>
    </Paper>
  );
};

FunctionForm.propTypes = {
  function: PropTypes.shape({
    name: PropTypes.string.isRequired
  }).isRequired,
  onClose: PropTypes.func.isRequired
};

export default FunctionForm;
