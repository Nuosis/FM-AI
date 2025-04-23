import { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';

/**
 * Component for selecting embedding models
 */
const EmbeddingModelSelector = ({
  models,
  availableModels,
  onModelChange,
  disabled,
  provider,
  onFetchModels
  // embeddingModelSize and onSizeChange are received as props but not used in this component
}) => {
  // Fetch models when component mounts if API key is verified
  useEffect(() => {
    if (onFetchModels && provider) {
      onFetchModels();
    }
  }, [onFetchModels, provider]);

  // Memoize handlers to prevent unnecessary re-renders

  const handleLargeModelChange = useCallback((event) => {
    onModelChange('large', event.target.value);
  }, [onModelChange]);

  const handleSmallModelChange = useCallback((event) => {
    onModelChange('small', event.target.value);
  }, [onModelChange]);

  return (
    <Box sx={{ mt: 2 }}>
      {/* Embedding Model Large */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Large Embedding Model</InputLabel>
        <Select
          value={models.large}
          onChange={handleLargeModelChange}
          disabled={disabled}
        >
          {availableModels.length > 0 ? (
            availableModels.filter(Boolean).map(model => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))
          ) : (
            <MenuItem value="" disabled>
              No models available
            </MenuItem>
          )}
        </Select>
        <FormHelperText>
          Higher quality, more expensive embedding model
        </FormHelperText>
      </FormControl>
      
      <FormControl fullWidth>
        <InputLabel>Small Embedding Model</InputLabel>
        <Select
          value={models.small}
          onChange={handleSmallModelChange}
          disabled={disabled}
        >
          <MenuItem value="">None (Optional)</MenuItem>
          {availableModels.length > 0 ? (
            availableModels.filter(Boolean).map(model => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))
          ) : (
            <MenuItem value="" disabled>
              No models available
            </MenuItem>
          )}
        </Select>
        <FormHelperText>
          Lower quality, cheaper embedding model (optional)
        </FormHelperText>
      </FormControl>
    </Box>
  );
};

EmbeddingModelSelector.propTypes = {
  models: PropTypes.shape({
    large: PropTypes.string.isRequired,
    small: PropTypes.string.isRequired
  }).isRequired,
  availableModels: PropTypes.array.isRequired,
  embeddingModelSize: PropTypes.string,
  onModelChange: PropTypes.func.isRequired,
  onSizeChange: PropTypes.func,
  disabled: PropTypes.bool,
  provider: PropTypes.string,
  onFetchModels: PropTypes.func
};

export default EmbeddingModelSelector;