import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import supabase from '../../utils/supabase';
import { signInWithEmail, signUpWithEmail, signOut } from '../../redux/slices/authSlice';

const TestSecureApiCall = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const dispatch = useDispatch();

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
      setCurrentTest('Testing Supabase connection...');
      const { data, error } = await supabase.from('health').select('*').limit(1);
      
      if (error) throw error;
      
      addResult('Supabase Health Check', { status: 'healthy', data });
      console.log('Supabase connection test passed');
      return true;
    } catch (error) {
      addResult('Supabase Health Check', error.message, true);
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
        password: 'Password123!',
        organizationId: import.meta.env.VITE_PUBLIC_KEY
      };

      // Check if user exists
      setCurrentTest('Checking if user exists...');
      const { data: existingUser } = await supabase
        .from('Users')
        .select('*')
        .eq('email', formData.email)
        .single();

      if (existingUser) {
        addResult('User Check', 'Test user already exists');
        return true;
      }

      // Register user with Supabase
      setCurrentTest('Creating user in Supabase...');
      const resultAction = await dispatch(signUpWithEmail({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organizationId: formData.organizationId
      }));

      if (signUpWithEmail.fulfilled.match(resultAction)) {
        addResult('Registration', 'Test user registered successfully');
        return true;
      } else {
        throw new Error(resultAction.payload || 'Registration failed');
      }
    } catch (error) {
      addResult('Registration', error.message, true);
      return false;
    }
  };

  const loginTestUser = async () => {
    try {
      setCurrentTest('Testing login with Supabase...');
      const resultAction = await dispatch(signInWithEmail({
        email: 'test.user@example.com',
        password: 'Password123!'
      }));
      
      if (signInWithEmail.fulfilled.match(resultAction)) {
        addResult('Login', 'Login successful with Supabase session');
        return true;
      } else {
        throw new Error(resultAction.payload || 'Login failed');
      }
    } catch (error) {
      addResult('Login', error.message, true);
      return false;
    }
  };

  const validateAuth = async () => {
    try {
      setCurrentTest('Validating Supabase session...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (!data.session) {
        throw new Error('No active session found');
      }
      
      // Test accessing a protected resource
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('*')
        .eq('id', data.session.user.id)
        .single();
        
      if (userError) throw userError;

      addResult('Session Validation', {
        session: data.session,
        user: userData
      });
      return true;
    } catch (error) {
      addResult('Session Validation', error.message, true);
      return false;
    }
  };

  const logoutTestUser = async () => {
    try {
      setCurrentTest('Testing logout with Supabase...');
      const resultAction = await dispatch(signOut());
      
      if (signOut.fulfilled.match(resultAction)) {
        addResult('Logout', 'Logout successful');
      } else {
        throw new Error(resultAction.payload || 'Logout failed');
      }
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

      // Try login first
      setCurrentTest('Attempting login...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        // No session or error, try login
        const loginResult = await loginTestUser();
        if (!loginResult) {
          // If login fails, try to register
          if (!await registerTestUser()) {
            if (mounted) setLoading(false);
            return;
          }
          // Retry login after registration
          if (!await loginTestUser()) {
            if (mounted) setLoading(false);
            return;
          }
        }
      } else {
        // Already logged in
        addResult('Login', 'Already logged in with existing session');
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
      supabase.auth.signOut()
        .catch(() => {/* Ignore logout errors during cleanup */});
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
