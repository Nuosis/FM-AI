import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { getLicenseKeyAuth } from '../../redux/slices/authSlice';
import { store } from '../../redux/store';
import tokenStorage from '../Auth/services/tokenStorage';
import { 
  Drawer, 
  List, 
  ListItemText, 
  ListItemIcon, 
  Collapse,
  Typography,
  styled,
  useTheme,
  ListItemButton,
  Alert,
  Select,
  MenuItem,
  FormControl,
  Box,
  IconButton,
  Divider
} from '@mui/material';
import {
  Security,
  Cloud,
  Timeline,
  Settings,
  Code,
  ExpandMore,
  ExpandLess,
  Storage,
  Class,
  AutoAwesome,
  Extension,
  VpnKey,
  Business,
  Clear as ClearIcon,
  Article as LogIcon,
  Login as LoginIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { 
  fetchOrganizations, 
  selectOrganization, 
  selectAllOrganizations, 
  selectSelectedOrganizationId 
} from '../../redux/slices/organizationSlice';
import { toggleLogViewer, selectShowLogViewer, createLog, LogType } from '../../redux/slices/appSlice';

const DrawerHeader = styled('div')(() => ({
  padding: '20px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
}));

const StyledSelect = styled(Select)(({ theme }) => ({
  '& .MuiSelect-select': {
    paddingTop: '8px',
    paddingBottom: '8px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.divider,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
  },
  '& .MuiSelect-icon': {
    color: theme.palette.primary.main,
  }
}));

const menuItems = [
  { name: 'Authentication', icon: <Security />, path: 'auth' },
  { name: 'Deployment', icon: <Cloud />, path: 'deployment' },
  { name: 'Monitoring', icon: <Timeline />, path: 'monitoring' },
  { name: 'Orchestration', icon: <Settings />, path: 'orchestration' },
  { name: 'Database', icon: <Code />, path: 'database' },
  { name: 'Org Settings', icon: <AutoAwesome />, path: 'processes' }
];

const Sidebar = ({ width = 240, onClassSelect, onViewChange, currentView }) => {
  const [openItem, setOpenItem] = useState(null);
  const [components, setComponents] = useState({});
  const [error, setError] = useState(null);
  const theme = useTheme();
  const dispatch = useDispatch();
  const organizations = useSelector(selectAllOrganizations);
  const selectedOrgId = useSelector(selectSelectedOrganizationId);
  const showLogViewer = useSelector(selectShowLogViewer);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const licenseKeyAuth = useSelector(getLicenseKeyAuth);

  useEffect(() => {
    dispatch(createLog('Initializing sidebar', LogType.DEBUG));
    //console.log('Initializing sidebar')
    if (licenseKeyAuth) {
      dispatch(createLog('License key auth available, fetching organizations', LogType.DEBUG));
      //console.log('License key auth available, fetching organizations')
      dispatch(fetchOrganizations());
    } else {
      dispatch(createLog('License key auth not available, skipping organization fetch', LogType.WARN));
      //console.log('License key auth not available, skipping organization fetch')
    }
  }, [dispatch, licenseKeyAuth]);

  useEffect(() => {
    if (currentView === 'organizations') {
      setOpenItem('processes');
      dispatch(createLog('Auto-expanded Org Settings menu', LogType.DEBUG));
    }
  }, [currentView, dispatch]);

  useEffect(() => {
    const loadAllConfigs = async () => {
      dispatch(createLog('Loading backend configurations', LogType.INFO));
      try {
        const configs = {};
        for (const { path } of menuItems) {
          if (path === 'processes') {
            configs[path] = [
              {
                name: 'Organizations',
                component: 'OrganizationList',
                isSpecial: true,
                icon: <Business fontSize="small" />
              },
              {
                name: 'Licenses',
                component: 'LicenseList',
                isSpecial: true,
                icon: <VpnKey fontSize="small" />
              },
              {
                name: 'Modules',
                component: 'ModuleList',
                isSpecial: true,
                icon: <Extension fontSize="small" />
              }
            ];
            continue;
          }
          dispatch(createLog(`Loading configuration for ${path}`, LogType.DEBUG));
          const response = await fetch(`/api/admin/backend-app/${path}/config.json`);
          if (!response.ok) {
            throw new Error(`Failed to load config for ${path}`);
          }
          const data = await response.json();
          let items = Object.entries(data).flatMap(([source, component]) => 
            component.classes.map(classInfo => ({
              ...classInfo,
              component: component.summary,
              source
            }))
          );
          
          if (path === 'database') {
            items = [
              {
                name: 'Register a Database',
                component: 'DatabaseRegistry',
                isSpecial: true
              },
              ...items
            ];
          }
          configs[path] = items;
        }
        setComponents(configs);
        dispatch(createLog('Successfully loaded all backend configurations', LogType.INFO));
      } catch (err) {
        console.error('Error loading configs:', err);
        setError('Failed to load configurations');
        dispatch(createLog(`Error loading configurations: ${err.message}`, LogType.ERROR));
      }
    };

    loadAllConfigs();
  }, [dispatch]);

  const handleClick = (path) => {
    if (openItem === path) {
      setOpenItem(null);
      dispatch(createLog(`Collapsed section: ${path}`, LogType.DEBUG));
    } else {
      setOpenItem(path);
      dispatch(createLog(`Expanded section: ${path}`, LogType.DEBUG));
    }
  };

  const handleClassSelect = (category, classInfo) => {
    if (classInfo.isSpecial) {
      const viewName = classInfo.name.toLowerCase();
      dispatch(createLog(`Navigating to special view: ${viewName}`, LogType.INFO));
      if (classInfo.name === 'Register a Database') {
        onViewChange('database');
      } else if (classInfo.name === 'Modules') {
        onViewChange('modules');
      } else if (classInfo.name === 'Licenses') {
        onViewChange('licenses');
      } else if (classInfo.name === 'Organizations') {
        onViewChange('organizations');
      } else if (classInfo.name === 'Billables') {
        onViewChange('billables');
      }
    } else {
      dispatch(createLog(`Selected class: ${classInfo.name} in category: ${category}`, LogType.INFO));
      onClassSelect(category, classInfo);
    }
  };

  const handleOrgSelect = (event) => {
    const orgId = event.target.value;
    const org = organizations.find(o => o.recordId === orgId);
    dispatch(createLog(`Selected organization: ${org?.fieldData.Name || 'Unknown'}`, LogType.INFO));
    dispatch(selectOrganization(orgId));
  };

  const handleClearOrg = () => {
    dispatch(createLog('Cleared organization selection', LogType.INFO));
    dispatch(selectOrganization(null));
  };

  const handleToggleLogs = () => {
    dispatch(createLog(`${showLogViewer ? 'Hiding' : 'Showing'} log viewer`, LogType.DEBUG));
    dispatch(toggleLogViewer());
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: width,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <DrawerHeader>
        <Typography variant="h6" color="primary">Admin Panel</Typography>
      </DrawerHeader>
      {!licenseKeyAuth && (
        <Alert severity="warning" sx={{ m: 1 }}>
          License key auth not available
        </Alert>
      )}
      <Box sx={{ p: 2 }}>
        <FormControl fullWidth>
          <StyledSelect
            value={selectedOrgId || ''}
            onChange={handleOrgSelect}
            displayEmpty
            disabled={!licenseKeyAuth}
            renderValue={(value) => {
              if (!value) {
                return (
                  <Typography color="text.secondary">
                    Select organization...
                  </Typography>
                );
              }
              const org = organizations.find(o => o.recordId === value);
              return org?.fieldData.Name || '';
            }}
            endAdornment={
              selectedOrgId ? (
                <IconButton 
                  size="small" 
                  onClick={handleClearOrg}
                  sx={{ 
                    position: 'absolute',
                    right: 28,
                    visibility: selectedOrgId ? 'visible' : 'hidden'
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null
            }
          >
            {organizations.map((org) => (
              <MenuItem key={org.recordId} value={org.recordId}>
                {org.fieldData.Name}
              </MenuItem>
            ))}
          </StyledSelect>
        </FormControl>
      </Box>
      <Divider />
      {error && (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      )}
      <List>
        {menuItems.map(({ name, icon, path }) => 
          // Only show Org Settings if authenticated
          path === 'processes' && !isAuthenticated ? null : (
          <div key={name}>
            <ListItemButton 
              onClick={() => handleClick(path)}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ color: theme.palette.primary.main }}>
                {icon}
              </ListItemIcon>
              <ListItemText primary={name} />
              {openItem === path ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse 
              in={openItem === path} 
              timeout="auto" 
              unmountOnExit
              sx={{
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 100%)'
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(0deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 100%)'
                }
              }}
            >
              <List component="div" disablePadding>
                {(components[path] || []).map((classInfo) => (
                  <ListItemButton 
                    sx={{ 
                      pl: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      },
                      ...(classInfo.isSpecial && (
                        (classInfo.name === 'Register a Database' && currentView === 'database') ||
                        (classInfo.name === 'Modules' && currentView === 'modules') ||
                        (classInfo.name === 'Licenses' && currentView === 'licenses') ||
                        (classInfo.name === 'Organizations' && currentView === 'organizations') ||
                        (classInfo.name === 'Billables' && currentView === 'billables')
                      ) && {
                        backgroundColor: 'rgba(144, 202, 249, 0.16)',
                      })
                    }}
                    key={`${classInfo.name}`}
                    onClick={() => handleClassSelect(path, classInfo)}
                  >
                    <ListItemIcon sx={{ color: theme.palette.primary.main, minWidth: 36 }}>
                      {classInfo.icon || (classInfo.isSpecial ? <Storage fontSize="small" /> : <Class fontSize="small" />)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={classInfo.name}
                      primaryTypographyProps={{
                        sx: { color: theme.palette.text.secondary }
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </div>
        ))}
        <ListItemButton
          onClick={handleToggleLogs}
          sx={{
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
            ...(showLogViewer && {
              backgroundColor: 'rgba(144, 202, 249, 0.16)',
            })
          }}
        >
          <ListItemIcon sx={{ color: theme.palette.primary.main }}>
            <LogIcon />
          </ListItemIcon>
          <ListItemText primary="Logs" />
        </ListItemButton>
        {/* Show Login button only when not authenticated */}
        {!isAuthenticated && (
          <ListItemButton
            onClick={() => onViewChange('login')}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
              ...(currentView === 'login' && {
                backgroundColor: 'rgba(144, 202, 249, 0.16)',
              })
            }}
          >
            <ListItemIcon sx={{ color: theme.palette.primary.main }}>
              <LoginIcon />
            </ListItemIcon>
            <ListItemText primary="Login" />
          </ListItemButton>
        )}
        
        {/* Show Logout button only when authenticated */}
        {isAuthenticated && (
          <ListItemButton
            onClick={async () => {
              try {
                const state = store.getState().auth;
                // Call backend logout endpoint
                await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ refresh_token: state.refreshToken })
                });
                
                // Clear tokens from storage
                tokenStorage.clearTokens();
                dispatch(createLog('User logged out successfully', LogType.INFO));
                onViewChange('login');
              } catch (error) {
                console.error('Logout error:', error);
                dispatch(createLog('Logout failed: ' + error.message, LogType.ERROR));
                // Still clear local state even if backend call fails
                tokenStorage.clearTokens();
                onViewChange('login');
              }
            }}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }
            }}
          >
            <ListItemIcon sx={{ color: theme.palette.primary.main }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        )}
      </List>
    </Drawer>
  );
};

Sidebar.propTypes = {
  width: PropTypes.number,
  onClassSelect: PropTypes.func.isRequired,
  onViewChange: PropTypes.func.isRequired,
  currentView: PropTypes.string.isRequired
};

export default Sidebar;
