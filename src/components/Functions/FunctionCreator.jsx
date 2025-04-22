// eslint-disable-next-line no-unused-vars
import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Typography, Button } from '@mui/material';

// Placeholder component that replaces the legacy AI module fetching implementation
const FunctionCreator = ({ onCancel }) => {
  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Function Creator Disabled
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        The AI module fetching feature has been removed.
      </Typography>
      <Button onClick={onCancel}>
        Close
      </Button>
    </Paper>
  );
};

FunctionCreator.propTypes = {
  onCancel: PropTypes.func.isRequired
};

export default FunctionCreator;
