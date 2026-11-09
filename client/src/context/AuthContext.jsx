import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('invoicehub_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [business, setBusiness] = useState(() => {
    const saved = localStorage.getItem('invoicehub_business');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('invoicehub_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success && res.data.data) {
          const userData = res.data.data.user;
          const businessData = res.data.data.business;
          setUser(userData);
          localStorage.setItem('invoicehub_user', JSON.stringify(userData));

          if (businessData) {
            setBusiness(businessData);
            localStorage.setItem('invoicehub_business', JSON.stringify(businessData));
            localStorage.setItem('invoicehub_business_id', businessData.id);
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
        localStorage.removeItem('invoicehub_token');
        localStorage.removeItem('invoicehub_user');
        localStorage.removeItem('invoicehub_business');
        localStorage.removeItem('invoicehub_business_id');
        setUser(null);
        setBusiness(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token, user: userData, business: businessData } = res.data.data;
      localStorage.setItem('invoicehub_token', token);
      localStorage.setItem('invoicehub_user', JSON.stringify(userData));
      setUser(userData);

      if (businessData) {
        localStorage.setItem('invoicehub_business', JSON.stringify(businessData));
        localStorage.setItem('invoicehub_business_id', businessData.id);
        setBusiness(businessData);
      } else {
        localStorage.removeItem('invoicehub_business');
        localStorage.removeItem('invoicehub_business_id');
        setBusiness(null);
      }
      return res.data;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (name, email, password, phone) => {
    const res = await api.post('/auth/register', { name, email, password, phone });
    if (res.data.success) {
      const { token, user: userData } = res.data.data;
      localStorage.setItem('invoicehub_token', token);
      localStorage.setItem('invoicehub_user', JSON.stringify(userData));
      setUser(userData);
      return res.data;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('invoicehub_token');
      localStorage.removeItem('invoicehub_user');
      localStorage.removeItem('invoicehub_business');
      localStorage.removeItem('invoicehub_business_id');
      setUser(null);
      setBusiness(null);
      window.location.href = '/login';
    }
  };

  const updateBusiness = (updated) => {
    setBusiness(updated);
    localStorage.setItem('invoicehub_business', JSON.stringify(updated));
    localStorage.setItem('invoicehub_business_id', updated.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        isLoading,
        login,
        register,
        logout,
        updateBusiness,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

