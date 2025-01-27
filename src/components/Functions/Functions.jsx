// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import FunctionCreator from './FunctionCreator';
import FunctionList from './FunctionList';

const Functions = () => {
  const [creating, setCreating] = useState(false);

  return (
    <Box sx={{ 
      p: 4,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4
      }}>
        <Typography variant="h4">
          AI Function Generator
        </Typography>
        {!creating && (
          <IconButton
            onClick={() => setCreating(true)}
            color="primary"
            sx={{ 
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': { bgcolor: 'background.paper' }
            }}
          >
            <AddIcon />
          </IconButton>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflow: 'auto' }}>
        {creating ? (
          <FunctionCreator onCancel={() => setCreating(false)} />
        ) : (
          <FunctionList />
        )}
      </Box>
    </Box>
  );
};

export default Functions;
