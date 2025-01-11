//AI_NOTE Path variables like activeParentPath are working and should not be changed.

import PropTypes from 'prop-types';
import { useRef, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { store } from '../../redux/store';
import tokenStorage from '../Auth/services/tokenStorage';
import { 
  styled,
  useTheme,
  IconButton,
} from '@mui/material';
import {
  Settings,
  Login as LoginIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { createLog, LogType } from '../../redux/slices/appSlice';
import DropUpMenu from './DropUpMenu';

const BottomBarContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
});

const IconLabel = styled('div')(({ theme }) => ({
  width: '100%',
  textAlign: 'center',
  padding: theme.spacing(.75),
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}));

const ScrollContainer = styled('div')(({ theme }) => ({
  width: '100%',
  overflow: 'hidden',
  position: 'relative',
  height: '60px',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: theme.palette.background.paper
}));

const MobileIconList = styled('div')(({ theme }) => ({
  display: 'flex',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': {
    display: 'none'
  },
  msOverflowStyle: 'none',
  gap: theme.spacing(2),
  padding: `${theme.spacing(0.5)} 50%`,
  WebkitOverflowScrolling: 'touch',
  scrollBehavior: 'smooth',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.standard * 6,
    easing: theme.transitions.easing.easeInOut
  }),
  alignItems: 'center',
  width: 'max-content',
  '& .MuiIconButton-root': {
    flexShrink: 0,
    transition: theme.transitions.create(['background-color', 'transform'], {
      duration: theme.transitions.duration.shorter
    }),
    '&:hover': {
      transform: 'scale(1.1)'
    },
    '&:focus': {
      outline: 'none'
    },
    padding: theme.spacing(1.5),
    margin: theme.spacing(0.5, 0),
    '& svg': {
      fontSize: '1.75rem'
    }
  }
}));

