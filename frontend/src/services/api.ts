import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  let token: string | null = null;
  
  if (Platform.OS === 'web') {
    token = localStorage.getItem('session_token');
  } else {
    token = await SecureStore.getItemAsync('session_token');
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      if (Platform.OS === 'web') {
        localStorage.removeItem('session_token');
      } else {
        await SecureStore.deleteItemAsync('session_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;