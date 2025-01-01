import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axiosInstance from '../../utils/axios';
import { createLog, LogType, selectShowLogViewer } from '../../redux/slices/appSlice';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const ModuleList = () => {
  const dispatch = useDispatch();
  const showLogViewer = useSelector(selectShowLogViewer);
  const [modules, setModules] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [formData, setFormData] = useState({ moduleName: '' });
  const [error, setError] = useState(null);

  const fetchModules = async () => {
    dispatch(createLog('Fetching modules list...', LogType.INFO));
    try {
      const full_response = await axiosInstance.get('/api/admin/modules/');
      const response=full_response.data.response
      console.log({response})
      // Ensure we have an array to work with
      const moduleArray = Array.isArray(response.data) ? response.data : [];
      dispatch(createLog(`Successfully fetched ${moduleArray.length} modules`, LogType.INFO));
      // Sort modules alphabetically by moduleName
      const sortedModules = moduleArray.sort((a, b) => 
        a.fieldData.moduleName.localeCompare(b.fieldData.moduleName)
      );
      setModules(sortedModules || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching modules:', err);
      dispatch(createLog(`Failed to fetch modules: ${err.message}`, LogType.ERROR));
      setModules([]);
      setError('Unable to load modules. You can still add new modules.');
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleOpenDialog = (module = null) => {
    setSelectedModule(module);
    setFormData({ moduleName: module ? module.fieldData.moduleName : '' });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedModule(null);
    setFormData({ moduleName: '' });
  };

  const handleSubmit = async () => {
    const action = selectedModule ? 'update' : 'create';
    dispatch(createLog(`Attempting to ${action} module: ${formData.moduleName}`, LogType.INFO));
    try {
      const url = selectedModule 
        ? `/api/admin/modules/${selectedModule.recordId}/`
        : '/api/admin/modules/';
      
      const requestData = {
        moduleName: formData.moduleName
      };
      
      if (selectedModule) {
        await axiosInstance.put(url, requestData);
        dispatch(createLog(`Successfully updated module: ${formData.moduleName}`, LogType.INFO));
      } else {
        await axiosInstance.post(url, requestData);
        dispatch(createLog(`Successfully created module: ${formData.moduleName}`, LogType.INFO));
      }

      handleCloseDialog();
      fetchModules();
    } catch (err) {
      const errorMessage = err.response?.data?.error || `Failed to ${action} module`;
      console.error('Error saving module:', err);
      dispatch(createLog(`Error ${action}ing module: ${errorMessage}`, LogType.ERROR));
      setError(errorMessage);
    }
  };

  const handleDelete = async (recordId, moduleName) => {
    if (!window.confirm('Are you sure you want to delete this module?')) {
      return;
    }

    dispatch(createLog(`Attempting to delete module: ${moduleName}`, LogType.INFO));
    try {
      await axiosInstance.delete(`/api/admin/modules/${recordId}`);
      dispatch(createLog(`Successfully deleted module: ${moduleName}`, LogType.INFO));
      fetchModules();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to delete module';
      console.error('Error deleting module:', err);
      dispatch(createLog(`Error deleting module: ${errorMessage}`, LogType.ERROR));
      setError(errorMessage);
    }
  };

  return (
    <Box sx={{ 
      p: 3,
      marginRight: showLogViewer ? '400px' : 0,
      transition: 'margin-right 0.3s ease-in-out'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Modules</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Module
        </Button>
      </Box>

      {error && (
        <Alert 
          severity={error.includes('No modules found') ? 'info' : 'error'} 
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Module Name</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No modules available. Click &quot;Add Module&quot; to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              modules.map((module) => (
                <TableRow key={module.fieldData.__ID}>
                  <TableCell>{module.fieldData.moduleName}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(module)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(module.recordId, module.fieldData.moduleName)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {selectedModule ? 'Edit Module' : 'Add Module'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Module Name"
            fullWidth
            value={formData.moduleName}
            onChange={(e) => setFormData({ ...formData, moduleName: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedModule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModuleList;
