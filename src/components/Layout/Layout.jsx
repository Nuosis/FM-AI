import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, styled, useTheme, useMediaQuery } from '@mui/material';
import { useSelector } from 'react-redux';
import Sidebar from '../Sidebar/Sidebar';
import Bottombar from '../Sidebar/Bottombar';
import {
  Security,
  Cloud,
  Timeline,
  Settings,
  Code,
  AutoAwesome,
  Business,
  VpnKey,
  Extension
} from '@mui/icons-material';

const DRAWER_WIDTH = 240;

const BottomBarContainer = styled('div')(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: '100px',
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  zIndex: theme.zIndex.drawer + 2,
  display: 'flex',
  flexDirection: 'column'
}));

const Main = styled('main', {
  shouldForwardProp: prop => prop !== 'isMobile'
})(({ theme, isMobile }) => ({
  flexGrow: 1,
  width: '100%',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflow: 'auto',
  marginBottom: isMobile ? '96px' : 0
}));

const menuItems = [
  { name: 'Authentication', icon: <Security />, path: 'auth' },
  { name: 'Deployment', icon: <Cloud />, path: 'deployment' },
  { name: 'Monitoring', icon: <Timeline />, path: 'monitoring' },
  { name: 'Orchestration', icon: <Settings />, path: 'orchestration' },
  { name: 'Database', icon: <Code />, path: 'database' },
  { name: 'Org Settings', icon: <AutoAwesome />, path: 'processes' }
];

const Layout = ({ children, onClassSelect, onViewChange, currentView }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [openItem, setOpenItem] = useState(null);
  const [components, setComponents] = useState({});
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    const loadAllConfigs = async () => {
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
      } catch (err) {
        console.error('Error loading configs:', err);
      }
    };

    loadAllConfigs();
  }, []);

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh',
      width: '100%'
    }}>
      {isMobile ? (
        <BottomBarContainer>
          <Bottombar
            menuItems={menuItems}
            components={components}
            mobileMenuAnchor={mobileMenuAnchor}
            activeParentPath={
              // For special views, highlight parent without opening menu
              currentView === 'organizations' || 
              currentView === 'licenses' || 
              currentView === 'modules' ? 'processes' : null
            }
            setMobileMenuAnchor={setMobileMenuAnchor}
            setOpenItem={setOpenItem}
            onClassSelect={onClassSelect}
            onViewChange={onViewChange}
            currentView={currentView}
            isAuthenticated={isAuthenticated}
          />
        </BottomBarContainer>
      ) : (
        <Sidebar 
          width={DRAWER_WIDTH} 
          onClassSelect={onClassSelect}
          onViewChange={onViewChange}
          currentView={currentView}
          openItem={openItem}
          setOpenItem={setOpenItem}
        />
      )}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        minWidth: 0
      }}>
        <Main id="main" isMobile={isMobile}>
          {children}
        </Main>
      </Box>
    </Box>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  onClassSelect: PropTypes.func.isRequired,
  onViewChange: PropTypes.func.isRequired,
  currentView: PropTypes.string.isRequired
};

export default Layout;
