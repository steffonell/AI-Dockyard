import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials, AuthTokens } from '../types';
import apiClient from '../services/apiClient';
import { tokenRefreshManager } from '../services/tokenRefreshManager';
import { authMonitor } from '../services/authMonitor';
import { getPreemptiveRefreshService } from '../services/preemptiveRefresh';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshTokens: () => Promise<void>;
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true });
          
          const response = await apiClient.post('/auth/login', credentials);
          const { data } = response;
          
          set({
            user: data.user,
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Start preemptive refresh after successful login
          getPreemptiveRefreshService().enable();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        authMonitor.trackLogout('User initiated logout');
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        
        // Clear any stored data
        localStorage.removeItem('auth-storage');
        tokenRefreshManager.clearQueue();
        getPreemptiveRefreshService().disable();
      },

      refreshTokens: async () => {
        try {
          // Use the centralized token refresh manager
          await tokenRefreshManager.refreshToken();
        } catch (error) {
          // If refresh fails, logout
          get().logout();
          throw error;
        }
      },

      initialize: async () => {
        try {
          set({ isLoading: true });
          
          const state = get();
          
          // If we have a user and refresh token but no access token, try to refresh
          if (state.user && state.refreshToken && !state.accessToken) {
            await get().refreshTokens();
          }
          
          // If we have a user and access token, consider authenticated
          if (state.user && state.accessToken) {
            set({ isAuthenticated: true });
          }
          
          set({ isInitialized: true, isLoading: false });
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          set({ isInitialized: true, isLoading: false });
          // Don't throw here, let the app continue
        }
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      setTokens: (tokens: AuthTokens) => {
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        });
        
        // Reschedule preemptive refresh with new token
        getPreemptiveRefreshService().enable();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
        // Don't persist accessToken for security, but store enough info to refresh
      }),
    }
  )
); 