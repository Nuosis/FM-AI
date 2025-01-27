import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  Box,
  Link,
  IconButton
} from '@mui/material';
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material';

const CurlDialog = ({ open, onClose, curlCommand }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      console.log('Command copied to clipboard');
    } catch (error) {
      console.log('Clipboard API not supported, using fallback', error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = curlCommand;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>cURL Command</DialogTitle>
      <DialogContent>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            bgcolor: 'background.default',
            position: 'relative'
          }}
        >
          <Box sx={{ 
            maxHeight: '200px', 
            overflow: 'auto',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {curlCommand}
          </Box>
          <IconButton
            onClick={handleCopy}
            sx={{ 
              position: 'absolute',
              top: 8,
              right: 8
            }}
            size="small"
          >
            <ContentCopyIcon />
          </IconButton>
        </Paper>
        
        <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
          Need help implementing cURL in FileMaker?
        </Typography>
        <Link 
          href="https://www.soliantconsulting.com/blog/translating-auto-generated-curl-to-filemaker-curl/"
          target="_blank"
          rel="noopener noreferrer"
        >
          View FileMaker cURL Implementation Guide
        </Link>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

CurlDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  curlCommand: PropTypes.string.isRequired
};

export default CurlDialog;
