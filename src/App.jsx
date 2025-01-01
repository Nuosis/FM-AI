import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import tokenStorage from './components/Auth/services/tokenStorage';
import Layout from './components/Layout/Layout';
import DatabaseRegistry from './components/DatabaseRegistry/DatabaseRegistry';
import BackendAppViewer from './components/BackendAppViewer/BackendAppViewer';
import ModuleList from './components/ModuleList/ModuleList';
import LicenseList from './components/LicenseList/LicenseList';
import OrganizationList from './components/OrganizationList/OrganizationList';
import BillableList from './components/BillableList/BillableList';
import LogViewer from './components/LogViewer/LogViewer';
import { LoginForm, RegistrationForm, AuthGuard } from './components/Auth';
import { clearLogs, createLog, LogType, selectShowLogViewer } from './redux/slices/appSlice';
import { setLicenseKey } from './redux/slices/authSlice';

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
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const showLogViewer = useSelector(selectShowLogViewer);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [currentView, setCurrentView] = useState('login');

  useEffect(() => {
    // Clear logs on mount and log app start
    dispatch(clearLogs());
    dispatch(createLog('Application initialized successfully', LogType.INFO));
    
    // Initialize token storage service
    dispatch(createLog('Initializing token storage service', LogType.INFO));
    try {
      tokenStorage.initialize();
      dispatch(createLog('Token storage service initialized successfully', LogType.INFO));
      
      // Set initial view based on restored auth state
      if (isAuthenticated) {
        setCurrentView('organizations');
        dispatch(createLog('Restored authenticated session', LogType.INFO));
      }
    } catch (error) {
      dispatch(createLog(`Token storage initialization failed: ${error.message}`, LogType.ERROR));
    }

    // Initialize license key auth from env variables
    const jwt = import.meta.env.VITE_API_JWT;
    const privateKey = import.meta.env.VITE_API_KEY;
    if (jwt && privateKey) {
      dispatch(setLicenseKey({ jwt, privateKey }));
      dispatch(createLog('License key auth initialized', LogType.INFO));
    } else {
      dispatch(createLog('License key auth not available', LogType.WARN));
    }

    // Cleanup on unmount
    return () => {
      dispatch(createLog('Cleaning up token storage service', LogType.INFO));
      tokenStorage.cleanup();
    };
  }, [dispatch, isAuthenticated]);

  // Set view to login when not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentView('login');
      dispatch(createLog('Redirected to login due to no authentication', LogType.INFO));
    }
  }, [isAuthenticated, dispatch]);

  const handleClassSelect = (category, classInfo) => {
    setSelectedCategory(category);
    setSelectedClass(classInfo);
    setCurrentView('backend-app');
    dispatch(createLog(`Selected class: ${classInfo?.name} in category: ${category}`, LogType.DEBUG));
  };

  const handleViewChange = (view) => {
    try {
      setCurrentView(view);
      if (view === 'database' || view === 'modules' || view === 'licenses' || 
          view === 'organizations' || view === 'billables') {
        setSelectedClass(null);
        setSelectedCategory(null);
      }
      dispatch(createLog(`Navigation: View changed to ${view}`, LogType.INFO));
    } catch (error) {
      dispatch(createLog(`Error changing view: ${error.message}`, LogType.ERROR));
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout 
        onClassSelect={handleClassSelect} 
        onViewChange={handleViewChange} 
        currentView={currentView}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 3, 
          width: '100%',
          flex: 1,
          marginRight: showLogViewer ? '33%' : 0,
          transition: 'margin-right 0.3s ease-in-out',
          position: 'relative',
          maxWidth: showLogViewer ? '67%' : '100%'
        }}>
          {currentView === 'backend-app' && (
            <AuthGuard>
              <BackendAppViewer 
                category={selectedCategory} 
                selectedClass={selectedClass} 
              />
            </AuthGuard>
          )}
          {currentView === 'database' && (
            <AuthGuard>
              <DatabaseRegistry />
            </AuthGuard>
          )}
          {currentView === 'modules' && (
            <AuthGuard>
              <ModuleList />
            </AuthGuard>
          )}
          {currentView === 'licenses' && (
            <AuthGuard>
              <LicenseList />
            </AuthGuard>
          )}
          {currentView === 'organizations' && (
            <AuthGuard>
              <OrganizationList />
            </AuthGuard>
          )}
          {currentView === 'billables' && (
            <AuthGuard>
              <BillableList />
            </AuthGuard>
          )}
          {currentView === 'login' && <LoginForm onViewChange={handleViewChange} />}
          {currentView === 'register' && <RegistrationForm onViewChange={handleViewChange} />}
        </Box>
        {showLogViewer && <LogViewer />}
      </Layout>
    </ThemeProvider>
  );
}

export default App;
