import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { ApiError } from '../types';
import { tokenRefreshManager } from './tokenRefreshManager';

// Extend the axios request config to include retry flag
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

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
    
    // Log the request for debugging
    console.log(`Making API request: ${config.method?.toUpperCase()} ${config.url}`, {
      hasAuth: !!token,
      baseURL: config.baseURL,
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses for debugging
    console.log(`API response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      message: error.message,
      data: error.response?.data,
    });
    
    const { response } = error;
    const config = error.config as ExtendedAxiosRequestConfig;
    
    if (response?.status === 401) {
      const authStore = useAuthStore.getState();
      
      // Only try to refresh if we have a refresh token and haven't already tried
      if (authStore.refreshToken && !config?._retry) {
        try {
          // Mark this request as having attempted a retry
          if (config) {
            config._retry = true;
          }
          
          // Check if refresh is already in progress
          if (tokenRefreshManager.isCurrentlyRefreshing()) {
            console.log('Token refresh in progress, queuing request...');
            // Queue this request to be retried after refresh completes
            return tokenRefreshManager.queueRequest(config);
          }
          
          // Start token refresh using our singleton manager
          await tokenRefreshManager.refreshToken();
          
          // Retry the original request with new token
          if (config) {
            const newToken = useAuthStore.getState().accessToken;
            if (newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
              return apiClient.request(config);
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // If refresh fails, logout and redirect
          authStore.logout();
          window.location.href = '/login';
        }
      } else {
        // No refresh token or already tried, logout
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