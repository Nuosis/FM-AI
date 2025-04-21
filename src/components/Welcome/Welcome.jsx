import { Box, Typography, Paper, Container, Button, Grid } from '@mui/material';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';

function Welcome({ onSignInClick = undefined }) {
  //console.log('Welcome component rendered');
  // Access authentication state from Redux
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  //console.log('Authentication status in Welcome:', isAuthenticated);
  
  // Default handler if onSignInClick is not provided
  const handleSignIn = () => {
    console.log('Sign In button clicked');
    if (onSignInClick) {
      onSignInClick();
    } else {
      console.log('No onSignInClick handler provided');
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom color="primary">
            Welcome to Clarity Business Solutions
          </Typography>
          <Typography variant="h5" component="h2" color="text.secondary" gutterBottom>
            Empowering Success
          </Typography>
        </Box>

        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            About Us
          </Typography>
          <Typography variant="body1" paragraph>
            <a href="https://www.claritybusinesssolutions.ca" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Clarity Business Solutions
            </a> specializes in providing
            cutting-edge AI-powered tools and solutions to streamline your business operations.
            We combine industry expertise with innovative technology to help you achieve greater
            efficiency and productivity.
          </Typography>
          <Typography variant="body1" paragraph>
            This playground is designed to showcase our capabilities, and highlight our core value. If we can be part of your success our success is garenteed! 
            Feel free to explore the features and functionalities we offer. Whether you are looking to automate
            processes, analyze data, or enhance customer interactions, we&apos;re here to help.
          </Typography>
        </Box>

        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Our Platform Features
          </Typography>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  AI-Powered Tools
                </Typography>
                <Typography variant="body2">
                  Access a suite of intelligent tools designed to automate repetitive tasks, 
                  analyze data, and provide actionable insights for your business.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Custom Functions
                </Typography>
                <Typography variant="body2">
                  Create and deploy custom functions tailored to your specific business processes, 
                  enhancing workflow efficiency and reducing manual intervention.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Interactive Chat
                </Typography>
                <Typography variant="body2">
                  Communicate with our advanced AI assistant to get instant help, generate content, 
                  and solve complex problems with natural language interactions.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {!isAuthenticated && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Ready to get started?
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => {
                handleSignIn();
              }}
              sx={{ mt: 2 }}
            >
              Sign In to Access All Features
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

Welcome.propTypes = {
  onSignInClick: PropTypes.func,
};

export default Welcome;