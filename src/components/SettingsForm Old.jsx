import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { createLog, LogType } from '../redux/slices/appSlice';
import axiosInstance from '../utils/axios';
import {
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Paper,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const SettingsForm = ({ license, onNotification, onModuleUpdate }) => {
  const dispatch = useDispatch();
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [serviceFields, setServiceFields] = useState([]);
  const [addedFields, setAddedFields] = useState([]);

  // Filter modules based on license
  const fetchAvailableModules = async () => {
    if (!license) return;
    try {
      const response = await axiosInstance.get(`/api/admin/modulesselected/license/${license.fieldData.__ID}`);
      const data = response.data;
      dispatch(createLog(`Module response data: ${JSON.stringify(data)}`, LogType.DEBUG));
      const modules = Array.isArray(data) ? data : [];
      setAvailableModules(modules);
      dispatch(createLog(`Successfully loaded ${modules.length} available modules`, LogType.INFO));
    } catch (err) {
      const errorMsg = `Failed to fetch available modules: ${err.message}`;
      dispatch(createLog(errorMsg, LogType.ERROR));
      onNotification?.({
        message: errorMsg,
        severity: 'error'
      });
    }
  };

  // Service field definitions
  const SERVICE_FIELDS = [
    { key: 'service_apiKey', label: 'API Key' },
    { key: 'service_clientSecret', label: 'Client Secret' },
    { key: 'service_identifier', label: 'Identifier' },
    { key: 'service_refreshToken', label: 'Refresh Token' },
    { key: 'service_token', label: 'Token' },
    { key: 'service_url', label: 'URL' }
  ];

  // Fetch module and its existing service fields
  const fetchModuleFields = async (moduleId) => {
    try {
      // Find the module record from availableModules
      const module = availableModules.find(m => m.fieldData.__ID === moduleId);
      if (!module) {
        throw new Error('Module not found');
      }

      setServiceFields(SERVICE_FIELDS);

      // Extract existing service field values from the module data
      const existingFields = SERVICE_FIELDS
        .filter(field => module.fieldData[field.key])
        .map(field => ({
          moduleId,
          recordId: module.recordId,
          field: field.label,
          value: module.fieldData[field.key]
        }));
      setAddedFields(existingFields);
    } catch (err) {
      const errorMsg = `Failed to fetch module fields: ${err.message}`;
      dispatch(createLog(errorMsg, LogType.ERROR));
      onNotification?.({
        message: errorMsg,
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    fetchAvailableModules();
  }, [license]);

  useEffect(() => {
    if (selectedModule) {
      fetchModuleFields(selectedModule);
    }
  }, [selectedModule]);

  // Mask sensitive values
  const maskValue = (value) => {
    if (!value) return '';
    if (value.length <= 8) {
      return value.slice(0, 2) + '***' + value.slice(-2);
    }
    return value.slice(0, 4) + '***' + value.slice(-4);
  };

  // Handle adding a new field
  const handleAddField = async () => {
    if (!selectedModule || !selectedField || !fieldValue) return;

    try {
      // Find the module record from availableModules
      const module = availableModules.find(m => m.fieldData.__ID === selectedModule);
      if (!module) {
        throw new Error('Module not found');
      }

      // Find the service field key that matches the selected field label
      const fieldKey = SERVICE_FIELDS.find(f => f.label === selectedField)?.key;
      if (!fieldKey) {
        throw new Error('Invalid field selected');
      }

      // Update the module record with the new service field using recordId
      await axiosInstance.patch(`/api/admin/modulesselected/${module.recordId}`, {
        [fieldKey]: fieldValue
      });

      setAddedFields([
        ...addedFields,
        {
          moduleId: selectedModule,
          recordId: module.recordId,
          field: selectedField,
          value: fieldValue
        }
      ]);

      // Reset field inputs
      setSelectedField('');
      setFieldValue('');

      dispatch(createLog('Successfully added service field', LogType.INFO));
      onNotification?.({
        message: 'Successfully added service field',
        severity: 'success'
      });
      onModuleUpdate?.();
    } catch (err) {
      const errorMsg = `Failed to add service field: ${err.message}`;
      dispatch(createLog(errorMsg, LogType.ERROR));
      onNotification?.({
        message: errorMsg,
        severity: 'error'
      });
    }
  };

  // Handle deleting a field
  const handleDeleteField = async (moduleId, field) => {
    try {
      // Find the field record from addedFields
      const fieldRecord = addedFields.find(f => f.moduleId === moduleId && f.field === field);
      if (!fieldRecord) {
        throw new Error('Field record not found');
      }

      // Find the service field key that matches the field label
      const fieldKey = SERVICE_FIELDS.find(f => f.label === field)?.key;
      if (!fieldKey) {
        throw new Error('Invalid field selected');
      }

      // Use recordId for the PATCH request and empty string to clear field
      await axiosInstance.patch(`/api/admin/modulesselected/${fieldRecord.recordId}`, {
        [fieldKey]: ""
      });

      setAddedFields(addedFields.filter(f => 
        !(f.moduleId === moduleId && f.field === field)
      ));

      dispatch(createLog('Successfully deleted service field', LogType.INFO));
      onNotification?.({
        message: 'Successfully deleted service field',
        severity: 'success'
      });
      onModuleUpdate?.();
    } catch (err) {
      const errorMsg = `Failed to delete service field: ${err.message}`;
      dispatch(createLog(errorMsg, LogType.ERROR));
      onNotification?.({
        message: errorMsg,
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {license?.fieldData?.organizationName || 'Organization'} Service Configuration
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Module</InputLabel>
          <Select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            label="Module"
          >
            {availableModules.map((module) => (
              <MenuItem key={module.fieldData.__ID} value={module.fieldData.__ID}>
                {module.fieldData.moduleName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Field</InputLabel>
          <Select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            label="Field"
            disabled={!selectedModule}
          >
            {serviceFields.map((field) => (
              <MenuItem key={field.key} value={field.label}>
                {field.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Value"
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          disabled={!selectedField}
          sx={{ minWidth: 200 }}
        />

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddField}
          disabled={!selectedModule || !selectedField || !fieldValue}
        >
          Add Field
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Keys
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {addedFields.map((field, index) => {
            const module = availableModules.find(m => m.fieldData.__ID === field.moduleId);
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  bgcolor: 'background.default',
                  borderRadius: 1
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={module?.fieldData.moduleName || 'Unknown Module'}
                    size="small"
                    color="primary"
                  />
                  <Typography>
                    {field.field}: {maskValue(field.value)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteField(field.moduleId, field.field)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            );
          })}
          {addedFields.length === 0 && (
            <Typography color="textSecondary">
              No keys added yet
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

SettingsForm.propTypes = {
  license: PropTypes.shape({
    fieldData: PropTypes.shape({
      __ID: PropTypes.string.isRequired,
      _orgID: PropTypes.string.isRequired,
      organizationName: PropTypes.string
    }).isRequired
  }),
  onNotification: PropTypes.func,
  onModuleUpdate: PropTypes.func
};

export default SettingsForm;
