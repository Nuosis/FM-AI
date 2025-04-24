import { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Typography,
  Link,
  Alert,
  Switch,
  FormControlLabel
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
  storageType,
  provider,
  baseUrl,
  onBaseUrlChange
}) => {
  // Check if the provider is Ollama or LM Studio
  const isOllama = provider?.toLowerCase() === 'ollama';
  const isLMStudio = provider?.toLowerCase() === 'lmstudio';
  const isLocalProvider = isOllama || isLMStudio;
  
  // Local state for API Key input field (for onBlur commit)
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  
  // State for proxy server connection check
  const [proxyStatus, setProxyStatus] = useState({
    checking: false,
    connected: false,
    error: null
  });
  
  // Local state for base URL input field
  const [baseUrlInput, setBaseUrlInput] = useState(baseUrl);
  
  // State for showing/hiding base URL input
  const [showBaseUrl, setShowBaseUrl] = useState(false);

  // Check if the proxy server is running
  const checkProxyServer = useCallback(async () => {
    if (!isLocalProvider) return;
    
    console.log('[ApiKeyVerifier] Checking proxy server for', provider);
    setProxyStatus(prev => ({ ...prev, checking: true, error: null }));
    
    try {
      // Try to connect to the proxy server health endpoint
      const proxyUrl = 'http://localhost:3500/health';
      console.log('[ApiKeyVerifier] Attempting to connect to proxy health endpoint at', proxyUrl);
      const response = await fetch(proxyUrl, { method: 'GET' });
      
      // Check if response is ok and the text is exactly 'ok'
      if (response.ok) {
        const responseText = await response.text();
        if (responseText === 'ok') {
          console.log('[ApiKeyVerifier] Proxy server health check successful');
          setProxyStatus({
            checking: false,
            connected: true,
            error: null
          });
        } else {
          throw new Error(`Proxy server health check failed: unexpected response "${responseText}"`);
        }
      } else {
        throw new Error(`Proxy server health check failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('[ApiKeyVerifier] Proxy server connection error:', error);
      setProxyStatus({
        checking: false,
        connected: false,
        error: 'Could not connect to the local LLM proxy server health endpoint'
      });
    }
  }, [isLocalProvider, provider]);
  
  // Check proxy server when provider changes to a local provider
  useEffect(() => {
    if (isLocalProvider) {
      checkProxyServer();
    }
  }, [isLocalProvider, checkProxyServer]);
  
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
  
  // Handle base URL change
  const handleBaseUrlChange = useCallback((e) => {
    setBaseUrlInput(e.target.value);
  }, []);
  
  // Handle base URL blur event
  const handleBaseUrlBlur = useCallback(() => {
    // Only update if value changed
    if (baseUrlInput !== baseUrl) {
      onBaseUrlChange(baseUrlInput);
    }
  }, [baseUrlInput, baseUrl, onBaseUrlChange]);
  
  // Handle toggle for showing/hiding base URL input
  const handleToggleBaseUrl = useCallback((event) => {
    setShowBaseUrl(event.target.checked);
  }, []);

  // Handle verify button click
  const handleVerify = useCallback(() => {
    console.log('[ApiKeyVerifier] Verifying connection for', provider, 'with key:', apiKeyInput ? 'API key provided' : 'No API key');
    onVerify(apiKeyInput);
  }, [apiKeyInput, onVerify, provider]);

  // Handle delete key button click
  const handleDeleteKey = useCallback(() => {
    if (onDeleteKey) {
      onDeleteKey();
    }
  }, [onDeleteKey]);

  return (
    <>
      {/* Show proxy server status for local providers */}
      {isLocalProvider && (
        <Box sx={{ mb: 2 }}>
          {proxyStatus.checking ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography>Checking proxy server connection...</Typography>
            </Box>
          ) : proxyStatus.connected ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Connected to local LLM proxy server
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Could not connect to the local LLM proxy server. This is required for {provider} integration.
              </Typography>
              <Typography variant="body2">
                Please download and run the proxy script:
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link
                  href="/scripts/local-llm-proxy.py"
                  download="local-llm-proxy.py"
                >
                  Download proxy script
                </Link>
                <Typography variant="body2">
                  Run it on MacOs/Linux: <code>python3 -m venv venv && source venv/bin/activate && python ~/Downloads/local-llm-proxy.py</code>
                </Typography>
                <Typography variant="body2">
                  Run it on Windows Command Prompt: <code>cd %USERPROFILE%\Downloads && python -m venv venv && venv\Scripts\activate && python local-llm-proxy.py</code>
                </Typography>
                <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                  This proxy server supports both LLM proxying and Python code execution.
                </Typography>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={checkProxyServer}
                >
                  Check Again
                </Button>
              </Box>
            </Alert>
          )}
        </Box>
      )}
      
      {!isVerified ? (
        // Show API key input and verify button when not verified
        <>
          {isOllama ? (
            // For Ollama, show a message that no API key is required
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" color="info.main" sx={{ mb: 2 }}>
                Ollama doesn&apos;t require an API key. Click &quot;Connect to Ollama&quot; to verify your local Ollama installation.
              </Typography>
              
              {/* Box for Ollama connection button with toggle */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => {
                    console.log('[ApiKeyVerifier] Connecting to Ollama with empty API key');
                    onVerify('');
                  }}
                  disabled={disabled || isVerifying || !proxyStatus.connected}
                  startIcon={isVerifying ? <CircularProgress size={20} /> : null}
                >
                  {isVerifying ? 'Connecting...' : 'Connect to Ollama'}
                </Button>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={showBaseUrl}
                      onChange={handleToggleBaseUrl}
                      size="small"
                    />
                  }
                  label="Show Base URL"
                  labelPlacement="start"
                  sx={{ ml: 2 }}
                />
              </Box>
              
              {/* Base URL input for Ollama - only shown when toggle is on */}
              {showBaseUrl && (
                <TextField
                  label="Base URL"
                  value={baseUrlInput}
                  onChange={handleBaseUrlChange}
                  onBlur={handleBaseUrlBlur}
                  fullWidth
                  placeholder="http://127.0.0.1:11434"
                  disabled={disabled || isVerifying}
                  helperText="Custom URL for your Ollama instance (default: http://127.0.0.1:11434)"
                  sx={{ mt: 1, mb: 1 }}
                />
              )}
              
            </Box>
          ) : isLMStudio ? (
            // For LM Studio, show a message that API key might be required
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" color="info.main" sx={{ mb: 2 }}>
                LM Studio may require an API key depending on your configuration. Enter it below if needed.
              </Typography>
              
              <TextField
                label="API Key (Optional for LM Studio)"
                value={apiKeyInput}
                onChange={handleChange}
                onBlur={handleBlur}
                fullWidth
                type="password"
                placeholder="Enter API key if required"
                disabled={disabled || isVerifying || !proxyStatus.connected}
                sx={{ mb: 1 }}
              />
              
              {/* Base URL input for LM Studio - only shown when toggle is on */}
              {showBaseUrl && (
                <TextField
                  label="Base URL"
                  value={baseUrlInput}
                  onChange={handleBaseUrlChange}
                  onBlur={handleBaseUrlBlur}
                  fullWidth
                  placeholder="http://127.0.0.1:1234"
                  disabled={disabled || isVerifying}
                  helperText="Custom URL for your LM Studio instance (default: http://127.0.0.1:1234)"
                  sx={{ mb: 1 }}
                />
              )}
              
              {/* Button and toggle on the same line */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleVerify}
                  disabled={disabled || isVerifying || !proxyStatus.connected}
                  startIcon={isVerifying ? <CircularProgress size={20} /> : null}
                >
                  {isVerifying ? 'Connecting...' : 'Connect to LM Studio'}
                </Button>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={showBaseUrl}
                      onChange={handleToggleBaseUrl}
                      size="small"
                    />
                  }
                  label="Show Base URL"
                  labelPlacement="start"
                  sx={{ ml: 2 }}
                />
              </Box>
            </Box>
          ) : (
            // For other providers, show the API key input
            <Box>
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
                sx={{ mb: 1 }}
              />
              
              {/* Base URL input - only shown when toggle is on */}
              {showBaseUrl && (
                <TextField
                  label="Base URL"
                  value={baseUrlInput}
                  onChange={handleBaseUrlChange}
                  onBlur={handleBaseUrlBlur}
                  fullWidth
                  placeholder="https://api.openai.com"
                  disabled={disabled || isVerifying}
                  helperText="Custom URL for your provider (if needed)"
                  sx={{ mb: 1 }}
                />
              )}
              
              {/* Button and toggle on the same line */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
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
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={showBaseUrl}
                      onChange={handleToggleBaseUrl}
                      size="small"
                    />
                  }
                  label="Show Base URL"
                  labelPlacement="start"
                  sx={{ ml: 2 }}
                />
              </Box>
            </Box>
          )}
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
  storageType: PropTypes.string.isRequired,
  provider: PropTypes.string,
  baseUrl: PropTypes.string,
  onBaseUrlChange: PropTypes.func
};

export default ApiKeyVerifier;