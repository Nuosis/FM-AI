import { useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { API_STORAGE_TYPES } from '../../utils/apiKeyStorage';

/**
 * Component for selecting API key storage preference
 */
const ApiKeyStorageSelector = ({ 
  value, 
  onChange, 
  isLoading 
}) => {
  // Memoize handleChange to prevent unnecessary re-renders
  const handleChange = useCallback((event) => {
    onChange(event.target.value);
  }, [onChange]);

  return (
    <FormControl fullWidth sx={{ mb: 3 }}>
      <InputLabel>API Key Storage</InputLabel>
      <Select
        value={value}
        onChange={handleChange}
        label="API Key Storage"
        disabled={isLoading}
      >
        <MenuItem value={API_STORAGE_TYPES.LOCAL}>Local Storage (persists across sessions)</MenuItem>
        <MenuItem value={API_STORAGE_TYPES.SESSION}>Session Storage (cleared when browser is closed)</MenuItem>
        <MenuItem value={API_STORAGE_TYPES.SAVED}>Secure Server Storage (recommended)</MenuItem>
      </Select>
    </FormControl>
  );
};

ApiKeyStorageSelector.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

export default ApiKeyStorageSelector;