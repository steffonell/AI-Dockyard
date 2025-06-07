export interface AuthMetrics {
  refreshAttempts: number;
  refreshSuccesses: number;
  refreshFailures: number;
  concurrentRefreshAttempts: number;
  lastRefreshTime: number;
  averageRefreshDuration: number;
  refreshDurations: number[];
  maxConcurrentRequests: number;
  logoutEvents: number;
}

export interface AuthEvent {
  timestamp: number;
  type: 'refresh_start' | 'refresh_success' | 'refresh_failure' | 'concurrent_attempt' | 'queue_request' | 'logout';
  details?: any;
  duration?: number;
}

export class AuthMonitor {
  private static instance: AuthMonitor;
  private metrics: AuthMetrics;
  private events: AuthEvent[] = [];
  private maxEventHistory = 100;

  private constructor() {
    this.metrics = {
      refreshAttempts: 0,
      refreshSuccesses: 0,
      refreshFailures: 0,
      concurrentRefreshAttempts: 0,
      lastRefreshTime: 0,
      averageRefreshDuration: 0,
      refreshDurations: [],
      maxConcurrentRequests: 0,
      logoutEvents: 0,
    };

    // Load metrics from localStorage if available
    this.loadMetricsFromStorage();
  }

  public static getInstance(): AuthMonitor {
    if (!AuthMonitor.instance) {
      AuthMonitor.instance = new AuthMonitor();
    }
    return AuthMonitor.instance;
  }

  private loadMetricsFromStorage() {
    try {
      const stored = localStorage.getItem('auth_metrics');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.metrics = { ...this.metrics, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load auth metrics from storage:', error);
    }
  }

  private saveMetricsToStorage() {
    try {
      localStorage.setItem('auth_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Failed to save auth metrics to storage:', error);
    }
  }

  private addEvent(event: AuthEvent) {
    this.events.push(event);
    if (this.events.length > this.maxEventHistory) {
      this.events = this.events.slice(-this.maxEventHistory);
    }
  }

  public trackRefreshStart() {
    this.metrics.refreshAttempts++;
    this.addEvent({
      timestamp: Date.now(),
      type: 'refresh_start'
    });
    console.log('[AuthMonitor] Token refresh started', {
      totalAttempts: this.metrics.refreshAttempts,
      successRate: this.getSuccessRate()
    });
  }

  public trackRefreshSuccess(duration: number) {
    this.metrics.refreshSuccesses++;
    this.metrics.lastRefreshTime = Date.now();
    this.metrics.refreshDurations.push(duration);
    
    // Keep only last 20 durations for average calculation
    if (this.metrics.refreshDurations.length > 20) {
      this.metrics.refreshDurations = this.metrics.refreshDurations.slice(-20);
    }
    
    this.metrics.averageRefreshDuration = 
      this.metrics.refreshDurations.reduce((a, b) => a + b, 0) / this.metrics.refreshDurations.length;

    this.addEvent({
      timestamp: Date.now(),
      type: 'refresh_success',
      duration
    });

    console.log('[AuthMonitor] Token refresh successful', {
      duration: `${duration}ms`,
      averageDuration: `${Math.round(this.metrics.averageRefreshDuration)}ms`,
      successRate: this.getSuccessRate()
    });

    this.saveMetricsToStorage();
  }

  public trackRefreshFailure(error: any) {
    this.metrics.refreshFailures++;
    this.addEvent({
      timestamp: Date.now(),
      type: 'refresh_failure',
      details: error.message || error
    });

    console.error('[AuthMonitor] Token refresh failed', {
      error: error.message || error,
      successRate: this.getSuccessRate(),
      totalFailures: this.metrics.refreshFailures
    });

    this.saveMetricsToStorage();
  }

  public trackConcurrentAttempt() {
    this.metrics.concurrentRefreshAttempts++;
    this.addEvent({
      timestamp: Date.now(),
      type: 'concurrent_attempt'
    });

    console.warn('[AuthMonitor] Concurrent token refresh attempt blocked', {
      totalConcurrentAttempts: this.metrics.concurrentRefreshAttempts
    });
  }

  public trackQueuedRequest(queueSize: number) {
    this.metrics.maxConcurrentRequests = Math.max(this.metrics.maxConcurrentRequests, queueSize);
    this.addEvent({
      timestamp: Date.now(),
      type: 'queue_request',
      details: { queueSize }
    });

    console.log('[AuthMonitor] Request queued during token refresh', {
      queueSize,
      maxConcurrentRequests: this.metrics.maxConcurrentRequests
    });
  }

  public trackLogout(reason?: string) {
    this.metrics.logoutEvents++;
    this.addEvent({
      timestamp: Date.now(),
      type: 'logout',
      details: { reason }
    });

    console.log('[AuthMonitor] User logged out', {
      reason,
      totalLogouts: this.metrics.logoutEvents
    });

    this.saveMetricsToStorage();
  }

  public getSuccessRate(): number {
    if (this.metrics.refreshAttempts === 0) return 100;
    return Math.round((this.metrics.refreshSuccesses / this.metrics.refreshAttempts) * 100);
  }

  public getMetrics(): AuthMetrics {
    return { ...this.metrics };
  }

  public getRecentEvents(count: number = 10): AuthEvent[] {
    return this.events.slice(-count);
  }

  public generateReport(): string {
    const now = Date.now();
    const timeSinceLastRefresh = this.metrics.lastRefreshTime > 0 
      ? Math.round((now - this.metrics.lastRefreshTime) / 1000) 
      : 'N/A';

    return `
=== Auth Monitor Report ===
Total Refresh Attempts: ${this.metrics.refreshAttempts}
Successful Refreshes: ${this.metrics.refreshSuccesses}
Failed Refreshes: ${this.metrics.refreshFailures}
Success Rate: ${this.getSuccessRate()}%
Concurrent Attempts Blocked: ${this.metrics.concurrentRefreshAttempts}
Average Refresh Duration: ${Math.round(this.metrics.averageRefreshDuration)}ms
Max Concurrent Requests: ${this.metrics.maxConcurrentRequests}
Time Since Last Refresh: ${timeSinceLastRefresh}s
Total Logout Events: ${this.metrics.logoutEvents}

Recent Events:
${this.getRecentEvents(5).map(event => 
  `${new Date(event.timestamp).toLocaleTimeString()} - ${event.type}${event.duration ? ` (${event.duration}ms)` : ''}${event.details ? ` - ${JSON.stringify(event.details)}` : ''}`
).join('\n')}
    `.trim();
  }

  public resetMetrics() {
    this.metrics = {
      refreshAttempts: 0,
      refreshSuccesses: 0,
      refreshFailures: 0,
      concurrentRefreshAttempts: 0,
      lastRefreshTime: 0,
      averageRefreshDuration: 0,
      refreshDurations: [],
      maxConcurrentRequests: 0,
      logoutEvents: 0,
    };
    this.events = [];
    localStorage.removeItem('auth_metrics');
    console.log('[AuthMonitor] Metrics reset');
  }
}

export const authMonitor = AuthMonitor.getInstance(); 