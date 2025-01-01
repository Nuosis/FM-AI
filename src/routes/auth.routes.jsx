import { LoginForm, RegistrationForm } from '../components/Auth';

export const getLoginForm = () => <LoginForm />;

export const authRoutes = [
  {
    path: '/login',
    element: <LoginForm />
  },
  {
    path: '/register',
    element: <RegistrationForm />
  }
];

// Example of using AuthGuard with module permissions
// Usage in app routes:
/*
import { AuthGuard } from '../components/Auth';

const protectedRoutes = [
  {
    path: '/admin',
    element: (
      <AuthGuard requiredModules={['admin']}>
        <AdminDashboard />
      </AuthGuard>
    )
  },
  {
    path: '/billing',
    element: (
      <AuthGuard requiredModules={['billing']}>
        <BillingPage />
      </AuthGuard>
    )
  }
];
*/
