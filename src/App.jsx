import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import Layout from './components/Layout/Layout';
import { LoginForm, RegistrationForm, TestSecureApiCall } from './components/Auth';
import { SettingsForm } from './components/Settings';
import Functions from './components/Functions';
import { Tools } from './components/Tools';
import LLMChat from './components/Chat/LLMChat';
import { createLog, LogType, /*toggleLogViewer*/ } from './redux/slices/appSlice';
import { fetchOrgLicenses } from './redux/slices/licenseSlice';
import { logoutSuccess, setSession } from './redux/slices/authSlice';
import supabase from './utils/supabase';
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
  const [sessionChecked, setSessionChecked] = useState(false);
  
  // Check session on app startup
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Get current session directly from Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        // If no session, ensure Redux state reflects logged out state
        if (!data.session) {
          dispatch(logoutSuccess());
          dispatch(createLog('No active session found on startup', LogType.INFO));
        } else {
          // If session exists, update Redux state with session
          dispatch(setSession(data.session));
          dispatch(createLog('Active session restored on startup', LogType.INFO));
        }
      } catch (error) {
        console.error('Session check failed:', error);
        dispatch(logoutSuccess());
        dispatch(createLog(`Session check error: ${error.message}`, LogType.ERROR));
      } finally {
        setSessionChecked(true);
      }
    };
    
    checkSession();
  }, [dispatch]);
  
  useEffect(() => {
    // Log auth state changes
    dispatch(createLog(`Current auth state: ${JSON.stringify(auth, null, 2)}`, LogType.DEBUG));
  }, [auth, dispatch]);

  // Effect to update currentView when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentView('chat');
    }
  }, [isAuthenticated]);

  const licenseStatus = useSelector(state => state.license.status);

  // Effect for license fetching
  useEffect(() => {

    if (isAuthenticated && licenseStatus === 'idle') {
      dispatch(fetchOrgLicenses())
        .unwrap()
        .then(result => {
          dispatch(createLog(
            `Licenses fetched successfully. Active license: ${result.activeLicenseId}`, 
            LogType.INFO
          ));
        })
        // .catch(error => {
          // dispatch(createLog(
          //   `Failed to fetch licenses: ${error.message}`, 
          //   LogType.ERROR
          // ));
        // });
    }
  }, [dispatch, isAuthenticated, licenseStatus]);

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
          sessionChecked ? (
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
                  {currentView === 'functions' && <Functions />}
                  {currentView === 'tools' && <Tools />}
                  {currentView === 'chat' && <LLMChat />}
                </>
              )}
            </Box>
            </Layout>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <p>Loading...</p>
            </Box>
          )
        }
      </Box>
    </ThemeProvider>
  );
}

export default App;
