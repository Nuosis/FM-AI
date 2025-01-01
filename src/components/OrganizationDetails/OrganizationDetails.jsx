import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Paper,
  Grid,
  Typography,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  Alert,
  useMediaQuery,
  useTheme
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { createLog, LogType } from '../../redux/slices/appSlice';
import {
  updateOrganization,
  selectEditMode,
  toggleEditMode,
  selectValidationErrors as selectOrgValidationErrors,
  validateEntireForm as validateOrganization,
  setValidationErrors as setOrgValidationErrors,
  setPendingChange
} from '../../redux/slices/organizationSlice';
import {
  fetchOrganizationEmails,
  addOrganizationEmail,
  deleteOrganizationEmail,
  updateOrganizationEmailRecord,
  selectOrganizationEmails,
  selectValidationErrors as selectEmailValidationErrors,
  validateEntireForm as validateEmails
} from '../../redux/slices/organizationEmailSlice';
import {
  fetchOrganizationAddresses,
  addOrganizationAddress,
  deleteOrganizationAddress,
  updateOrganizationAddressRecord,
  selectOrganizationAddresses,
  selectValidationErrors as selectAddressValidationErrors,
  validateEntireForm as validateAddresses
} from '../../redux/slices/organizationAddressSlice';
import {
  fetchOrganizationPhones,
  addOrganizationPhone,
  deleteOrganizationPhone,
  updateOrganizationPhoneRecord,
  selectOrganizationPhones,
  selectValidationErrors as selectPhoneValidationErrors,
  validateEntireForm as validatePhones
} from '../../redux/slices/organizationPhoneSlice';
import {
  fetchOrganizationRecordDetails,
  selectOrganizationRecordDetails,
  selectValidationErrors as selectRecordValidationErrors,
  validateEntireForm as validateRecordDetails,
  setPendingRecordDetailsChange
} from '../../redux/slices/organizationRecordDetailsSlice';
import {
  fetchOrganizationParties,
  createOrganizationParty,
  updateOrganizationPartyRecord,
  deleteOrganizationParty,
  selectOrganizationParties
} from '../../redux/slices/organizationPartySlice';
import {
  fetchOrganizationLicenses,
  selectOrganizationLicenses,
  selectValidationErrors as selectLicenseValidationErrors,
  validateEntireForm as validateLicenses
} from '../../redux/slices/organizationLicenseSlice';
import {
  fetchOrganizationModulesSelected,
  selectOrganizationModulesSelected
} from '../../redux/slices/organizationModulesSelectedSlice';
import ContactSection from './ContactSection';
import MembersSection from './MembersSection';
import RecordDetailsSection from './RecordDetailsSection';
import LicenseSection from './LicenseSection';

