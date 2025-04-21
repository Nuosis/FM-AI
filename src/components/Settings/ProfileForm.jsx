import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { updateProfile } from '../../redux/slices/authSlice';
import supabaseService from '../../services/supabaseService';
import {
  Box,
  Button,
  Typography,
  TextField,
  CircularProgress
} from '@mui/material';

/**
 * ProfileForm component for managing user profile information
 * Handles first name, last name, phone, city, state, and email (display only)
 * Maps to customers, customer_phone, customer_address, customer_email tables
 */
const ProfileForm = ({ onSuccess, onError }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.auth.user);
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [profileError, setProfileError] = useState('');
  // Success is handled by parent component's snackbar via onSuccess callback

  // Initialize profile fields on mount
  useEffect(() => {
    console.log({currentUser})
    if (currentUser) {
      setFirstName(currentUser.first_name || currentUser.user_metadata?.first_name || '');
      setLastName(currentUser.last_name || currentUser.user_metadata?.last_name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      
      // Use address from currentUser
      if (currentUser.address) {
        setCity(currentUser.address.city || '');
        setState(currentUser.address.state || '');
      } else {
        // Clear city and state if no address is available
        setCity('');
        setState('');
      }
    }
  }, [currentUser]);

  const validateProfileForm = () => {
    // Basic validation for profile fields
    if (!firstName.trim()) {
      setProfileError('First name is required');
      return false;
    }
    if (!lastName.trim()) {
      setProfileError('Last name is required');
      return false;
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setProfileError('Please enter a valid email address');
      return false;
    }
    // Phone validation (optional field)
    if (phone) {
      const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
      if (!phoneRegex.test(phone)) {
        setProfileError('Please enter a valid phone number');
        return false;
      }
    }
    // City/state validation
    if (!city.trim()) {
      setProfileError('City is required');
      return false;
    }
    if (!state.trim()) {
      setProfileError('State is required');
      return false;
    }
    setProfileError('');
    return true;
  };
  
  const handleProfileUpdate = async () => {
    if (!validateProfileForm()) return;

    setIsLoading(true);

    try {
      // Update customer name and phone
      let customerId = currentUser.customer && currentUser.customer.id;

      // If no customer, create one and link to user
      if (!customerId) {
        // Create customer
        console.log("Creating new customer");
        const newCustomer = await supabaseService.insertRecord(
          'customers',
          {
            name: `${firstName} ${lastName}`,
            first_name: firstName,
            last_name: lastName
          },
          { returning: true }
        );
        
        if (!newCustomer || !newCustomer[0]) throw new Error('Failed to create customer');
        customerId = newCustomer[0].id;
        // Links customer to user automatically by trigger on backend
      } else {
        // Update customer name fields
        await supabaseService.updateRecord(
          'customers',
          {
            name: `${firstName} ${lastName}`,
            first_name: firstName,
            last_name: lastName
          },
          { id: customerId }
        );
      }

      // Upsert phone to customer_phone
      if (phone) {
        await supabaseService.upsertRecord(
          'customer_phone',
          {
            customer_id: customerId,
            phone: phone,
            is_primary: true
          }
        );
      }

      // Upsert organization to customer_organization
      if (phone) {
        await supabaseService.upsertRecord(
          'customer_organization',
          {
            customer_id: customerId,
            organization_id: currentUser.organization_id,
          }
        );
      }

      // Upsert email to customer_email
      // created via trigger on customer_create

      // Check if address exists for this customer
      const existingAddress = await supabaseService.executeQuery(
        supabase => supabase
          .from('customer_address')
          .select('*')
          .eq('customer_id', customerId)
          .maybeSingle()
      );

      let addressData;
      
      if (existingAddress) {
        // Update existing address
        addressData = await supabaseService.updateRecord(
          'customer_address',
          {
            city: city,
            state: state
          },
          { customer_id: customerId },
          { returning: true }
        );
      } else {
        // Insert new address
        addressData = await supabaseService.insertRecord(
          'customer_address',
          {
            customer_id: customerId,
            city: city,
            state: state
          },
          { returning: true }
        );
      }
      
      // Perform address search on the updated address data
      if (addressData && addressData[0]) {
        // The address search would normally be handled by the Redux thunk
        // but we'll trigger a refresh of the page to update the state
        console.log('[Profile] Address updated, refresh recommended to update search results');
      }

      // Optimistically update the Redux store with the new profile data
      dispatch(updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone: phone
      }));

      if (onSuccess) {
        onSuccess('Profile updated successfully');
      }
    } catch (error) {
      const errorMsg = `Failed to update profile: ${error.message || error}`;
      setProfileError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Personal Information
      </Typography>
      
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2
      }}>
        <TextField
          label="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          fullWidth
          required
        />
        
        <TextField
          label="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          fullWidth
          required
        />
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          disabled // Email is managed by auth system and cannot be changed here
          helperText="Email cannot be changed here. Please contact support for email changes."
          sx={{ flex: 1 }}
        />
        <TextField
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          fullWidth
          placeholder="e.g., +1 (555) 123-4567"
          sx={{ flex: 1 }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          fullWidth
          required
          placeholder="e.g., San Francisco"
        />
        <TextField
          label="State/Province"
          value={state}
          onChange={(e) => setState(e.target.value)}
          fullWidth
          required
          placeholder="e.g., BC"
        />
      </Box>
      
      {/* Temporarily disabled error display in component */}
      {/* {profileError && (
        <Typography color="error" variant="body2">
          {profileError}
        </Typography>
      )} */}
      
      {/* Success message is handled by parent component's snackbar */}
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleProfileUpdate}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          Update Profile
        </Button>
      </Box>
    </Box>
  );
};

ProfileForm.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func
};

export default ProfileForm;