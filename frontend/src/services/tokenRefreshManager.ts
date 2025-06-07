import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import { authMonitor } from './authMonitor';

interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  config: any;
}

export class TokenRefreshManager {
  private static instance: TokenRefreshManager;
  private refreshPromise: Promise<void> | null = null;
  private requestQueue: QueuedRequest[] = [];
  private isRefreshing: boolean = false;
  private refreshAttempts: number = 0;
  private maxRefreshAttempts: number = 3;
  private refreshCooldown: number = 1000; // 1 second
  private lastRefreshAttempt: number = 0;

  // Cross-tab coordination using localStorage
  private readonly REFRESH_LOCK_KEY = 'auth_refresh_lock';
  private readonly REFRESH_LOCK_TTL = 30000; // 30 seconds
  private readonly REFRESH_STATUS_KEY = 'auth_refresh_status';

  private constructor() {
    // Listen for storage events to coordinate across tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  public static getInstance(): TokenRefreshManager {
    if (!TokenRefreshManager.instance) {
      TokenRefreshManager.instance = new TokenRefreshManager();
    }
    return TokenRefreshManager.instance;
  }

  private handleStorageChange(event: StorageEvent) {
    if (event.key === this.REFRESH_STATUS_KEY && event.newValue === 'completed') {
      // Another tab completed the refresh, process our queue
      this.processQueuedRequests();
    }
  }

  private acquireRefreshLock(): boolean {
    const now = Date.now();
    const lockData = localStorage.getItem(this.REFRESH_LOCK_KEY);
    
    if (lockData) {
      const { timestamp } = JSON.parse(lockData);
      if (now - timestamp < this.REFRESH_LOCK_TTL) {
        return false; // Lock is still valid
      }
    }

    // Acquire lock
    localStorage.setItem(this.REFRESH_LOCK_KEY, JSON.stringify({ timestamp: now }));
    return true;
  }

  private releaseRefreshLock() {
    localStorage.removeItem(this.REFRESH_LOCK_KEY);
    localStorage.setItem(this.REFRESH_STATUS_KEY, 'completed');
    // Clear status after a short delay
    setTimeout(() => {
      localStorage.removeItem(this.REFRESH_STATUS_KEY);
    }, 1000);
  }

  private async exponentialBackoff(): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, this.refreshAttempts), 8000); // Max 8 seconds
    console.log(`Token refresh backoff: ${delay}ms (attempt ${this.refreshAttempts + 1})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  public async refreshToken(): Promise<void> {
    // Check cooldown period
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.refreshCooldown) {
      console.log('Token refresh in cooldown period, skipping');
      throw new Error('Token refresh in cooldown period');
    }

    // If already refreshing, return the existing promise
    if (this.refreshPromise) {
      console.log('Token refresh already in progress, waiting...');
      authMonitor.trackConcurrentAttempt();
      return this.refreshPromise;
    }

    // Try to acquire cross-tab lock
    if (!this.acquireRefreshLock()) {
      console.log('Another tab is refreshing token, waiting...');
      authMonitor.trackConcurrentAttempt();
      // Wait for the other tab to complete
      return new Promise((resolve, reject) => {
        const checkCompletion = () => {
          if (localStorage.getItem(this.REFRESH_STATUS_KEY) === 'completed') {
            resolve();
          } else {
            setTimeout(checkCompletion, 100);
          }
        };
        checkCompletion();
        // Timeout after 30 seconds
        setTimeout(() => reject(new Error('Token refresh timeout')), 30000);
      });
    }

    this.isRefreshing = true;
    this.lastRefreshAttempt = now;

    this.refreshPromise = this.performRefresh();
    
    try {
      await this.refreshPromise;
      this.refreshAttempts = 0; // Reset attempts on success
      this.processQueuedRequests();
    } catch (error) {
      this.refreshAttempts++;
      this.processQueuedRequestsWithError(error);
      throw error;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
      this.releaseRefreshLock();
    }
  }

  private async performRefresh(): Promise<void> {
    const authStore = useAuthStore.getState();
    const startTime = Date.now();
    
    authMonitor.trackRefreshStart();
    
    if (!authStore.refreshToken) {
      const error = new Error('No refresh token available');
      authMonitor.trackRefreshFailure(error);
      throw error;
    }

    // Apply exponential backoff if this is a retry
    if (this.refreshAttempts > 0) {
      await this.exponentialBackoff();
    }

    if (this.refreshAttempts >= this.maxRefreshAttempts) {
      console.error('Max refresh attempts exceeded');
      authStore.logout();
      const error = new Error('Max refresh attempts exceeded');
      authMonitor.trackRefreshFailure(error);
      throw error;
    }

    console.log(`Attempting token refresh (attempt ${this.refreshAttempts + 1}/${this.maxRefreshAttempts})`);

    try {
      // Make refresh request directly without interceptors to avoid infinite loops
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: authStore.refreshToken
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update auth store with new tokens
      authStore.setTokens({
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken
      });

      const duration = Date.now() - startTime;
      authMonitor.trackRefreshSuccess(duration);
      console.log('Token refresh successful');
    } catch (error) {
      console.error('Token refresh failed:', error);
      authMonitor.trackRefreshFailure(error);
      
      // If this was our last attempt, logout
      if (this.refreshAttempts >= this.maxRefreshAttempts - 1) {
        authStore.logout();
        authMonitor.trackLogout('Max refresh attempts exceeded');
      }
      
      throw error;
    }
  }

  public queueRequest(config: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, config });
      authMonitor.trackQueuedRequest(this.requestQueue.length);
    });
  }

  private async processQueuedRequests() {
    const authStore = useAuthStore.getState();
    const newToken = authStore.accessToken;

    console.log(`Processing ${this.requestQueue.length} queued requests`);

    const queue = [...this.requestQueue];
    this.requestQueue = [];

    // Create a fresh axios instance to avoid circular imports
    const freshAxios = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    for (const { resolve, reject, config } of queue) {
      try {
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
          const response = await freshAxios.request(config);
          resolve(response);
        } else {
          reject(new Error('No access token available'));
        }
      } catch (error) {
        reject(error);
      }
    }
  }

  private processQueuedRequestsWithError(error: any) {
    console.log(`Rejecting ${this.requestQueue.length} queued requests due to refresh failure`);
    
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const { reject } of queue) {
      reject(error);
    }
  }

  public isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }

  public clearQueue() {
    this.requestQueue = [];
  }
}

export const tokenRefreshManager = TokenRefreshManager.getInstance(); 