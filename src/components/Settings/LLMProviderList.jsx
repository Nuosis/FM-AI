import { useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * Component for displaying a list of saved LLM provider configurations
 */
const LLMProviderList = ({
  providerConfigs,
  onEdit,
  onDelete,
  isLoading,
  defaultProvider,
  onSetDefault
}) => {
  // Memoize handleEdit to prevent unnecessary re-renders
  const handleEdit = useCallback((config) => {
    onEdit(config);
  }, [onEdit]);

  // Memoize handleDelete to prevent unnecessary re-renders
  const handleDelete = useCallback((configId) => {
    console.log('[LLMProviderList] Delete button clicked for configId:', configId);
    onDelete(configId);
  }, [onDelete]);

  if (providerConfigs.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Saved Provider Configurations
      </Typography>
      <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
        <List dense>
          {providerConfigs.map((config) => {
            const isDefault = config.provider === defaultProvider;
            return (
              <ListItem key={config.id}>
                <ListItemText
                  primary={
                    <>
                      {config.description || `${config.provider}`}
                      {isDefault && (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'success.main',
                            ml: 1
                          }}
                        />
                      )}
                    </>
                  }
                  secondary={`Provider: ${config.provider}`}
                />
                <ListItemSecondaryAction>
                  {!isDefault && (
                    <IconButton
                      edge="end"
                      onClick={() => onSetDefault(config.provider)}
                      disabled={isLoading}
                      title="Set as Default"
                      size="small"
                      color="primary"
                      sx={{ mr: 1 }}
                    >
                      <span style={{ fontSize: '0.75rem' }}>Set To Default</span>
                    </IconButton>
                  )}
                  <IconButton
                    edge="end"
                    onClick={() => handleEdit(config)}
                    disabled={isLoading}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => {
                      console.log('[LLMProviderList] Delete IconButton clicked for config:', config);
                      handleDelete(config.id);
                    }}
                    disabled={isLoading}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
};

LLMProviderList.propTypes = {
  providerConfigs: PropTypes.array.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  defaultProvider: PropTypes.string,
  onSetDefault: PropTypes.func
};

export default LLMProviderList;