import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import {
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { createLog, LogType } from '../../redux/slices/appSlice';

const BackendAppViewer = ({ category, selectedClass }) => {
  const dispatch = useDispatch();
  const [testResults, setTestResults] = useState({});
  const [runningTests, setRunningTests] = useState({});
  const [allTestsPassed, setAllTestsPassed] = useState(false);

  // Clear test results when selected class changes
  useEffect(() => {
    if (selectedClass) {
      setTestResults({});
      setRunningTests({});
      setAllTestsPassed(false);
      dispatch(createLog(`Viewing class: ${selectedClass.name} (${category})`, LogType.INFO));
    }
  }, [selectedClass, category, dispatch]);

  const runTests = async (methodName = null) => {
    if (!selectedClass) return;

    if (methodName === null) {
      // Running all tests
      dispatch(createLog(`Starting all tests for ${selectedClass.name}`, LogType.INFO));
      setRunningTests(prev => ({ ...prev, all: true }));
      setAllTestsPassed(false);
      let allPassed = true;
      
      // Run tests for each function sequentially
      for (const func of selectedClass.functions) {
        if (func.tests && func.tests.length > 0) {
          setRunningTests(prev => ({ ...prev, [func.name]: true }));
          dispatch(createLog(`Running tests for method: ${func.name}`, LogType.DEBUG));
          try {
            const endpoint = `/api/admin/run-test/${category}/${selectedClass.name}/${func.name}`;
            const response = await fetch(endpoint, { method: 'POST' });
            if (!response.ok) {
              throw new Error('Failed to run tests');
            }
            const results = await response.json();
            
            // Update individual function results
            setTestResults(prev => ({
              ...prev,
              [func.name]: results
            }));

            if (!results.passed) {
              allPassed = false;
              dispatch(createLog(
                `Tests failed for ${func.name}: ${results.failed_tests?.map(t => t.message).join(', ') || results.message}`,
                LogType.WARNING
              ));
            } else {
              dispatch(createLog(`Tests passed for ${func.name}`, LogType.DEBUG));
            }
          } catch (err) {
            const errorResult = { passed: false, message: err.message };
            setTestResults(prev => ({
              ...prev,
              [func.name]: errorResult
            }));
            allPassed = false;
            dispatch(createLog(`Error running tests for ${func.name}: ${err.message}`, LogType.ERROR));
          } finally {
            setRunningTests(prev => ({ ...prev, [func.name]: false }));
          }
        }
      }
      
      setAllTestsPassed(allPassed);
      setRunningTests(prev => ({ ...prev, all: false }));
      dispatch(createLog(
        `All tests completed for ${selectedClass.name}. Overall status: ${allPassed ? 'PASSED' : 'FAILED'}`,
        allPassed ? LogType.INFO : LogType.WARNING
      ));
    } else {
      // Running single function test
      dispatch(createLog(`Starting test for method: ${methodName}`, LogType.DEBUG));
      setRunningTests(prev => ({ ...prev, [methodName]: true }));
      try {
        const endpoint = `/api/admin/run-test/${category}/${selectedClass.name}/${methodName}`;
        const response = await fetch(endpoint, { method: 'POST' });
        if (!response.ok) {
          throw new Error('Failed to run tests');
        }
        const results = await response.json();
        setTestResults(prev => ({
          ...prev,
          [methodName]: results
        }));
        
        if (!results.passed) {
          dispatch(createLog(
            `Test failed for ${methodName}: ${results.failed_tests?.map(t => t.message).join(', ') || results.message}`,
            LogType.WARNING
          ));
        } else {
          dispatch(createLog(`Test passed for ${methodName}`, LogType.DEBUG));
        }
      } catch (err) {
        setTestResults(prev => ({
          ...prev,
          [methodName]: { passed: false, message: err.message }
        }));
        dispatch(createLog(`Error running test for ${methodName}: ${err.message}`, LogType.ERROR));
      } finally {
        setRunningTests(prev => ({ ...prev, [methodName]: false }));
      }
    }
  };

  const getTestButtonText = (methodName) => {
    const results = testResults[methodName];
    if (!results) {
      return 'Run Test';
    }
    return results.passed ? 'Test Passed' : 'Test Failed';
  };

  const getAllTestsButtonText = () => {
    if (runningTests.all) {
      return 'Running Tests...';
    }
    if (allTestsPassed) {
      return 'All Tests Passed';
    }
    return 'Run All Tests';
  };

  const getTestButtonColor = (methodName) => {
    const results = testResults[methodName];
    if (!results) return 'primary';
    return results.passed ? 'success' : 'error';
  };

  if (!selectedClass) {
    return null;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {selectedClass.name}
        </Typography>

        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Description: {selectedClass.description}
        </Typography>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Source: {selectedClass.source}
        </Typography>

        {selectedClass.attributes && selectedClass.attributes.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Attributes
            </Typography>
            <List>
              {selectedClass.attributes.map((attr) => (
                <ListItem key={attr.name}>
                  <ListItemText
                    primary={
                      <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {attr.name}
                        <Chip
                          label={attr.type}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      </Box>
                    }
                    secondary={attr.description}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
        
        {selectedClass.functions && selectedClass.functions.some(func => func.tests && func.tests.length > 0) && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, mt: 3 }}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => runTests()}
              disabled={runningTests.all}
              size="small"
              color={allTestsPassed ? 'success' : 'primary'}
              endIcon={runningTests.all && (
                <CircularProgress 
                  size={16} 
                  thickness={6} 
                  sx={{ color: 'grey.400' }} 
                />
              )}
            >
              {getAllTestsButtonText()}
            </Button>
          </Box>
        )}
      </Box>

      <Typography variant="h6" gutterBottom>
        Functions
      </Typography>
      
      {selectedClass.functions && selectedClass.functions.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {selectedClass.functions.map((func) => (
            <Card key={func.name} variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {func.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {func.description}
                </Typography>

                {func.params && func.params.length > 0 && (
                  <>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Parameters
                    </Typography>
                    <List dense>
                      {func.params.map((param) => (
                        <ListItem key={param.name}>
                          <ListItemText
                            primary={
                              <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                {param.name}
                                <Chip
                                  label={param.type}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                />
                              </Box>
                            }
                            secondary={param.description}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}

                {func.output && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Returns
                    </Typography>
                    <Chip label={func.output} size="small" variant="outlined" color="primary" />
                  </Box>
                )}

                {func.tests && func.tests.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Tests
                    </Typography>
                    <List dense>
                      {func.tests.map((test) => (
                        <ListItem key={test.name}>
                          <ListItemText
                            primary={test.name}
                            secondary={`Path: ${test.path}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                {func.tests && func.tests.length > 0 && (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                      size="small"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => runTests(func.name)}
                      disabled={runningTests[func.name]}
                      color={getTestButtonColor(func.name)}
                      endIcon={runningTests[func.name] && (
                        <CircularProgress 
                          size={16} 
                          thickness={6} 
                          sx={{ color: 'grey.400' }} 
                        />
                      )}
                    >
                      {getTestButtonText(func.name)}
                    </Button>
                    {testResults[func.name] && !testResults[func.name].passed && (
                      <Typography 
                        variant="body2" 
                        color="error"
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          maxWidth: '70%'
                        }}
                      >
                        {testResults[func.name].failed_tests?.map(test => 
                          `${test.name}: ${test.message}`
                        ).join(', ') || testResults[func.name].message}
                      </Typography>
                    )}
                  </Stack>
                )}
              </CardActions>
            </Card>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="textSecondary">
          This class has no functions defined.
        </Typography>
      )}
    </Paper>
  );
};

BackendAppViewer.propTypes = {
  category: PropTypes.string,
  selectedClass: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    component: PropTypes.string,
    summary: PropTypes.string,
    source: PropTypes.string,
    attributes: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
      type: PropTypes.string,
      description: PropTypes.string
    })),
    functions: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
      params: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        type: PropTypes.string,
        description: PropTypes.string
      })),
      output: PropTypes.string,
      tests: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        path: PropTypes.string.isRequired,
        test_params: PropTypes.object
      }))
    }))
  })
};

export default BackendAppViewer;
