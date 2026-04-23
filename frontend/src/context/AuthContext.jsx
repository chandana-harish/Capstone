import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, userService } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await userService.getMe();
      setProfile(data.data);
    } catch {
      // profile fetch may fail; not critical
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
        loadProfile();
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, [loadProfile]);

  const login = async (email, password) => {
    const { data } = await authService.login({ email, password });
    const { accessToken, refreshToken, user: userData } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    await loadProfile();
    toast.success(`Welcome back, ${userData.email}!`);
    return userData;
  };

  const logout = async () => {
    try {
      if (user?.userId) await authService.logout(user.userId);
    } catch { /* silently fail */ }
    localStorage.clear();
    setUser(null);
    setProfile(null);
    toast.success('Logged out successfully');
  };

  const register = async (payload) => {
    await authService.register(payload);
    toast.success('Account created! Please log in.');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, register, loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
