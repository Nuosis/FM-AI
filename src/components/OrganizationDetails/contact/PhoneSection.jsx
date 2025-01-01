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
  Chip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  Call as CallIcon
} from '@mui/icons-material';

const PhoneSection = ({ phones, editMode, onAdd, onEdit, onDelete }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [editIndex, setEditIndex] = useState(null);
  const [formData, setFormData] = useState({});

  const phoneTypes = ['main', 'mobile', 'fax', 'other'];

  const handleOpenDialog = (mode, index = null) => {
    setDialogMode(mode);
    setEditIndex(index);
    
    if (mode === 'edit' && index !== null) {
      const phoneData = phones[index].fieldData;
      setFormData({
        phone: phoneData.phone,
        label: phoneData.label || 'main',
        f_primary: phoneData.f_primary || '0'
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
      onAdd('phone', formData);
    } else {
      const phoneId = phones[editIndex].fieldData.__ID;
      onEdit('phone', phoneId, formData);
    }
    handleCloseDialog();
  };

  const handleDelete = (index) => {
    const phoneId = phones[index].fieldData.__ID;
    onDelete('phone', phoneId);
  };

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const renderDialog = () => {
    return (
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add Phone' : 'Edit Phone'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Phone Number"
            fullWidth
            value={formData.phone || ''}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            required
            helperText="Format: 555-123-4567"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Label</InputLabel>
            <Select
              value={formData.label || ''}
              onChange={(e) => handleFieldChange('label', e.target.value)}
            >
              {phoneTypes.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={formData.f_primary === '1'}
                onChange={(e) => handleFieldChange('f_primary', e.target.checked ? '1' : '0')}
              />
            }
            label="Primary Phone"
          />
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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <PhoneIcon sx={{ mr: 1 }} /> Phone Numbers
        </Typography>
        {editMode && (
          <Button
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('add')}
            size="small"
          >
            Add Phone
          </Button>
        )}
      </Box>
      <List>
        {phones?.map((item, index) => (
          <Card key={item.fieldData.__ID} sx={{ mb: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip 
                      size="small" 
                      label={item.fieldData.label || 'main'} 
                      variant="outlined"
                    />
                    {item.fieldData.f_primary === '1' && (
                      <Chip 
                        size="small" 
                        label="Primary" 
                        color="primary" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Typography variant="body1">
                    {item.fieldData.phone}
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-end',
                  ml: 1,
                  pb: 0.5
                }}>
                  <Tooltip title="Call">
                    <IconButton 
                      onClick={() => {
                        window.location.href = `tel:${item.fieldData.phone}`;
                      }}
                      size="small"
                    >
                      <CallIcon fontSize="medium" />
                    </IconButton>
                  </Tooltip>
                  
                  {editMode && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', ml: 1 }}>
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpenDialog('edit', index)}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        color="secondary" 
                        onClick={() => handleDelete(index)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
        
      </List>

      {renderDialog()}
    </Box>
  );
};

PhoneSection.propTypes = {
  phones: PropTypes.arrayOf(PropTypes.shape({
    fieldData: PropTypes.shape({
      __ID: PropTypes.string.isRequired,
      phone: PropTypes.string.isRequired,
      label: PropTypes.string,
      f_primary: PropTypes.string
    }).isRequired
  })),
  editMode: PropTypes.bool.isRequired,
  onAdd: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default PhoneSection;
