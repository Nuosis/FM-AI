import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { store } from '../../redux/store';
import tokenStorage from '../Auth/services/tokenStorage';
import { 
  styled,
  useTheme,
  Box,
  IconButton,
} from '@mui/material';
import {
  Article as LogIcon,
  Login as LoginIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { toggleLogViewer, selectShowLogViewer, createLog, LogType } from '../../redux/slices/appSlice';
import DropUpMenu from './DropUpMenu';

const MobileIconList = styled('div')(({ theme }) => ({
  display: 'flex',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': {
    display: 'none'
  },
  msOverflowStyle: 'none',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  alignItems: 'center',
  justifyContent: 'flex-start',
  width: '100%',
  '& .MuiIconButton-root': {
    flexShrink: 0,
    transition: theme.transitions.create(['background-color', 'transform'], {
      duration: theme.transitions.duration.shorter
    }),
    '&:hover': {
      transform: 'scale(1.1)'
    }
  }
}));

const MobileSidebar = ({ 
  menuItems, 
  components, 
  mobileMenuAnchor,
  setMobileMenuAnchor,
  setOpenItem,
  onViewChange,
  onClassSelect,
  currentView,
  isAuthenticated 
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const showLogViewer = useSelector(selectShowLogViewer);

  const handleToggleLogs = () => {
    dispatch(createLog(`${showLogViewer ? 'Hiding' : 'Showing'} log viewer`, LogType.DEBUG));
    dispatch(toggleLogViewer());
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
      setOpenItem('processes');
    } else {
      dispatch(createLog(`Selected class: ${classInfo.name} in category: ${category}`, LogType.INFO));
      onClassSelect(category, classInfo);
    }
  };

  return (
    <>
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 1
      }}>
        <MobileIconList>
          {menuItems.map(({ name, icon, path }) => 
            path === 'processes' && !isAuthenticated ? null : (
              <IconButton
                key={name}
                onClick={() => {
                  if (mobileMenuAnchor === path) {
                    setMobileMenuAnchor(null);
                  } else {
                    setMobileMenuAnchor(path);
                    setOpenItem(path);
                  }
                }}
                sx={{
                  color: theme.palette.primary.main,
                  ...(mobileMenuAnchor === path && {
                    backgroundColor: 'rgba(144, 202, 249, 0.16)',
                  })
                }}
              >
                {icon}
              </IconButton>
            )
          )}
          <IconButton
            onClick={handleToggleLogs}
            sx={{
              color: theme.palette.primary.main,
              ...(showLogViewer && {
                backgroundColor: 'rgba(144, 202, 249, 0.16)',
              })
            }}
          >
            <LogIcon />
          </IconButton>
          {!isAuthenticated ? (
            <IconButton
              onClick={() => onViewChange('login')}
              sx={{
                color: theme.palette.primary.main,
                ...(currentView === 'login' && {
                  backgroundColor: 'rgba(144, 202, 249, 0.16)',
                })
              }}
            >
              <LoginIcon />
            </IconButton>
          ) : (
            <IconButton
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
                  onViewChange('login');
                } catch (error) {
                  console.error('Logout error:', error);
                  dispatch(createLog('Logout failed: ' + error.message, LogType.ERROR));
                  tokenStorage.clearTokens();
                  onViewChange('login');
                }
              }}
              sx={{
                color: theme.palette.primary.main
              }}
            >
              <LogoutIcon />
            </IconButton>
          )}
        </MobileIconList>
      </Box>
      <DropUpMenu
        open={Boolean(mobileMenuAnchor)}
        onClose={() => setMobileMenuAnchor(null)}
        items={components[mobileMenuAnchor] || []}
        onItemClick={(item) => handleClassSelect(mobileMenuAnchor, item)}
        currentView={currentView}
      />
    </>
  );
};

MobileSidebar.propTypes = {
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
    path: PropTypes.string.isRequired
  })).isRequired,
  components: PropTypes.object.isRequired,
  mobileMenuAnchor: PropTypes.string,
  setMobileMenuAnchor: PropTypes.func.isRequired,
  setOpenItem: PropTypes.func.isRequired,
  onViewChange: PropTypes.func.isRequired,
  onClassSelect: PropTypes.func.isRequired,
  currentView: PropTypes.string.isRequired,
  isAuthenticated: PropTypes.bool.isRequired
};

export default MobileSidebar;