const OrganizationDetails = ({ organization, onClose }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState('details');
  const editMode = useSelector(selectEditMode);
  const [localEdits, setLocalEdits] = useState({});
  
  // Get validation errors from Redux store
  const orgValidationErrors = useSelector(selectOrgValidationErrors);
  const recordValidationErrors = useSelector(selectRecordValidationErrors);
  const emailValidationErrors = useSelector(selectEmailValidationErrors);
  const addressValidationErrors = useSelector(selectAddressValidationErrors);
  const phoneValidationErrors = useSelector(selectPhoneValidationErrors);
  const licenseValidationErrors = useSelector(selectLicenseValidationErrors);
  
  // Get record details from Redux store
  const recordDetails = useSelector(
    state => selectOrganizationRecordDetails(state, organization?.fieldData?.__ID),
    // Add equality function to prevent unnecessary rerenders
    (prev, next) => {
      if (!prev || !next) return prev === next;
      return JSON.stringify(prev) === JSON.stringify(next);
    }
  );

  // Get data from Redux store with memoization
  const emails = useSelector(
    state => selectOrganizationEmails(state, organization?.fieldData?.__ID),
    (prev, next) => JSON.stringify(prev) === JSON.stringify(next)
  );
  const addresses = useSelector(
    state => selectOrganizationAddresses(state, organization?.fieldData?.__ID),
    (prev, next) => JSON.stringify(prev) === JSON.stringify(next)
  );
  const phones = useSelector(
    state => selectOrganizationPhones(state, organization?.fieldData?.__ID),
    (prev, next) => JSON.stringify(prev) === JSON.stringify(next)
  );
  const members = useSelector(
    state => selectOrganizationParties(state, organization?.fieldData?.__ID),
    (prev, next) => JSON.stringify(prev) === JSON.stringify(next)
  );
  const licenses = useSelector(
    state => {
      const orgId = organization?.fieldData?.__ID;
      //console.log('Organization ID for licenses:', orgId);
      const selectedLicenses = selectOrganizationLicenses(state, orgId);
      //console.log('Selected Licenses:', JSON.stringify(selectedLicenses, null, 2));
      return selectedLicenses;
    },
    (prev, next) => JSON.stringify(prev) === JSON.stringify(next)
  );
  const availableModules = useSelector(
    state => selectOrganizationModulesSelected(state, organization?.fieldData?.__ID),
    (prev, next) => JSON.stringify(prev) === JSON.stringify(next)
  );

  useEffect(() => {
    if (organization?.fieldData?.__ID) {
      const orgId = organization.fieldData.__ID;
      const recordId = organization.recordId;
      
      // Log organization state before fetching
      dispatch(createLog(`Organization state before fetching: ${JSON.stringify({
        id: orgId,
        recordId: recordId,
        fieldData: organization.fieldData
      })}`, LogType.DEBUG));
      
      // Fetch related data when component mounts or organization changes
      const fetchData = async () => {
        try {
          await dispatch(fetchOrganizationLicenses(orgId)).unwrap();
          console.log('Licenses fetched successfully');
        } catch (error) {
          console.error('Error fetching licenses:', error);
        }
        dispatch(fetchOrganizationEmails(orgId));
        dispatch(fetchOrganizationAddresses(orgId));
        dispatch(fetchOrganizationPhones(orgId));
        dispatch(fetchOrganizationParties(orgId));
        dispatch(fetchOrganizationModulesSelected(orgId));
      };
      fetchData();
    }
  }, [dispatch, organization?.fieldData?.__ID]);

  // Separate useEffect for logging contact data
  useEffect(() => {
    if (emails || addresses || phones) {
      dispatch(createLog(`Current contact data: ${JSON.stringify({
        emails,
        addresses,
        phones
      })}`, LogType.DEBUG));
    }
  }, [dispatch, emails, addresses, phones]);

  // Fetch record details when organization changes
  useEffect(() => {
    if (organization?.fieldData?.__ID) {
      dispatch(fetchOrganizationRecordDetails(organization.fieldData.__ID));
    }
  }, [dispatch, organization?.fieldData?.__ID]);

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
    dispatch(createLog(`Changed to tab: ${newValue}`, LogType.DEBUG));
  };

  const handleEdit = () => {
    dispatch(toggleEditMode());
    // Log full organization state when edit is clicked
    dispatch(createLog(`Organization state when edit clicked: ${JSON.stringify({
      id: organization?.fieldData?.__ID,
      recordId: organization?.recordId,
      name: organization?.fieldData?.Name,
      fullOrg: organization
    })}`, LogType.DEBUG));
    
    setLocalEdits({
      Name: organization?.fieldData?.Name,
      website: organization?.fieldData?.website,
      details: recordDetails
    });
    dispatch(createLog(`Editing organization: ${organization?.fieldData?.Name}`, LogType.DEBUG));
  };

  const handleSave = async () => {
    // Validate all forms
    dispatch(validateOrganization());
    dispatch(validateRecordDetails({ organizationId: organization.fieldData.__ID }));
    dispatch(validateEmails({ organizationId: organization.fieldData.__ID }));
    dispatch(validateAddresses({ organizationId: organization.fieldData.__ID }));
    dispatch(validatePhones({ organizationId: organization.fieldData.__ID }));
    dispatch(validateLicenses({ organizationId: organization.fieldData.__ID }));
    
    if (
      Object.keys(orgValidationErrors).length > 0 || 
      Object.keys(recordValidationErrors).length > 0 ||
      Object.keys(emailValidationErrors).length > 0 ||
      Object.keys(addressValidationErrors).length > 0 ||
      Object.keys(phoneValidationErrors).length > 0 ||
      Object.keys(licenseValidationErrors).length > 0
    ) {
      dispatch(createLog('Form validation failed', LogType.WARNING));
      return;
    }

    try {
      const orgId = organization.fieldData.__ID;
      dispatch(createLog(`Updating organization: ${localEdits.Name}`, LogType.INFO));
      
      // Update pending changes in store
      Object.entries(localEdits).forEach(([field, value]) => {
        dispatch(setPendingChange({
          id: orgId,
          field,
          value
        }));
      });
      
      await dispatch(updateOrganization(orgId)).unwrap();
      dispatch(toggleEditMode());
      dispatch(createLog(`Successfully updated organization: ${localEdits.Name}`, LogType.INFO));
    } catch (err) {
      dispatch(createLog(`Error updating organization: ${err.message}`, LogType.ERROR));
    }
  };

  const handleCancel = () => {
    dispatch(toggleEditMode());
    setLocalEdits({});
    // Refetch record details to reset state
    if (organization?.fieldData?.__ID) {
      dispatch(fetchOrganizationRecordDetails(organization.fieldData.__ID));
    }
    dispatch(createLog('Cancelled organization edit', LogType.DEBUG));
  };

  const handleInputChange = (field, value) => {
    const orgId = organization.fieldData.__ID;
    // Update both local state and pending changes
    setLocalEdits(prev => ({
      ...prev,
      [field]: value
    }));
    dispatch(setPendingChange({
      id: orgId,
      field,
      value
    }));
    // Clear validation errors when field changes
    dispatch(setOrgValidationErrors({}));
    dispatch(createLog(`Organization ${field} changed to: ${value}`, LogType.DEBUG));
  };

  const handleRecordDetailsChange = (newDetails) => {
    const orgId = organization.fieldData.__ID;
    dispatch(setPendingRecordDetailsChange({
      organizationId: orgId,
      field: 'details',
      value: newDetails
    }));
  };

  // Contact handlers
  const handleAddContact = async (type, data) => {
    try {
      const orgId = organization.fieldData.__ID;
      const recordId = organization.recordId;
      // Include both IDs in the data
      const contactData = {
        ...data,
        orgId,
        recordId
      };
      switch (type) {
        case 'email':
          await dispatch(addOrganizationEmail({ orgId, emailData: contactData })).unwrap();
          break;
        case 'phone':
          await dispatch(addOrganizationPhone({ orgId, phoneData: contactData })).unwrap();
          break;
        case 'address':
          await dispatch(addOrganizationAddress({ orgId, addressData: contactData })).unwrap();
          break;
      }
      // Refresh contact data after adding
      switch (type) {
        case 'email':
          dispatch(fetchOrganizationEmails(orgId));
          break;
        case 'phone':
          dispatch(fetchOrganizationPhones(orgId));
          break;
        case 'address':
          dispatch(fetchOrganizationAddresses(orgId));
          break;
      }
    } catch (error) {
      dispatch(createLog(`Error adding contact: ${error.message}`, LogType.ERROR));
    }
  };

  // Member handlers
  const handleAddMember = async (memberData) => {
    try {
      const orgId = organization.fieldData.__ID;
      await dispatch(createOrganizationParty(orgId, { 
        displayName: memberData.displayName,
        role: memberData.role || 'user',
        relationship: 'Member'
      })).unwrap();
      // Refresh members after adding
      dispatch(fetchOrganizationParties(orgId));
    } catch (error) {
      dispatch(createLog(`Error adding member: ${error.message}`, LogType.ERROR));
    }
  };

  const handleUpdateMemberRole = async (memberId, role) => {
    try {
      const orgId = organization.fieldData.__ID;
      await dispatch(updateOrganizationPartyRecord(orgId, memberId, { role })).unwrap();
      // Refresh members after updating
      dispatch(fetchOrganizationParties(orgId));
    } catch (error) {
      dispatch(createLog(`Error updating member role: ${error.message}`, LogType.ERROR));
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const orgId = organization.fieldData.__ID;
      await dispatch(deleteOrganizationParty(orgId, memberId)).unwrap();
      // Refresh members after removing
      dispatch(fetchOrganizationParties(orgId));
    } catch (error) {
      dispatch(createLog(`Error removing member: ${error.message}`, LogType.ERROR));
    }
  };

  const renderDetailsContent = () => (
    <Box>
      {(orgValidationErrors.general || recordValidationErrors.general) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {orgValidationErrors.general || recordValidationErrors.general}
        </Alert>
      )}
      
      <Grid container spacing={2}>
        {/* Main Organization Info */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Main Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  label="Organization Name"
                  fullWidth
                  value={editMode ? localEdits.Name || '' : organization?.fieldData?.Name}
                  onChange={(e) => handleInputChange('Name', e.target.value)}
                  error={!!orgValidationErrors.Name}
                  helperText={orgValidationErrors.Name}
                  disabled={!editMode}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  label="Website"
                  fullWidth
                  value={editMode ? localEdits.website || '' : organization?.fieldData?.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  error={!!orgValidationErrors.website}
                  helperText={orgValidationErrors.website}
                  disabled={!editMode}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Record Details */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <RecordDetailsSection
              details={recordDetails}
              editMode={editMode}
              onChange={handleRecordDetailsChange}
              validationErrors={recordValidationErrors}
            />
          </Paper>
        </Grid>

        {/* Timestamps */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Record Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon fontSize="small" />
                  Created
                </Typography>
                <Typography variant="body1">
                  {organization?.fieldData?.['~CreationTimestamp']}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon fontSize="small" />
                  Last Modified
                </Typography>
                <Typography variant="body1">
                  {organization?.fieldData?.['~ModificationTimestamp']}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? '100%' : '66vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: isMobile ? 1 : 2
      }}>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ fontSize: isMobile ? '2rem' : '1.25rem', mb: isMobile ? 2 : 0 }}
        >
          {editMode ? 'Edit Organization' : 'Organization Details'}
        </Typography>
        {!editMode && !isMobile && (
          <Box>
            <IconButton 
              onClick={handleEdit} 
              color="primary"
              sx={{ padding: 1 }}
            >
              <EditIcon />
            </IconButton>
            <IconButton 
              onClick={onClose}
              sx={{ padding: 1 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        )}
      </DialogTitle>

      {!isMobile && (
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="standard"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.primary.main
            },
            '& .MuiTab-root': {
              '&:focus': {
                outline: 'none'
              },
              '&.Mui-selected': {
                color: theme.palette.primary.main
              }
            }
          }}
        >
          <Tab 
            icon={<BusinessIcon />} 
            label="Details"
            value="details"
          />
          <Tab 
            icon={<EmailIcon />} 
            label="Contact"
            value="contact"
          />
          <Tab 
            icon={<PersonIcon />} 
            label="Members"
            value="members"
          />
          <Tab 
            icon={<VpnKeyIcon />} 
            label="Licenses"
            value="licenses"
          />
        </Tabs>
      )}

      <DialogContent sx={{
        flex: 1, 
        overflow: 'auto',
        p: isMobile ? 1 : 2,
        pb: isMobile ? (editMode ? 14 : 7) : 2,
        position: 'relative'
      }}>
        {activeTab === 'details' && renderDetailsContent()}

        {activeTab === 'contact' && (
          <ContactSection
            contacts={{
              emails,
              addresses,
              phones
            }}
            onAdd={handleAddContact}
            onEdit={async (type, id, data) => {
              try {
                const orgId = organization.fieldData.__ID;
                switch (type) {
                  case 'email':
                    await dispatch(updateOrganizationEmailRecord(orgId, id, data)).unwrap();
                    dispatch(fetchOrganizationEmails(orgId));
                    break;
                  case 'phone':
                    await dispatch(updateOrganizationPhoneRecord(orgId, id, data)).unwrap();
                    dispatch(fetchOrganizationPhones(orgId));
                    break;
                  case 'address':
                    await dispatch(updateOrganizationAddressRecord(orgId, id, data)).unwrap();
                    dispatch(fetchOrganizationAddresses(orgId));
                    break;
                }
                dispatch(createLog(`Successfully updated ${type}`, LogType.INFO));
              } catch (error) {
                dispatch(createLog(`Error editing contact: ${error.message}`, LogType.ERROR));
              }
            }}
            onDelete={async (type, id) => {
              try {
                const orgId = organization.fieldData.__ID;
                switch (type) {
                  case 'email':
                    await dispatch(deleteOrganizationEmail(orgId, id)).unwrap();
                    dispatch(fetchOrganizationEmails(orgId));
                    break;
                  case 'phone':
                    await dispatch(deleteOrganizationPhone(orgId, id)).unwrap();
                    dispatch(fetchOrganizationPhones(orgId));
                    break;
                  case 'address':
                    await dispatch(deleteOrganizationAddress(orgId, id)).unwrap();
                    dispatch(fetchOrganizationAddresses(orgId));
                    break;
                }
                dispatch(createLog(`Successfully deleted ${type}`, LogType.INFO));
              } catch (error) {
                dispatch(createLog(`Error deleting contact: ${error.message}`, LogType.ERROR));
              }
            }}
            editMode={editMode}
          />
        )}

        {activeTab === 'members' && (
          <MembersSection
            members={members}
            onAdd={handleAddMember}
            onEdit={handleUpdateMemberRole}
            onDelete={handleRemoveMember}
            editMode={editMode}
          />
        )}

        {activeTab === 'licenses' && (
          <LicenseSection
            licenses={licenses}
            organizationId={organization.fieldData.__ID}
            editMode={editMode}
            availableModules={availableModules}
          />
        )}
        {isMobile && (
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ 
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: '#424242',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              borderColor: 'divider',
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main,
                top: 0
              },
              '& .MuiTab-root': {
                minHeight: 56,
                '&:focus': {
                  outline: 'none'
                },
                '&.Mui-selected': {
                  color: theme.palette.primary.main
                }
              }
            }}
          >
            <Tab icon={<BusinessIcon />} value="details" />
            <Tab icon={<EmailIcon />} value="contact" />
            <Tab icon={<PersonIcon />} value="members" />
            <Tab icon={<VpnKeyIcon />} value="licenses" />
          </Tabs>
        )}
        {isMobile && (
          <Box sx={{ 
            position: 'fixed',
            bottom: 56,
            left: 0,
            right: 0,
            bgcolor: '#424242',
            p: 1,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
          }}>
            {editMode ? (
              <>
                <Button onClick={handleCancel}>Cancel</Button>
                <Button 
                  onClick={handleSave} 
                  variant="contained"
                  disabled={activeTab !== 'details'}
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <IconButton 
                  onClick={handleEdit} 
                  color="primary"
                  size="small"
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  onClick={onClose}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      {editMode && !isMobile && (
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={activeTab !== 'details'}
          >
            Save Changes
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

OrganizationDetails.propTypes = {
  organization: PropTypes.shape({
    recordId: PropTypes.string.isRequired,
    fieldData: PropTypes.shape({
      Name: PropTypes.string.isRequired,
      __ID: PropTypes.string.isRequired,
      website: PropTypes.string,
      '~CreatedBy': PropTypes.string,
      '~CreationTimestamp': PropTypes.string,
      '~ModificationTimestamp': PropTypes.string,
      '~ModifiedBy': PropTypes.string,
      '~dapiRecordID': PropTypes.string
    }).isRequired,
    portalData: PropTypes.shape({
      addresses: PropTypes.array,
      emails: PropTypes.array,
      phones: PropTypes.array,
      parties: PropTypes.array,
      details: PropTypes.array,
      licenses: PropTypes.array
    }).isRequired,
    modId: PropTypes.string
  }).isRequired,
  onClose: PropTypes.func.isRequired
};

export default OrganizationDetails;
