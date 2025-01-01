import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const RecordDetailsSection = ({ details, editMode, onChange, validationErrors = {} }) => {
  const handleAddDetail = () => {
    onChange([...details, { type: 'GST', data: '' }]);
  };

  const handleRemoveDetail = (index) => {
    const newDetails = [...details];
    newDetails.splice(index, 1);
    onChange(newDetails);
  };

  const handleDetailChange = (index, field, value) => {
    const newDetails = [...details];
    newDetails[index] = {
      ...newDetails[index],
      [field]: value
    };
    onChange(newDetails);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Record Details</Typography>
        {editMode && (
          <Tooltip title="Add Record Detail">
            <IconButton onClick={handleAddDetail} color="primary">
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Grid container spacing={2}>
        {details.map((detail, index) => (
          <Grid item xs={12} key={index}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              {editMode ? (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={detail.type}
                      onChange={(e) => handleDetailChange(index, 'type', e.target.value)}
                      label="Type"
                      error={!!validationErrors.type}
                      helperText={validationErrors.type}
                    >
                      <MenuItem value="GST">GST</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="Value"
                    value={detail.data}
                    onChange={(e) => handleDetailChange(index, 'data', e.target.value)}
                    error={!!validationErrors.data}
                    helperText={validationErrors.data}
                  />
                  <IconButton onClick={() => handleRemoveDetail(index)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ minWidth: 120 }}>
                    {detail.type}:
                  </Typography>
                  <Typography variant="body1">
                    {detail.data}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

RecordDetailsSection.propTypes = {
  details: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string.isRequired,
    data: PropTypes.string.isRequired
  })).isRequired,
  editMode: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  validationErrors: PropTypes.shape({
    type: PropTypes.string,
    data: PropTypes.string,
    general: PropTypes.string
  })
};

export default RecordDetailsSection;
