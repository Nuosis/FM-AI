import PropTypes from 'prop-types';
import { Box, styled } from '@mui/material';
import Sidebar from '../Sidebar/Sidebar';

const DRAWER_WIDTH = 240;

const Main = styled('main')(({ theme }) => ({
  flexGrow: 1,
  width: '100%',
  padding: theme.spacing(3),
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
}));

const Layout = ({ children, onClassSelect, onViewChange, currentView }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar 
        width={DRAWER_WIDTH} 
        onClassSelect={onClassSelect}
        onViewChange={onViewChange}
        currentView={currentView}
      />
      <Main id="main">
        {children}
      </Main>
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
