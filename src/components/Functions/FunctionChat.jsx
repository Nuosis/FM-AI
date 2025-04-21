// eslint-disable-next-line no-unused-vars
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import ProgressText from '../Chat/ProgressText';
import axiosInstance from '../../utils/axios';
import { useSelector } from 'react-redux';

const FunctionChat = ({ initialPrompt, provider, model, temperature, systemInstructions }) => {
  const [response, setResponse] = useState(<ProgressText text="Thinking..." />);
  const [isLoading, setIsLoading] = useState(true);
  const organizationId = useSelector(state => state.auth.user?.org_id);
  const [selectedModule, setSelectedModule] = useState('');

  // Get module ID for the provider on mount
  useEffect(() => {
    const fetchModuleId = async () => {
      try {
        const response = await axiosInstance.get('/api/admin/modules/');
        const moduleArray = Array.isArray(response.data.response.data) ? response.data.response.data : [];
        
        const aiModule = moduleArray.find(module => 
          module.fieldData.moduleName.startsWith('AI:') && 
          module.fieldData.moduleName.toLowerCase().includes(provider.toLowerCase())
        );
        
        if (aiModule) {
          setSelectedModule(aiModule.fieldData.__ID);
        }
      } catch (error) {
        console.error('Error fetching module ID:', error);
      }
    };

    fetchModuleId();
  }, [provider]);

  useEffect(() => {
    const fetchResponse = async () => {
      setIsLoading(true);
      try {
        if (!selectedModule) {
          throw new Error('Module not found for provider');
        }

        const response = await axiosInstance.post(
          `/api/llm/${selectedModule}/completion`,
          {
            messages: [
              { role: 'system', content: systemInstructions || '' },
              { role: 'user', content: initialPrompt }
            ],
            moduleId: selectedModule,
            model,
            temperature,
            stream: false
          }
        );
        
        setResponse(response.data.content || 'No response received');
      } catch (error) {
        console.error('Error fetching response:', error);
        setResponse('Error: Failed to get response');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResponse();
  }, [initialPrompt, provider, model, temperature, systemInstructions, selectedModule, organizationId]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="body1" gutterBottom>
        <strong>Prompt:</strong> {initialPrompt.split('\n\n')[0]}
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="body1">
          <strong>Response:</strong>
        </Typography>
        {isLoading ? (
          <Box sx={{ mt: 1 }}>
            <ProgressText text="Thinking ..." />
          </Box>
        ) : (
          <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
            {response}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

FunctionChat.propTypes = {
  initialPrompt: PropTypes.string.isRequired,
  provider: PropTypes.string.isRequired,
  model: PropTypes.string.isRequired,
  temperature: PropTypes.number.isRequired,
  systemInstructions: PropTypes.string
};

export default FunctionChat;
