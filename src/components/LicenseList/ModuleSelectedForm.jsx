import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { createLog, LogType } from '../../redux/slices/appSlice';
import axiosInstance from '../../utils/axios';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  FormControlLabel,
  Switch
} from '@mui/material';

const ModuleSelectedForm = ({ 
  open, 
  onClose, 
  moduleSelection = null, 
  license = null, 
  onSubmit 
}) => {
  const dispatch = useDispatch();
  const [availableModules, setAvailableModules] = useState([]);
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Convert from MM/DD/YYYY to YYYY-MM-DD
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const getInitialFormData = () => {
    const data = {
      _moduleID: '',
      moduleName: '',
      accessLevel: 'user',
      dateStart: new Date().toISOString().split('T')[0],
      dateEnd: formatDate(license?.fieldData?.dateEnd) || '',
      price: '0',
      priceScheme: 'monthly',
      usageCap: '0',
      usageScheme: 'users',
      overagePrice: '0',
      overageScheme: 'per user',
      f_taxGST: "0"
    };
    return data;
  };

  // Helper function to ensure numeric values are strings
  const ensureString = (value, defaultValue = '0') => {
    if (value === undefined || value === null) return defaultValue;
    return String(value);
  };

  const [formData, setFormData] = useState(getInitialFormData());

  const fetchAvailableModules = async () => {
    try {
      const response = await axiosInstance.get('/api/admin/modules/');
      const data = response.data.response.data;
      console.log({data})
      dispatch(createLog(`Module response data: ${JSON.stringify(data)}`, LogType.DEBUG));
      // Ensure data is an array
      const modules = Array.isArray(data) ? data : [];
      setAvailableModules(modules);
      dispatch(createLog(`Successfully loaded ${modules.length} available modules`, LogType.INFO));
    } catch (err) {
      dispatch(createLog(`Failed to fetch available modules: ${err.message}`, LogType.ERROR));
    }
  };

  useEffect(() => {
    fetchAvailableModules();
  }, []);

  // Update form when moduleSelection changes
  useEffect(() => {
    if (moduleSelection) {
      const data = {
        _moduleID: moduleSelection.fieldData._moduleID || '',
        moduleName: moduleSelection.fieldData.moduleName || '',
        accessLevel: moduleSelection.fieldData.accessLevel || 'user',
        dateStart: formatDate(moduleSelection.fieldData.dateStart) || new Date().toISOString().split('T')[0],
        dateEnd: formatDate(moduleSelection.fieldData.dateEnd) || formatDate(license?.fieldData?.dateEnd) || '',
        price: ensureString(moduleSelection.fieldData.price),
        priceScheme: moduleSelection.fieldData.priceScheme || 'monthly',
        usageCap: ensureString(moduleSelection.fieldData.usageCap),
        usageScheme: moduleSelection.fieldData.usageScheme || 'users',
        overagePrice: ensureString(moduleSelection.fieldData.overagePrice),
        overageScheme: moduleSelection.fieldData.overageScheme || 'per user',
        f_taxGST: ensureString(moduleSelection.fieldData.f_taxGST)
      };
      setFormData(data);
    } else if (open) {
      // Log license data for debugging
      dispatch(createLog(`License data for Add Module Selection: ${JSON.stringify({
        fullLicense: license || null
      })}`, LogType.DEBUG));

      // Only reset form when opening dialog for new module
      const initialData = getInitialFormData();
      setFormData(initialData);
      
      // Log form data when opening for new module
      dispatch(createLog(`Opening Add Module Selection form with initial data: ${JSON.stringify({
        ...initialData
      })}`, LogType.DEBUG));
    }
  }, [moduleSelection, license, open]);

  const handleSubmit = async () => {
    try {
      // Log full module data before submitting
      dispatch(createLog(`Submitting module selection with data: ${JSON.stringify(formData)}`, LogType.DEBUG));
      
      // Format dates if needed before submitting
      const submissionData = {
        ...formData,
        dateStart: formatDate(formData.dateStart),
        dateEnd: formatDate(formData.dateEnd),
      };
      await onSubmit(submissionData);
      onClose();
    } catch (err) {
      dispatch(createLog(`Failed to submit module selection: ${err.message}`, LogType.ERROR));
    }
  };

  // Helper function to log form changes
  const logFormChange = (field, value, updatedData) => {
    dispatch(createLog(`Module form field changed: ${JSON.stringify({
      field,
      value,
      updatedData
    })}`, LogType.DEBUG));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {moduleSelection ? 'Edit Module Selection' : 'Add Module Selection'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Module</InputLabel>
              <Select
                value={formData._moduleID}
                onChange={(e) => {
                  const selectedModule = availableModules.find(
                    m => m.fieldData.__ID === e.target.value
                  );
                  const updatedData = {
                    ...formData,
                    _moduleID: e.target.value,
                    moduleName: selectedModule?.fieldData.moduleName || ''
                  };
                  logFormChange('module', e.target.value, updatedData);
                  setFormData(updatedData);
                }}
                label="Module"
              >
                {availableModules.map((module) => (
                  <MenuItem key={module.fieldData.__ID} value={module.fieldData.__ID}>
                    {module.fieldData.moduleName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Access Level</InputLabel>
              <Select
                value={formData.accessLevel}
                onChange={(e) => {
                  const updatedData = {...formData, accessLevel: e.target.value};
                  logFormChange('accessLevel', e.target.value, updatedData);
                  setFormData(updatedData);
                }}
                label="Access Level"
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.dateStart}
              onChange={(e) => {
                const updatedData = {...formData, dateStart: e.target.value};
                logFormChange('dateStart', e.target.value, updatedData);
                setFormData(updatedData);
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={formData.dateEnd}
              onChange={(e) => {
                const updatedData = {...formData, dateEnd: e.target.value};
                logFormChange('dateEnd', e.target.value, updatedData);
                setFormData(updatedData);
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          {/* Pricing Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Pricing</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Base Price"
              type="number"
              value={formData.price}
              onChange={(e) => {
                const updatedData = {...formData, price: e.target.value};
                logFormChange('price', e.target.value, updatedData);
                setFormData(updatedData);
              }}
              inputProps={{ min: "0", step: "0.01" }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Price Scheme</InputLabel>
              <Select
                value={formData.priceScheme}
                onChange={(e) => {
                  const updatedData = {...formData, priceScheme: e.target.value};
                  logFormChange('priceScheme', e.target.value, updatedData);
                  setFormData(updatedData);
                }}
                label="Price Scheme"
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="annual">Annual</MenuItem>
                <MenuItem value="payPerUse">Pay Per Use</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Usage Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Usage Limits</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Usage Cap"
              type="number"
              value={formData.usageCap}
              onChange={(e) => {
                const updatedData = {...formData, usageCap: e.target.value};
                logFormChange('usageCap', e.target.value, updatedData);
                setFormData(updatedData);
              }}
              inputProps={{ min: "0" }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Usage Scheme</InputLabel>
              <Select
                value={formData.usageScheme}
                onChange={(e) => {
                  const updatedData = {...formData, usageScheme: e.target.value};
                  logFormChange('usageScheme', e.target.value, updatedData);
                  setFormData(updatedData);
                }}
                label="Usage Scheme"
              >
                <MenuItem value="users">Users</MenuItem>
                <MenuItem value="api_calls">API Calls</MenuItem>
                <MenuItem value="storage">Storage</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Overage Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Overage Charges</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Overage Price"
              type="number"
              value={formData.overagePrice}
              onChange={(e) => {
                const updatedData = {...formData, overagePrice: e.target.value};
                logFormChange('overagePrice', e.target.value, updatedData);
                setFormData(updatedData);
              }}
              inputProps={{ min: "0", step: "0.01" }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Overage Scheme</InputLabel>
              <Select
                value={formData.overageScheme}
                onChange={(e) => {
                  const updatedData = {...formData, overageScheme: e.target.value};
                  logFormChange('overageScheme', e.target.value, updatedData);
                  setFormData(updatedData);
                }}
                label="Overage Scheme"
              >
                <MenuItem value="per user">Per User</MenuItem>
                <MenuItem value="per api call">Per API Call</MenuItem>
                <MenuItem value="per gb">Per GB</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* GST Section */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.f_taxGST === "1"}
                  onChange={(e) => {
                    const updatedData = {...formData, f_taxGST: e.target.checked ? "1" : "0"};
                    logFormChange('f_taxGST', e.target.checked ? "1" : "0", updatedData);
                    setFormData(updatedData);
                  }}
                />
              }
              label="Charge GST"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {moduleSelection ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ModuleSelectedForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  license: PropTypes.shape({
    fieldData: PropTypes.shape({
      __ID: PropTypes.string,
      dateEnd: PropTypes.string
    })
  }),
  moduleSelection: PropTypes.shape({
    fieldData: PropTypes.shape({
      _moduleID: PropTypes.string,
      moduleName: PropTypes.string,
      accessLevel: PropTypes.string,
      dateStart: PropTypes.string,
      dateEnd: PropTypes.string,
      price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      priceScheme: PropTypes.string,
      usageCap: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      usageScheme: PropTypes.string,
      overagePrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      overageScheme: PropTypes.string,
      chargeGST: PropTypes.bool,
      f_taxGST: PropTypes.string
    })
  })
};

export default ModuleSelectedForm;
