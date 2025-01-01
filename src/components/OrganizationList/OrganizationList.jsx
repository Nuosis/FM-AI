import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  TextField,
  Typography,
  Alert,
  TableSortLabel,
  useMediaQuery,
  useTheme,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import {
  fetchOrganizations,
  deleteOrganization,
  selectOrganizations,
  selectOrganizationLoading,
  selectOrganizationError,
  setSearchQuery,
  setSortConfig,
  selectSearchQuery,
  selectSortConfig,
  selectOrganizationRefresh,
  setRefresh,
  setNotification,
  clearNotification,
  selectNotification,
  selectOrganization,
  selectSelectedOrganizationId,
  selectOrganizationById
} from '../../redux/slices/organizationSlice';
import { createLog, LogType, selectShowLogViewer } from '../../redux/slices/appSlice';
import OrganizationDetails from '../OrganizationDetails';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryFetch = async (dispatch, name = null, maxAttempts = 5, baseDelay = 100) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await delay(baseDelay * Math.pow(2, attempt));
    dispatch(createLog(`Retry attempt ${attempt + 1} to fetch organizations`, LogType.DEBUG));
    const result = await dispatch(fetchOrganizations()).unwrap();
    
    if (name) {
      if (result.some(org => org.fieldData?.Name === name)) {
        dispatch(setRefresh(false));
        dispatch(createLog(`Successfully found new organization: ${name}`, LogType.DEBUG));
        return true;
      }
    } else {
      dispatch(setRefresh(false));
      return true;
    }
  }
  dispatch(createLog('Failed to fetch organizations after multiple attempts', LogType.ERROR));
  return false;
};

const OrganizationList = () => {
  const dispatch = useDispatch();
  const organizations = useSelector(selectOrganizations);
  const loading = useSelector(selectOrganizationLoading);
  const error = useSelector(selectOrganizationError);
  const searchQuery = useSelector(selectSearchQuery);
  const sortConfig = useSelector(selectSortConfig);
  const refresh = useSelector(selectOrganizationRefresh);
  const showLogViewer = useSelector(selectShowLogViewer);
  const notification = useSelector(selectNotification);
  const selectedOrganizationId = useSelector(selectSelectedOrganizationId);
  const selectedOrganization = useSelector(state => 
    selectedOrganizationId ? selectOrganizationById(state, selectedOrganizationId) : null
  );
  const theme = useTheme();
  const isMediumOrSmaller = useMediaQuery(theme.breakpoints.down('lg'));

  useEffect(() => {
    if (refresh) {
      dispatch(createLog('Fetching organizations', LogType.INFO));
      dispatch(fetchOrganizations()).unwrap()
        .then(() => {
          dispatch(setRefresh(false));
          dispatch(createLog('Successfully fetched organizations', LogType.DEBUG));
        })
        .catch((err) => {
          dispatch(createLog(`Error fetching organizations: ${err.message}`, LogType.ERROR));
        });
    }
  }, [dispatch, refresh]);

  const handleDelete = async (organization) => {
    const orgId = organization.fieldData?.__ID;
    const name = organization.fieldData?.Name;
    
    if (!window.confirm('Are you sure you want to delete this organization?')) {
      dispatch(createLog(`Organization deletion cancelled for: ${name}`, LogType.DEBUG));
      return;
    }

    try {
      dispatch(createLog(`Deleting organization: ${name}`, LogType.INFO));
      await dispatch(deleteOrganization(orgId)).unwrap();
      dispatch(setNotification({
        message: `Successfully deleted ${name}`,
        severity: 'success'
      }));
      dispatch(createLog(`Successfully deleted organization: ${name}`, LogType.INFO));
      await retryFetch(dispatch);
    } catch (err) {
      dispatch(setNotification({
        message: `Error deleting organization: ${err.message}`,
        severity: 'error'
      }));
      dispatch(createLog(`Error deleting organization: ${err.message}`, LogType.ERROR));
    }
  };

  const handleSort = (field) => {
    const newDirection = 
      sortConfig.field === field && sortConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc';
    dispatch(setSortConfig({ field, direction: newDirection }));
    dispatch(createLog(`Organizations sorted by ${field} ${newDirection}`, LogType.DEBUG));
  };

  const handleCloseNotification = () => {
    dispatch(clearNotification());
  };

  return (
    <Box sx={{ 
      width: showLogViewer ? 'Fit Content' : '100%',
      p: 4,
      marginRight: showLogViewer ? 10 : 4,
      height: '100vh',
      overflowY: 'auto'
    }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Organizations</Typography>

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        gap: 2
      }}>
        <Box sx={{ width: '30%', minWidth: '250px' }}>
          <TextField
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => {
              dispatch(setSearchQuery(e.target.value));
              dispatch(createLog(`Organization search query: ${e.target.value}`, LogType.DEBUG));
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
          onClick={() => dispatch(selectOrganization(null))}
          sx={{ 
            height: '40px',
            minWidth: isMediumOrSmaller ? '40px' : 'auto',
            width: isMediumOrSmaller ? '40px' : 'auto',
            padding: isMediumOrSmaller ? '8px' : undefined,
            '& .MuiButton-startIcon': {
              margin: isMediumOrSmaller ? 0 : undefined
            }
          }}
        >
          <Box sx={{ display: { xs: 'block', lg: 'block' }, visibility: isMediumOrSmaller ? 'hidden' : 'visible', width: isMediumOrSmaller ? 0 : 'auto' }}>
            Add Organization
          </Box>
        </Button>
      </Box>

      {/* Only show error in list view when details dialog is not open */}
      {error && !selectedOrganization && (
        <Alert 
          severity={error.includes('No organizations found') ? 'info' : 'error'} 
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
                  active={sortConfig.field === 'Name'}
                  direction={sortConfig.field === 'Name' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('Name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.field === 'Website'}
                  direction={sortConfig.field === 'Website' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('Website')}
                >
                  Website
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography variant="body2" color="textSecondary">
                    Loading organizations...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography variant="body2" color="textSecondary">
                    {searchQuery 
                      ? 'No organizations match your search criteria.'
                      : 'No organizations available. Click "Add Organization" to create one.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org) => (
                <TableRow key={org.fieldData?.__ID}>
                  <TableCell>{org.fieldData?.Name}</TableCell>
                  <TableCell>{org.fieldData?.website}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => {
                        const orgId = org.fieldData?.__ID;
                        dispatch(createLog(`Opening organization details for: ${org.fieldData?.Name} (ID: ${orgId})`, LogType.DEBUG));
                        dispatch(selectOrganization(orgId));
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(org)}
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

      {selectedOrganization && (
        <OrganizationDetails
          organization={selectedOrganization}
          onClose={() => dispatch(selectOrganization(null))}
        />
      )}

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

export default OrganizationList;
