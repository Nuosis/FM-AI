import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const BillableList = () => {
  const [billables, setBillables] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBillable, setSelectedBillable] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    quantity: '',
    unit: '',
    unitPrice: '',
    f_taxableGST: '0',
    f_taxableHST: '0',
    f_taxablePST: '0'
  });
  const [error, setError] = useState(null);

  const fetchBillables = async () => {
    try {
      const response = await fetch('/api/admin/billables');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch billables');
      }
      const data = await response.json();
      // Sort billables by description
      const sortedBillables = [...data].sort((a, b) => 
        a.fieldData.description.localeCompare(b.fieldData.description)
      );
      setBillables(sortedBillables || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching billables:', err);
      setBillables([]);
      setError('Unable to load billables. Please try again later.');
    }
  };

  useEffect(() => {
    fetchBillables();
  }, []);

  const handleOpenDialog = (billable = null) => {
    setSelectedBillable(billable);
    if (billable) {
      setFormData({
        description: billable.fieldData.description || '',
        quantity: billable.fieldData.quantity || '',
        unit: billable.fieldData.unit || '',
        unitPrice: billable.fieldData.unitPrice || '',
        f_taxableGST: billable.fieldData.f_taxableGST || '0',
        f_taxableHST: billable.fieldData.f_taxableHST || '0',
        f_taxablePST: billable.fieldData.f_taxablePST || '0'
      });
    } else {
      setFormData({
        description: '',
        quantity: '',
        unit: '',
        unitPrice: '',
        f_taxableGST: '0',
        f_taxableHST: '0',
        f_taxablePST: '0'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedBillable(null);
    setFormData({
      description: '',
      quantity: '',
      unit: '',
      unitPrice: '',
      f_taxableGST: '0',
      f_taxableHST: '0',
      f_taxablePST: '0'
    });
  };

  const handleSubmit = async () => {
    try {
      const url = selectedBillable 
        ? `/api/admin/billables/${selectedBillable.recordId}`
        : '/api/admin/billables';
      
      const method = selectedBillable ? 'PUT' : 'POST';
      
      const requestData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        f_taxableGST: parseFloat(formData.f_taxableGST),
        f_taxableHST: parseFloat(formData.f_taxableHST),
        f_taxablePST: parseFloat(formData.f_taxablePST)
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${selectedBillable ? 'update' : 'create'} billable`);
      }

      handleCloseDialog();
      fetchBillables();
    } catch (err) {
      console.error('Error saving billable:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this billable?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/billables/${recordId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete billable');
      }

      fetchBillables();
    } catch (err) {
      console.error('Error deleting billable:', err);
      setError(err.message);
    }
  };

  const calculateTotalPrice = (billable) => {
    const quantity = parseFloat(billable.fieldData.quantity) || 0;
    const unitPrice = parseFloat(billable.fieldData.unitPrice) || 0;
    const basePrice = quantity * unitPrice;
    
    const gst = basePrice * (parseFloat(billable.fieldData.f_taxableGST) || 0);
    const hst = basePrice * (parseFloat(billable.fieldData.f_taxableHST) || 0);
    const pst = basePrice * (parseFloat(billable.fieldData.f_taxablePST) || 0);
    
    return (basePrice + gst + hst + pst).toFixed(2);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Billables</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Billable
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell align="right">Unit Price</TableCell>
              <TableCell align="right">Total Price</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {billables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No billables available. Click &quot;Add Billable&quot; to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              billables.map((billable) => (
                <TableRow key={billable.fieldData.__ID}>
                  <TableCell>{billable.fieldData.description}</TableCell>
                  <TableCell align="right">{billable.fieldData.quantity}</TableCell>
                  <TableCell>{billable.fieldData.unit}</TableCell>
                  <TableCell align="right">
                    ${parseFloat(billable.fieldData.unitPrice).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    ${calculateTotalPrice(billable)}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(billable)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(billable.recordId)}
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedBillable ? 'Edit Billable' : 'Add Billable'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Description"
            fullWidth
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              type="number"
              margin="dense"
              label="Quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              margin="dense"
              label="Unit"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              sx={{ flex: 1 }}
            />
          </Box>
          <TextField
            type="number"
            margin="dense"
            label="Unit Price"
            fullWidth
            value={formData.unitPrice}
            onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>
            }}
          />
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Tax Rates</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              type="number"
              margin="dense"
              label="GST Rate"
              value={formData.f_taxableGST}
              onChange={(e) => setFormData({ ...formData, f_taxableGST: e.target.value })}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              type="number"
              margin="dense"
              label="HST Rate"
              value={formData.f_taxableHST}
              onChange={(e) => setFormData({ ...formData, f_taxableHST: e.target.value })}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              type="number"
              margin="dense"
              label="PST Rate"
              value={formData.f_taxablePST}
              onChange={(e) => setFormData({ ...formData, f_taxablePST: e.target.value })}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>
              }}
              sx={{ flex: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedBillable ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillableList;
