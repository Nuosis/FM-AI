import { useState, useEffect } from 'react';
import axios from '../../utils/axios'
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Snackbar,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import TestIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import EditIcon from '@mui/icons-material/Edit';

const DatabaseRegistry = () => {
  const [databases, setDatabases] = useState({});
  const [serverStatus, setServerStatus] = useState({});
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDatabase, setEditingDatabase] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [credentialsDialog, setCredentialsDialog] = useState({
    open: false,
    envVar: '',
    credentials: ''
  });
  const [newDatabase, setNewDatabase] = useState({
    base_url: '',
    database: '',
    username: '',
    password: ''
  });

  // Get env var name for a database
  const getEnvVarName = (database) => {
    return `FM_${database.toUpperCase()}_CREDENTIALS`;
  };

  // Fetch existing databases and their server status
  const fetchDatabases = async () => {
    try {
      const { data } = await axios.get('/api/admin/databases/');
      setDatabases(data);

      // Fetch server status for each database
      const { data: statusData } = await axios.get('/api/admin/databases/verify');
      setServerStatus(statusData);
    } catch (error) {
      console.error('Error fetching databases:', error);
      if (error.response?.status === 404) {
        setDatabases({});
        return;
      }
      setError('Failed to fetch databases');
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  // Copy to clipboard helper
  const copyToClipboard = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbar({ open: true, message: message });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setError('Failed to copy to clipboard');
    }
  };

  // Add/Edit database
  const handleSaveDatabase = async () => {
    try {
      const rawCredentials = `${newDatabase.username}:${newDatabase.password}`;
      const databaseData = {
        base_url: newDatabase.base_url,
        database: newDatabase.database,
        credentials: rawCredentials
      };

      const url = editingDatabase 
        ? `/api/admin/databases/${encodeURIComponent(editingDatabase)}`
        : '/api/admin/databases';

      const { data: result } = await (editingDatabase 
        ? axios.put(url, databaseData)
        : axios.post(url, databaseData));
      
      if (!editingDatabase) {
        setCredentialsDialog({
          open: true,
          envVar: result.env_var,
          credentials: result.encoded_credentials
        });
      }

      await fetchDatabases();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving database:', error);
      setError(`Failed to ${editingDatabase ? 'update' : 'add'} database`);
    }
  };

  // Handle edit database
  const handleEditDatabase = (identifier, config) => {
    setEditingDatabase(identifier);
    setNewDatabase({
      base_url: config.base_url,
      database: config.database,
      username: '',
      password: ''
    });
    setOpenDialog(true);
  };

  // Close dialog and reset form
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDatabase(null);
    setNewDatabase({ base_url: '', database: '', username: '', password: '' });
  };

  // Remove database
  const handleRemoveDatabase = async (identifier) => {
    try {
      await axios.delete(`/api/admin/databases/${encodeURIComponent(identifier)}`);
      await fetchDatabases();
      setSnackbar({ open: true, message: 'Database removed successfully' });
    } catch (error) {
      console.error('Error removing database:', error);
      setError('Failed to remove database');
    }
  };

  // Test database connection
  const handleTestDatabase = async (identifier) => {
    try {
      const { data } = await axios.post(`/api/admin/databases/${encodeURIComponent(identifier)}/test`);
      setSnackbar({ open: true, message: data.message });
    } catch (error) {
      console.error('Error testing database:', error);
      setError('Failed to test database connection');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', mb: 3 }}>
          <Typography variant="h5">Register a Database</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Add Database
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {Object.entries(databases).map(([identifier, config]) => (
            <Grid item xs={12} key={identifier}>
              <Card sx={{ width: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2 
                  }}>
                    <Box>
                      <Typography variant="h6" sx={{ mb: 1 }}>{config.database}</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {config.base_url}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Tooltip title={serverStatus[identifier] ? 'Server Online' : 'Server Offline'}>
                        <IconButton 
                          color={serverStatus[identifier] ? 'success' : 'error'}
                          size="small"
                        >
                          {serverStatus[identifier] ? <CheckCircleIcon /> : <ErrorIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Test Connection">
                        <IconButton 
                          onClick={() => handleTestDatabase(identifier)}
                          color="primary"
                          size="small"
                          sx={{ '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' } }}
                        >
                          <TestIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Database">
                        <IconButton 
                          onClick={() => handleEditDatabase(identifier, config)}
                          color="primary"
                          size="small"
                          sx={{ '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' } }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove Database">
                        <IconButton 
                          onClick={() => handleRemoveDatabase(identifier)} 
                          color="error"
                          size="small"
                          sx={{ '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.04)' } }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label="Copy Env Var"
                      size="small"
                      onClick={() => copyToClipboard(
                        getEnvVarName(config.database),
                        'Environment variable name copied to clipboard'
                      )}
                      icon={<ContentCopyIcon />}
                      sx={{ mr: 1 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Add/Edit Database Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{editingDatabase ? 'Edit Database' : 'Add New Database'}</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Base URL"
                value={newDatabase.base_url}
                onChange={(e) => setNewDatabase({ ...newDatabase, base_url: e.target.value })}
                margin="normal"
                helperText="FileMaker Server URL (e.g., https://fm-server.com)"
              />
              <TextField
                fullWidth
                label="Database"
                value={newDatabase.database}
                onChange={(e) => setNewDatabase({ ...newDatabase, database: e.target.value })}
                margin="normal"
                helperText="FileMaker database name"
              />
              <TextField
                fullWidth
                label="Username"
                value={newDatabase.username}
                onChange={(e) => setNewDatabase({ ...newDatabase, username: e.target.value })}
                margin="normal"
                helperText="FileMaker username for authentication"
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={newDatabase.password}
                onChange={(e) => setNewDatabase({ ...newDatabase, password: e.target.value })}
                margin="normal"
                helperText="FileMaker password for authentication"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSaveDatabase} variant="contained" color="primary">
              {editingDatabase ? 'Save Changes' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Credentials Dialog */}
        <Dialog 
          open={credentialsDialog.open} 
          onClose={() => setCredentialsDialog({ open: false, envVar: '', credentials: '' })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Database Added Successfully</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Add the following to your .env file:
            </Alert>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Environment Variable:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth
                  value={credentialsDialog.envVar}
                  variant="outlined"
                  size="small"
                  InputProps={{ readOnly: true }}
                />
                <IconButton 
                  onClick={() => copyToClipboard(
                    credentialsDialog.envVar,
                    'Environment variable name copied to clipboard'
                  )}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2">Encoded Credentials:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth
                  value={credentialsDialog.credentials}
                  variant="outlined"
                  size="small"
                  InputProps={{ readOnly: true }}
                />
                <IconButton 
                  onClick={() => copyToClipboard(
                    credentialsDialog.credentials,
                    'Encoded credentials copied to clipboard'
                  )}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCredentialsDialog({ open: false, envVar: '', credentials: '' })}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ open: false, message: '' })}
          message={snackbar.message}
        />
      </Paper>
    </Box>
  );
};

export default DatabaseRegistry;
