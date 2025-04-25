import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import supabaseService from '../../services/supabaseService';
import { updateUserPreferences } from '../../redux/slices/authSlice';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { fetchDataSources } from '../../redux/slices/dataStoreSlice';

/**
 * DataStoreSettings component for configuring data sources
 * Allows users to add, edit, and delete data sources
 * @param {Object} props - Component props
 * @param {Function} props.onSuccess - Callback for success notifications
 * @param {Function} props.onError - Callback for error notifications
 */
const DataStoreSettings = ({ onSuccess, onError }) => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [dataSources, setDataSources] = useState([]);
  // Remove default data source state as it's not needed for data_store
  const [editingSource, setEditingSource] = useState(null);
  const [newSource, setNewSource] = useState({
    name: '',
    type: 'supabase',
    url: '',
    tableName: 'vector_records',
    username: '',
    password: '',
    accessToken: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');

  // Load data sources from user preferences
  useEffect(() => {
    if (user?.preferences) {
      // Prioritize data_store if available, otherwise fall back to data_store_credentials
      const dataSources = user.preferences.data_store || user.preferences.data_store_credentials || [];
      // No need for data_store_preferences as we're not using default indicators
      
      setDataSources(dataSources);
      // No longer setting default data source
    }
  }, [user]);

  // Handle form submission for adding a new data source
  const handleAddSource = async () => {
    if (!newSource.name || !newSource.url) {
      setError('Name and URL are required');
      return;
    }

    setLoading(true);
    try {
      // Check if name already exists
      if (dataSources.some(ds => ds.name.toLowerCase() === newSource.name.toLowerCase())) {
        setError('A data source with this name already exists');
        setLoading(false);
        return;
      }

      // Generate a source_id for the new data source
      const source_id = `ds_${Date.now()}`;

      // Create the data store configuration object
      const dataStoreConfig = {
        name: newSource.name,
        source_id: source_id,
        type: newSource.type,
        url: newSource.url,
        table: newSource.tableName
      };

      // Add the new data source to the list
      const updatedSources = [...dataSources, dataStoreConfig];
      
      // Update data sources in Redux state

      // Store credentials in key_store if provided
      if (newSource.username || newSource.password || newSource.accessToken) {
        try {
          // Determine if using username/password or access token
          if (newSource.accessToken) {
            // Store access token
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: user.user_id,
                  provider: `data_store.${source_id}`,
                  api_key: newSource.accessToken,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          } else if (newSource.username || newSource.password) {
            // Store username/password
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: user.user_id,
                  provider: `data_store.${source_id}`,
                  username: newSource.username,
                  password: newSource.password,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          }
        } catch (credError) {
          console.error('Error storing credentials:', credError);
          // Continue with the process even if credential storage fails
        }
      }
      
      // Update user preferences in the database
      try {
        // Save to Supabase
        await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_preferences')
            .upsert({
              user_id: user.user_id,
              preference_key: 'data_store',
              preference_value: updatedSources
            }, {
              onConflict: 'user_id,preference_key'
            })
        );
        
        // Update Redux state
        dispatch(updateUserPreferences({
          key: 'data_store',
          value: updatedSources
        }));
        
        // Update local state
        setDataSources(updatedSources);
      } catch (dbError) {
        console.error('Error saving data store to database:', dbError);
        // Continue with local state update even if database update fails
        setDataSources(updatedSources);
      }
      
      // Reset form
      setNewSource({
        name: '',
        type: 'supabase',
        url: '',
        tableName: 'vector_records',
        username: '',
        password: '',
        accessToken: ''
      });
      setShowAddForm(false);
      setError('');
      
      // Sync with Redux state
      dispatch(fetchDataSources());
      
      onSuccess('Data source added successfully');
    } catch (err) {
      console.error('Error adding data source:', err);
      onError('Failed to add data source: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission for editing a data source
  const handleEditSource = async () => {
    if (!editingSource.name || !editingSource.url) {
      setError('Name and URL are required');
      return;
    }

    setLoading(true);
    try {
      // Find the original data source to get its source_id
      const originalSource = dataSources.find(ds => ds.name === editingSource.originalName);
      const source_id = originalSource?.source_id || `ds_${Date.now()}`;

      // Create the updated data store configuration
      const updatedConfig = {
        name: editingSource.name,
        source_id: source_id,
        type: editingSource.type,
        url: editingSource.url,
        table: editingSource.tableName
      };

      // Update the data source in the list
      const updatedSources = dataSources.map(ds =>
        ds.name === editingSource.originalName ? updatedConfig : ds
      );
      
      // Update data sources in Redux state

      // Update credentials in key_store if provided
      if (editingSource.username || editingSource.password || editingSource.accessToken) {
        try {
          // Determine if using username/password or access token
          if (editingSource.accessToken) {
            // Store access token
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: user.user_id,
                  provider: `data_store.${source_id}`,
                  api_key: editingSource.accessToken,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          } else if (editingSource.username || editingSource.password) {
            // Store username/password
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: user.user_id,
                  provider: `data_store.${source_id}`,
                  username: editingSource.username,
                  password: editingSource.password,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          }
        } catch (credError) {
          console.error('Error updating credentials:', credError);
          // Continue with the process even if credential storage fails
        }
      }
      
      // No longer updating default data source
      
      // Update user preferences in the database
      try {
        // Save to Supabase
        await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_preferences')
            .upsert({
              user_id: user.user_id,
              preference_key: 'data_store',
              preference_value: updatedSources
            }, {
              onConflict: 'user_id,preference_key'
            })
        );
        
        // Update Redux state
        dispatch(updateUserPreferences({
          key: 'data_store',
          value: updatedSources
        }));
        
        // Update local state
        setDataSources(updatedSources);
      } catch (dbError) {
        console.error('Error saving data store to database:', dbError);
        // Continue with local state update even if database update fails
        setDataSources(updatedSources);
      }
      
      // Reset form
      setEditingSource(null);
      setError('');
      
      // Sync with Redux state
      dispatch(fetchDataSources());
      
      onSuccess('Data source updated successfully');
    } catch (err) {
      console.error('Error updating data source:', err);
      onError('Failed to update data source: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a data source
  const handleDeleteSource = async (name) => {
    setLoading(true);
    try {
      // Find the data source to get its source_id
      const dataSource = dataSources.find(ds => ds.name === name);
      const source_id = dataSource?.source_id;

      // Remove the data source from the list
      const updatedSources = dataSources.filter(ds => ds.name !== name);
      
      // Update data sources in Redux state

      // Delete credentials from key_store if source_id exists
      if (source_id) {
        try {
          await supabaseService.executeQuery(supabase =>
            supabase
              .from('key_store')
              .delete()
              .eq('user_id', user.user_id)
              .eq('provider', `data_store.${source_id}`)
          );
        } catch (credError) {
          console.error('Error deleting credentials:', credError);
          // Continue with the process even if credential deletion fails
        }
      }
      
      // No longer updating default data source
      
      // Update user preferences in the database
      try {
        // Save to Supabase
        await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_preferences')
            .upsert({
              user_id: user.user_id,
              preference_key: 'data_store',
              preference_value: updatedSources
            }, {
              onConflict: 'user_id,preference_key'
            })
        );
        
        // Update Redux state
        dispatch(updateUserPreferences({
          key: 'data_store',
          value: updatedSources
        }));
        
        // Update local state
        setDataSources(updatedSources);
      } catch (dbError) {
        console.error('Error saving data store to database:', dbError);
        // Continue with local state update even if database update fails
        setDataSources(updatedSources);
      }
      
      // Sync with Redux state
      dispatch(fetchDataSources());
      
      onSuccess('Data source deleted successfully');
    } catch (err) {
      console.error('Error deleting data source:', err);
      onError('Failed to delete data source: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // No longer need handleSetDefault function

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Data Store Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure data sources for vector storage and retrieval. You can add multiple data sources.
      </Typography>

      {/* Data Sources List */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Data Sources
        </Typography>
        
        {dataSources.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No data sources configured. Add a data source to get started.
          </Alert>
        ) : (
          <Box sx={{ mb: 2 }}>
            {dataSources.map((source) => (
              <Box key={source.name} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                {editingSource && editingSource.originalName === source.name ? (
                  // Edit form
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Name"
                        value={editingSource.name}
                        onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={editingSource.type}
                          label="Type"
                          onChange={(e) => setEditingSource({ ...editingSource, type: e.target.value })}
                        >
                          <MenuItem value="supabase">Supabase</MenuItem>
                          <MenuItem value="postgres">Local PostgreSQL</MenuItem>
                          <MenuItem value="filemaker">FileMaker</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="URL"
                        value={editingSource.url}
                        onChange={(e) => setEditingSource({ ...editingSource, url: e.target.value })}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Table Name"
                        value={editingSource.tableName || 'vector_records'}
                        onChange={(e) => setEditingSource({ ...editingSource, tableName: e.target.value })}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Authentication (Optional)
                      </Typography>
                      <Box sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          Choose either Username/Password OR Access Token
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Username"
                              value={editingSource.username || ''}
                              onChange={(e) => setEditingSource({ ...editingSource, username: e.target.value })}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Password"
                              type="password"
                              value={editingSource.password || ''}
                              onChange={(e) => setEditingSource({ ...editingSource, password: e.target.value })}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }}>
                              <Typography variant="caption">OR</Typography>
                            </Divider>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Access Token"
                              type="password"
                              value={editingSource.accessToken || ''}
                              onChange={(e) => setEditingSource({ ...editingSource, accessToken: e.target.value })}
                              size="small"
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button
                          startIcon={<SaveIcon />}
                          variant="contained"
                          size="small"
                          onClick={handleEditSource}
                          disabled={loading}
                        >
                          Save
                        </Button>
                        <Button
                          startIcon={<CancelIcon />}
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setEditingSource(null);
                            setError('');
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                ) : (
                  // Display view
                  <Grid container alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">
                        {source.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Type: {source.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                        URL: {source.url}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Table: {source.tableName || 'vector_records'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => setEditingSource({ ...source, originalName: source.name })}
                        disabled={loading}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteSource(source.name)}
                        disabled={loading}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Add New Data Source Form */}
        {showAddForm ? (
          <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Add New Data Source
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newSource.type}
                    label="Type"
                    onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}
                  >
                    <MenuItem value="supabase">Supabase</MenuItem>
                    <MenuItem value="postgres">Local PostgreSQL</MenuItem>
                    <MenuItem value="filemaker">FileMaker</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="URL"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  size="small"
                  placeholder={
                    newSource.type === 'supabase' ? 'https://your-project.supabase.co' :
                    newSource.type === 'postgres' ? 'postgresql://username:password@localhost:5432/database' :
                    'https://your-filemaker-server.com/fmi/data/v1/databases/your-database'
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Table Name"
                  value={newSource.tableName}
                  onChange={(e) => setNewSource({ ...newSource, tableName: e.target.value })}
                  size="small"
                  placeholder="vector_records"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Authentication (Optional)
                </Typography>
                <Box sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Choose either Username/Password OR Access Token
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Username"
                        value={newSource.username}
                        onChange={(e) => setNewSource({ ...newSource, username: e.target.value })}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={newSource.password}
                        onChange={(e) => setNewSource({ ...newSource, password: e.target.value })}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }}>
                        <Typography variant="caption">OR</Typography>
                      </Divider>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Access Token"
                        type="password"
                        value={newSource.accessToken}
                        onChange={(e) => setNewSource({ ...newSource, accessToken: e.target.value })}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button
                    startIcon={<SaveIcon />}
                    variant="contained"
                    size="small"
                    onClick={handleAddSource}
                    disabled={loading}
                  >
                    Add
                  </Button>
                  <Button
                    startIcon={<CancelIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewSource({
                        name: '',
                        type: 'supabase',
                        url: '',
                        tableName: 'vector_records',
                        username: '',
                        password: '',
                        accessToken: '',
                        schema: {
                          id: 'uuid',
                          embedding: 'float[]',
                          metadata: 'jsonb',
                          created_at: 'timestamp'
                        }
                      });
                      setError('');
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => setShowAddForm(true)}
            disabled={loading}
          >
            Add Data Source
          </Button>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

DataStoreSettings.propTypes = {
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired
};

export default DataStoreSettings;