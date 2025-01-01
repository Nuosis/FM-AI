import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { createLog, LogType, selectShowLogViewer } from '../../redux/slices/appSlice';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';

const LicenseForm = ({ open, onClose, selectedLicense = null, onSubmit }) => {
  const dispatch = useDispatch();
  const [organizations, setOrganizations] = useState([]);
  const formatDateForForm = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    // Convert MM/DD/YYYY to YYYY-MM-DD if needed
    if (dateStr.includes('/')) {
      const [month, day, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const [formData, setFormData] = useState(() => {
    const initialData = {
      f_active: true,
      dateStart: new Date().toISOString().split('T')[0],
      dateEnd: '',
      licenseTerm: '1',
      licenseTermUnit: 'years',
      maxDevices: '25',
      _orgID: ''
    };
    return initialData;
  });

  // Track form data changes
  useEffect(() => {
    dispatch(createLog(`Form data updated: ${JSON.stringify(formData)}`, LogType.DEBUG));
  }, [formData, dispatch]);

  useEffect(() => {
    if (selectedLicense) {
      dispatch(createLog(`Mounting LicenseForm for editing license - Organization: ${selectedLicense.organizationName}, Status: ${selectedLicense.fieldData.f_active ? 'Active' : 'Inactive'}, Term: ${selectedLicense.fieldData.licenseTerm} ${selectedLicense.fieldData.licenseTermUnit}, Devices: ${selectedLicense.fieldData.maxDevices}`, LogType.INFO));
      
      // Normalize the term unit value
      const rawTermUnit = selectedLicense.fieldData.licenseTermUnit;
      const termUnit = typeof rawTermUnit === 'string' ? rawTermUnit.toLowerCase() : 'years';
      
      const newFormData = {
        ...selectedLicense.fieldData,
        dateStart: formatDateForForm(selectedLicense.fieldData.dateStart),
        dateEnd: formatDateForForm(selectedLicense.fieldData.dateEnd),
        licenseTerm: selectedLicense.fieldData.licenseTerm?.toString() || '1',
        licenseTermUnit: termUnit,
        maxDevices: selectedLicense.fieldData.maxDevices?.toString() || '25',
        _orgID: selectedLicense.fieldData._orgID,
        f_active: selectedLicense.fieldData.f_active === 1
      };
      setFormData(newFormData);
    }
  }, [selectedLicense, dispatch]);

  useEffect(() => {
    // Only fetch organizations for new license creation
    if (!selectedLicense) {
      dispatch(createLog('Mounting LicenseForm for new license creation', LogType.INFO));
      fetch('/api/organizations/', {
        headers: {
          'Authorization': `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch organizations');
          }
          return response.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setOrganizations(data);
            dispatch(createLog(`Successfully loaded organizations`, LogType.INFO));
          }
        })
        .catch(error => {
          console.error('Error fetching organizations:', error);
          dispatch(createLog(`Failed to fetch organizations: ${error.message}`, LogType.ERROR));
        });
    }
  }, [selectedLicense, dispatch]);

  const calculateEndDate = (startDate, term, unit) => {
    const date = new Date(startDate);
    switch(unit) {
      case 'days':
        date.setDate(date.getDate() + parseInt(term));
        break;
      case 'months':
        date.setMonth(date.getMonth() + parseInt(term));
        break;
      case 'years':
        date.setFullYear(date.getFullYear() + parseInt(term));
        break;
    }
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (formData.dateStart && formData.licenseTerm && formData.licenseTermUnit) {
      const endDate = calculateEndDate(
        formData.dateStart,
        formData.licenseTerm,
        formData.licenseTermUnit
      );
      setFormData(prev => ({ ...prev, dateEnd: endDate }));
    }
  }, [formData.dateStart, formData.licenseTerm, formData.licenseTermUnit]);

  const handleSubmit = () => {
    dispatch(createLog(`${selectedLicense ? 'Updating' : 'Creating'} license for organization ${formData._orgID}`, LogType.INFO));
    // Ensure all fields are strings for API submission
    // Convert form data to match FileMaker data types
    const apiFormData = {
      ...formData,
      f_active: formData.f_active ? 1 : 0,
      licenseTerm: Number(formData.licenseTerm),
      maxDevices: Number(formData.maxDevices),
      dateStart: formatDateForForm(formData.dateStart),
      dateEnd: formatDateForForm(formData.dateEnd),
      licenseTermUnit: formData.licenseTermUnit.toLowerCase()
    };
    dispatch(createLog(`License details - Term: ${apiFormData.licenseTerm} ${apiFormData.licenseTermUnit}, Devices: ${apiFormData.maxDevices}, Active: ${apiFormData.f_active}`, LogType.DEBUG));
    onSubmit(apiFormData);
  };

  const showLogViewer = useSelector(selectShowLogViewer);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          width: showLogViewer ? 'calc(100% - 400px)' : '100%',
          transition: 'width 0.3s ease',
          maxWidth: 'none'
        }
      }}
    >
      <DialogTitle>
        {selectedLicense ? 'Edit License' : 'Add License'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {selectedLicense ? (
            <TextField
              label="Organization"
              value={selectedLicense.organizationName || 'Organization not found'}
              fullWidth
              disabled
            />
          ) : (
            <FormControl fullWidth required>
              <InputLabel>Organization</InputLabel>
              <Select
                value={formData._orgID}
                onChange={(e) => setFormData({ ...formData, _orgID: e.target.value })}
                label="Organization"
              >
                {organizations.map((org) => (
                  <MenuItem key={org.fieldData.__ID} value={org.fieldData.__ID}>
                    {org.fieldData.Name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControlLabel
            control={
              <Switch
                checked={formData.f_active}
                onChange={(e) => setFormData({ ...formData, f_active: e.target.checked })}
              />
            }
            label="Active"
          />
          
          <TextField
            label="Start Date"
            type="date"
            value={formData.dateStart}
            onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
            fullWidth
            InputLabelProps={{ shrink: true }}
            disabled={!!selectedLicense}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="License Term"
              type="number"
              value={formData.licenseTerm}
              onChange={(e) => setFormData({ ...formData, licenseTerm: e.target.value })}
              fullWidth
              inputProps={{ min: "1" }}
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Term Unit</InputLabel>
              <Select
                value={formData.licenseTermUnit}
                onChange={(e) => {
                  dispatch(createLog(`Term Unit changed to: ${e.target.value}`, LogType.DEBUG));
                  setFormData({ ...formData, licenseTermUnit: e.target.value });
                }}
                label="Term Unit"
                onOpen={() => {
                  dispatch(createLog(`Current Term Unit value: ${formData.licenseTermUnit}`, LogType.DEBUG));
                }}
              >
                <MenuItem value="days" key="days">Days</MenuItem>
                <MenuItem value="months" key="months">Months</MenuItem>
                <MenuItem value="years" key="years">Years</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            label="Max Devices"
            type="number"
            value={formData.maxDevices}
            onChange={(e) => setFormData({ ...formData, maxDevices: e.target.value })}
            fullWidth
            inputProps={{ min: "1" }}
            required
          />

          <TextField
            label="End Date"
            type="date"
            value={formData.dateEnd}
            disabled
            fullWidth
            InputLabelProps={{ shrink: true }}
            helperText="Auto-calculated based on start date and term"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={
            !formData._orgID || 
            !formData.maxDevices || 
            !formData.licenseTerm || 
            !formData.licenseTermUnit
          }
        >
          {selectedLicense ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

LicenseForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  selectedLicense: PropTypes.shape({
    fieldData: PropTypes.shape({
      __ID: PropTypes.string,
      f_active: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
      dateStart: PropTypes.string,
      dateEnd: PropTypes.string,
      licenseTerm: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      licenseTermUnit: PropTypes.string,
      maxDevices: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      _orgID: PropTypes.string
    }),
    organizationName: PropTypes.string
  })
};

export default LicenseForm;
