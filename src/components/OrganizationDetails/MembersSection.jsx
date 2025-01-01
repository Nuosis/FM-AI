import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Tooltip,
  InputLabel,
  OutlinedInput,
  Toolbar,
  InputAdornment
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon
} from '@mui/icons-material';
import { createLog, LogType } from '../../redux/slices/appSlice';

const MembersSection = ({ members, onAdd, onEdit, onDelete, editMode }) => {
  const dispatch = useDispatch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({});
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(createLog('MembersSection mounted', LogType.INFO));
    dispatch(createLog(`Members data: ${JSON.stringify(members)}`, LogType.DEBUG));

    // Error checking
    if (!members) {
      dispatch(createLog('No members data available', LogType.WARNING));
    }
  }, [dispatch, members]);

  const handleOpenDialog = (mode, member = null) => {
    dispatch(createLog(`Opening ${mode} dialog for member`, LogType.DEBUG));
    setDialogMode(mode);
    setSelectedMember(member);
    
    if (mode === 'edit' && member) {
      setFormData({
        displayName: member.fieldData.displayName,
        role: member.fieldData.role || 'user'
      });

      dispatch(createLog(`Loading edit data: ${JSON.stringify(member)}`, LogType.DEBUG));
    } else {
      setFormData({
        displayName: '',
        role: 'user'
      });
    }
    
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogMode('add');
    setSelectedMember(null);
    setFormData({});
  };

  const handleSubmit = () => {
    try {
      dispatch(createLog(`Submitting form data: ${JSON.stringify(formData)}`, LogType.DEBUG));

      if (dialogMode === 'add') {
        onAdd(formData);
        dispatch(createLog('Added new member', LogType.INFO));
      } else {
        onEdit(selectedMember.fieldData.__ID, formData);
        dispatch(createLog(`Updated member: ${selectedMember.fieldData.__ID}`, LogType.INFO));
      }
      
      handleCloseDialog();
    } catch (error) {
      dispatch(createLog(`Error in ${dialogMode} operation: ${error.message}`, LogType.ERROR));
    }
  };

  const handleDelete = (memberId) => {
    try {
      dispatch(createLog(`Deleting member: ${memberId}`, LogType.DEBUG));
      onDelete(memberId);
      dispatch(createLog(`Deleted member: ${memberId}`, LogType.INFO));
    } catch (error) {
      dispatch(createLog(`Error deleting member: ${error.message}`, LogType.ERROR));
    }
  };

  const handleRoleChange = (memberId, newRole) => {
    try {
      dispatch(createLog(`Changing role for member ${memberId} to ${newRole}`, LogType.DEBUG));
      onEdit(memberId, { role: newRole });
      dispatch(createLog(`Updated role for member: ${memberId}`, LogType.INFO));
    } catch (error) {
      dispatch(createLog(`Error updating role: ${error.message}`, LogType.ERROR));
    }
  };

  const filteredMembers = members?.filter(member => {
    if (!member?.fieldData?.displayName) {
      dispatch(createLog(`Invalid member data found: ${JSON.stringify(member)}`, LogType.WARNING));
      return false;
    }
    const roleMatch = filterRole === 'all' || member.fieldData.role === filterRole;
    const searchMatch = member.fieldData.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    return roleMatch && searchMatch;
  }) || [];

  const renderMemberDialog = () => {
    return (
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add Member' : 'Edit Member'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Display Name"
            fullWidth
            value={formData.displayName || ''}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            required
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role || 'user'}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
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

  return (
    <Box>
      <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 }, mb: 2 }}>
        <Typography variant="h6" sx={{ flex: '1 1 100%' }}>
          Organization Members
        </Typography>
        <FormControl sx={{ minWidth: 120, mr: 2 }}>
          <InputLabel>Filter Role</InputLabel>
          <Select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            input={<OutlinedInput label="Filter Role" />}
            size="small"
          >
            <MenuItem value="all">All Roles</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="user">User</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ width: '200px', mr: 2 }}>
          <OutlinedInput
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            startAdornment={
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            }
          />
        </FormControl>
        {editMode && (
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => handleOpenDialog('add')}
          >
            Add Member
          </Button>
        )}
      </Toolbar>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              {editMode && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMembers?.map((member) => (
              <TableRow key={member.fieldData.__ID}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {member.fieldData.displayName}
                    {member.fieldData.role === 'admin' ? (
                      <Tooltip title="Admin">
                        <AdminIcon color="primary" fontSize="small" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="User">
                        <UserIcon fontSize="small" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {editMode ? (
                    <FormControl size="small">
                      <Select
                        value={member.fieldData.role || 'user'}
                        onChange={(e) => handleRoleChange(member.fieldData.__ID, e.target.value)}
                      >
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <Chip 
                      label={member.fieldData.role || 'user'}
                      color={member.fieldData.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                    />
                  )}
                </TableCell>
                {editMode && (
                  <TableCell align="right">
                    <Tooltip title="Edit member">
                      <IconButton onClick={() => handleOpenDialog('edit', member)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove member">
                      <IconButton onClick={() => handleDelete(member.fieldData.__ID)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {renderMemberDialog()}
    </Box>
  );
};

MembersSection.propTypes = {
  members: PropTypes.arrayOf(PropTypes.shape({
    fieldData: PropTypes.shape({
      __ID: PropTypes.string.isRequired,
      displayName: PropTypes.string.isRequired,
      role: PropTypes.string
    }).isRequired
  })),
  onAdd: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  editMode: PropTypes.bool.isRequired
};

export default MembersSection;
