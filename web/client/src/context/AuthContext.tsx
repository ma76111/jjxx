import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { User, AuthContextType } from '../types';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // Refresh user from API silently — syncs language and other fields changed via bot
  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem('token');
    if (!t) return;
    try {
      const res = await axiosClient.get('/user/me');
      const freshUser: User = res.data;
      localStorage.setItem('user', JSON.stringify(freshUser));
      setUser(freshUser);
    } catch {
      // silently ignore — token may be expired, let other guards handle it
    }
  }, []);

  // Refresh on window focus (user switches back to tab after changing lang in bot)
  useEffect(() => {
    if (!token) return;
    const onFocus = () => refreshUser();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [token, refreshUser]);

  // Also do an initial refresh on mount so fresh lang is picked up immediately
  useEffect(() => {
    if (token) refreshUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const MAIN_ADMIN_ID = Number(import.meta.env.VITE_MAIN_ADMIN_ID) || 0;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isAdmin: !!user?.is_admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
