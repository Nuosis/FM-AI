import { useState } from 'react';
import fetchWithAuth from '../../utils/fetchWithAuth';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { deleteSource } from '../../redux/slices/knowledgeSlice';
import { selectDataStores } from '../../redux/slices/dataStoreSlice';
import SourceUpload from './SourceUpload';

/**
 * KnowledgeDetail component for viewing and managing sources for a Knowledge entity
 * @param {Object} props - Component props
 * @param {Object} props.knowledge - The Knowledge entity
 * @param {Function} props.onSuccess - Callback for success notifications
 * @param {Function} props.onError - Callback for error notifications
 */
const KnowledgeDetail = ({ knowledge, onSuccess, onError }) => {
  const dispatch = useDispatch();
  const dataStores = useSelector(selectDataStores);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState(null);
  const [sourceDetailsOpen, setSourceDetailsOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);

  // Find the data store for this knowledge
  const dataStore = dataStores.find(ds => ds.store_id === knowledge.store_id);

  // Handle source deletion
  const handleDeleteSource = async () => {
    if (!sourceToDelete) return;

    setIsLoading(true);
    try {
      // Delete source from Knowledge entity in Redux
      await dispatch(deleteSource({
        knowledgeId: knowledge.knowledge_id,
        sourceId: sourceToDelete.source_id
      })).unwrap();

      // Delete vector records from data store
      try {
        await fetchWithAuth(`/data_store/records?store_id=${knowledge.store_id}&source_id=${sourceToDelete.source_id}`, {
          method: 'DELETE'
        });
      } catch (deleteError) {
        console.error('Error deleting vector records:', deleteError);
        // Continue even if vector record deletion fails
      }

      onSuccess(`Source "${sourceToDelete.filename}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting source:', error);
      onError(`Failed to delete source: ${error.message}`);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setSourceToDelete(null);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (source) => {
    setSourceToDelete(source);
    setDeleteDialogOpen(true);
  };

  // Open source details dialog
  const openSourceDetails = (source) => {
    setSelectedSource(source);
    setSourceDetailsOpen(true);
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2, flexGrow: 1, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          {knowledge.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Data Store: {dataStore ? dataStore.name : 'Unknown'} ({dataStore ? dataStore.type : 'Unknown'})
        </Typography>

        {/* Source Upload */}
        <SourceUpload
          knowledgeId={knowledge.knowledge_id}
          storeId={knowledge.store_id}
          onSuccess={onSuccess}
          onError={onError}
        />

        {/* Sources List */}
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
          Sources
        </Typography>
        
        {!knowledge.sources || knowledge.sources.length === 0 ? (
          <Alert severity="info">
            No sources added yet. Upload a file or provide a URL to add a source.
          </Alert>
        ) : (
          <List>
            {knowledge.sources.map((source) => (
              <Box key={source.source_id}>
                <ListItem>
                  <ListItemText
                    primary={source.filename}
                    secondary={
                      <Box>
                        <Typography variant="body2" component="span">
                          Uploaded: {formatDate(source.upload_date)}
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label={source.mimetype || 'Unknown type'}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          {source.chunk_count && (
                            <Chip
                              label={`${source.chunk_count} chunks`}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="View Details">
                      <IconButton edge="end" onClick={() => openSourceDetails(source)} sx={{ mr: 1 }}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Source">
                      <IconButton edge="end" onClick={() => openDeleteDialog(source)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </Box>
            ))}
          </List>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Source</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the source &quot;{sourceToDelete?.filename}&quot;? This will remove all associated vector records from the data store.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteSource}
            color="error"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Source Details Dialog */}
      <Dialog
        open={sourceDetailsOpen}
        onClose={() => setSourceDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Source Details</DialogTitle>
        <DialogContent>
          {selectedSource && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedSource.filename}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Metadata
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Source ID" secondary={selectedSource.source_id} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Upload Date" secondary={formatDate(selectedSource.upload_date)} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="MIME Type" secondary={selectedSource.mimetype || 'Unknown'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Chunks" secondary={selectedSource.chunk_count || 'Unknown'} />
                  </ListItem>
                  {selectedSource.file_size && (
                    <ListItem>
                      <ListItemText primary="File Size" secondary={formatFileSize(selectedSource.file_size)} />
                    </ListItem>
                  )}
                  {selectedSource.title && (
                    <ListItem>
                      <ListItemText primary="Document Title" secondary={selectedSource.title} />
                    </ListItem>
                  )}
                  {selectedSource.author && (
                    <ListItem>
                      <ListItemText primary="Author" secondary={selectedSource.author} />
                    </ListItem>
                  )}
                  {selectedSource.created_date && (
                    <ListItem>
                      <ListItemText primary="Created Date" secondary={formatDate(selectedSource.created_date)} />
                    </ListItem>
                  )}
                </List>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSourceDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

KnowledgeDetail.propTypes = {
  knowledge: PropTypes.shape({
    knowledge_id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    store_id: PropTypes.string.isRequired,
    sources: PropTypes.array
  }).isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired
};

export default KnowledgeDetail;