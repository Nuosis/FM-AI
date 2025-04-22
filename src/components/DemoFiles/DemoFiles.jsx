import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Paper,
  CircularProgress
} from '@mui/material';
import { InsertDriveFile, Download } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { createLog, LogType } from '../../redux/slices/appSlice';

const DemoFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  
  const baseUrl = 'http://server.claritybusinesssolutions.ca/aiDemo/';
  
  // Known files in case the directory listing doesn't work
  const knownFiles = [
    'LLM_Chat.fmp12',
    'DocumentSearch.fmp12'
  ];

  useEffect(() => {
    // Skip fetch and directly use known files
    // console.log('Using predefined known files list instead of fetching');
    setFiles(knownFiles);
    dispatch(createLog('Using predefined known files list', LogType.INFO));
    
    // Simulate a brief loading state for UI consistency
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    
    // Clean up timer on component unmount
    return () => clearTimeout(timer);
  }, [dispatch]);

  const handleDownload = (filename) => {
    try {
      const fileUrl = `${baseUrl}${filename}`;
      dispatch(createLog(`Downloading file: ${filename}`, LogType.INFO));
      
      // Create a temporary anchor element to trigger the download
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', filename);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.log(`Failed to download file: ${err.message}`);
      dispatch(createLog(`Error downloading file: ${err.message}`, LogType.ERROR));
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Demo Files
      </Typography>
      <Typography variant="body1" paragraph>
        Download FileMaker demo files to explore AI integration examples.
      </Typography>
      
      <Paper elevation={2} sx={{ mt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {files.map((filename) => (
              <ListItem key={filename} disablePadding>
                <ListItemButton onClick={() => handleDownload(filename)}>
                  <ListItemIcon>
                    <InsertDriveFile />
                  </ListItemIcon>
                  <ListItemText primary={filename} />
                  <Download color="primary" />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default DemoFiles;