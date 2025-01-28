import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import Layout from './components/Layout/Layout';
import { LoginForm, RegistrationForm } from './components/Auth';
import SettingsForm from './components/SettingsForm';
import Functions from './components/Functions';
import { createLog, LogType, /*toggleLogViewer*/ } from './redux/slices/appSlice';
import tokenStorage from './components/Auth/services/tokenStorage';
import { fetchOrgLicenses } from './redux/slices/licenseSlice';

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
  const dispatch = useDispatch();
  const [currentView, setCurrentView] = useState('login');
  const auth = useSelector(state => state.auth);
  const { isAuthenticated } = auth;

  useEffect(() => {
    // Log auth state changes
    dispatch(createLog(`Current auth state: ${JSON.stringify(auth, null, 2)}`, LogType.DEBUG));
  }, [auth, dispatch]);

  const licenseStatus = useSelector(state => state.license.status);

  // Track if token storage is initialized
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeTokenStorage = async () => {
      if (isInitialized) return; // Prevent multiple initializations
      
      try {
        dispatch(createLog('Initializing token storage...', LogType.DEBUG));
        await tokenStorage.initialize();
        if (mounted) {
          setIsInitialized(true);
          dispatch(createLog('Token storage initialized successfully', LogType.DEBUG));
        }
      } catch (error) {
        dispatch(createLog(`Token storage initialization failed: ${error.message}`, LogType.ERROR));
        // Don't set isInitialized on error to allow retry on next render
      }
    };

    initializeTokenStorage();

    // Cleanup on unmount
    return () => {
      mounted = false;
      tokenStorage.cleanup();
    };
  }, [dispatch, isInitialized]); // Only re-run if dispatch or isInitialized changes

  // Separate useEffect for license fetching to avoid race conditions
  useEffect(() => {
    if (!isInitialized) return; // Wait for token storage to initialize

    // Check if we have licenses in localStorage
    const savedLicenses = localStorage.getItem('licenseState');
    const hasLicenses = savedLicenses && JSON.parse(savedLicenses).licenses.length > 0;

    if (isAuthenticated && licenseStatus === 'idle' && !hasLicenses) {
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
  }, [dispatch, isAuthenticated, licenseStatus, isInitialized]);

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
        <Layout 
          currentView={currentView}
          onViewChange={handleViewChange}
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
            {!isAuthenticated ? (
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}>
                {currentView === 'register' ? (
                  <RegistrationForm onViewChange={handleViewChange} />
                ) : (
                  <LoginForm onViewChange={handleViewChange} />
                )}
              </Box>
            ) : (
              <>
                {currentView === 'settings' && (
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
              </>
            )}
          </Box>
          </Layout>
      </Box>
    </ThemeProvider>
  );
}

export default App;
