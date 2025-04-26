import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import { addSource } from '../../redux/slices/knowledgeSlice';
import { selectActiveEmbeddingModel } from '../../redux/slices/llmSlice';
import axios from 'axios';

/**
 * SourceUpload component for uploading files or URLs to a Knowledge entity
 * @param {Object} props - Component props
 * @param {string} props.knowledgeId - The ID of the Knowledge entity
 * @param {string} props.storeId - The ID of the data store
 * @param {Function} props.onSuccess - Callback for success notifications
 * @param {Function} props.onError - Callback for error notifications
 */
const SourceUpload = ({ knowledgeId, storeId, onSuccess, onError }) => {
  const dispatch = useDispatch();
  const embeddingModel = useSelector(selectActiveEmbeddingModel);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadType, setUploadType] = useState('file'); // 'file' or 'url'
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [progress, setProgress] = useState(0);

  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  // Handle URL input
  const handleUrlChange = (event) => {
    setUrl(event.target.value);
    setError('');
  };

  // Handle upload type toggle
  const handleUploadTypeChange = (type) => {
    setUploadType(type);
    setError('');
  };

  // Handle upload
  const handleUpload = async () => {
    if (uploadType === 'file' && !file) {
      setError('Please select a file to upload');
      return;
    }

    if (uploadType === 'url' && !url) {
      setError('Please enter a URL');
      return;
    }

    if (!embeddingModel) {
      setError('No embedding model selected. Please configure an embedding model in Settings.');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setError('');

    try {
      // Step 1: Process the file/URL with docling service
      const formData = new FormData();
      
      if (uploadType === 'file') {
        formData.append('file', file);
      } else {
        formData.append('url', url);
      }

      const doclingResponse = await axios.post('/docling/process', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 50) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      if (!doclingResponse.data || !doclingResponse.data.chunks) {
        throw new Error('Failed to process document');
      }

      setProgress(50);

      // Step 2: Vectorize chunks using the selected embedding model
      const chunks = doclingResponse.data.chunks;
      const metadata = doclingResponse.data.metadata || {};
      
      // Prepare source data
      const sourceData = {
        source_id: `s_${Date.now()}`,
        filename: uploadType === 'file' ? file.name : url,
        mimetype: uploadType === 'file' ? file.type : 'url',
        upload_date: new Date().toISOString(),
        chunk_count: chunks.length,
        ...metadata
      };

      // Step 3: Push chunks to the data store
      const vectorizePromises = chunks.map(async (chunk, index) => {
        try {
          // Get vector embedding for the chunk
          const embeddingResponse = await axios.post('/llm/embed', {
            text: chunk.text,
            model: embeddingModel.id
          });

          if (!embeddingResponse.data || !embeddingResponse.data.embedding) {
            throw new Error(`Failed to get embedding for chunk ${index}`);
          }

          // Push to data store
          await axios.post('/data_store/records', {
            store_id: storeId,
            vector: embeddingResponse.data.embedding,
            metadata: {
              knowledge_id: knowledgeId,
              source_id: sourceData.source_id,
              chunk_index: index,
              chunk_text: chunk.text,
              source: sourceData.filename,
              upload_date: sourceData.upload_date,
              mimetype: sourceData.mimetype,
              ...chunk.metadata
            }
          });

          // Update progress
          const progressIncrement = 50 / chunks.length;
          setProgress(50 + Math.round((index + 1) * progressIncrement));
        } catch (error) {
          console.error(`Error processing chunk ${index}:`, error);
          throw error;
        }
      });

      await Promise.all(vectorizePromises);

      // Step 4: Add source to Knowledge entity in Redux
      await dispatch(addSource({ knowledgeId, sourceData })).unwrap();

      // Reset form
      setFile(null);
      setUrl('');
      setProgress(100);
      
      onSuccess(`Source "${sourceData.filename}" added successfully`);
    } catch (error) {
      console.error('Error uploading source:', error);
      setError(error.message || 'Failed to upload source');
      onError(`Failed to upload source: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Add Source
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Upload a file or provide a URL to add as a source to this Knowledge entity.
      </Typography>

      {/* Upload Type Selector */}
      <Box sx={{ display: 'flex', mb: 2 }}>
        <Button
          variant={uploadType === 'file' ? 'contained' : 'outlined'}
          startIcon={<UploadFileIcon />}
          onClick={() => handleUploadTypeChange('file')}
          sx={{ mr: 1 }}
        >
          File
        </Button>
        <Button
          variant={uploadType === 'url' ? 'contained' : 'outlined'}
          startIcon={<LinkIcon />}
          onClick={() => handleUploadTypeChange('url')}
        >
          URL
        </Button>
      </Box>

      {/* File Upload */}
      {uploadType === 'file' && (
        <Box sx={{ mb: 2 }}>
          <input
            accept="*/*"
            style={{ display: 'none' }}
            id="file-upload-button"
            type="file"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <label htmlFor="file-upload-button">
            <Button
              variant="outlined"
              component="span"
              disabled={isLoading}
              fullWidth
            >
              {file ? file.name : 'Select File'}
            </Button>
          </label>
          {file && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </Typography>
              <Tooltip title="Remove file">
                <IconButton size="small" onClick={() => setFile(null)} disabled={isLoading}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      )}

      {/* URL Input */}
      {uploadType === 'url' && (
        <TextField
          fullWidth
          label="URL"
          value={url}
          onChange={handleUrlChange}
          disabled={isLoading}
          placeholder="https://example.com/document.pdf"
          sx={{ mb: 2 }}
        />
      )}


      {/* Progress */}
      {isLoading && (
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <Box sx={{ width: '100%', height: 8, bgcolor: 'grey.300', borderRadius: 1 }}>
                <Box
                  sx={{
                    width: `${progress}%`,
                    height: '100%',
                    bgcolor: 'primary.main',
                    borderRadius: 1,
                    transition: 'width 0.3s ease-in-out'
                  }}
                />
              </Box>
            </Grid>
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                {progress}%
              </Typography>
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary">
            {progress < 50 ? 'Processing document...' : 'Vectorizing chunks...'}
          </Typography>
        </Box>
      )}

      {/* Upload Button */}
      <Button
        variant="contained"
        onClick={handleUpload}
        disabled={isLoading || (uploadType === 'file' && !file) || (uploadType === 'url' && !url)}
        fullWidth
      >
        {isLoading ? <CircularProgress size={24} /> : 'Upload'}
      </Button>
    </Paper>
  );
};

SourceUpload.propTypes = {
  knowledgeId: PropTypes.string.isRequired,
  storeId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired
};

export default SourceUpload;