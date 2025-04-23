import { useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';

import ProviderSelector from './ProviderSelector';
import ApiKeyVerifier from './ApiKeyVerifier';
import ChatModelSelector from './ChatModelSelector';
import EmbeddingModelSelector from './EmbeddingModelSelector';

/**
 * Form component for adding/editing LLM provider configurations
 */
const LLMProviderForm = ({
  formData,
  onFormDataChange,
  selectedConfig,
  onReset,
  onSave,
  isLoading,
  isApiKeyVerified,
  isVerifyingApiKey,
  apiKeyError,
  onVerifyApiKey,
  onDeleteApiKey,
  availableModels,
  apiKeyStorage,
  onFetchModels
}) => {
  // Handle provider change
  const handleProviderChange = useCallback((provider) => {
    onFormDataChange({
      ...formData,
      provider,
      // Reset model when provider changes
      models: {
        ...formData.models,
        chat: {
          ...formData.models.chat,
          strong: '',
          weak: ''
        },
        embedding: {
          ...formData.models.embedding,
          large: '',
          small: ''
        }
      }
    });
  }, [formData, onFormDataChange]);

  // Handle API key change
  const handleApiKeyChange = useCallback((apiKey) => {
    onFormDataChange({
      ...formData,
      apiKey
    });
  }, [formData, onFormDataChange]);
  
  // Handle base URL change
  const handleBaseUrlChange = useCallback((baseUrl) => {
    onFormDataChange({
      ...formData,
      baseUrl
    });
  }, [formData, onFormDataChange]);
  

  // Handle model type change
  const handleModelTypeChange = useCallback((event, newModelType) => {
    onFormDataChange({
      ...formData,
      modelType: newModelType
    });
  }, [formData, onFormDataChange]);

  // Handle embedding model size change
  const handleEmbeddingModelSizeChange = useCallback((size) => {
    onFormDataChange({
      ...formData,
      embeddingModelSize: size
    });
  }, [formData, onFormDataChange]);

  // Handle chat model change
  const handleChatModelChange = useCallback((type, model) => {
    onFormDataChange({
      ...formData,
      models: {
        ...formData.models,
        chat: {
          ...formData.models.chat,
          [type]: model
        }
      }
    });
  }, [formData, onFormDataChange]);

  // Handle embedding model change
  const handleEmbeddingModelChange = useCallback((type, model) => {
    onFormDataChange({
      ...formData,
      models: {
        ...formData.models,
        embedding: {
          ...formData.models.embedding,
          [type]: model
        }
      }
    });
  }, [formData, onFormDataChange]);

  // Check if the provider is Ollama (which doesn't require an API key)
  const isOllama = formData.provider?.toLowerCase() === 'ollama';

  // Determine if save button should be disabled
  const isSaveDisabled =
    isLoading ||
    !formData.provider ||
    (!isOllama && !isApiKeyVerified) || // Skip API key verification for Ollama
    (isApiKeyVerified && formData.modelType === 'chat' && !formData.models.chat.strong) ||
    (isApiKeyVerified && formData.modelType === 'embedding' && !formData.models.embedding.large);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        {selectedConfig ? 'Edit Provider Configuration' : 'Add Provider Configuration'}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Provider selection */}
        <ProviderSelector
          value={formData.provider}
          onChange={handleProviderChange}
          disabled={isLoading}
        />
        
        {/* API Key input and verification */}
        <ApiKeyVerifier
          apiKey={formData.apiKey}
          onChange={handleApiKeyChange}
          onVerify={onVerifyApiKey}
          onDeleteKey={onDeleteApiKey}
          isVerified={isApiKeyVerified}
          isVerifying={isVerifyingApiKey}
          error={apiKeyError}
          disabled={isLoading}
          storageType={apiKeyStorage}
          provider={formData.provider}
          baseUrl={formData.baseUrl}
          onBaseUrlChange={handleBaseUrlChange}
        />
        
        {/* Reveal model selection and baseUrl only if API key is verified */}
        {isApiKeyVerified && (
          <>
            {/* Model type tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
              <Tabs
                value={formData.modelType}
                onChange={handleModelTypeChange}
                aria-label="Model type tabs"
                sx={{
                  '& .MuiTab-root': {
                    '&:focus': {
                      outline: 'none'
                    }
                  }
                }}
              >
                <Tab label="Chat Models" value="chat" />
                <Tab label="Embedding Models" value="embedding" />
              </Tabs>
            </Box>
            
            {/* Chat models tab content */}
            {formData.modelType === 'chat' && (
              <ChatModelSelector
                models={formData.models.chat}
                availableModels={availableModels}
                onModelChange={handleChatModelChange}
                disabled={isLoading}
                provider={formData.provider}
                onFetchModels={onFetchModels}
              />
            )}
            
            {/* Embedding models tab content */}
            {formData.modelType === 'embedding' && (
              <EmbeddingModelSelector
                models={formData.models.embedding}
                availableModels={availableModels}
                embeddingModelSize={formData.embeddingModelSize}
                onModelChange={handleEmbeddingModelChange}
                onSizeChange={handleEmbeddingModelSizeChange}
                disabled={isLoading}
                provider={formData.provider}
                onFetchModels={onFetchModels}
              />
            )}
            
          </>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          {selectedConfig && (
            <Button
              variant="outlined"
              onClick={onReset}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          
          <Button
            variant="contained"
            color="primary"
            onClick={onSave}
            disabled={isSaveDisabled}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
            sx={{ ml: 'auto' }}
          >
            Save Provider Config
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

LLMProviderForm.propTypes = {
  formData: PropTypes.shape({
    provider: PropTypes.string.isRequired,
    models: PropTypes.shape({
      chat: PropTypes.shape({
        strong: PropTypes.string.isRequired,
        weak: PropTypes.string.isRequired
      }).isRequired,
      embedding: PropTypes.shape({
        large: PropTypes.string.isRequired,
        small: PropTypes.string.isRequired
      }).isRequired
    }).isRequired,
    apiKey: PropTypes.string.isRequired,
    baseUrl: PropTypes.string.isRequired,
    modelType: PropTypes.string.isRequired,
    chatModelStrength: PropTypes.string.isRequired,
    embeddingModelSize: PropTypes.string.isRequired
  }).isRequired,
  onFormDataChange: PropTypes.func.isRequired,
  selectedConfig: PropTypes.object,
  onReset: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  isApiKeyVerified: PropTypes.bool.isRequired,
  isVerifyingApiKey: PropTypes.bool.isRequired,
  apiKeyError: PropTypes.string,
  onVerifyApiKey: PropTypes.func.isRequired,
  onDeleteApiKey: PropTypes.func,
  availableModels: PropTypes.array.isRequired,
  apiKeyStorage: PropTypes.string.isRequired,
  onFetchModels: PropTypes.func
};

export default LLMProviderForm;