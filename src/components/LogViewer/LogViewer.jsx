import { useSelector, useDispatch } from 'react-redux';
import { 
  selectIsVerboseEnabled,
  toggleVerbose,
  clearLogs,
  setLogContent
} from '../../redux/slices/appSlice';
import { useEffect } from 'react';
import axios from '../../utils/axios';

const LogViewer = () => {
  const dispatch = useDispatch();
  const isVerboseEnabled = useSelector(selectIsVerboseEnabled);
  const logs = useSelector(state => state.app.logs) || [];

  const fetchLogContent = async () => {
    try {
      const response = await axios.get('/api/admin/logs/content');
      const content = response.data || '';
      
      // Parse the log content into structured data
      const parsedLogs = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const match = line.match(/\[(.*?)\] \[(.*?)\] \[(.*?)\] (.*)/);
          if (match) {
            return {
              timestamp: match[2], // Using the ISO timestamp
              type: match[3],
              message: match[4]
            };
          }
          return null;
        })
        .filter(log => log !== null);

      dispatch(setLogContent(parsedLogs));
    } catch (error) {
      console.error('Error fetching log content:', error);
      dispatch(setLogContent([]));
    }
  };

  useEffect(() => {
    fetchLogContent();
  }, [logs.length]); // Fetch when logs array length changes

  const handleToggleVerbose = () => {
    dispatch(toggleVerbose());
  };

  const handleClearLogs = () => {
    dispatch(clearLogs());
  };

  return (
    <div style={{ 
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
        <h2 style={{ margin: 0 }}>Logs</h2>
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
          `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}\n`
        )) : ''}
      </pre>
    </div>
  );
};

export default LogViewer;
