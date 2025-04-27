import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  TextField,
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
  Tabs,
  Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { createLog, LogType } from '../../redux/slices/appSlice';
import {
  fetchKnowledge,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  setActiveKnowledge,
  selectKnowledge,
  selectActiveKnowledge,
  selectKnowledgeLoading,
  selectKnowledgeError
} from '../../redux/slices/knowledgeSlice';
import { fetchDataStores, selectDataStores } from '../../redux/slices/dataStoreSlice';
import DataStoreSelector from './DataStoreSelector';
import KnowledgeDetail from './KnowledgeDetail';
import KnowledgeChat from './KnowledgeChat';

/**
 * KnowledgeList component for managing Knowledge entities
 */
const KnowledgeList = () => {
  const dispatch = useDispatch();
  const knowledgeItems = useSelector(selectKnowledge);
  const activeKnowledge = useSelector(selectActiveKnowledge);
  const isLoading = useSelector(selectKnowledgeLoading);
  const error = useSelector(selectKnowledgeError);
  const dataStores = useSelector(selectDataStores);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newKnowledge, setNewKnowledge] = useState({
    store_id: ''
  });
  const [knowledgeToDelete, setKnowledgeToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch knowledge on component mount
  useEffect(() => {
    dispatch(fetchKnowledge());
    // No need to fetch dataStores as they are already in the Redux state
  }, [dispatch]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle creating a new knowledge
  const handleCreateKnowledge = async () => {
    if (!newKnowledge.store_id) {
      dispatch(createLog('Data store is required', LogType.ERROR));
      return;
    }

    try {
      // Find the data store to get its name
      const dataStore = dataStores.find(ds => ds.store_id === newKnowledge.store_id);
      if (!dataStore) {
        dispatch(createLog('Selected data store not found', LogType.ERROR));
        return;
      }

      await dispatch(createKnowledge({
        knowledge_id: `k_${Date.now()}`,
        name: dataStore.name, // Use the data store name
        store_id: newKnowledge.store_id,
        sources: []
      })).unwrap();

      setCreateDialogOpen(false);
      setNewKnowledge({
        store_id: ''
      });
      
      dispatch(createLog(`Knowledge "${dataStore.name}" created successfully`, LogType.INFO));
    } catch (error) {
      dispatch(createLog(`Failed to create knowledge: ${error.message}`, LogType.ERROR));
    }
  };


  // Handle deleting a knowledge
  const handleDeleteKnowledge = async () => {
    if (!knowledgeToDelete) return;

    try {
      await dispatch(deleteKnowledge(knowledgeToDelete.knowledge_id)).unwrap();

      setDeleteDialogOpen(false);
      setKnowledgeToDelete(null);
      
      dispatch(createLog(`Knowledge "${knowledgeToDelete.name}" deleted successfully`, LogType.INFO));
    } catch (error) {
      dispatch(createLog(`Failed to delete knowledge: ${error.message}`, LogType.ERROR));
    }
  };

  // Handle selecting a knowledge
  const handleSelectKnowledge = (knowledge) => {
    dispatch(setActiveKnowledge(knowledge.knowledge_id));
  };


  // Open delete dialog
  const openDeleteDialog = (knowledge) => {
    setKnowledgeToDelete(knowledge);
    setDeleteDialogOpen(true);
  };

  // Handle success notification
  const handleSuccess = (message) => {
    dispatch(createLog(message, LogType.INFO));
  };

  // Handle error notification
  const handleError = (message) => {
    dispatch(createLog(message, LogType.ERROR));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Knowledge Management
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Create and manage Knowledge entities that link multiple sources to a specific data store backend.
      </Typography>

      {/* Loading Indicator */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 200px)' }}>
        {/* Knowledge List */}
        <Paper sx={{ p: 2, width: 300, mr: 2, overflow: 'auto', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Knowledge Entities
            </Typography>
            <Button
              startIcon={<AddIcon />}
              size="small"
              onClick={() => setCreateDialogOpen(true)}
              disabled={dataStores.length === 0}
            >
              Create
            </Button>
          </Box>

          {dataStores.length === 0 ? (
            <Alert severity="info">
              No data stores available. Please add a data store in Settings first.
            </Alert>
          ) : knowledgeItems.length === 0 ? (
            <Alert severity="info">
              No knowledge entities found. Create one to get started.
            </Alert>
          ) : (
            <List>
              {knowledgeItems.map((knowledge) => (
                <Box key={knowledge.knowledge_id}>
                  <ListItem
                    button
                    selected={activeKnowledge?.knowledge_id === knowledge.knowledge_id}
                    onClick={() => handleSelectKnowledge(knowledge)}
                  >
                    <ListItemText
                      primary={knowledge.name}
                      secondary={
                        <Box>
                          <Typography variant="caption" component="span">
                            {knowledge.sources?.length || 0} sources
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Delete">
                        <IconButton
                          edge="end"
                          onClick={() => openDeleteDialog(knowledge)}
                          disabled={knowledge.sources && knowledge.sources.length > 0}
                        >
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

        {/* Knowledge Detail */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', height: '100%' }}>
          {activeKnowledge ? (
            <Box>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{
                  mb: 2,
                  '& .MuiTab-root': {
                    '&:focus': {
                      outline: 'none'
                    }
                  }
                }}
              >
                <Tab label="Sources" />
                <Tab label="Chat" />
              </Tabs>
              
              {activeTab === 0 && (
                <KnowledgeDetail
                  knowledge={activeKnowledge}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              )}
              
              {activeTab === 1 && (
                <KnowledgeChat
                  knowledge={activeKnowledge}
                  onError={handleError}
                />
              )}
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                No Knowledge Selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a knowledge entity from the list or create a new one.
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Create Knowledge Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Knowledge</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph sx={{ mt: 2 }}>
            Select a data store. The Knowledge entity will use the data store's name.
          </Typography>
          <DataStoreSelector
            value={newKnowledge.store_id}
            onChange={(storeId) => setNewKnowledge({ ...newKnowledge, store_id: storeId })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateKnowledge}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!newKnowledge.store_id}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>


      {/* Delete Knowledge Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Knowledge</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the knowledge &quot;{knowledgeToDelete?.name}&quot;? This action cannot be undone.
          </DialogContentText>
          <Alert severity="info" sx={{ mt: 2 }}>
            Note: Knowledge can only be deleted if all sources are removed first.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteKnowledge}
            color="error"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KnowledgeList;