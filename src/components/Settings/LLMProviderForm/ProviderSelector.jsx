import { useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

/**
 * Component for selecting an LLM provider
 */
const ProviderSelector = ({
  value,
  onChange,
  disabled
}) => {
  // Memoize handleChange to prevent unnecessary re-renders
  const handleChange = useCallback((event) => {
    onChange(event.target.value);
  }, [onChange]);

  return (
    <FormControl fullWidth>
      <InputLabel>Provider</InputLabel>
      <Select
        value={value}
        onChange={handleChange}
        label="Provider"
        disabled={disabled}
      >
        <MenuItem value="openAI">OpenAI</MenuItem>
        <MenuItem value="anthropic">Anthropic</MenuItem>
        <MenuItem value="gemini">Gemini</MenuItem>
        <MenuItem value="lmStudio">LM Studio</MenuItem>
        <MenuItem value="ollama">Ollama</MenuItem>
      </Select>
    </FormControl>
  );
};

ProviderSelector.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default ProviderSelector;