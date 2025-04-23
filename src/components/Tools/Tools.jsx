import { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Tabs, Tab } from '@mui/material';
import { Add as AddIcon, BugReport as BugReportIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import ToolList from './ToolList';
import ToolCreator from './ToolCreator';
import ToolChat from './ToolChat';

const Tools = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [creating, setCreating] = useState(false);
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ 
      p: 4,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h4">
          Tool Playground
        </Typography>
        {!creating && activeTab === 0 && (
          isAuthenticated ? (
            <IconButton
              onClick={() => setCreating(true)}
              color="primary"
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': { bgcolor: 'background.paper' }
              }}
            >
              <AddIcon />
            </IconButton>
          ) : (
            <Tooltip title="Login to create tools">
              <span>
                <IconButton
                  disabled
                  color="primary"
                  sx={{
                    bgcolor: 'background.paper',
                    boxShadow: 1
                  }}
                >
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>
          )
        )}
      </Box>
      
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          mb: 2,
          '& .MuiTab-root': {
            '&:focus': {
              outline: 'none'
            },
            '&.Mui-focusVisible': {
              outline: 'none'
            }
          }
        }}
      >
        <Tab label="Tools" />
        {isAuthenticated && <Tab label="Tool Chat" />}
        {import.meta.env.VITE_TOOL_TEST === 'true' && (
          <Tab
            icon={<BugReportIcon fontSize="small" />}
            iconPosition="start"
            label="Debug"
          />
        )}
      </Tabs>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflow: 'auto' }}>
        {activeTab === 0 && (
          creating ? (
            <ToolCreator onCancel={() => setCreating(false)} />
          ) : (
            <ToolList />
          )
        )}
        {isAuthenticated && activeTab === 1 && (
          <ToolChat />
        )}
      </Box>
    </Box>
  );
};

export default Tools;