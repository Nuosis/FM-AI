import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createLog, LogType, selectShowLogViewer } from '../../redux/slices/appSlice';
import {
  setSearchQuery,
  setSortConfig,
  setNotification,
  clearNotification,
  selectSearchQuery,
  selectSortConfig,
  selectNotification
} from '../../redux/slices/licenseSlice';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  Chip,
  TextField,
  TableSortLabel,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Key as KeyIcon,
  Extension as ModuleIcon,
  Search as SearchIcon
} from '@mui/icons-material';

import LicenseForm from './LicenseForm';
import ModuleSelectedList from './ModuleSelectedList';
import LicenseKeyManagement from './LicenseKeyManagement';

const LicenseList = () => {
  const dispatch = useDispatch();
  const [licenses, setLicenses] = useState([]);
  const searchQuery = useSelector(selectSearchQuery);
  const sortConfig = useSelector(selectSortConfig);
  const notification = useSelector(selectNotification);
  const [organizations, setOrganizations] = useState({});

  const fetchOrganizations = async () => {
    dispatch(createLog('Fetching organizations for license list', LogType.DEBUG));
    try {
      const response = await fetch('/api/organizations/', {
        headers: {
          'Authorization': `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch organizations');
      }
      const data = await response.json();
      const orgMap = {};
      data.forEach(org => {
        orgMap[org.fieldData.__ID] = org.fieldData.Name;
      });
      setOrganizations(orgMap);
      dispatch(createLog(`Successfully mapped ${Object.keys(orgMap).length} organizations`, LogType.INFO));
    } catch (err) {
      console.error('Error fetching organizations:', err);
      dispatch(createLog(`Failed to fetch organizations: ${err.message}`, LogType.ERROR));
      dispatch(setNotification({
        message: `Failed to fetch organizations: ${err.message}`,
        severity: 'error'
      }));
    }
  };
  const [error, setError] = useState(null);
  const [selectedLicense, setSelectedLicense] = useState(null);
  
  // Dialog states
  const [openLicenseDialog, setOpenLicenseDialog] = useState(false);
  const [showModuleSelections, setShowModuleSelections] = useState(false);
  const [openLicenseKeyDialog, setOpenLicenseKeyDialog] = useState(false);

  const fetchLicenses = async () => {
    dispatch(createLog('Fetching all licenses', LogType.DEBUG));
    try {
      const response = await fetch('/api/admin/licenses/', {
        headers: {
          'Authorization': `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch licenses');
      }
      const data = await response.json();
      setLicenses(data || []);
      setError(null);
      dispatch(createLog(`Successfully loaded ${data?.length || 0} licenses`, LogType.INFO));
    } catch (err) {
      console.error('Error fetching licenses:', err);
      setLicenses([]);
      setError('Unable to load licenses. You can still add new licenses.');
      dispatch(createLog(`Failed to fetch licenses: ${err.message}`, LogType.ERROR));
      dispatch(setNotification({
        message: `Failed to fetch licenses: ${err.message}`,
        severity: 'error'
      }));
    }
  };

  useEffect(() => {
    fetchLicenses();
    fetchOrganizations();
  }, []);

  const handleLicenseSubmit = async (formData) => {
    const action = selectedLicense ? 'update' : 'create';
    dispatch(createLog(`Attempting to ${action} license for organization ${formData._orgID}`, LogType.INFO));
    try {
      const url = selectedLicense 
        ? `/api/admin/licenses/${selectedLicense.fieldData['~dapiRecordID']}/`
        : '/api/admin/licenses/';
      
      dispatch(createLog(`License details - Term: ${formData.licenseTerm} ${formData.licenseTermUnit}, Devices: ${formData.maxDevices}, Active: ${formData.f_active}`, LogType.DEBUG));
      
      if (selectedLicense) {
        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
          },
          body: JSON.stringify(formData)
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to ${action} license`);
        }
      } else {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
          },
          body: JSON.stringify(formData)
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to ${action} license`);
        }
      }

      dispatch(createLog(`Successfully ${action}d license`, LogType.INFO));
      dispatch(setNotification({
        message: `Successfully ${action}d license`,
        severity: 'success'
      }));
      setOpenLicenseDialog(false);
      fetchLicenses();
    } catch (err) {
      console.error('Error saving license:', err);
      setError(err.response?.data?.error || err.message);
      dispatch(createLog(`Failed to ${action} license: ${err.message}`, LogType.ERROR));
      dispatch(setNotification({
        message: `Failed to ${action} license: ${err.message}`,
        severity: 'error'
      }));
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this license?')) {
      return;
    }

    dispatch(createLog(`Attempting to delete license ${recordId}`, LogType.WARNING));
    try {
      const response = await fetch(`/api/admin/licenses/${recordId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete license');
      }

      dispatch(createLog(`Successfully deleted license ${recordId}`, LogType.INFO));
      dispatch(setNotification({
        message: 'Successfully deleted license',
        severity: 'success'
      }));
      fetchLicenses();
    } catch (err) {
      console.error('Error deleting license:', err);
      setError(err.response?.data?.error || err.message);
      dispatch(createLog(`Failed to delete license ${recordId}: ${err.message}`, LogType.ERROR));
      dispatch(setNotification({
        message: `Failed to delete license: ${err.message}`,
        severity: 'error'
      }));
    }
  };

  const showLogViewer = useSelector(selectShowLogViewer);

  const handleSort = (field) => {
    const newDirection = 
      sortConfig.field === field && sortConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc';
    dispatch(setSortConfig({ field, direction: newDirection }));
    dispatch(createLog(`Licenses sorted by ${field} ${newDirection}`, LogType.DEBUG));
  };

  const handleCloseNotification = () => {
    dispatch(clearNotification());
  };

  const filteredAndSortedLicenses = useMemo(() => {
    let result = [...licenses];

    // Filter based on search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(license => {
        const orgName = organizations[license.fieldData._orgID]?.toLowerCase() || '';
        const status = license.fieldData.f_active ? 'active' : 'inactive';
        return (
          orgName.includes(lowerQuery) ||
          status.includes(lowerQuery) ||
          license.fieldData.dateEnd?.toLowerCase().includes(lowerQuery)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.field) {
        case 'organization':
          aValue = organizations[a.fieldData._orgID] || '';
          bValue = organizations[b.fieldData._orgID] || '';
          break;
        case 'status':
          aValue = a.fieldData.f_active ? 'active' : 'inactive';
          bValue = b.fieldData.f_active ? 'active' : 'inactive';
          break;
        case 'dateEnd':
          aValue = a.fieldData.dateEnd || '';
          bValue = b.fieldData.dateEnd || '';
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return result;
  }, [licenses, organizations, searchQuery, sortConfig]);

  if (showModuleSelections && selectedLicense) {
    return (
      <ModuleSelectedList
        license={selectedLicense}
        onBack={() => {
          setShowModuleSelections(false);
          setSelectedLicense(null);
        }}
      />
    );
  }

  return (
    <Box sx={{ 
      p: 3,
      width: showLogViewer ? 'calc(100% - 400px)' : '100%',
      transition: 'width 0.3s ease'
    }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Licenses</Typography>

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        gap: 2
      }}>
        <Box sx={{ width: '30%', minWidth: '250px' }}>
          <TextField
            placeholder="Search licenses..."
            value={searchQuery}
            onChange={(e) => {
              dispatch(setSearchQuery(e.target.value));
              dispatch(createLog(`License search query: ${e.target.value}`, LogType.DEBUG));
            }}
            sx={{ 
              width: '100%',
              '& .MuiInputBase-root': {
                height: '40px'
              }
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            }}
          />
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedLicense(null);
            setOpenLicenseDialog(true);
          }}
        >
          Add License
        </Button>
      </Box>

      {error && (
        <Alert 
          severity={error.includes('No licenses found') ? 'info' : 'error'} 
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.field === 'status'}
                  direction={sortConfig.field === 'status' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.field === 'organization'}
                  direction={sortConfig.field === 'organization' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('organization')}
                >
                  Organization
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.field === 'dateEnd'}
                  direction={sortConfig.field === 'dateEnd' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('dateEnd')}
                >
                  End Date
                </TableSortLabel>
              </TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {licenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No licenses available. Click &quot;Add License&quot; to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedLicenses.map((license) => (
                <TableRow key={license.fieldData.__ID}>
                  <TableCell>
                    <Chip
                      label={license.fieldData.f_active ? 'Active' : 'Inactive'}
                      color={license.fieldData.f_active ? 'success' : 'error'}
                      sx={{ fontWeight: 'medium' }}
                    />
                  </TableCell>
                  <TableCell>{organizations[license.fieldData._orgID] || 'Unknown'}</TableCell>
                  <TableCell>{license.fieldData.dateEnd}</TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => {
                        setSelectedLicense({
                          ...license,
                          organizationName: organizations[license.fieldData._orgID]
                        });
                        setOpenLicenseDialog(true);
                      }}
                      title="Edit License"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="secondary"
                      onClick={() => {
                        setSelectedLicense({
                          ...license,
                          organizationName: organizations[license.fieldData._orgID]
                        });
                        setShowModuleSelections(true);
                      }}
                      title="Manage Modules"
                    >
                      <ModuleIcon />
                    </IconButton>
                    <IconButton
                      color="info"
                      onClick={() => {
                        setSelectedLicense(license);
                        setOpenLicenseKeyDialog(true);
                      }}
                      title="Manage License Keys"
                    >
                      <KeyIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(license.fieldData['~dapiRecordID'])}
                      title="Delete License"
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

      {/* License Form Dialog */}
      <LicenseForm
        open={openLicenseDialog}
        onClose={() => {
          setOpenLicenseDialog(false);
          setSelectedLicense(null);
        }}
        selectedLicense={selectedLicense}
        onSubmit={handleLicenseSubmit}
      />


      {/* License Key Management Dialog */}
      <LicenseKeyManagement
        open={openLicenseKeyDialog}
        onClose={() => {
          setOpenLicenseKeyDialog(false);
          setSelectedLicense(null);
        }}
        license={selectedLicense}
      />

      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {notification && (
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

export default LicenseList;
