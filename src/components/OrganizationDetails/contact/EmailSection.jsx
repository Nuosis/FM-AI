import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Typography,
  List,
  IconButton,
  Card,
  CardContent,
  Chip
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
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <EmailIcon sx={{ mr: 1 }} /> Email Addresses
      </Typography>
      <List>
        {emails?.map((item) => (
          <Card key={item.fieldData.__ID} sx={{ mb: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">
                    {item.fieldData.email}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
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
                </Box>
                
                <Box>
                  {editMode && (
                    <>
                      <IconButton onClick={() => onEdit('email', item.fieldData.__ID, item.fieldData)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => onDelete('email', item.fieldData.__ID)}>
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
            onClick={() => onAdd('email', { label: 'main' })}
            sx={{ mt: 1 }}
          >
            Add Email
          </Button>
        )}
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
