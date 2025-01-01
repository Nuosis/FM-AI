import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Typography,
  List,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  LocationOn as LocationIcon,
  Map as MapIcon
} from '@mui/icons-material';

const AddressSection = ({ addresses, editMode, onAdd, onEdit, onDelete }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [editIndex, setEditIndex] = useState(null);
  const [formData, setFormData] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const addressTypes = ['main', 'branch', 'warehouse', 'billing'];

  const handleOpenDialog = (mode, index = null) => {
    setDialogMode(mode);
    setEditIndex(index);
    
    if (mode === 'edit' && index !== null) {
      const addressData = addresses[index].fieldData;
      setFormData({
        streetAddress: addressData.streetAddress,
        unitNumber: addressData.unitNumber,
        city: addressData.city,
        prov: addressData.prov,
        country: addressData.country,
        postalCode: addressData.postalCode,
        label: addressData.label || 'main'
      });
    } else {
      setFormData({});
    }
    
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogMode('add');
    setEditIndex(null);
    setFormData({});
  };

  const handleSubmit = () => {
    if (dialogMode === 'add') {
      onAdd('address', formData);
    } else {
      const addressId = addresses[editIndex].fieldData.__ID;
      onEdit('address', addressId, formData);
    }
    handleCloseDialog();
  };

  const handleDelete = (index) => {
    const addressId = addresses[index].fieldData.__ID;
    onDelete('address', addressId);
  };

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const renderDialog = () => {
    return (
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add Address' : 'Edit Address'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Street Address"
            fullWidth
            value={formData.streetAddress || ''}
            onChange={(e) => handleFieldChange('streetAddress', e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Unit Number"
            fullWidth
            value={formData.unitNumber || ''}
            onChange={(e) => handleFieldChange('unitNumber', e.target.value)}
          />
          <TextField
            margin="dense"
            label="City"
            fullWidth
            value={formData.city || ''}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Province/State"
            fullWidth
            value={formData.prov || ''}
            onChange={(e) => handleFieldChange('prov', e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Country"
            fullWidth
            value={formData.country || ''}
            onChange={(e) => handleFieldChange('country', e.target.value)}
          />
          <TextField
            margin="dense"
            label="Postal Code"
            fullWidth
            value={formData.postalCode || ''}
            onChange={(e) => handleFieldChange('postalCode', e.target.value)}
            required
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Label</InputLabel>
            <Select
              value={formData.label || ''}
              onChange={(e) => handleFieldChange('label', e.target.value)}
            >
              {addressTypes.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogMode === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderMap = () => {
    if (!selectedAddress) return null;

    const fullAddress = `${selectedAddress.streetAddress}, ${selectedAddress.city}, ${selectedAddress.prov} ${selectedAddress.postalCode}`;

    return (
      <Dialog open={showMap} onClose={() => setShowMap(false)} maxWidth="md" fullWidth>
        <DialogTitle>Address Location</DialogTitle>
        <DialogContent>
          <Box sx={{ height: 400, bgcolor: 'background.paper', p: 2 }}>
            {/* Map integration placeholder */}
            <Typography color="textSecondary">
              Map integration will be implemented here using the address:
              {fullAddress}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMap(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <LocationIcon sx={{ mr: 1 }} /> Addresses
      </Typography>
      <List>
        {addresses?.map((item, index) => (
          <Card key={item.fieldData.__ID} sx={{ mb: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">
                    {`${item.fieldData.streetAddress}${item.fieldData.unitNumber ? `, Unit ${item.fieldData.unitNumber}` : ''}`}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {`${item.fieldData.city}, ${item.fieldData.prov} ${item.fieldData.postalCode}`}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip 
                      size="small" 
                      label={item.fieldData.label || 'main'} 
                      variant="outlined"
                    />
                  </Box>
                </Box>
                
                <Box>
                  <Tooltip title="View on map">
                    <IconButton 
                      onClick={() => {
                        setSelectedAddress(item.fieldData);
                        setShowMap(true);
                      }}
                    >
                      <MapIcon />
                    </IconButton>
                  </Tooltip>
                  
                  {editMode && (
                    <>
                      <IconButton onClick={() => handleOpenDialog('edit', index)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
        
        {editMode && (
          <Button
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('add')}
            sx={{ mt: 1 }}
          >
            Add Address
          </Button>
        )}
      </List>

      {renderDialog()}
      {renderMap()}
    </Box>
  );
};

AddressSection.propTypes = {
  addresses: PropTypes.arrayOf(PropTypes.shape({
    fieldData: PropTypes.shape({
      __ID: PropTypes.string.isRequired,
      streetAddress: PropTypes.string.isRequired,
      unitNumber: PropTypes.string,
      city: PropTypes.string.isRequired,
      prov: PropTypes.string.isRequired,
      country: PropTypes.string,
      postalCode: PropTypes.string.isRequired,
      label: PropTypes.string
    }).isRequired
  })),
  editMode: PropTypes.bool.isRequired,
  onAdd: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default AddressSection;
