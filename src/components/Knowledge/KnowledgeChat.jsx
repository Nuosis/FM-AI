import { useState } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import InfoIcon from '@mui/icons-material/Info';
import { selectActiveEmbeddingModel } from '../../redux/slices/llmSlice';
import axios from 'axios';

/**
 * KnowledgeChat component for querying a Knowledge entity
 * @param {Object} props - Component props
 * @param {Object} props.knowledge - The Knowledge entity
 * @param {Function} props.onError - Callback for error notifications
 */
const KnowledgeChat = ({ knowledge, onError }) => {
  const embeddingModel = useSelector(selectActiveEmbeddingModel);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [showDetails, setShowDetails] = useState({});

  // Handle query submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    if (!embeddingModel) {
      setError('No embedding model selected. Please configure an embedding model in Settings.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get vector embedding for the query
      const embeddingResponse = await axios.post('/llm/embed', {
        text: query,
        model: embeddingModel.id
      });

      if (!embeddingResponse.data || !embeddingResponse.data.embedding) {
        throw new Error('Failed to get embedding for query');
      }

      // Perform semantic search
      const searchResponse = await axios.post('/data_store/search', {
        store_id: knowledge.store_id,
        vector: embeddingResponse.data.embedding,
        filter: {
          knowledge_id: knowledge.knowledge_id
        },
        limit: 5
      });

      if (!searchResponse.data || !searchResponse.data.results) {
        throw new Error('Failed to perform semantic search');
      }

      setResults(searchResponse.data.results);
    } catch (error) {
      console.error('Error performing semantic search:', error);
      setError(error.message || 'Failed to perform semantic search');
      onError(`Failed to perform semantic search: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle showing details for a result
  const toggleDetails = (id) => {
    setShowDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2, flexGrow: 1, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Query Knowledge: {knowledge.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Enter a query to search for relevant information in this Knowledge entity.
        </Typography>

        {/* Query Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            endIcon={<SendIcon />}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Search'}
          </Button>
        </Box>


        {/* Results */}
        {results.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Results
            </Typography>
            <List>
              {results.map((result, index) => (
                <Box key={index}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" component="span">
                            Match {index + 1}
                          </Typography>
                          <Chip
                            label={`Score: ${(result.score * 100).toFixed(2)}%`}
                            size="small"
                            color="primary"
                            sx={{ ml: 1 }}
                          />
                          <Tooltip title="Toggle Details">
                            <IconButton size="small" onClick={() => toggleDetails(index)} sx={{ ml: 1 }}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Card variant="outlined" sx={{ mb: 1, bgcolor: 'background.default' }}>
                            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                              <Typography variant="body2" component="div">
                                {result.metadata?.chunk_text || 'No text available'}
                              </Typography>
                            </CardContent>
                          </Card>
                          
                          {showDetails[index] && (
                            <Card variant="outlined" sx={{ mb: 1 }}>
                              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                <Typography variant="caption" component="div" gutterBottom>
                                  <strong>Source:</strong> {result.metadata?.source || 'Unknown'}
                                </Typography>
                                {result.metadata?.upload_date && (
                                  <Typography variant="caption" component="div" gutterBottom>
                                    <strong>Upload Date:</strong> {formatDate(result.metadata.upload_date)}
                                  </Typography>
                                )}
                                {result.metadata?.chunk_index !== undefined && (
                                  <Typography variant="caption" component="div" gutterBottom>
                                    <strong>Chunk Index:</strong> {result.metadata.chunk_index}
                                  </Typography>
                                )}
                                {result.metadata?.source_id && (
                                  <Typography variant="caption" component="div" gutterBottom>
                                    <strong>Source ID:</strong> {result.metadata.source_id}
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </Box>
              ))}
            </List>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

KnowledgeChat.propTypes = {
  knowledge: PropTypes.shape({
    knowledge_id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    store_id: PropTypes.string.isRequired
  }).isRequired,
  onError: PropTypes.func.isRequired
};

export default KnowledgeChat;