import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
    
    // Handle deep links on mobile
    if (Platform.OS !== 'web') {
      const subscription = Linking.addEventListener('url', handleDeepLink);
      return () => subscription.remove();
    }
  }, []);

  // Handle session_id from URL on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const hash = window.location.hash;
      const search = window.location.search;
      
      let sessionId: string | null = null;
      
      if (hash.includes('session_id=')) {
        sessionId = hash.split('session_id=')[1].split('&')[0];
      } else if (search.includes('session_id=')) {
        sessionId = new URLSearchParams(search).get('session_id');
      }
      
      if (sessionId) {
        processSessionId(sessionId);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const checkSession = async () => {
    try {
      let token: string | null = null;
      
      if (Platform.OS === 'web') {
        token = localStorage.getItem('session_token');
      } else {
        token = await SecureStore.getItemAsync('session_token');
      }
      
      if (token) {
        const response = await api.get('/auth/me');
        setUser(response.data);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeepLink = async (event: { url: string }) => {
    const url = event.url;
    
    if (url.includes('session_id=')) {
      let sessionId: string | null = null;
      
      if (url.includes('#session_id=')) {
        sessionId = url.split('#session_id=')[1].split('&')[0];
      } else if (url.includes('?session_id=')) {
        sessionId = url.split('?session_id=')[1].split('&')[0];
      }
      
      if (sessionId) {
        await processSessionId(sessionId);
      }
    }
  };

  const processSessionId = async (sessionId: string) => {
    try {
      // Exchange session_id for user data
      const response = await api.post('/auth/session', {
        id: sessionId,
        email: '',
        name: '',
        picture: '',
        session_token: sessionId,
      });
      
      // Store token
      if (Platform.OS === 'web') {
        localStorage.setItem('session_token', sessionId);
      } else {
        await SecureStore.setItemAsync('session_token', sessionId);
      }
      
      // Get user data
      await checkSession();
    } catch (error) {
      console.error('Session processing failed:', error);
    }
  };

  const login = async () => {
    try {
      const redirectUrl = Platform.OS === 'web'
        ? `${window.location.origin}/`
        : Linking.createURL('auth');
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          await handleDeepLink({ url: result.url });
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      
      if (Platform.OS === 'web') {
        localStorage.removeItem('session_token');
      } else {
        await SecureStore.deleteItemAsync('session_token');
      }
      
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('User refresh failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};