import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { selectDataStores, selectDataStoresLoading } from '../../redux/slices/dataStoreSlice';

/**
 * DataStoreSelector component for selecting a data store for a Knowledge entity
 * @param {Object} props - Component props
 * @param {string} props.value - The selected data store ID
 * @param {Function} props.onChange - Callback for when the selection changes
 * @param {boolean} props.disabled - Whether the selector is disabled
 */
const DataStoreSelector = ({ value, onChange, disabled = false }) => {
  const dataStores = useSelector(selectDataStores);
  const isLoading = useSelector(selectDataStoresLoading);
  const [selectedStore, setSelectedStore] = useState(value || '');

  // Update selected store when value prop changes
  useEffect(() => {
    setSelectedStore(value || '');
  }, [value]);

  // Handle selection change
  const handleChange = (event) => {
    const storeId = event.target.value;
    setSelectedStore(storeId);
    onChange(storeId);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!dataStores || dataStores.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No data stores available. Please add a data store in Settings first.
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Select Data Store Backend
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Choose a data store backend for this Knowledge entity. This will determine where the vector data is stored.
      </Typography>
      <FormControl fullWidth disabled={disabled}>
        <InputLabel id="data-store-select-label">Data Store</InputLabel>
        <Select
          labelId="data-store-select-label"
          id="data-store-select"
          value={selectedStore}
          label="Data Store"
          onChange={handleChange}
        >
          {dataStores.map((store) => (
            <MenuItem key={store.store_id} value={store.store_id}>
              {store.name} ({store.type})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
};

DataStoreSelector.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default DataStoreSelector;