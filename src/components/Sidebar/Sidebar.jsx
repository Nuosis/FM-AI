import { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import Charlie from '../../assets/Charlie.png';
import { 
  Drawer, 
  List, 
  ListItemText, 
  ListItemIcon, 
  Typography,
  styled,
  useTheme,
  ListItemButton,
} from '@mui/material';
import {
  Settings,
  Login as LoginIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { menuItems } from '../../constants/menuItems';
import {
  Code,
  ManageSearch,
  Handyman,
  SmartToy,
  QuestionAnswer
} from '@mui/icons-material';
import { createLog, LogType, toggleLogViewer } from '../../redux/slices/appSlice';
import tokenStorage from '../Auth/services/tokenStorage';
import { store } from '../../redux/store';

const DrawerHeader = styled('div')(() => ({
  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  position: 'relative',
  height: '60px'
}));

const HeaderImage = styled('img')({
  height: '40px',
  width: '40px',
  objectFit: 'contain',
  position: 'absolute',
  right: 0,
  bottom: 0
});

const Sidebar = ({ width = 240, onViewChange, currentView }) => {
  const [openItem, setOpenItem] = useState(null);
  const theme = useTheme();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const handleClick = (path) => {
    if (openItem === path) {
      setOpenItem(null);
      dispatch(createLog(`Collapsed section: ${path}`, LogType.DEBUG));
    } else {
      setOpenItem(path);
      dispatch(createLog(`Expanded section: ${path}`, LogType.DEBUG));
    }
  };

  const handleViewChange = (view) => {
    dispatch(createLog(`Navigating to view: ${view}`, LogType.INFO));
    onViewChange(view);
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
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DrawerHeader>
        <Typography variant="h6" color="primary" sx={{ my: 2, ml: 2 }}>FM + AI</Typography>
        <HeaderImage 
          src={Charlie} 
          alt="Charlie" 
          onClick={() => dispatch(toggleLogViewer())}
          style={{ cursor: 'pointer' }}
        />
      </DrawerHeader>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <List sx={{ flex: 1 }}>
          {isAuthenticated && menuItems.filter(item => item.enabled).map(({ name, iconType, path, view }) => {
            const icon = (() => {
              switch (iconType) {
                case 'Code': return <Code />;
                case 'ManageSearch': return <ManageSearch />;
                case 'Handyman': return <Handyman />;
                case 'SmartToy': return <SmartToy />;
                case 'QuestionAnswer': return <QuestionAnswer />;
                default: return null;
              }
            })();
            return (
            <div key={name}>
              <ListItemButton 
                onClick={() => {
                  handleClick(path);
                  handleViewChange(view);
                }}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  ...(currentView === view && {
                    backgroundColor: 'rgba(144, 202, 249, 0.16)',
                  })
                }}
              >
                <ListItemIcon sx={{ color: theme.palette.primary.main }}>
                  {icon}
                </ListItemIcon>
                <ListItemText primary={name} />
              </ListItemButton>
            </div>
            );
          })}
        </List>
      </div>

      <List sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
        {isAuthenticated && (
          <ListItemButton
            onClick={() => handleViewChange('settings')}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
              ...(currentView === 'settings' && {
                backgroundColor: 'rgba(144, 202, 249, 0.16)',
              })
            }}
          >
            <ListItemIcon sx={{ color: theme.palette.primary.main }}>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        )}
        
        {!isAuthenticated ? (
          <ListItemButton
            onClick={() => handleViewChange('login')}
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
        ) : (
          <ListItemButton
            onClick={async () => {
              try {
                const state = store.getState().auth;
                await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ refresh_token: state.refreshToken })
                });
                tokenStorage.clearTokens();
                dispatch(createLog('User logged out successfully', LogType.INFO));
                handleViewChange('login');
              } catch (error) {
                console.error('Logout error:', error);
                dispatch(createLog('Logout failed: ' + error.message, LogType.ERROR));
                tokenStorage.clearTokens();
                handleViewChange('login');
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
  onViewChange: PropTypes.func.isRequired,
  currentView: PropTypes.string.isRequired,
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    iconType: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    view: PropTypes.string.isRequired,
    enabled: PropTypes.bool.isRequired,
    component: PropTypes.string.isRequired
  }))
};

export default Sidebar;
