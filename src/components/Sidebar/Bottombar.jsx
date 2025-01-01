import PropTypes from 'prop-types';
import { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { store } from '../../redux/store';
import tokenStorage from '../Auth/services/tokenStorage';
import { 
  styled,
  useTheme,
  IconButton,
} from '@mui/material';
import {
  Article as LogIcon,
  Login as LoginIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { toggleLogViewer, selectShowLogViewer, createLog, LogType } from '../../redux/slices/appSlice';
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

const MobileSidebar = ({ 
  menuItems, 
  components, 
  mobileMenuAnchor,
  setMobileMenuAnchor,
  setOpenItem,
  onViewChange,
  onClassSelect,
  currentView,
  isAuthenticated,
  activeParentPath
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const showLogViewer = useSelector(selectShowLogViewer);
  const [centeredIcon, setCenteredIcon] = useState(null);
  const scrollContainerRef = useRef(null);
  const iconListRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const scrollToIcon = (iconPath) => {
    if (!iconPath) return;
    const iconElement = iconListRef.current?.querySelector(`[data-path="${iconPath}"]`);
    if (iconElement) {
      const currentScroll = iconListRef.current.scrollLeft;
      const targetScroll = iconElement.offsetLeft - (iconListRef.current.offsetWidth - iconElement.offsetWidth) / 2;
      const distance = Math.abs(currentScroll - targetScroll);
      
      // Longer duration for longer distances
      const duration = Math.min(4500, Math.max(2400, distance * 6));
      
      // Disable snap points during animation
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
      
      // Reset snap points after animation
      setTimeout(() => {
        iconListRef.current.style.scrollSnapType = 'x mandatory';
      }, duration);
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
        // If no menu is open after 2 seconds, scroll back to active parent
        if (!mobileMenuAnchor && activeParentPath) {
          scrollToIcon(activeParentPath);
        }
      }, 2000);
    };

    const iconList = iconListRef.current;
    iconList.addEventListener('scroll', handleScroll);
    
    // Initial scroll to active parent
    if (activeParentPath) {
      scrollToIcon(activeParentPath);
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      iconList.removeEventListener('scroll', handleScroll);
    };
  }, [activeParentPath, mobileMenuAnchor]);

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
      }

  return (
    <BottomBarContainer>
      <ScrollContainer ref={scrollContainerRef}>
        <MobileIconList ref={iconListRef}>
          {menuItems.map(({ name, icon, path }) => 
            path === 'processes' && !isAuthenticated ? null : (
              <IconButton
                key={name}
                className="icon-button"
                data-path={path}
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
                  ...(centeredIcon === path && {
                    backgroundColor: 'rgba(144, 202, 249, 0.16)',
                    transform: 'scale(1.1)'
                  })
                }}
              >
                {icon}
              </IconButton>
            )
          )}
          <IconButton
            className="icon-button"
            data-path="logs"
            onClick={handleToggleLogs}
            sx={{
              color: theme.palette.primary.main,
              ...(centeredIcon === 'logs' && {
                backgroundColor: 'rgba(144, 202, 249, 0.16)',
                transform: 'scale(1.1)'
              })
            }}
          >
            <LogIcon />
          </IconButton>
          {!isAuthenticated ? (
            <IconButton
              className="icon-button"
              data-path="login"
              onClick={() => onViewChange('login')}
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
                  onViewChange('login');
                } catch (error) {
                  console.error('Logout error:', error);
                  dispatch(createLog('Logout failed: ' + error.message, LogType.ERROR));
                  tokenStorage.clearTokens();
                  onViewChange('login');
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
          (centeredIcon === 'logs' ? 'Logs' :
           centeredIcon === 'login' ? 'Login' :
           centeredIcon === 'logout' ? 'Logout' : '')
        )}
      </IconLabel>
      {/* Only show DropUpMenu when explicitly opened by clicking */}
      {mobileMenuAnchor && (
        <DropUpMenu
          open={true}
          onClose={() => setMobileMenuAnchor(null)}
          items={components[mobileMenuAnchor] || []}
          onItemClick={(item) => handleClassSelect(mobileMenuAnchor, item)}
          currentView={currentView}
        />
      )}
    </BottomBarContainer>
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
  isAuthenticated: PropTypes.bool.isRequired,
  activeParentPath: PropTypes.string
};

export default MobileSidebar;