const BottomBar = ({ 
  menuItems,
  components, 
  mobileMenuAnchor,
  setMobileMenuAnchor,
  setOpenItem,
  onViewChange,
  currentView,
  isAuthenticated,
  activeParentPath: propActiveParentPath
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [centeredIcon, setCenteredIcon] = useState(null);
  const [activeParentPath, setActiveParentPath] = useState(propActiveParentPath);
  const [selectedParentPath, setSelectedParentPath] = useState(propActiveParentPath);

  useEffect(() => {
    console.log('BottomBar mounted with:', {
      currentView,
      propActiveParentPath,
      menuItems: menuItems.map(item => ({ name: item.name, path: item.path }))
    });
  }, []);
  
  useEffect(() => {
    console.log(`Setting ${selectedParentPath} to active parent path`);
    setActiveParentPath(selectedParentPath);
  }, []);

  const scrollContainerRef = useRef(null);
  const iconListRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const scrollToIcon = (iconPath) => {
    if (!iconPath) {
      console.log(`No iconPath provided for ${activeParentPath}`);
      return;
    }
    console.log(`Scrolling to ${activeParentPath}`);

    const iconElement = iconListRef.current?.querySelector(`[data-path="${iconPath}"]`);

    if (iconElement) {
      const currentScroll = iconListRef.current.scrollLeft;
      const targetScroll = iconElement.offsetLeft - (iconListRef.current.offsetWidth - iconElement.offsetWidth) / 2;
      const distance = Math.abs(currentScroll - targetScroll);
      
      const duration = Math.min(4500, Math.max(2400, distance * 6));
      
      if (iconListRef.current) {
        iconListRef.current.style.scrollSnapType = 'none';
        const startTime = Date.now();
        const startScroll = currentScroll;
        const scrollDiff = targetScroll - startScroll;
        
        const easeInOutCubic = (t) => {
          return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const animate = () => {
          if (!iconListRef.current) return;
          
          const elapsed = Date.now() - startTime;
          const progress = Math.min(1, elapsed / duration);
          
          if (progress < 1) {
            const eased = easeInOutCubic(progress);
            iconListRef.current.scrollLeft = startScroll + (scrollDiff * eased);
            requestAnimationFrame(animate);
          }
        };
        
        requestAnimationFrame(animate);
        
        setTimeout(() => {
          if (iconListRef.current) {
            iconListRef.current.style.scrollSnapType = 'x mandatory';
          }
        }, duration);
      }
    }
  };

  const updateCenteredIcon = () => {
    if (!scrollContainerRef.current || !iconListRef.current) return;
    const container = scrollContainerRef.current;
    const containerCenter = container.offsetWidth / 2;
    const containerRect = container.getBoundingClientRect();
    const icons = iconListRef.current.querySelectorAll('.icon-button');
    
    let closestIcon = null;
    let minDistance = Infinity;

    icons.forEach(icon => {
      const iconRect = icon.getBoundingClientRect();
      const iconCenter = iconRect.left - containerRect.left + iconRect.width / 2;
      const distance = Math.abs(iconCenter - containerCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIcon = icon;
      }
    });

    if (closestIcon) {
      const path = closestIcon.getAttribute('data-path');
      setCenteredIcon(path);
    }
  };

  useEffect(() => {
    if (!scrollContainerRef.current || !iconListRef.current) return;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      requestAnimationFrame(updateCenteredIcon);

      scrollTimeoutRef.current = setTimeout(() => {
        if (!mobileMenuAnchor && activeParentPath) {
          scrollToIcon(activeParentPath);
        }
      }, 2000);
    };

    const iconList = iconListRef.current;
    iconList.addEventListener('scroll', handleScroll);
    
    if (activeParentPath) {
      setTimeout(() => {
        scrollToIcon(activeParentPath);
      }, 100);
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      iconList.removeEventListener('scroll', handleScroll);
    };
  }, [activeParentPath, mobileMenuAnchor]);

  const handleViewChange = (view) => {
    dispatch(createLog(`Navigating to view: ${view}`, LogType.INFO));
    onViewChange(view);
  };

  return (
    <BottomBarContainer>
      <ScrollContainer ref={scrollContainerRef}>
        <MobileIconList ref={iconListRef}>
          {menuItems.map(({ name, icon, path, view }) => (
            <IconButton
              key={name}
              className="icon-button"
              data-path={path}
              onClick={() => {
                handleViewChange(view);
                if (mobileMenuAnchor === path) {
                  setMobileMenuAnchor(null);
                } else {
                  setMobileMenuAnchor(path);
                  setOpenItem(path);
                  setSelectedParentPath(path);
                }
              }}
              sx={{
                color: theme.palette.primary.main,
                ...(centeredIcon === path && {
                  backgroundColor: 'rgba(144, 202, 249, 0.16)',
                  transform: 'scale(1.1)'
                })
              }}
            >
              {icon}
            </IconButton>
          ))}
          {isAuthenticated && (
            <IconButton
              className="icon-button"
              data-path="settings"
              onClick={() => handleViewChange('settings')}
              sx={{
                color: theme.palette.primary.main,
                ...(centeredIcon === 'settings' && {
                  backgroundColor: 'rgba(144, 202, 249, 0.16)',
                  transform: 'scale(1.1)'
                })
              }}
            >
              <Settings />
            </IconButton>
          )}
          {!isAuthenticated ? (
            <IconButton
              className="icon-button"
              data-path="login"
              onClick={() => handleViewChange('login')}
              sx={{
                color: theme.palette.primary.main,
                ...(centeredIcon === 'login' && {
                  backgroundColor: 'rgba(144, 202, 249, 0.16)',
                  transform: 'scale(1.1)'
                })
              }}
            >
              <LoginIcon />
            </IconButton>
          ) : (
            <IconButton
              className="icon-button"
              data-path="logout"
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
                color: theme.palette.primary.main,
                ...(centeredIcon === 'logout' && {
                  backgroundColor: 'rgba(144, 202, 249, 0.16)',
                  transform: 'scale(1.1)'
                })
              }}
            >
              <LogoutIcon />
            </IconButton>
          )}
        </MobileIconList>
      </ScrollContainer>
      <IconLabel>
        {centeredIcon && (
          menuItems.find(item => item.path === centeredIcon)?.name ||
          (centeredIcon === 'settings' ? 'Settings' :
           centeredIcon === 'login' ? 'Login' :
           centeredIcon === 'logout' ? 'Logout' : '')
        )}
      </IconLabel>
      {mobileMenuAnchor && (
        <DropUpMenu
          open={true}
          onClose={() => setMobileMenuAnchor(null)}
          items={components[mobileMenuAnchor] || []}
          onItemClick={(item) => {
            if (item.view) {
              handleViewChange(item.view);
            }
            setMobileMenuAnchor(null);
          }}
          currentView={currentView}
        />
      )}
    </BottomBarContainer>
  );
};

BottomBar.propTypes = {
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
    path: PropTypes.string.isRequired,
    view: PropTypes.string.isRequired
  })).isRequired,
  components: PropTypes.object.isRequired,
  mobileMenuAnchor: PropTypes.string,
  setMobileMenuAnchor: PropTypes.func.isRequired,
  setOpenItem: PropTypes.func.isRequired,
  onViewChange: PropTypes.func.isRequired,
  currentView: PropTypes.string.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
  activeParentPath: PropTypes.string
};

export default BottomBar;
