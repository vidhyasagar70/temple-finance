import { createContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('templeFinanceUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('templeFinanceToken') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const storedToken = localStorage.getItem('templeFinanceToken');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('templeFinanceUser', JSON.stringify(res.data));
          } else {
            logout();
          }
        } catch {
          logout();
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const login = async (phone, password) => {
    const res = await authApi.login(phone, password);
    if (res.success && res.data) {
      const { token: newToken, user: userData } = res.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('templeFinanceToken', newToken);
      localStorage.setItem('templeFinanceUser', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('templeFinanceToken');
    localStorage.removeItem('templeFinanceUser');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
