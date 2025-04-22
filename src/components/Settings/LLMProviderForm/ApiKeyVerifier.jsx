import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Typography
} from '@mui/material';

/**
 * Component for API key input and verification
 */
const ApiKeyVerifier = ({
  apiKey,
  onChange,
  onVerify,
  onDeleteKey,
  isVerified,
  isVerifying,
  error,
  disabled,
  storageType
}) => {
  // Local state for API Key input field (for onBlur commit)
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);

  // Handle input change
  const handleChange = useCallback((e) => {
    setApiKeyInput(e.target.value);
  }, []);

  // Handle blur event
  const handleBlur = useCallback(() => {
    // Only update if value changed
    if (apiKeyInput !== apiKey) {
      onChange(apiKeyInput);
    }
  }, [apiKeyInput, apiKey, onChange]);

  // Handle verify button click
  const handleVerify = useCallback(() => {
    onVerify(apiKeyInput);
  }, [apiKeyInput, onVerify]);

  // Handle delete key button click
  const handleDeleteKey = useCallback(() => {
    if (onDeleteKey) {
      onDeleteKey();
    }
  }, [onDeleteKey]);

  return (
    <>
      {!isVerified ? (
        // Show API key input and verify button when not verified
        <>
          <TextField
            label="API Key"
            value={apiKeyInput}
            onChange={handleChange}
            onBlur={handleBlur}
            fullWidth
            type="password"
            placeholder="Enter API key"
            disabled={disabled || isVerifying}
            helperText={
              error
                ? error
                : `API key will be stored using ${storageType} storage`
            }
            error={!!error}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleVerify}
              disabled={
                disabled ||
                isVerifying ||
                !apiKeyInput
              }
              startIcon={isVerifying ? <CircularProgress size={20} /> : null}
            >
              {isVerifying ? 'Verifying...' : 'Verify API Key'}
            </Button>
          </Box>
        </>
      ) : (
        // Show success message and delete key button when verified
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="body1" color="success.main">
            API key verified and stored
          </Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={handleDeleteKey}
            disabled={disabled}
          >
            Delete Key
          </Button>
        </Box>
      )}
    </>
  );
};

ApiKeyVerifier.propTypes = {
  apiKey: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onVerify: PropTypes.func.isRequired,
  onDeleteKey: PropTypes.func,
  isVerified: PropTypes.bool.isRequired,
  isVerifying: PropTypes.bool.isRequired,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  storageType: PropTypes.string.isRequired
};

export default ApiKeyVerifier;