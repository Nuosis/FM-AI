import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Typography,
  List,
  IconButton,
  Card,
  CardContent,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Email as EmailIcon
} from '@mui/icons-material';

const EmailSection = ({ emails, editMode, onAdd, onEdit, onDelete }) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <EmailIcon sx={{ mr: 1 }} /> Email Addresses
        </Typography>
        {editMode && (
          <Button 
            startIcon={<AddIcon />}
            onClick={() => onAdd('email', { label: 'main' })}
            size="small"
          >
            Add Email
          </Button>
        )}
      </Box>
      <List>
        {emails?.map((item) => (
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
                    {item.fieldData.email}
                  </Typography>
                </Box>                  
                <Tooltip title="Send Mail">
                  <IconButton 
                    onClick={() => {
                      window.location.href = `mailto:${item.fieldData.email}`;
                    }}
                    size="small"
                  >
                    <EmailIcon fontSize="medium" />
                  </IconButton>
                </Tooltip>
                
                {editMode && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', ml: 1 }}>
                    <IconButton 
                      color="primary" 
                      onClick={() => onEdit('email', item.fieldData.__ID, item.fieldData)}
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      color="secondary" 
                      onClick={() => onDelete('email', item.fieldData.__ID)}
                      size="small"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
        
      </List>
    </Box>
  );
};

EmailSection.propTypes = {
  emails: PropTypes.arrayOf(PropTypes.shape({
    fieldData: PropTypes.shape({
      __ID: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      label: PropTypes.string,
      f_primary: PropTypes.string
    }).isRequired
  })),
  editMode: PropTypes.bool.isRequired,
  onAdd: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default EmailSection;
