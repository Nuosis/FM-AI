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
import { fetchDataStores } from '../../redux/slices/dataStoreSlice';

/**
 * DataStoreSettings component for configuring data stores
 * Allows users to add, edit, and delete data stores
 * @param {Object} props - Component props
 * @param {Function} props.onSuccess - Callback for success notifications
 * @param {Function} props.onError - Callback for error notifications
 */
const DataStoreSettings = ({ onSuccess, onError }) => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [dataStores, setDataStores] = useState([]);
  // Remove default data store state as it's not needed for data_store
  const [editingStore, setEditingStore] = useState(null);
  const [newStore, setNewStore] = useState({
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

  // Load data stores from user preferences
  useEffect(() => {
    if (user?.preferences) {
      // Prioritize data_store if available, otherwise fall back to data_store_credentials
      const dataStores = user.preferences.data_store || user.preferences.data_store_credentials || [];
      // No need for data_store_preferences as we're not using default indicators
      
      setDataStores(dataStores);
      // No longer setting default data store
    }
  }, [user]);

  // Handle form submission for adding a new data store
  const handleAddStore = async () => {
    if (!newStore.name || !newStore.url) {
      setError('Name and URL are required');
      return;
    }

    setLoading(true);
    try {
      // Check if name already exists
      if (dataStores.some(ds => ds.name.toLowerCase() === newStore.name.toLowerCase())) {
        setError('A data store with this name already exists');
        setLoading(false);
        return;
      }

      // Generate a store_id for the new data store
      const store_id = `ds_${Date.now()}`;

      // Create the data store configuration object
      const dataStoreConfig = {
        name: newStore.name,
        store_id: store_id,
        type: newStore.type,
        url: newStore.url,
        table: newStore.tableName
      };

      // Add the new data store to the list
      const updatedStores = [...dataStores, dataStoreConfig];
      
      // Store credentials in key_store if provided
      if (newStore.username || newStore.password || newStore.accessToken) {
        try {
          // Determine if using username/password or access token
          if (newStore.accessToken) {
            // Store access token
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: user.user_id,
                  provider: `data_store.${store_id}`,
                  api_key: newStore.accessToken,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          } else if (newStore.username || newStore.password) {
            // Store username/password
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: user.user_id,
                  provider: `data_store.${store_id}`,
                  username: newStore.username,
                  password: newStore.password,
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
              preference_value: updatedStores
            }, {
              onConflict: 'user_id,preference_key'
            })
        );
        
        // Update Redux state
        dispatch(updateUserPreferences({
          key: 'data_store',
          value: updatedStores
        }));
        
        // Update local state
        setDataStores(updatedStores);
      } catch (dbError) {
        console.error('Error saving data store to database:', dbError);
        // Continue with local state update even if database update fails
        setDataStores(updatedStores);
      }
      
      // Reset form
      setNewStore({
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
      dispatch(fetchDataStores());
      
      onSuccess('Data store added successfully');
    } catch (err) {
      console.error('Error adding data store:', err);
      onError('Failed to add data store: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission for editing a data store
  const handleEditStore = async () => {
    if (!editingStore.name || !editingStore.url) {
      setError('Name and URL are required');
      return;
    }

    setLoading(true);
    try {
      // Find the original data store to get its store_id
      const originalStore = dataStores.find(ds => ds.name === editingStore.originalName);
      const store_id = originalStore?.store_id || `ds_${Date.now()}`;

      // Create the updated data store configuration
      const updatedConfig = {
        name: editingStore.name,
        store_id: store_id,
        type: editingStore.type,
        url: editingStore.url,
        table: editingStore.tableName
      };

      // Update the data store in the list
      const updatedStores = dataStores.map(ds =>
        ds.name === editingStore.originalName ? updatedConfig : ds
      );
      
      // Update credentials in key_store if provided
      if (editingStore.username || editingStore.password || editingStore.accessToken) {
        try {
          // Determine if using username/password or access token
          if (editingStore.accessToken) {
            // Store access token
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: user.user_id,
                  provider: `data_store.${store_id}`,
                  api_key: editingStore.accessToken,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          } else if (editingStore.username || editingStore.password) {
            // Store username/password
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: user.user_id,
                  provider: `data_store.${store_id}`,
                  username: editingStore.username,
                  password: editingStore.password,
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
      
      // Update user preferences in the database
      try {
        // Save to Supabase
        await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_preferences')
            .upsert({
              user_id: user.user_id,
              preference_key: 'data_store',
              preference_value: updatedStores
            }, {
              onConflict: 'user_id,preference_key'
            })
        );
        
        // Update Redux state
        dispatch(updateUserPreferences({
          key: 'data_store',
          value: updatedStores
        }));
        
        // Update local state
        setDataStores(updatedStores);
      } catch (dbError) {
        console.error('Error saving data store to database:', dbError);
        // Continue with local state update even if database update fails
        setDataStores(updatedStores);
      }
      
      // Reset form
      setEditingStore(null);
      setError('');
      
      // Sync with Redux state
      dispatch(fetchDataStores());
      
      onSuccess('Data store updated successfully');
    } catch (err) {
      console.error('Error updating data store:', err);
      onError('Failed to update data store: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a data store
  const handleDeleteStore = async (name) => {
    setLoading(true);
    try {
      // Find the data store to get its store_id
      const dataStore = dataStores.find(ds => ds.name === name);
      const store_id = dataStore?.store_id;

      // Remove the data store from the list
      const updatedStores = dataStores.filter(ds => ds.name !== name);
      
      // Delete credentials from key_store if store_id exists
      if (store_id) {
        try {
          await supabaseService.executeQuery(supabase =>
            supabase
              .from('key_store')
              .delete()
              .eq('user_id', user.user_id)
              .eq('provider', `data_store.${store_id}`)
          );
        } catch (credError) {
          console.error('Error deleting credentials:', credError);
          // Continue with the process even if credential deletion fails
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
              preference_value: updatedStores
            }, {
              onConflict: 'user_id,preference_key'
            })
        );
        
        // Update Redux state
        dispatch(updateUserPreferences({
          key: 'data_store',
          value: updatedStores
        }));
        
        // Update local state
        setDataStores(updatedStores);
      } catch (dbError) {
        console.error('Error saving data store to database:', dbError);
        // Continue with local state update even if database update fails
        setDataStores(updatedStores);
      }
      
      // Sync with Redux state
      dispatch(fetchDataStores());
      
      onSuccess('Data store deleted successfully');
    } catch (err) {
      console.error('Error deleting data store:', err);
      onError('Failed to delete data store: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // No longer need handleSetDefault function

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure data stores for vector storage and retrieval. You can add multiple data stores.
      </Typography>

      {/* Data Stores List */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Data Stores
        </Typography>
        
        {dataStores.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No data stores configured. Add a data store to get started.
          </Alert>
        ) : (
          <Box sx={{ mb: 2 }}>
            {dataStores.map((store) => (
              <Box key={store.name} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                {editingStore && editingStore.originalName === store.name ? (
                  // Edit form
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Name"
                        value={editingStore.name}
                        onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={editingStore.type}
                          label="Type"
                          onChange={(e) => setEditingStore({ ...editingStore, type: e.target.value })}
                        >
                          <MenuItem value="supabase">Supabase</MenuItem>
                          <MenuItem value="postgres">Local PostgreSQL</MenuItem>
                          <MenuItem value="filemaker">FileMaker</MenuItem>
                          <MenuItem value="lancedb">LanceDB</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="URL"
                        value={editingStore.url}
                        onChange={(e) => setEditingStore({ ...editingStore, url: e.target.value })}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Table Name"
                        value={editingStore.tableName || 'vector_records'}
                        onChange={(e) => setEditingStore({ ...editingStore, tableName: e.target.value })}
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
                              value={editingStore.username || ''}
                              onChange={(e) => setEditingStore({ ...editingStore, username: e.target.value })}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Password"
                              type="password"
                              value={editingStore.password || ''}
                              onChange={(e) => setEditingStore({ ...editingStore, password: e.target.value })}
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
                              value={editingStore.accessToken || ''}
                              onChange={(e) => setEditingStore({ ...editingStore, accessToken: e.target.value })}
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
                          onClick={handleEditStore}
                          disabled={loading}
                        >
                          Save
                        </Button>
                        <Button
                          startIcon={<CancelIcon />}
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setEditingStore(null);
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
                        {store.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Type: {store.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                        URL: {store.url}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Table: {store.tableName || 'vector_records'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => setEditingStore({ ...store, originalName: store.name })}
                        disabled={loading}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteStore(store.name)}
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

        {/* Add New Data Store Form */}
        {showAddForm ? (
          <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Add New Data Store
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newStore.type}
                    label="Type"
                    onChange={(e) => setNewStore({ ...newStore, type: e.target.value })}
                  >
                    <MenuItem value="supabase">Supabase</MenuItem>
                    <MenuItem value="postgres">Local PostgreSQL</MenuItem>
                    <MenuItem value="filemaker">FileMaker</MenuItem>
                    <MenuItem value="lancedb">LanceDB</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="URL"
                  value={newStore.url}
                  onChange={(e) => setNewStore({ ...newStore, url: e.target.value })}
                  size="small"
                  placeholder={
                    newStore.type === 'supabase' ? 'https://your-project.supabase.co' :
                    newStore.type === 'postgres' ? 'postgresql://username:password@localhost:5432/database' :
                    newStore.type === 'filemaker' ? 'https://your-filemaker-server.com/fmi/data/v1/databases/your-database' :
                    '/path/to/your/lancedb/database.lance'
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Table Name"
                  value={newStore.tableName}
                  onChange={(e) => setNewStore({ ...newStore, tableName: e.target.value })}
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
                        value={newStore.username}
                        onChange={(e) => setNewStore({ ...newStore, username: e.target.value })}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={newStore.password}
                        onChange={(e) => setNewStore({ ...newStore, password: e.target.value })}
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
                        value={newStore.accessToken}
                        onChange={(e) => setNewStore({ ...newStore, accessToken: e.target.value })}
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
                    onClick={handleAddStore}
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
                      setNewStore({
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
            Add Data Store
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