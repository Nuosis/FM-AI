import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createOrganizationLicense,
  updateOrganizationLicenseRecord,
  deleteOrganizationLicense,
  selectOrganizationLicenseStatus,
  selectOrganizationLicenseError,
  validateEntireForm,
  setValidationErrors,
  clearValidationErrors,
  selectValidationErrors
} from '../../redux/slices/organizationLicenseSlice';

const licenseTermUnits = ['Day', 'Month', 'Year'];

const LicenseSection = ({
  licenses,
  organizationId,
  editMode,
  availableModules = []
}) => {
  /*console.log('LicenseSection Props:', {
    licenses: JSON.stringify(licenses, null, 2),
    organizationId,
    editMode,
    availableModules: JSON.stringify(availableModules, null, 2)
  });*/
  const dispatch = useDispatch();
  const status = useSelector(selectOrganizationLicenseStatus);
  const error = useSelector(selectOrganizationLicenseError);
  const validationErrors = useSelector(selectValidationErrors);
  const [editingLicense, setEditingLicense] = useState(null);
  const [newLicense, setNewLicense] = useState(false);
  const [formData, setFormData] = useState({
    dateStart: '',
    dateEnd: '',
    f_active: 1,
    licenseTerm: '',
    licenseTermUnit: '',
    maxDevices: '',
    modules: []
  });

  const handleModuleChange = (event) => {
    const selectedModules = event.target.value;
    setFormData(prev => ({
      ...prev,
      modules: selectedModules
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    // Validate form data
    const validation = validateEntireForm(formData);
    if (!validation.isValid) {
      dispatch(setValidationErrors(validation.errors));
      return;
    }

    try {
      if (editingLicense) {
        await dispatch(updateOrganizationLicenseRecord({
          organizationId,
          licenseId: editingLicense.__ID,
          updateData: formData
        })).unwrap();
        setEditingLicense(null);
      } else {
        await dispatch(createOrganizationLicense({
          organizationId,
          licenseData: formData
        })).unwrap();
        setNewLicense(false);
      }
      dispatch(clearValidationErrors());
      setFormData({
        dateStart: '',
        dateEnd: '',
        f_active: 1,
        licenseTerm: '',
        licenseTermUnit: '',
        maxDevices: '',
        modules: []
      });
    } catch (error) {
      dispatch(setValidationErrors({ general: error.message }));
    }
  };

  const handleCancel = () => {
    dispatch(clearValidationErrors());
    setEditingLicense(null);
    setNewLicense(false);
      setFormData({
        dateStart: '',
        dateEnd: '',
        f_active: 1,
        licenseTerm: '',
        licenseTermUnit: '',
        maxDevices: '',
        modules: []
      });
  };

  const handleEdit = (license) => {
    setEditingLicense(license);
    setFormData({
      dateStart: license.dateStart,
      dateEnd: license.dateEnd,
      f_active: license.f_active,
      licenseTerm: license.licenseTerm,
      licenseTermUnit: license.licenseTermUnit,
      maxDevices: license.maxDevices,
      modules: license.modulesSelected || []
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // Handle MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parts[2], parts[0] - 1, parts[1]).toLocaleDateString();
    }
    // Handle other formats
    return new Date(dateStr).toLocaleDateString();
  };

  const renderForm = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        {editingLicense ? 'Edit License' : 'New License'}
      </Typography>
      
      <Grid container spacing={2}>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="License Term"
            value={formData.licenseTerm}
            onChange={(e) => handleInputChange('licenseTerm', e.target.value)}
            error={!!validationErrors?.licenseTerm}
            helperText={validationErrors?.licenseTerm}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Term Unit</InputLabel>
            <Select
              value={formData.licenseTermUnit}
              onChange={(e) => handleInputChange('licenseTermUnit', e.target.value)}
              label="Term Unit"
              error={!!validationErrors?.licenseTermUnit}
            >
              {licenseTermUnits.map((unit) => (
                <MenuItem key={unit} value={unit}>{unit}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="date"
            label="Start Date"
            value={formData.dateStart ? new Date(formData.dateStart).toISOString().split('T')[0] : ''}
            onChange={(e) => handleInputChange('dateStart', e.target.value)}
            error={!!validationErrors?.dateStart}
            helperText={validationErrors?.dateStart}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="date"
            label="End Date"
            value={formData.dateEnd ? new Date(formData.dateEnd).toISOString().split('T')[0] : ''}
            onChange={(e) => handleInputChange('dateEnd', e.target.value)}
            error={!!validationErrors?.dateEnd}
            helperText={validationErrors?.dateEnd}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            type="number"
            label="Max Devices"
            value={formData.maxDevices}
            onChange={(e) => handleInputChange('maxDevices', e.target.value)}
            error={!!validationErrors?.maxDevices}
            helperText={validationErrors?.maxDevices}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Modules</InputLabel>
            <Select
              multiple
              value={formData.modules || []}
              onChange={handleModuleChange}
              label="Modules"
              error={!!validationErrors?.modules}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((moduleId) => {
                    const module = availableModules.find(m => m.fieldData._moduleID === moduleId);
                    return (
                      <Chip 
                        key={moduleId} 
                        label={module ? `${module.fieldData.name} (${module.fieldData.version})` : moduleId} 
                        size="small" 
                      />
                    );
                  })}
                </Box>
              )}
            >
              {availableModules.map((module) => (
                <MenuItem key={module.fieldData._moduleID} value={module.fieldData._moduleID}>
                  <Typography variant="body2">
                    {module.fieldData.name} - v{module.fieldData.version}
                    <Typography 
                      component="span" 
                      variant="caption" 
                      color="textSecondary" 
                      sx={{ ml: 1 }}
                    >
                      ({module.fieldData.status})
                    </Typography>
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={handleCancel}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!formData.licenseTerm || !formData.licenseTermUnit}
            >
              {editingLicense ? 'Save Changes' : 'Add License'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderLicenseList = () => (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Licenses</Typography>
        {editMode && (
          <Button
            startIcon={<AddIcon />}
            onClick={() => setNewLicense(true)}
            disabled={newLicense || editingLicense}
          >
            Add License
          </Button>
        )}
      </Box>

      {!licenses || licenses.length === 0 ? (
        <>
          <Typography color="textSecondary">No licenses found</Typography>
          <Typography variant="caption" color="textSecondary">
            Debug: licenses={JSON.stringify(licenses)}
          </Typography>
        </>
      ) : (
        licenses.map((license) => (
          <Paper
            key={license.__ID}
            elevation={1}
            sx={{ p: 2, mb: 2, backgroundColor: 'background.default' }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">{license._orgID}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {license.licenseTerm} {license.licenseTermUnit} • 
                  {Number(license.f_active) === 1 ? ' Active' : ' Inactive'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  Start: {formatDate(license.dateStart)}
                </Typography>
                <Typography variant="body2">
                  End: {formatDate(license.dateEnd)}
                </Typography>
                {license.modulesSelected?.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {license.modulesSelected.map((moduleId) => {
                      const module = availableModules.find(m => m.fieldData._moduleID === moduleId);
                      return (
                        <Chip
                          key={moduleId}
                          label={module ? `${module.fieldData.name} (${module.fieldData.version})` : moduleId}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      );
                    })}
                  </Box>
                )}
              </Grid>

              {editMode && (
                <Grid item xs={12} sm={2} sx={{ textAlign: 'right' }}>
                  <IconButton
                    onClick={() => handleEdit(license)}
                    disabled={newLicense || editingLicense}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => dispatch(deleteOrganizationLicense({
                      organizationId,
                      licenseId: license.__ID
                    }))}
                    disabled={newLicense || editingLicense}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              )}
            </Grid>
          </Paper>
        ))
      )}
    </Paper>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {status === 'loading' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Loading...
        </Alert>
      )}
      
      {(newLicense || editingLicense) && renderForm()}
      {renderLicenseList()}
    </Box>
  );
};

LicenseSection.propTypes = {
  organizationId: PropTypes.string.isRequired,
  licenses: PropTypes.arrayOf(PropTypes.shape({
    __ID: PropTypes.string.isRequired,
    dateStart: PropTypes.string.isRequired,
    dateEnd: PropTypes.string.isRequired,
    f_active: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    licenseTerm: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    licenseTermUnit: PropTypes.string.isRequired,
    maxDevices: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    modulesSelected: PropTypes.arrayOf(PropTypes.string)
  })),
  editMode: PropTypes.bool.isRequired,
  availableModules: PropTypes.arrayOf(PropTypes.shape({
    fieldData: PropTypes.shape({
      _moduleID: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      version: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired
    }).isRequired
  }))
};

export default LicenseSection;
