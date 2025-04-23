import { useSelector } from 'react-redux';
import { selectTools } from '../../redux/slices/toolsSlice';
import { Box, Paper, Typography } from '@mui/material';

const ToolDataDebug = () => {
  const tools = useSelector(selectTools);
  
  return (
    <Paper elevation={1} sx={{ p: 3, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Tool Data Debug
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Raw Tools Data:</Typography>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '300px'
        }}>
          {JSON.stringify(tools, null, 2)}
        </pre>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Array Length: {Array.isArray(tools) ? tools.length : 'Not an array'}</Typography>
        <Typography variant="subtitle2">Data Type: {typeof tools}</Typography>
      </Box>
    </Paper>
  );
};

export default ToolDataDebug;