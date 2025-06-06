import axios, { AxiosError, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/authStore';
import { ApiError } from '../types';

// Create axios instance - now pointing to the integrated backend
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const { response } = error;
    
    if (response?.status === 401) {
      // Try to refresh token or redirect to login
      const authStore = useAuthStore.getState();
      try {
        await authStore.refreshTokens();
        // Retry the original request
        if (error.config) {
          return apiClient.request(error.config);
        }
      } catch (refreshError) {
        // If refresh fails, logout and redirect
        authStore.logout();
        window.location.href = '/login';
      }
    }
    
    // Transform error to our ApiError format
    const apiError: ApiError = {
      message: (response?.data as any)?.message || error.message || 'An unexpected error occurred',
      code: (response?.data as any)?.code || 'UNKNOWN_ERROR',
      details: (response?.data as any)?.details,
    };
    
    return Promise.reject(apiError);
  }
);

export default apiClient; 