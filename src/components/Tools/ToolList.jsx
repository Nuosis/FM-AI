import { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectTools, 
  selectToolsLoading,
  selectToolsError,
  fetchTools,
  deleteTool
} from '../../redux/slices/toolsSlice';
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
  FormControlLabel,
  Tabs,
  Tab
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  PlayArrow as PlayArrowIcon,
  GetApp as GetAppIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import ToolPlayground from './ToolPlayground';
import ToolCreator from './ToolCreator';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ToolList = () => {
  const rawTools = useSelector(selectTools);
  const isLoading = useSelector(selectToolsLoading);
  const error = useSelector(selectToolsError);
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();
  
  const [expandedTools, setExpandedTools] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showMyToolsOnly, setShowMyToolsOnly] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [activeTab, setActiveTab] = useState(1); // 0: Details, 1: Playground (default to Playground)
  const [editingTool, setEditingTool] = useState(null);

  // Extract tools from the response
  const tools = useMemo(() => {
    // If rawTools is an array, use it directly
    console.log ('Raw tools:', rawTools);
    if (rawTools && Array.isArray(rawTools)) {
      return rawTools;
    }
    
    // Default to empty array
    return [];
  }, [rawTools]);

  // Filter and sort tools
  const filteredAndSortedTools = useMemo(() => {
    // First filter by search term and optionally by user's id
    let filtered = tools.filter(tool => {
      const matchesSearch = tool.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUser = !showMyToolsOnly || tool.user_id === user?.user_id;
      return matchesSearch && matchesUser;
    });

    // Then sort
    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name?.localeCompare(b.name);
      } else {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });
  }, [tools, user?.id, searchTerm, sortBy, showMyToolsOnly]);

  const toggleDetails = (toolId) => {
    setExpandedTools(prev => ({
      ...prev,
      [toolId]: !prev[toolId]
    }));
  };

  useEffect(() => {
    dispatch(fetchTools());
  }, [dispatch]);

  const handleDelete = async (tool) => {
    if (window.confirm(`Are you sure you want to delete the tool "${tool.name}"?`)) {
      await dispatch(deleteTool(tool.id));
    }
  };

  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
    setActiveTab(1); // Always switch to Playground tab (default)
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleEditTool = (tool) => {
    setEditingTool(tool);
  };
  
  const handleCancelEdit = () => {
    setEditingTool(null);
  };

  const handleDownload = (tool) => {
    // Generate Python code with @tool() decorator
    const generatePythonCode = () => {
      const { name, description } = tool;
      
      // Create docstring
      const docstring = `"""${description}

This tool was created using the AI Tool System.
Author: ${tool.user_name || 'Unknown'}
Source: ${window.location.origin}
"""`;

      // Create the Python code
      return `from typing import Any

@tool()
def ${name?.toLowerCase().replace(/\s+/g, '_')}(*args, **kwargs):
    ${docstring}
    # Implementation
    ${tool.code || '# No implementation provided'}
`;
    };

    const code = generatePythonCode();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool.name?.toLowerCase().replace(/\s+/g, '_')}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Show the tool editor when editing a tool
  if (editingTool) {
    return (
      <ToolCreator
        toolToEdit={editingTool}
        onCancel={handleCancelEdit}
      />
    );
  }

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

  if (tools.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No tools created yet. Create your first tool to get started.
        </Typography>
      </Paper>
    );
  }

  if (selectedTool) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{selectedTool.name}</Typography>
            <IconButton onClick={() => setSelectedTool(null)}>
              <ExpandMoreIcon sx={{ transform: 'rotate(90deg)' }} />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {selectedTool.description}
          </Typography>
        </Paper>

        <Paper elevation={1} sx={{ p: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab
              label="Details"
              sx={{
                '&.Mui-selected': { outline: 'none', boxShadow: 'none' },
                '&:focus': { outline: 'none', boxShadow: 'none' },
                '&:active': { outline: 'none', boxShadow: 'none' }
              }}
            />
            <Tab
              label="Playground"
              sx={{
                '&.Mui-selected': { outline: 'none', boxShadow: 'none' },
                '&:focus': { outline: 'none', boxShadow: 'none' },
                '&:active': { outline: 'none', boxShadow: 'none' }
              }}
            />
          </Tabs>

          {activeTab === 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Code:</Typography>
              <SyntaxHighlighter language="python" style={materialDark}>
                {selectedTool.code || '# No code available'}
              </SyntaxHighlighter>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Tooltip title="Download as Python file">
                  <IconButton onClick={() => handleDownload(selectedTool)}>
                    <GetAppIcon />
                  </IconButton>
                </Tooltip>
                {selectedTool.user_id === user?.user_id && (
                  <>
                    <Tooltip title="Edit Tool">
                      <IconButton
                        color="primary"
                        onClick={() => handleEditTool(selectedTool)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Tool">
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(selectedTool)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>
            </Box>
          )}

          {activeTab === 1 && (
            <ToolPlayground tool={selectedTool} />
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search tools..."
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
                checked={showMyToolsOnly}
                onChange={(e) => setShowMyToolsOnly(e.target.checked)}
                size="small"
              />
            }
            label="My Tools Only"
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

      {filteredAndSortedTools.map((tool) => (
        <Paper 
          key={tool.id} 
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
                onClick={() => toggleDetails(tool.id)}
                sx={{
                  transform: expandedTools[tool.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                  '&:focus': { outline: 'none' }
                }}
                size="small"
                disableRipple
              >
                <ExpandMoreIcon />
              </IconButton>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {tool.name}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {tool.description}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Open in Playground">
                <IconButton onClick={() => handleToolSelect(tool)} size="small" color="primary">
                  <PlayArrowIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download as Python file">
                <IconButton onClick={() => handleDownload(tool)} size="small">
                  <GetAppIcon />
                </IconButton>
              </Tooltip>
              {tool.user_id === user?.user_id ? (
                <>
                  <Tooltip title="Edit Tool">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEditTool(tool)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Tool">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(tool)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip title="Only the owner can update this tool in the database">
                    <span>
                      <IconButton
                        size="small"
                        color="primary"
                        disabled
                      >
                        <EditIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Only the owner can delete this tool">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>

          {expandedTools[tool.id] && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Code Preview:
                </Typography>
                <SyntaxHighlighter 
                  language="python" 
                  style={materialDark}
                  customStyle={{ maxHeight: '200px', overflow: 'auto' }}
                >
                  {tool.code || '# No code available'}
                </SyntaxHighlighter>
              </Box>
            </>
          )}
        </Paper>
      ))}
    </Box>
  );
};

export default ToolList;