import { useAuthStore } from '../store/authStore';
import { tokenRefreshManager } from './tokenRefreshManager';
import { authMonitor } from './authMonitor';

export class PreemptiveRefreshService {
  private static instance: PreemptiveRefreshService;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_THRESHOLD = 0.8; // Refresh when 80% of token life has elapsed
  private readonly MIN_REFRESH_INTERVAL = 30000; // Minimum 30 seconds between checks
  private readonly DEFAULT_TOKEN_DURATION = 15 * 60 * 1000; // 15 minutes default
  private isEnabled = true;
  private isMonitoringStarted = false;

  private constructor() {
    // Don't start monitoring immediately to avoid circular dependency
    // Will be started when enable() is called
  }

  public static getInstance(): PreemptiveRefreshService {
    if (!PreemptiveRefreshService.instance) {
      PreemptiveRefreshService.instance = new PreemptiveRefreshService();
    }
    return PreemptiveRefreshService.instance;
  }

  private decodeJwtPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode JWT payload:', error);
      return null;
    }
  }

  private getTokenExpirationTime(token: string): number | null {
    const payload = this.decodeJwtPayload(token);
    if (!payload || !payload.exp) {
      return null;
    }
    return payload.exp * 1000; // Convert to milliseconds
  }

  private calculateRefreshTime(token: string): number {
    const expirationTime = this.getTokenExpirationTime(token);
    
    if (!expirationTime) {
      // If we can't decode the token, use default duration
      console.warn('Could not determine token expiration, using default refresh interval');
      return Date.now() + (this.DEFAULT_TOKEN_DURATION * this.REFRESH_THRESHOLD);
    }

    const now = Date.now();
    const tokenDuration = expirationTime - now;
    
    if (tokenDuration <= 0) {
      // Token is already expired, refresh immediately
      return now;
    }

    // Calculate refresh time (80% of token life)
    const refreshTime = now + (tokenDuration * this.REFRESH_THRESHOLD);
    
    console.log('[PreemptiveRefresh] Token refresh scheduled', {
      expiresAt: new Date(expirationTime).toLocaleTimeString(),
      refreshAt: new Date(refreshTime).toLocaleTimeString(),
      durationMinutes: Math.round(tokenDuration / 60000),
      refreshInMinutes: Math.round((refreshTime - now) / 60000)
    });

    return refreshTime;
  }

  private async performPreemptiveRefresh() {
    try {
      const authStore = useAuthStore.getState();
      
      if (!authStore.isAuthenticated || !authStore.accessToken) {
        console.log('[PreemptiveRefresh] Not authenticated, skipping refresh');
        return;
      }
    } catch (error) {
      console.warn('[PreemptiveRefresh] Unable to access auth store:', error);
      return;
    }

    const authStore = useAuthStore.getState();

    // Check if token is still valid and needs refreshing
    if (!authStore.accessToken) {
      console.log('[PreemptiveRefresh] No access token available');
      return;
    }
    
    const expirationTime = this.getTokenExpirationTime(authStore.accessToken);
    if (expirationTime && expirationTime > Date.now() + 60000) { // At least 1 minute left
      console.log('[PreemptiveRefresh] Token still has significant time left, skipping');
      this.scheduleNextRefresh(); // Reschedule
      return;
    }

    try {
      console.log('[PreemptiveRefresh] Starting preemptive token refresh');
      await tokenRefreshManager.refreshToken();
      console.log('[PreemptiveRefresh] Preemptive refresh completed successfully');
      
      // Schedule next refresh with new token
      this.scheduleNextRefresh();
    } catch (error) {
      console.error('[PreemptiveRefresh] Preemptive refresh failed:', error);
      authMonitor.trackRefreshFailure(error);
      
      // Retry with exponential backoff
      this.scheduleRetry();
    }
  }

  private scheduleNextRefresh() {
    if (!this.isEnabled) return;

    try {
      const authStore = useAuthStore.getState();
      if (!authStore.accessToken || !authStore.isAuthenticated) {
        console.log('[PreemptiveRefresh] No token available, stopping scheduling');
        return;
      }

      this.clearExistingTimer();

      const refreshTime = this.calculateRefreshTime(authStore.accessToken);
      const delay = Math.max(refreshTime - Date.now(), this.MIN_REFRESH_INTERVAL);

      this.refreshTimer = setTimeout(() => {
        this.performPreemptiveRefresh();
      }, delay);

      console.log(`[PreemptiveRefresh] Next refresh scheduled in ${Math.round(delay / 60000)} minutes`);
    } catch (error) {
      console.warn('[PreemptiveRefresh] Unable to access auth store for scheduling:', error);
    }
  }

  private scheduleRetry() {
    if (!this.isEnabled) return;

    this.clearExistingTimer();

    // Retry after 1 minute on failure
    const retryDelay = 60000;
    this.refreshTimer = setTimeout(() => {
      this.performPreemptiveRefresh();
    }, retryDelay);

    console.log('[PreemptiveRefresh] Retry scheduled in 1 minute');
  }

  private clearExistingTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private startMonitoring() {
    // Only start monitoring if not already started
    if (this.isMonitoringStarted) {
      return;
    }
    this.isMonitoringStarted = true;

    // Initial schedule if user is already authenticated
    // Use setTimeout to ensure auth store is initialized
    setTimeout(() => {
      try {
        const authStore = useAuthStore.getState();
        if (authStore.isAuthenticated && authStore.accessToken) {
          this.scheduleNextRefresh();
        }
      } catch (error) {
        console.warn('[PreemptiveRefresh] Auth store not ready yet, will retry on enable');
      }
    }, 100);

    // Listen for auth state changes through storage events (for cross-tab sync)
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth-storage') {
        console.log('[PreemptiveRefresh] Auth state changed, rescheduling');
        setTimeout(() => this.scheduleNextRefresh(), 100);
      }
    });

    // Also listen for focus events to reschedule (in case system was sleeping)
    window.addEventListener('focus', () => {
      console.log('[PreemptiveRefresh] Window focused, checking token status');
      setTimeout(() => this.scheduleNextRefresh(), 1000);
    });
  }

  public enable() {
    this.isEnabled = true;
    
    // Start monitoring if not already started
    if (!this.isMonitoringStarted) {
      this.startMonitoring();
    }
    
    this.scheduleNextRefresh();
    console.log('[PreemptiveRefresh] Service enabled');
  }

  public disable() {
    this.isEnabled = false;
    this.clearExistingTimer();
    console.log('[PreemptiveRefresh] Service disabled');
  }

  public forceRefresh() {
    console.log('[PreemptiveRefresh] Force refresh requested');
    this.performPreemptiveRefresh();
  }

  public getStatus() {
    try {
      const authStore = useAuthStore.getState();
      const hasTimer = this.refreshTimer !== null;
      let nextRefreshTime = null;

      if (hasTimer && authStore.accessToken) {
        const refreshTime = this.calculateRefreshTime(authStore.accessToken);
        nextRefreshTime = new Date(refreshTime);
      }

      return {
        enabled: this.isEnabled,
        hasScheduledRefresh: hasTimer,
        nextRefreshTime,
        isAuthenticated: authStore.isAuthenticated,
        hasToken: !!authStore.accessToken
      };
    } catch (error) {
      console.warn('[PreemptiveRefresh] Unable to access auth store for status:', error);
      return {
        enabled: this.isEnabled,
        hasScheduledRefresh: this.refreshTimer !== null,
        nextRefreshTime: null,
        isAuthenticated: false,
        hasToken: false
      };
    }
  }
}

// Export factory function to avoid circular dependency issues
export const getPreemptiveRefreshService = () => PreemptiveRefreshService.getInstance(); 