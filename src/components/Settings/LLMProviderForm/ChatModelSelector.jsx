import { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';

/**
 * Component for selecting chat models
 */
const ChatModelSelector = ({
  models,
  availableModels,
  onModelChange,
  disabled,
  provider,
  onFetchModels
}) => {
  // Fetch models when component mounts if API key is verified
  useEffect(() => {
    if (onFetchModels && provider) {
      onFetchModels();
    }
  }, [onFetchModels, provider]);

  // Memoize handlers to prevent unnecessary re-renders

  const handleStrongModelChange = useCallback((event) => {
    onModelChange('strong', event.target.value);
  }, [onModelChange]);

  const handleWeakModelChange = useCallback((event) => {
    onModelChange('weak', event.target.value);
  }, [onModelChange]);

  return (
    <Box sx={{ mt: 2 }}>
      {/* Strong Chat Model */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Strong Chat Model</InputLabel>
        <Select
          value={models.strong}
          onChange={handleStrongModelChange}
          label="Strong Chat Model"
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
          Higher quality, slower model for complex tasks
        </FormHelperText>
      </FormControl>
      
      {/* Weak Chat Model */}
      <FormControl fullWidth>
        <InputLabel>Weak Chat Model</InputLabel>
        <Select
          value={models.weak}
          onChange={handleWeakModelChange}
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
          Lower quality, faster model for simple tasks (optional)
        </FormHelperText>
      </FormControl>
    </Box>
  );
};

ChatModelSelector.propTypes = {
  models: PropTypes.shape({
    strong: PropTypes.string.isRequired,
    weak: PropTypes.string.isRequired
  }).isRequired,
  availableModels: PropTypes.array.isRequired,
  onModelChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  provider: PropTypes.string,
  onFetchModels: PropTypes.func
};

export default ChatModelSelector;