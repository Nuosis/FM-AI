import { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { updateUserPreferences } from '../../redux/slices/authSlice';
import { setDarkMode } from '../../redux/slices/llmSlice';
import supabaseService from '../../services/supabaseService';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';

/**
 * PreferencesForm component for managing application preferences
 * Currently handles UI mode (dark/light/system)
 * Maps to user_preferences table with key = 'llm_preferences'
 */
const PreferencesForm = ({ onSuccess, onError }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.auth.user);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get dark mode from Redux store using memoized selector
  const darkMode = useSelector(state => state.llm.darkMode || 'system', shallowEqual);

  const handleDarkModeChange = async (event) => {
    const newDarkMode = event.target.value;
    setIsLoading(true);
    
    try {
      // Update Redux store and localStorage
      dispatch(setDarkMode(newDarkMode));
      
      // Update database if user is logged in
      if (currentUser?.user_id) {
        console.log('Current user ID being used for preferences:', currentUser.user_id);
        // Update mode_preference in Supabase
        const modePreference = {
          darkMode: newDarkMode
        };
        
        // Use user_id instead of id - user_id is the auth.users ID
        console.log('Using auth user ID instead of profile ID:', currentUser.user_id);
        
        await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_preferences')
            .upsert({
              user_id: currentUser.user_id, // Use the auth.users ID
              preference_key: 'mode_preference',
              preference_value: modePreference
            }, {
              onConflict: 'user_id,preference_key'
            })
        );
        
        console.log('Attempted to update preferences for user ID:', currentUser.user_id);
        
        // Update mode_preference in Redux store
        dispatch(updateUserPreferences({
          key: 'mode_preference',
          value: modePreference
        }));
        
        if (onSuccess) {
          onSuccess('Preferences updated successfully');
        }
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      if (onError) {
        onError('Failed to update preferences');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Get the mode preference from Redux store
  // Get the mode preference from Redux store
  const modePreference = useSelector(() => {
    // Get it from the dedicated mode_preference key
    if (currentUser?.preferences?.mode_preference) {
      return currentUser.preferences.mode_preference.darkMode;
    }
    // Fall back to the default value from the llm slice
    return darkMode;
  }, shallowEqual);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Application Preferences
      </Typography>
      
      {/* Dark Mode Preference */}
      <FormControl fullWidth disabled={isLoading}>
        <InputLabel>Dark Mode</InputLabel>
        <Select
          value={modePreference || darkMode}
          onChange={handleDarkModeChange}
          label="Dark Mode"
          endAdornment={isLoading ? <CircularProgress size={20} sx={{ mr: 2 }} /> : null}
        >
          <MenuItem value="system">System Default</MenuItem>
          <MenuItem value="dark">Always On</MenuItem>
          <MenuItem value="light">Always Off</MenuItem>
        </Select>
      </FormControl>
      
      {/* Additional preferences can be added here in the future */}
    </Box>
  );
};

PreferencesForm.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func
};

export default PreferencesForm;