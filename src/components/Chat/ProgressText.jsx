// eslint-disable-next-line no-unused-vars
import React from 'react';
import PropTypes from 'prop-types';
import { keyframes } from '@mui/system';
import { Box, Typography, useTheme } from '@mui/material';

const shimmer = keyframes`
  0% {
    background-position: 200% center;
  }
  100% {
    background-position: -200% center;
  }
`;

const ProgressText = ({ progress, text }) => {
  const theme = useTheme();
  const gradientColor = theme.palette.secondary.main;

  return (
    <Box sx={{ display: 'inline-block' }}>
      <Typography
        variant="h6"
        sx={{
          background: `linear-gradient(90deg, 
            ${theme.palette.text.primary} 25%, 
            ${gradientColor} 50%, 
            ${theme.palette.text.primary} 75%
          )`,
          backgroundSize: '200% auto',
          color: 'transparent',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          animation: `${shimmer} 3.5s linear infinite`,
          fontWeight: 'medium',
          minWidth: '4em',
          textAlign: 'center'
        }}
      >
        {progress !== undefined ? `${Math.round(progress)}%` : text}
      </Typography>
    </Box>
  );
};

ProgressText.propTypes = {
  progress: PropTypes.number,
  text: PropTypes.string
};

export default ProgressText;
