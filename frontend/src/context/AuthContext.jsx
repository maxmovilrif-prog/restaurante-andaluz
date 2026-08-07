import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminLogin } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'));

  const login = useCallback(async (pin) => {
    const { token: newToken } = await adminLogin(pin);
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setToken(null);
  }, []);

  useEffect(() => {
    const handleExpired = () => setToken(null);
    window.addEventListener('admin-auth-expired', handleExpired);
    return () => window.removeEventListener('admin-auth-expired', handleExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
