import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Settings from '@mui/icons-material/Settings';
import Storage from '@mui/icons-material/Storage';
import {
  selectActiveDataStore,
  selectIsDataStoreReady,
  fetchDataStores
} from '../../redux/slices/dataStoreSlice';

/**
 * TabPanel component for tab content
 */
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`data-store-tabpanel-${index}`}
      aria-labelledby={`data-store-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

/**
 * DataStore component for managing vector records
 */
const DataStore = ({ onViewChange }) => {
  const dispatch = useDispatch();
  const activeDataStore = useSelector(selectActiveDataStore);
  const isDataStoreReady = useSelector(selectIsDataStoreReady);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newRecord, setNewRecord] = useState({
    embedding: [],
    metadata: {}
  });
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');

  // Initialize data store when component mounts
  useEffect(() => {
    dispatch(fetchDataStores());
  }, [dispatch]);

  // Load records when component mounts or active data source changes
  useEffect(() => {
    if (isDataStoreReady && activeDataStore) {
      fetchRecords();
    }
  }, [isDataStoreReady, activeDataStore]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Fetch records from the active data source
  const fetchRecords = async () => {
    setLoading(true);
    try {
      // This would typically be an API call to the backend
      // For now, we'll just simulate it with a timeout
      setTimeout(() => {
        setRecords([
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            metadata: { text: 'Sample text', category: 'example' },
            created_at: new Date().toISOString()
          },
          {
            id: '223e4567-e89b-12d3-a456-426614174001',
            embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
            metadata: { text: 'Another example', category: 'sample' },
            created_at: new Date().toISOString()
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Error fetching records:', err);
      setError('Failed to fetch records: ' + err.message);
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery) {
      setError('Search query is required');
      return;
    }

    setLoading(true);
    try {
      // This would typically be an API call to the backend
      // For now, we'll just simulate it with a timeout
      setTimeout(() => {
        setRecords([
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            metadata: { text: 'Sample text matching search', category: 'example' },
            created_at: new Date().toISOString()
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Error searching records:', err);
      setError('Failed to search records: ' + err.message);
      setLoading(false);
    }
  };

  // Handle adding a new metadata field
  const handleAddMetadata = () => {
    if (!metadataKey || !metadataValue) {
      setError('Both key and value are required for metadata');
      return;
    }

    setNewRecord({
      ...newRecord,
      metadata: {
        ...newRecord.metadata,
        [metadataKey]: metadataValue
      }
    });

    // Reset form fields
    setMetadataKey('');
    setMetadataValue('');
  };

  // Handle removing a metadata field
  const handleRemoveMetadata = (key) => {
    const updatedMetadata = { ...newRecord.metadata };
    delete updatedMetadata[key];
    
    setNewRecord({
      ...newRecord,
      metadata: updatedMetadata
    });
  };

  // Handle creating a new record
  const handleCreateRecord = async () => {
    if (Object.keys(newRecord.metadata).length === 0) {
      setError('At least one metadata field is required');
      return;
    }

    setLoading(true);
    try {
      // This would typically be an API call to the backend
      // For now, we'll just simulate it with a timeout
      setTimeout(() => {
        // Add the new record to the list with a generated ID
        const newId = 'new-' + Date.now();
        const createdRecord = {
          id: newId,
          embedding: newRecord.embedding.length > 0 ? newRecord.embedding : [0.1, 0.2, 0.3, 0.4, 0.5],
          metadata: newRecord.metadata,
          created_at: new Date().toISOString()
        };
        
        setRecords([...records, createdRecord]);
        
        // Reset form
        setNewRecord({
          embedding: [],
          metadata: {}
        });
        
        setLoading(false);
        setTabValue(0); // Switch to the Records tab
      }, 1000);
    } catch (err) {
      console.error('Error creating record:', err);
      setError('Failed to create record: ' + err.message);
      setLoading(false);
    }
  };

  // Handle deleting a record
  const handleDeleteRecord = async (id) => {
    setLoading(true);
    try {
      // This would typically be an API call to the backend
      // For now, we'll just simulate it with a timeout
      setTimeout(() => {
        // Remove the record from the list
        setRecords(records.filter(record => record.id !== id));
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Error deleting record:', err);
      setError('Failed to delete record: ' + err.message);
      setLoading(false);
    }
  };

  // Format the embedding array for display
  const formatEmbedding = (embedding) => {
    if (!embedding || embedding.length === 0) return 'No embedding';
    
    // Show first 5 values and indicate if there are more
    const displayValues = embedding.slice(0, 5);
    const hasMore = embedding.length > 5;
    
    return `[${displayValues.join(', ')}${hasMore ? ', ...' : ''}]`;
  };

  // Function to navigate to settings
  const handleGoToSettings = () => {
    // Use the onViewChange prop to navigate to settings
    if (onViewChange) {
      onViewChange('settings');
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Data Store
      </Typography>
      
      {!isDataStoreReady ? (
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            backgroundColor: 'rgba(25, 118, 210, 0.05)',
            border: '1px solid rgba(25, 118, 210, 0.2)'
          }}
        >
          <Storage sx={{ fontSize: 60, color: 'primary.main', mb: 2, opacity: 0.8 }} />
          <Typography variant="h5" gutterBottom color="primary">
            Data Store Not Configured
          </Typography>
          <Typography variant="body1" paragraph sx={{ mb: 3 }}>
            You need to configure at least one data store before you can use the Data Store feature.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleGoToSettings}
            startIcon={<Settings />}
          >
            Go to Settings
          </Button>
        </Paper>
      ) : (
        <>
          <Paper sx={{ mb: 3, p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Active Data Store: <Chip label={activeDataStore ? activeDataStore.name : 'None'} color="primary" size="small" />
            </Typography>
          </Paper>

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="data store tabs"
              sx={{
                '& .MuiTab-root': {
                  '&:focus': {
                    outline: 'none'
                  },
                  '&.Mui-focusVisible': {
                    outline: 'none'
                  }
                }
              }}
            >
              <Tab
                label="Records"
                id="data-store-tab-0"
                aria-controls="data-store-tabpanel-0"
                sx={{ '&:focus': { outline: 'none' } }}
              />
              <Tab
                label="Search"
                id="data-store-tab-1"
                aria-controls="data-store-tabpanel-1"
                sx={{ '&:focus': { outline: 'none' } }}
              />
              <Tab
                label="Create"
                id="data-store-tab-2"
                aria-controls="data-store-tabpanel-2"
                sx={{ '&:focus': { outline: 'none' } }}
              />
            </Tabs>
          </Box>

          {/* Records Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Vector Records
            </Typography>
            
            {records.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                No records found. Create a new record or search for existing ones.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {records.map((record) => (
                  <Grid item xs={12} key={record.id}>
                    <Paper sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={10}>
                          <Typography variant="subtitle1" gutterBottom>
                            ID: {record.id}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Created: {new Date(record.created_at).toLocaleString()}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2">
                            <strong>Embedding:</strong> {formatEmbedding(record.embedding)}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Metadata:</strong>
                          </Typography>
                          <Box sx={{ pl: 2 }}>
                            {Object.entries(record.metadata).map(([key, value]) => (
                              <Typography key={key} variant="body2">
                                {key}: {typeof value === 'object' ? JSON.stringify(value) : value}
                              </Typography>
                            ))}
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteRecord(record.id)}
                            disabled={loading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          {/* Search Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Search Records
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={10}>
                <TextField
                  fullWidth
                  label="Search Query"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter text to search by similarity or metadata query (e.g., category:example)"
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  disabled={loading || !searchQuery}
                >
                  Search
                </Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Create Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Create New Record
            </Typography>
            
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Metadata
              </Typography>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    label="Key"
                    value={metadataKey}
                    onChange={(e) => setMetadataKey(e.target.value)}
                    size="small"
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    label="Value"
                    value={metadataValue}
                    onChange={(e) => setMetadataValue(e.target.value)}
                    size="small"
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddMetadata}
                    disabled={loading || !metadataKey || !metadataValue}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>
              
              {Object.keys(newRecord.metadata).length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Metadata:
                  </Typography>
                  <Grid container spacing={1}>
                    {Object.entries(newRecord.metadata).map(([key, value]) => (
                      <Grid item key={key}>
                        <Chip
                          label={`${key}: ${value}`}
                          onDelete={() => handleRemoveMetadata(key)}
                          disabled={loading}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Paper>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleCreateRecord}
                disabled={loading || Object.keys(newRecord.metadata).length === 0}
              >
                Create Record
              </Button>
            </Box>
          </TabPanel>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

// Add prop types
DataStore.propTypes = {
  onViewChange: PropTypes.func
};

export default DataStore;