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
    const fetchFiles = async () => {
      try {
        // Try to fetch the directory listing
        const response = await fetch(baseUrl);
        
        if (response.ok) {
          const html = await response.text();
          // Parse HTML to extract file links
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const links = Array.from(doc.querySelectorAll('a'));
          
          // Filter out parent directory links and extract filenames
          const fileLinks = links
            .filter(link => !link.href.endsWith('/') && !link.href.includes('?'))
            .map(link => {
              const filename = link.textContent.trim();
              return filename;
            })
            .filter(filename => filename !== '');
          
          if (fileLinks.length > 0) {
            setFiles(fileLinks);
            dispatch(createLog(`Found ${fileLinks.length} demo files`, LogType.INFO));
          } else {
            // Fall back to known files if no files were found
            setFiles(knownFiles);
            dispatch(createLog('No files found in directory listing, using known files', LogType.WARNING));
          }
        } else {
          // Fall back to known files if the fetch fails
          setFiles(knownFiles);
          dispatch(createLog(`Failed to fetch directory listing: ${response.status}`, LogType.WARNING));
        }
      } catch (err) {
        // Fall back to known files if there's an error
        setFiles(knownFiles);
        console.log('Failed to fetch file list. Using known files instead.');
        dispatch(createLog(`Error fetching demo files: ${err.message}`, LogType.WARNING));
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
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