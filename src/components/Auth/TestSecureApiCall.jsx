import { useEffect, useState } from 'react';
import axios, { createRequest } from '../../utils/axios';

const TestSecureApiCall = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  const addResult = (step, data, isError = false) => {
    setResults(prev => [...prev, { 
      step, 
      data, 
      isError, 
      timestamp: new Date().toISOString() 
    }]);
  };

  const checkHealth = async () => {
    try {
      setCurrentTest('Testing /health endpoint...');
      const response = await axios(createRequest({
        method: 'GET',
        url: '/health',
        withCredentials: false
      }, true));
      if (response.data.status !== 'healthy') {
        throw new Error('Health check failed');
      }
      addResult('Health Check', response.data);
      console.log('/health passed')
      return true;
    } catch (error) {
      addResult('Health Check', error.message, true);
      return false;
    }
  };

  const registerTestUser = async () => {
    try {
      setCurrentTest('Registering test user...');
      const formData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        displayName: 'Test User',
        password: 'Password123!',
        _orgID: import.meta.env.VITE_PUBLIC_KEY
      };

      // Check if email exists
      setCurrentTest('Checking if email exists...');
      const emailResponse = await axios(createRequest({
        method: 'POST',
        url: '/api/admin/email/find',
        data: {
          email: formData.email,
          _orgID: formData._orgID
        },
        headers: {
          Authorization: `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      }, true));

      let partyID;
      
      // 401 means no email found, which is what we want for a new registration
      if (emailResponse.status === 401 || emailResponse.data.data?.length === 0) {
        // Create new party
        setCurrentTest('Creating new party...');
        const partyResponse = await axios.post('/api/admin/party/', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          displayName: formData.displayName,
          _orgID: formData._orgID,
          type: 'user'
        }, {
          headers: {
            Authorization: `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
          }
        });
        
        partyID = partyResponse.data.response.data[0].fieldData.__ID;
        
        // Create email
        setCurrentTest('Creating email record...');
        await axios.post('/api/admin/email/', {
          email: formData.email,
          _fkID: partyID,
          _orgID: formData._orgID
        }, {
          headers: {
            Authorization: `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
          }
        });
      } else if (emailResponse.data.data?.length > 0) {
        partyID = emailResponse.data.data[0].fieldData._fkID;
      } else {
        throw new Error('Unexpected response from email check');
      }

      // Register user
      setCurrentTest('Registering user in auth system...');
      await axios.post('/api/auth/register', {
        userName: formData.email,
        password: formData.password,
        _orgID: formData._orgID,
        _partyID: partyID,
        active_status: 'active'
      }, {
        headers: {
          Authorization: `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      });

      addResult('Registration', 'Test user registered successfully');
      return true;
    } catch (error) {
      addResult('Registration', error.message, true);
      return false;
    }
  };

  const loginTestUser = async () => {
    try {
      setCurrentTest('Testing login...');
      const credentials = btoa('test.user@example.com:Password123!');
      await axios.post('/api/auth/login', 
        { org_id: import.meta.env.VITE_PUBLIC_KEY },
        { headers: { Authorization: `Basic ${credentials}` } }
      );
      addResult('Login', 'Login successful');
      return true;
    } catch (error) {
      addResult('Login', error.message, true);
      return false;
    }
  };

  const validateAuth = async () => {
    try {
      setCurrentTest('Validating authentication...');
      const [validateResponse, healthResponse] = await Promise.all([
        axios.get('/api/auth/validate'),
        axios.get('/api/auth/health/token')
      ]);

      addResult('Token Validation', {
        validate: validateResponse.data,
        health: healthResponse.data
      });
      return true;
    } catch (error) {
      addResult('Token Validation', error.message, true);
      return false;
    }
  };

  const logoutTestUser = async () => {
    try {
      setCurrentTest('Testing logout...');
      await axios.post('/api/auth/logout');
      addResult('Logout', 'Logout successful');
    } catch (error) {
      addResult('Logout', error.message, true);
    }
  };

  useEffect(() => {
    let mounted = true;
    const runTests = async () => {
      if (!mounted) return;
      setLoading(true);
      
      // Run tests in sequence
      if (!await checkHealth()) {
        if (mounted) setLoading(false);
        return;
      }

      // Try login first with suppressed errors
      setCurrentTest('Attempting login...');
      const loginResponse = await axios(createRequest({
        method: 'POST',
        url: '/api/auth/login',
        data: { org_id: import.meta.env.VITE_PUBLIC_KEY },
        headers: { 
          Authorization: `Basic ${btoa('test.user@example.com:Password123!')}` 
        }
      }, true));

      // If forbidden, user doesn't exist - create and retry login
      if (loginResponse.status === 403) {
        if (!await registerTestUser()) {
          if (mounted) setLoading(false);
          return;
        }
        // Retry login with error reporting
        if (!await loginTestUser()) {
          if (mounted) setLoading(false);
          return;
        }
      } else if (loginResponse.status === 200) {
        addResult('Login', 'Login successful');
      } else {
        addResult('Login', `Unexpected response: ${loginResponse.status}`, true);
        if (mounted) setLoading(false);
        return;
      }

      if (mounted) {
        await validateAuth();
        await logoutTestUser();
        setLoading(false);
        setCurrentTest('');
      }
    };

    runTests();

    return () => {
      mounted = false;
      // Clean up auth state
      axios.post('/api/auth/logout')
        .catch(() => {/* Ignore logout errors during cleanup */})
        .finally(() => {
          // Clear cookies
          document.cookie = 'access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          document.cookie = 'refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        });
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
        <p className="text-center mt-4">{currentTest || 'Running auth flow tests...'}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Auth Flow Test Results</h2>
      
      <div className="space-y-4">
        {results.map((result, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg border ${
              result.isError ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
            }`}
          >
            <h3 className={`font-medium ${
              result.isError ? 'text-red-700' : 'text-green-700'
            }`}>
              {result.step}
            </h3>
            <pre className="mt-2 whitespace-pre-wrap text-sm">
              {typeof result.data === 'string' 
                ? result.data 
                : JSON.stringify(result.data, null, 2)
              }
            </pre>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestSecureApiCall;
