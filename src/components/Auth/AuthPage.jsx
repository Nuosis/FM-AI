import { useState } from 'react';
import RegistrationForm from './RegistrationForm';
import LoginForm from './LoginForm';

const AuthPage = () => {
  const [view, setView] = useState('login'); // 'login' or 'register'

  return (
    <>
      {view === 'login' && <LoginForm onViewChange={setView} />}
      {view === 'register' && <RegistrationForm onViewChange={setView} />}
    </>
  );
};

export default AuthPage;