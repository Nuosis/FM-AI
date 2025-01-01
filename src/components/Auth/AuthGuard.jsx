import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import {
  refreshTokenStart,
  refreshTokenSuccess,
  refreshTokenFailure
} from '../../redux/slices/authSlice';

const AuthGuard = ({ children, requiredModules = [] }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, accessToken, refreshToken, user, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    const validateToken = async () => {
      if (!accessToken || !refreshToken) return;

      try {
        // Validate current token
        const validateResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/validate`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        // If token is invalid, try to refresh
        if (!validateResponse.ok) {
          dispatch(refreshTokenStart());

          const refreshResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh_token: refreshToken })
          });

          if (!refreshResponse.ok) {
            throw new Error('Token refresh failed');
          }

          const data = await refreshResponse.json();
          dispatch(refreshTokenSuccess(data));
        }
      } catch (err) {
        dispatch(refreshTokenFailure(err.message));
      }
    };

    validateToken();
  }, [accessToken, refreshToken, dispatch]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check module permissions
  if (requiredModules.length > 0) {
    const hasRequiredModules = requiredModules.every(module => 
      user.permitted_modules?.includes(module)
    );

    if (!hasRequiredModules) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You don&apos;t have permission to access this page.
              {requiredModules.length > 0 && (
                <span className="block mt-2">
                  Required modules: {requiredModules.join(', ')}
                </span>
              )}
            </p>
          </div>
        </div>
      );
    }
  }

  return children;
};

AuthGuard.propTypes = {
  children: PropTypes.node.isRequired,
  requiredModules: PropTypes.arrayOf(PropTypes.string)
};

export default AuthGuard;
