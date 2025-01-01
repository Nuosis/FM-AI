import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { createLog, LogType, selectShowLogViewer } from '../../redux/slices/appSlice';
import axiosInstance from '../../utils/axios';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Alert,
  Snackbar,
  Chip,
  TableSortLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft as ChevronLeftIcon,
  Search as SearchIcon
} from '@mui/icons-material';

import ModuleSelectedForm from './ModuleSelectedForm';

const ModuleSelectedList = ({ license = null, onBack }) => {
  const dispatch = useDispatch();
  const showLogViewer = useSelector(selectShowLogViewer);
  const [moduleSelections, setModuleSelections] = useState([]);
  const [notification, setNotification] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({
    field: 'moduleName',
    direction: 'asc'
  });

  const fetchModuleSelections = async () => {
    if (!license) return;
    
    dispatch(createLog(`Fetching module selections for license ${license.fieldData.__ID}`, LogType.DEBUG));
    try {
      const response = await axiosInstance.get(`/api/admin/modulesselected/license/${license.fieldData.__ID}`);
      const data = response.data;
      setModuleSelections(data || []);
      setNotification(null);
      dispatch(createLog(`Successfully loaded ${data?.length || 0} module selections`, LogType.INFO));
    } catch (err) {
      console.error('Error fetching module selections:', err);
      setNotification({
        message: err.response?.data?.error || 'Failed to load module selections',
        severity: 'error'
      });
      dispatch(createLog(`Failed to fetch module selections: ${err.message}`, LogType.ERROR));
    }
  };

  useEffect(() => {
    if (license) {
      fetchModuleSelections();
    }
  }, [license]);

  const handleSort = (field) => {
    const newDirection = 
      sortConfig.field === field && sortConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc';
    setSortConfig({ field, direction: newDirection });
  };

  const handleModuleSubmit = async (formData) => {
    const isEdit = !!selectedModule;
    const method = isEdit ? 'PATCH' : 'POST';
    const url = isEdit 
      ? `/api/admin/modulesselected/${selectedModule.recordId}`
      : `/api/admin/modulesselected`;

    // Ensure all required fields are present
    const requiredFields = {
      _licenseID: license.fieldData.__ID,
      _orgID: license.fieldData._orgID,
      _moduleID: formData._moduleID,
      accessLevel: formData.accessLevel,
      dateStart: formData.dateStart,
      dateEnd: formData.dateEnd || license.fieldData.dateEnd, // Fallback to license end date
      f_taxGST: formData.f_taxGST
    };

    // Optional fields
    const optionalFields = {
      moduleName: formData.moduleName,
      price: formData.price,
      priceScheme: formData.priceScheme,
      usageCap: formData.usageCap,
      usageScheme: formData.usageScheme,
      overagePrice: formData.overagePrice,
      overageScheme: formData.overageScheme
    };

    try {
      // Validate required fields
      const missingFields = Object.keys(requiredFields)
        .filter(key => !requiredFields[key]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const axiosMethod = method === 'PATCH' ? 'patch' : 'post';
      await axiosInstance[axiosMethod](url, {
        ...requiredFields,
        ...optionalFields
      });

      dispatch(createLog(`Successfully ${isEdit ? 'updated' : 'created'} module selection`, LogType.INFO));
      await fetchModuleSelections();
      setOpenForm(false);
      setSelectedModule(null);
      setNotification({
        message: `Successfully ${isEdit ? 'updated' : 'created'} module selection`,
        severity: 'success'
      });
    } catch (err) {
      setNotification({
        message: err.message,
        severity: 'error'
      });
      dispatch(createLog(`Failed to ${isEdit ? 'update' : 'create'} module selection: ${err.message}`, LogType.ERROR));
    }
  };

  const handleDeleteModuleSelection = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this module selection?')) {
      return;
    }

    try {
      await axiosInstance.delete(`/api/admin/modulesselected/${recordId}`);

      dispatch(createLog('Successfully deleted module selection', LogType.INFO));
      await fetchModuleSelections();
      setNotification({
        message: 'Successfully deleted module selection',
        severity: 'success'
      });
    } catch (err) {
      setNotification({
        message: err.message,
        severity: 'error'
      });
      dispatch(createLog(`Failed to delete module selection: ${err.message}`, LogType.ERROR));
    }
  };

  const filteredAndSortedModules = useMemo(() => {
    let result = [...moduleSelections];

    // Filter based on search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(module => {
        const moduleName = module.fieldData.moduleName?.toLowerCase() || '';
        const accessLevel = module.fieldData.accessLevel?.toLowerCase() || '';
        const status = module.fieldData.f_active ? 'active' : 'inactive';
        return (
          moduleName.includes(lowerQuery) ||
          accessLevel.includes(lowerQuery) ||
          status.includes(lowerQuery)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.field) {
        case 'moduleName':
          aValue = a.fieldData.moduleName || '';
          bValue = b.fieldData.moduleName || '';
          break;
        case 'accessLevel':
          aValue = a.fieldData.accessLevel || '';
          bValue = b.fieldData.accessLevel || '';
          break;
        case 'status':
          aValue = a.fieldData.f_active ? 'active' : 'inactive';
          bValue = b.fieldData.f_active ? 'active' : 'inactive';
          break;
        case 'price':
          aValue = a.fieldData.price || '0';
          bValue = b.fieldData.price || '0';
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue.toString().localeCompare(bValue.toString());
      } else {
        return bValue.toString().localeCompare(aValue.toString());
      }
    });

    return result;
  }, [moduleSelections, searchQuery, sortConfig]);

  return (
    <Box sx={{ 
      p: 3,
      width: showLogViewer ? 'calc(100% - 400px)' : '100%',
      transition: 'width 0.3s ease'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={onBack} size="small" sx={{ mr: 1 }}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h5">Select Modules For {license?.organizationName || 'Unknown Organization'}</Typography>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        gap: 2
      }}>
        <Box sx={{ width: '30%', minWidth: '250px' }}>
          <TextField
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            setSelectedModule(null);
            setOpenForm(true);
          }}
        >
          Add Module Selection
        </Button>
      </Box>

      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {notification && (
          <Alert 
            onClose={() => setNotification(null)} 
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.field === 'moduleName'}
                  direction={sortConfig.field === 'moduleName' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('moduleName')}
                >
                  Module
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.field === 'accessLevel'}
                  direction={sortConfig.field === 'accessLevel' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('accessLevel')}
                >
                  Access Level
                </TableSortLabel>
              </TableCell>
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
                  active={sortConfig.field === 'price'}
                  direction={sortConfig.field === 'price' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('price')}
                >
                  Price
                </TableSortLabel>
              </TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedModules.map((module) => (
              <TableRow key={module.recordId}>
                <TableCell>{module.fieldData.moduleName}</TableCell>
                <TableCell>{module.fieldData.accessLevel}</TableCell>
                <TableCell>
                  <Chip
                    label={module.fieldData.f_active ? 'Active' : 'Inactive'}
                    color={module.fieldData.f_active ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {`${module.fieldData.price} (${module.fieldData.priceScheme})`}
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => {
                      setSelectedModule(module);
                      setOpenForm(true);
                    }}
                    title="Edit Module Selection"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteModuleSelection(module.recordId)}
                    title="Delete Module Selection"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {moduleSelections.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No module selections found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ModuleSelectedForm
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setSelectedModule(null);
        }}
        moduleSelection={selectedModule}
        license={license}
        onSubmit={handleModuleSubmit}
      />
    </Box>
  );
};

ModuleSelectedList.propTypes = {
  license: PropTypes.shape({
    fieldData: PropTypes.shape({
      __ID: PropTypes.string.isRequired,
      _orgID: PropTypes.string.isRequired,
      dateEnd: PropTypes.string.isRequired
    }).isRequired,
    organizationName: PropTypes.string
  }),
  onBack: PropTypes.func.isRequired
};

export default ModuleSelectedList;
