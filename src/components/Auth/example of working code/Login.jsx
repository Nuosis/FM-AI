import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/auth/AuthForm';
import TestSecureApiCall from '../components/auth/TestSecureApiCall';

export default function Login() {
  const { isAuthenticated, verifyingSession } = useSelector(state => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !verifyingSession) {
      // Temporarily disabled redirect for debugging
      // navigate('/dashboard');
      console.log('Login successful - redirect disabled for debugging');
    }
  }, [isAuthenticated, verifyingSession, navigate]);

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');

  const handleEmailChange = (email) => {
    setUsername(email);
  };

  const handleFormSwitch = () => {
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-secondary-50 p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-light text-primary-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
        </div>

        <AuthForm 
          isSignUp={isSignUp}
          onEmailChange={handleEmailChange}
          onFormSwitch={handleFormSwitch}
        />

        <div className="text-center">
          <button
            type="button"
            onClick={handleFormSwitch}
            className="text-accent-500 hover:text-accent-600 text-sm"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>

        {username === 'devCBS' && <TestSecureApiCall />}
      </div>
    </div>
  );
}
