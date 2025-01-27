// eslint-disable-next-line no-unused-vars
import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectFunctions, 
  selectFunctionsLoading,
  selectFunctionsError,
  fetchFunctions
} from '../../redux/slices/functionsSlice';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon
} from '@mui/icons-material';

const FunctionList = () => {
  const functions = useSelector(selectFunctions);
  const isLoading = useSelector(selectFunctionsLoading);
  const error = useSelector(selectFunctionsError);
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();
  
  const [expandedFunctions, setExpandedFunctions] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name' or 'date'
  const [showMyFunctionsOnly, setShowMyFunctionsOnly] = useState(false);

  // Filter and sort functions
  const filteredAndSortedFunctions = useMemo(() => {
    // First filter by search term and optionally by user's party_id
    let filtered = functions.filter(func => {
      const matchesSearch = func.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUser = !showMyFunctionsOnly || func._partyId === user?.party_id;
      return matchesSearch && matchesUser;
    });

    // Then sort
    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        // Assuming there's a createdAt field, fallback to comparing IDs if not available
        return (b.createdAt || b.id) > (a.createdAt || a.id) ? 1 : -1;
      }
    });
  }, [functions, user?.party_id, searchTerm, sortBy]);

  const toggleDetails = (functionId) => {
    setExpandedFunctions(prev => ({
      ...prev,
      [functionId]: !prev[functionId]
    }));
  };

  useEffect(() => {
    console.log('FunctionList mounted');
    dispatch(fetchFunctions()).then(action => {
      console.log('fetchFunctions dispatch result:', action);
    });
  }, [dispatch]);

  // console.log('FunctionList render state:', {
  //   functions,
  //   isLoading,
  //   error,
  //   functionCount: functions?.length
  // });

  const copyAsCurl = (func) => {
    // TODO: Implement curl command generation
    const curlCommand = `curl -X POST "YOUR_API_ENDPOINT" -H "Content-Type: application/json" -d '${JSON.stringify(func)}'`;
    navigator.clipboard.writeText(curlCommand);
  };

  if (isLoading) {
    return (
      <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={1} sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }
  // console.log({functions})
  if (functions.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No functions created yet. Create your first function to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search functions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={showMyFunctionsOnly}
                onChange={(e) => setShowMyFunctionsOnly(e.target.checked)}
                size="small"
              />
            }
            label="My Functions Only"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sortBy}
              label="Sort by"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="date">Newest</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {filteredAndSortedFunctions.map((func) => (
        <Paper 
          key={func.id} 
          elevation={1} 
          sx={{ 
            p: 3,
            '&:hover': {
              boxShadow: (theme) => theme.shadows[3]
            }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={() => toggleDetails(func.id)}
                sx={{
                  transform: expandedFunctions[func.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }}
                size="small"
              >
                <ExpandMoreIcon />
              </IconButton>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {func.name}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {func.description}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Copy as cURL">
                <IconButton onClick={() => copyAsCurl(func)} size="small">
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit Function">
                <IconButton size="small">
                  <EditIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {expandedFunctions[func.id] && (
            <>
              <Divider sx={{ my: 2 }} />

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Input Variables:
                </Typography>
                <Typography variant="body2" sx={{ ml: 2 }}>
                  {func.input_variables.join(', ')}
                </Typography>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Example:
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Box>
                    <Typography variant="caption" display="block" gutterBottom>
                      Input:
                    </Typography>
                    <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                      {JSON.stringify(func.example.input, null, 2)}
                    </pre>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="caption" display="block" gutterBottom>
                      Output:
                    </Typography>
                    <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                      {JSON.stringify(func.example.output, null, 2)}
                    </pre>
                  </Box>
                </Paper>
              </Box>
            </>
          )}
        </Paper>
      ))}
    </Box>
  );
};

export default FunctionList;
