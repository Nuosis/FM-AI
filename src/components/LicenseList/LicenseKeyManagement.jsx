import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { createLog, LogType } from '../../redux/slices/appSlice';
import axiosInstance from '../../utils/axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  FormGroup,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Tooltip,
  TextField
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

const LicenseKeyManagement = ({ open, onClose, license = null }) => {
  const dispatch = useDispatch();
  const [licenseKeys, setLicenseKeys] = useState([]);
  const [error, setError] = useState(null);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    type: 'production',
    description: '',
    modules: []
  });
  const [moduleNames, setModuleNames] = useState({}); // Map of moduleId to moduleName
  const [copySuccess, setCopySuccess] = useState('');

  // Log when form is shown
  useEffect(() => {
    if (showNewKeyForm) {
      dispatch(createLog('License Key creation form opened', LogType.INFO));
    }
  }, [showNewKeyForm, dispatch]);

  // Fetch modules_selected when license changes
  useEffect(() => {
    const fetchModules = async () => {
      if (license?.fieldData?.__ID) {
        dispatch(createLog(`Fetching modules for license ${license.fieldData.__ID}`, LogType.INFO));
        try {
          const response = await axiosInstance.get(`/api/admin/modulesselected/license/${license.fieldData.__ID}`);
          const data = response.data;

          // Log raw response data
          dispatch(createLog('Raw modules_selected response:', LogType.DEBUG));
          dispatch(createLog(JSON.stringify(data, null, 2), LogType.DEBUG));

          // Process data
          const moduleIds = data.map(module => module.fieldData._moduleID);
          // Create a map of moduleId to moduleName
          const nameMap = data.reduce((acc, module) => {
            acc[module.fieldData._moduleID] = module.fieldData.moduleName;
            return acc;
          }, {});
          setModuleNames(nameMap);
          setNewKeyData(prev => ({
            ...prev,
            modules: moduleIds
          }));
          
          // Log processed data
          dispatch(createLog('Processed modules data:', LogType.DEBUG));
          dispatch(createLog(JSON.stringify({
            moduleIds,
            moduleNames: nameMap,
            rawData: data
          }, null, 2), LogType.DEBUG));
        } catch (err) {
          console.error('Error fetching modules:', err);
          dispatch(createLog(`Error fetching modules: ${err.message}`, LogType.ERROR));
          setError('Failed to load modules');
        }
      }
    };

    fetchModules();
  }, [license, dispatch]);

  useEffect(() => {
    if (open && license) {
      fetchLicenseKeys();
    }
  }, [open, license]);

  const fetchLicenseKeys = async () => {
    try {
      const response = await fetch(`/api/licenses/${license.fieldData.__ID}/keys`, {
        headers: {
          'Authorization': `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch License Keys');
      }
      const data = await response.json();
      dispatch(createLog('License Keys response:', LogType.DEBUG));
      dispatch(createLog(JSON.stringify(data, null, 2), LogType.DEBUG));
      setLicenseKeys(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching License Keys:', err);
      dispatch(createLog(`Error fetching License Keys: ${err.message}`, LogType.ERROR));
      setError('Failed to load License Keys');
    }
  };

  const resetForm = () => {
    setNewKeyData(prev => ({
      type: 'production',
      description: '',
      modules: prev.modules // Keep existing modules
    }));
    setShowNewKeyForm(false);
    dispatch(createLog('License Key creation form reset', LogType.INFO));
  };

  const handleCreateLicenseKey = async () => {
    try {
      dispatch(createLog(`Creating License Key for license ${license.fieldData.__ID}`, LogType.INFO));
      dispatch(createLog('Selected modules:', LogType.DEBUG));
      dispatch(createLog(JSON.stringify({
        moduleIds: newKeyData.modules,
        moduleNames: newKeyData.modules.map(id => moduleNames[id])
      }, null, 2), LogType.DEBUG));

      const response = await fetch(`/api/licenses/${license.fieldData.__ID}/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        },
        body: JSON.stringify({
          ...newKeyData,
          f_active: '1', // Always active for new keys (using string '1' for FileMaker)
          _licenseID: license.fieldData.__ID
        })
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create License Key');
      }
      dispatch(createLog('Create License Key response:', LogType.DEBUG));
      dispatch(createLog(JSON.stringify(responseData, null, 2), LogType.DEBUG));

      await fetchLicenseKeys();
      resetForm();
      setError(null);
      dispatch(createLog('License Key created successfully', LogType.INFO));
    } catch (err) {
      console.error('Error creating License Key:', err);
      dispatch(createLog(`Error creating License Key: ${err.message}`, LogType.ERROR));
      setError(err.message);
    }
  };

  const handleUpdateLicenseKey = async (recordId, updatedData) => {
    try {
      dispatch(createLog(`Updating License Key ${recordId}`, LogType.INFO));
      const response = await fetch(
        `/api/licenses/${license.fieldData.__ID}/keys/${recordId}/modules`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
          },
          body: JSON.stringify({
            ...updatedData,
            _licenseID: license.fieldData.__ID
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update License Key');
      }

      await fetchLicenseKeys();
      setError(null);
      dispatch(createLog('License Key updated successfully', LogType.INFO));
    } catch (err) {
      console.error('Error updating License Key:', err);
      dispatch(createLog(`Error updating License Key: ${err.message}`, LogType.ERROR));
      setError(err.message);
    }
  };

  const copyToClipboard = async (text, field) => {
    console.log({ text, field });
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      console.error('Clipboard API is not available.');
      setError('Clipboard API is not supported in this environment');
      dispatch(createLog('Clipboard API not supported', LogType.ERROR));
      return;
    }
  
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`${field} copied!`);
      setTimeout(() => setCopySuccess(''), 2000);
      dispatch(createLog(`${field} copied to clipboard`, LogType.INFO));
    } catch (err) {
      console.error('Failed to copy text:', err);
      setError('Failed to copy to clipboard');
      dispatch(createLog(`Error copying to clipboard: ${err.message}`, LogType.ERROR));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography>Manage License Keys</Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setShowNewKeyForm(true)}
            disabled={showNewKeyForm}
          >
            New License Key
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {copySuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {copySuccess}
            </Alert>
          )}

          {showNewKeyForm && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Create New License Key
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <TextField
                    required
                    label="Description"
                    value={newKeyData.description}
                    onChange={(e) => setNewKeyData({
                      ...newKeyData,
                      description: e.target.value
                    })}
                    sx={{ flex: 4 }}
                    helperText="Provide a description for this License Key"
                  />
                  
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={newKeyData.type}
                      onChange={(e) => setNewKeyData({
                        ...newKeyData,
                        type: e.target.value
                      })}
                      label="Type"
                    >
                      <MenuItem value="development">Development</MenuItem>
                      <MenuItem value="staging">Staging</MenuItem>
                      <MenuItem value="production">Production</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <FormControl component="fieldset">
                  <Typography variant="subtitle2" gutterBottom>
                    Modules
                  </Typography>
                  <FormGroup sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                    {newKeyData.modules.map((moduleId) => (
                      <FormControlLabel
                        key={moduleId}
                        control={
                          <Checkbox
                            checked={newKeyData.modules.includes(moduleId)}
                            onChange={(e) => {
                              const updatedModules = e.target.checked
                                ? [...newKeyData.modules, moduleId]
                                : newKeyData.modules.filter(m => m !== moduleId);
                              setNewKeyData({
                                ...newKeyData,
                                modules: updatedModules
                              });
                              dispatch(createLog(
                                `Module ${moduleId} (${moduleNames[moduleId]}) ${e.target.checked ? 'selected' : 'deselected'}`,
                                LogType.DEBUG
                              ));
                            }}
                          />
                        }
                        label={moduleNames[moduleId] || moduleId}
                      />
                    ))}
                  </FormGroup>
                </FormControl>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                  <Button onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleCreateLicenseKey}
                    disabled={!newKeyData.description || newKeyData.modules.length === 0}
                  >
                    Create
                  </Button>
                </Box>
              </Box>
            </Paper>
          )}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Modules</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Expiration</TableCell>
                  <TableCell>Private Key</TableCell>
                  <TableCell>JWT</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {licenseKeys.map((apiKey) => (
                  <TableRow key={apiKey.fieldData.__ID}>
                    <TableCell>{apiKey.fieldData.description}</TableCell>
                    <TableCell>{apiKey.fieldData.type}</TableCell>
                    <TableCell>
                      {(() => {
                        const modules = typeof apiKey.fieldData.modules === 'string' 
                          ? JSON.parse(apiKey.fieldData.modules)
                          : apiKey.fieldData.modules || [];
                        return modules.map(moduleId => 
                          moduleNames[moduleId] || 'Unknown Module'
                        ).join(', ');
                      })()}
                    </TableCell>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={apiKey.fieldData.f_active === '1'}
                            onChange={(e) => handleUpdateLicenseKey(
                              apiKey.recordId,
                              { f_active: e.target.checked ? '1' : '0' }
                            )}
                          />
                        }
                        label={apiKey.fieldData.f_active === '1' ? 'Active' : 'Inactive'}
                      />
                    </TableCell>
                    <TableCell>
                      {apiKey.fieldData.expiration ? new Date(apiKey.fieldData.expiration).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {apiKey.fieldData.privateKey ? (
                          <>
                            <CheckCircleIcon sx={{ color: 'green' }} />
                            <Tooltip title="Copy private key">
                              <IconButton
                                onClick={() => copyToClipboard(apiKey.fieldData.privateKey, 'Private key')}
                                size="small"
                              >
                                <CopyIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <ErrorIcon sx={{ color: 'red' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {apiKey.fieldData.jwt ? (
                          <>
                            <CheckCircleIcon sx={{ color: 'green' }} />
                            <Tooltip title="Copy JWT">
                              <IconButton
                                onClick={() => copyToClipboard(apiKey.fieldData.jwt, 'JWT')}
                                size="small"
                              >
                                <CopyIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <ErrorIcon sx={{ color: 'red' }} />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {licenseKeys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No License Keys available. Click &quot;New License Key&quot; to create one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

LicenseKeyManagement.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  license: PropTypes.shape({
    fieldData: PropTypes.shape({
      __ID: PropTypes.string.isRequired,
      modules: PropTypes.arrayOf(PropTypes.string)
    }).isRequired
  })
};

export default LicenseKeyManagement;
