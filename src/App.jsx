import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline, Box, Typography, CircularProgress, Paper, LinearProgress } from '@mui/material';
import Layout from './components/Layout/Layout';
import { LoginForm, RegistrationForm, TestSecureApiCall } from './components/Auth';
import { SettingsForm } from './components/Settings';
import { Tools } from './components/Tools';
import LLMChat from './components/Chat/LLMChat';
import { createLog, LogType, initializeApp, selectInitialization } from './redux/slices/appSlice';
import UnderRepair from './components/UnderRepair';
import Welcome from './components/Welcome/Welcome';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    error: {
      main: '#f44336',
      dark: '#d32f2f',
      light: '#e57373',
      contrastText: '#fff',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#fff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1e1e1e',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
  },
});

function App() {
  const isRepair = import.meta.env.VITE_FLAG_REPAIR === 'true';
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);
  const { isAuthenticated } = auth;
  const [currentView, setCurrentView] = useState(() => (isAuthenticated ? 'chat' : 'welcome'));
  const initialization = useSelector(selectInitialization);
  
  // Centralized app initialization
  useEffect(() => {
    dispatch(createLog('App starting up', LogType.INFO));
    dispatch(initializeApp())
      .unwrap()
      .then(result => {
        dispatch(createLog(`App initialization completed. Authenticated: ${result.authenticated}`, LogType.INFO));
      })
      .catch(error => {
        dispatch(createLog(`App initialization failed: ${error.message}`, LogType.ERROR));
      });
  }, [dispatch]);
  
  // Effect to update currentView when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentView('chat');
    }
  }, [isAuthenticated]);
  
  // Log auth state changes (keeping this for debugging purposes)
  useEffect(() => {
    dispatch(createLog(`Current auth state: ${JSON.stringify(auth, null, 2)}`, LogType.DEBUG));
  }, [auth, dispatch]);

  const handleViewChange = (view) => {
    try {
      setCurrentView(view);
      dispatch(createLog(`Navigation: View changed to ${view}`, LogType.INFO));
    } catch (error) {
      dispatch(createLog(`Error changing view: ${error.message}`, LogType.ERROR));
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex' }}>
        { isRepair ? <UnderRepair /> :
          initialization.status === 'succeeded' || initialization.status === 'failed' ? (
            <Layout
              currentView={currentView}
              onViewChange={handleViewChange}
              isAuthenticated={isAuthenticated}
            >
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 3, 
              width: '100%',
              flex: 1,
              marginRight: '33%',
              transition: 'margin-right 0.3s ease-in-out',
              position: 'relative',
              maxWidth: '100%'
            }}>
              {currentView === 'test' ? (
                <TestSecureApiCall />
              ) : currentView === 'welcome' ? (
                isAuthenticated ? (
                  // Redirect authenticated users to chat when they try to access welcome
                  <Box sx={{ display: 'none' }}>
                    {setTimeout(() => handleViewChange('chat'), 0)}
                  </Box>
                ) : (
                  <Welcome onSignInClick={() => handleViewChange('login')} />
                )
              ) : currentView === 'login' || currentView === 'register' ? (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  {currentView === 'register' && <RegistrationForm onViewChange={handleViewChange} />}
                  {currentView === 'login' && <LoginForm onViewChange={handleViewChange} />}
                </Box>
              ) : (
                <>
                  {currentView === 'settings' && isAuthenticated && (
                    <SettingsForm
                      onNotification={(notification) => {
                        dispatch(createLog(notification.message,
                          notification.severity === 'error' ? LogType.ERROR : LogType.INFO
                        ));
                      }}
                      onModuleUpdate={() => {
                        dispatch(createLog('Module settings updated', LogType.INFO));
                      }}
                    />
                  )}
                  {currentView === 'tools' && <Tools />}
                  {currentView === 'chat' && <LLMChat />}
                  {currentView === 'knowledge' && null}
                </>
              )}
            </Box>
            </Layout>
          ) : (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100%',
                backgroundColor: 'background.default'
              }}
            >
              <Paper
                elevation={4}
                sx={{
                  padding: 4,
                  borderRadius: 2,
                  maxWidth: 400,
                  width: '90%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  mx: 'auto' // Center horizontally
                }}
              >
                <Typography variant="h5" component="h1" gutterBottom>
                  Initializing Application
                </Typography>
                
                <CircularProgress size={60} thickness={4} />
                
                <Box sx={{ width: '100%', mt: 2, textAlign: 'center' }}>
                  <Typography variant="body1" gutterBottom sx={{ mb: 1 }}>
                    {initialization.status === 'loading' ? 'Loading components and services...' : 'Preparing your environment...'}
                  </Typography>
                  
                  <LinearProgress
                    variant="indeterminate"
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      mb: 2
                    }}
                  />
                </Box>
                
                {initialization.error && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'error.light',
                      color: 'error.contrastText',
                      width: '100%',
                      borderRadius: 1,
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="body2" component="div" align="center">
                      <strong>Error:</strong> {initialization.error}
                    </Typography>
                  </Paper>
                )}
              </Paper>
            </Box>
          )
        }
      </Box>
    </ThemeProvider>
  );
}

export default App;
