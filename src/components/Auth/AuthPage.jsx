import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Typography, Divider } from '@mui/material';
import RegistrationForm from './RegistrationForm';
import LoginForm from './LoginForm';
import JwtDebugger from './JwtDebugger';

const AuthPage = () => {
  const [view, setView] = useState('login'); // 'login' or 'register'
  const { isAuthenticated } = useSelector(state => state.auth);

  return (
    <>
      {view === 'login' && <LoginForm onViewChange={setView} />}
      {view === 'register' && <RegistrationForm onViewChange={setView} />}
      
      {/* Show JWT Debugger only in development environment and when authenticated */}
      {import.meta.env.DEV && isAuthenticated && (
        <Box sx={{ maxWidth: 800, mx: 'auto', px: 2 }}>
          <Divider sx={{ my: 4 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Development Tools
          </Typography>
          <JwtDebugger />
        </Box>
      )}
    </>
  );
};

export default AuthPage;