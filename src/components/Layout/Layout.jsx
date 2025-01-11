import { useState } from 'react';
import PropTypes from 'prop-types';
import { Box, styled, useTheme, useMediaQuery } from '@mui/material';
import {
  Code,
  ManageSearch,
  Handyman,
  SmartToy
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import LogViewer from '../LogViewer/LogViewer';
import { selectShowLogViewer } from '../../redux/slices/appSlice';
import Sidebar from '../Sidebar/Sidebar';
import Bottombar from '../Sidebar/Bottombar';
import { menuItems } from '../../constants/menuItems';

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
  width: '100%',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  overflow: 'auto',
  marginBottom: isMobile ? '96px' : 0
}));

const Layout = ({ children, onViewChange, currentView }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [openItem, setOpenItem] = useState(null);
  const showLogViewer = useSelector(selectShowLogViewer);

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh',
      width: '100%'
    }}>
      {isMobile ? (
        <BottomBarContainer>
          <Bottombar
            menuItems={menuItems.map(item => ({
              ...item,
              icon: (() => {
                switch (item.iconType) {
                  case 'Code': return <Code />;
                  case 'ManageSearch': return <ManageSearch />;
                  case 'Handyman': return <Handyman />;
                  case 'SmartToy': return <SmartToy />;
                  default: return null;
                }
              })()
            }))}
            mobileMenuAnchor={mobileMenuAnchor}
            setMobileMenuAnchor={setMobileMenuAnchor}
            setOpenItem={setOpenItem}
            onViewChange={onViewChange}
            currentView={currentView}
          />
        </BottomBarContainer>
      ) : (
        <Sidebar 
          width={DRAWER_WIDTH} 
          onViewChange={onViewChange}
          currentView={currentView}
          openItem={openItem}
          setOpenItem={setOpenItem}
        />
      )}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100%',
        overflow: 'hidden'
      }}>
        <Main id="main" isMobile={isMobile}>
          {children}
        </Main>
        {showLogViewer && (
          <Box id="logs" sx={{
            width: '100%',
            height: isMobile ? '300px' : '400px',
            backgroundColor: '#1e1e1e',
            marginBottom: isMobile ? '96px' : 0
          }}>
            <LogViewer />
          </Box>
        )}
      </Box>
    </Box>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  onViewChange: PropTypes.func.isRequired,
  currentView: PropTypes.string.isRequired
};

export default Layout;
