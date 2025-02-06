import { useSelector, useDispatch } from 'react-redux';
import { 
  selectIsVerboseEnabled,
  selectServerHealth,
  toggleVerbose,
  clearLogs,
  setLogContent,
  checkServerHealth
} from '../../redux/slices/appSlice';
import { selectActiveLicense } from '../../redux/slices/licenseSlice';
import { useEffect } from 'react';
import { readLogs } from '../../utils/logging';

const LogViewer = () => {
  const dispatch = useDispatch();
  const isVerboseEnabled = useSelector(selectIsVerboseEnabled);
  const logs = useSelector(state => state.app.logs) || [];
  const serverHealth = useSelector(selectServerHealth);
  const license = useSelector(selectActiveLicense);

  useEffect(() => {
    // Read logs from localStorage
    const storedLogs = readLogs();
    dispatch(setLogContent(storedLogs));
    
    // Check server health
    dispatch(checkServerHealth());

    // Set up interval to check health every 30 seconds
    const healthInterval = setInterval(() => {
      dispatch(checkServerHealth());
    }, 30000);

    return () => clearInterval(healthInterval);
  }, [dispatch]);

  const handleToggleVerbose = () => {
    dispatch(toggleVerbose());
  };

  const handleClearLogs = () => {
    dispatch(clearLogs());
  };

  const getHealthColor = () => {
    switch(serverHealth.status) {
      case 'healthy':
        return '#4CAF50'; // Green
      case 'unhealthy':
        return '#dc3545'; // Red
      default:
        return '#6c757d'; // Gray
    }
  };

  const getHealthText = () => {
    return serverHealth.status === 'unhealthy' ? 'Server Unavailable' : '';
  };

  return (
    <div style={{ 
      position: 'relative',
      zIndex: 10,
      height: '100%',
      backgroundColor: '#1e1e1e',
      color: '#fff',
      padding: '20px',
      overflowY: 'auto',
      borderTop: '1px solid #333'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>Logs</h2>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: getHealthColor(),
          }} />
          <span style={{ 
            color: '#dc3545',
            fontSize: '14px',
            visibility: serverHealth.status === 'unhealthy' ? 'visible' : 'hidden'
          }}>
            {getHealthText()}
          </span>
          {serverHealth.status === 'healthy' && license && (
            <span style={{ 
              color: '#4CAF50',
              fontSize: '14px',
              marginLeft: '5px'
            }}>
              certified
            </span>
          )}
        </div>
        <div>
          <button 
            onClick={handleToggleVerbose}
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              backgroundColor: isVerboseEnabled ? '#4CAF50' : '#666',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {isVerboseEnabled ? 'Verbose On' : 'Verbose Off'}
          </button>
          <button 
            onClick={handleClearLogs}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Clear Logs
          </button>
        </div>
      </div>
      <pre style={{ 
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.5',
        margin: 0,
        padding: '10px',
        backgroundColor: '#2d2d2d',
        borderRadius: '4px',
        height: 'calc(100% - 80px)',
        overflowY: 'auto'
      }}>
        {Array.isArray(logs) ? logs.map(log => (
          `[${log.timestamp}] [${log.type}] ${log.message}\n`
        )).join('') : ''}
      </pre>
    </div>
  );
};

export default LogViewer;
