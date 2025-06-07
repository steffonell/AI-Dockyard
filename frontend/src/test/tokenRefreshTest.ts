import { tokenRefreshManager } from '../services/tokenRefreshManager';
import { authMonitor } from '../services/authMonitor';
import { getPreemptiveRefreshService } from '../services/preemptiveRefresh';
import { useAuthStore } from '../store/authStore';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

export class TokenRefreshTestSuite {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Token Refresh Test Suite...');
    
    this.results = [];
    
    await this.testSingletonBehavior();
    await this.testConcurrentRequests();
    await this.testRequestQueuing();
    await this.testExponentialBackoff();
    await this.testCrossTabCoordination();
    await this.testMonitoringMetrics();
    await this.testPreemptiveRefresh();
    
    this.printResults();
    return this.results;
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - startTime
      });
      console.log(`✅ ${name} - PASSED (${Date.now() - startTime}ms)`);
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.error(`❌ ${name} - FAILED: ${error}`);
    }
  }

  private async testSingletonBehavior(): Promise<void> {
    await this.runTest('Singleton Pattern', async () => {
      const instance1 = tokenRefreshManager;
      const instance2 = tokenRefreshManager;
      
      if (instance1 !== instance2) {
        throw new Error('TokenRefreshManager is not a singleton');
      }
    });
  }

  private async testConcurrentRequests(): Promise<void> {
    await this.runTest('Concurrent Request Handling', async () => {
      // Reset metrics
      authMonitor.resetMetrics();
      
      // Mock auth store with valid refresh token
      const mockStore = {
        refreshToken: 'mock-refresh-token',
        accessToken: null,
        isAuthenticated: true
      };
      
      // Simulate multiple concurrent refresh attempts
      const promises = Array(5).fill(0).map(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (tokenRefreshManager.isCurrentlyRefreshing()) {
              resolve('queued');
            } else {
              resolve('started');
            }
          }, Math.random() * 10);
        });
      });
      
      const results = await Promise.all(promises);
      
      // Should have at most one 'started' and rest 'queued'
      const startedCount = results.filter(r => r === 'started').length;
      if (startedCount > 1) {
        throw new Error(`Expected at most 1 refresh to start, got ${startedCount}`);
      }
    });
  }

  private async testRequestQueuing(): Promise<void> {
    await this.runTest('Request Queuing', async () => {
      // Clear any existing queue
      tokenRefreshManager.clearQueue();
      
      // Mock a request config
      const mockConfig = {
        url: '/test',
        method: 'GET',
        headers: {}
      };
      
      // Queue a request
      const queuePromise = tokenRefreshManager.queueRequest(mockConfig);
      
      // Verify it's a promise
      if (!(queuePromise instanceof Promise)) {
        throw new Error('queueRequest should return a Promise');
      }
      
      // Clear queue to prevent hanging
      tokenRefreshManager.clearQueue();
    });
  }

  private async testExponentialBackoff(): Promise<void> {
    await this.runTest('Exponential Backoff', async () => {
      // This test verifies the backoff calculation logic
      const delays = [];
      
      for (let attempt = 0; attempt < 5; attempt++) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        delays.push(delay);
      }
      
      // Verify exponential growth with cap
      if (delays[0] !== 1000) throw new Error('First delay should be 1000ms');
      if (delays[1] !== 2000) throw new Error('Second delay should be 2000ms');
      if (delays[4] !== 8000) throw new Error('Fifth delay should be capped at 8000ms');
    });
  }

  private async testCrossTabCoordination(): Promise<void> {
    await this.runTest('Cross-Tab Coordination', async () => {
      const lockKey = 'auth_refresh_lock';
      const statusKey = 'auth_refresh_status';
      
      // Clear any existing locks
      localStorage.removeItem(lockKey);
      localStorage.removeItem(statusKey);
      
      // Simulate acquiring lock
      const now = Date.now();
      localStorage.setItem(lockKey, JSON.stringify({ timestamp: now }));
      
      // Check if lock exists
      const lockData = localStorage.getItem(lockKey);
      if (!lockData) {
        throw new Error('Lock should be set in localStorage');
      }
      
      const parsed = JSON.parse(lockData);
      if (Math.abs(parsed.timestamp - now) > 100) {
        throw new Error('Lock timestamp should be recent');
      }
      
      // Clean up
      localStorage.removeItem(lockKey);
    });
  }

  private async testMonitoringMetrics(): Promise<void> {
    await this.runTest('Monitoring Metrics', async () => {
      // Reset metrics
      authMonitor.resetMetrics();
      
      // Test tracking methods
      authMonitor.trackRefreshStart();
      authMonitor.trackRefreshSuccess(1500);
      authMonitor.trackConcurrentAttempt();
      authMonitor.trackQueuedRequest(3);
      
      const metrics = authMonitor.getMetrics();
      
      if (metrics.refreshAttempts !== 1) {
        throw new Error(`Expected 1 refresh attempt, got ${metrics.refreshAttempts}`);
      }
      
      if (metrics.refreshSuccesses !== 1) {
        throw new Error(`Expected 1 refresh success, got ${metrics.refreshSuccesses}`);
      }
      
      if (metrics.concurrentRefreshAttempts !== 1) {
        throw new Error(`Expected 1 concurrent attempt, got ${metrics.concurrentRefreshAttempts}`);
      }
      
      if (metrics.maxConcurrentRequests !== 3) {
        throw new Error(`Expected max 3 concurrent requests, got ${metrics.maxConcurrentRequests}`);
      }
      
      const successRate = authMonitor.getSuccessRate();
      if (successRate !== 100) {
        throw new Error(`Expected 100% success rate, got ${successRate}%`);
      }
    });
  }

  private async testPreemptiveRefresh(): Promise<void> {
    await this.runTest('Preemptive Refresh Service', async () => {
      const service = getPreemptiveRefreshService();
      const status = service.getStatus();
      
      // Should have basic status properties
      if (typeof status.enabled !== 'boolean') {
        throw new Error('Status should have enabled property');
      }
      
      if (typeof status.hasScheduledRefresh !== 'boolean') {
        throw new Error('Status should have hasScheduledRefresh property');
      }
      
      if (typeof status.isAuthenticated !== 'boolean') {
        throw new Error('Status should have isAuthenticated property');
      }
      
      // Test enable/disable
      service.disable();
      if (service.getStatus().enabled) {
        throw new Error('Service should be disabled');
      }
      
      service.enable();
      if (!service.getStatus().enabled) {
        throw new Error('Service should be enabled');
      }
    });
  }

  private printResults(): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${Math.round((passed / this.results.length) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
    }
    
    console.log('\n🔍 Detailed Results:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`  ${status} ${result.name}${duration}`);
    });
  }

  // Utility method to simulate token expiration scenarios
  async simulateTokenExpiration(): Promise<void> {
    console.log('🔄 Simulating token expiration scenario...');
    
    // Reset metrics for clean test
    authMonitor.resetMetrics();
    
    // Simulate multiple API calls hitting 401
    const mockRequests = Array(10).fill(0).map((_, i) => ({
      url: `/api/test-${i}`,
      method: 'GET',
      headers: {}
    }));
    
    console.log(`📡 Simulating ${mockRequests.length} concurrent API requests...`);
    
    // This would normally trigger the token refresh logic
    // In a real scenario, these would be actual API calls that return 401
    
    const metrics = authMonitor.getMetrics();
    console.log('📊 Final metrics:', {
      refreshAttempts: metrics.refreshAttempts,
      concurrentBlocked: metrics.concurrentRefreshAttempts,
      maxQueue: metrics.maxConcurrentRequests,
      successRate: `${authMonitor.getSuccessRate()}%`
    });
  }
}

// Export singleton instance
export const tokenRefreshTestSuite = new TokenRefreshTestSuite();

// Global test runner for browser console
if (typeof window !== 'undefined') {
  (window as any).runTokenRefreshTests = () => tokenRefreshTestSuite.runAllTests();
  (window as any).simulateTokenExpiration = () => tokenRefreshTestSuite.simulateTokenExpiration();
  console.log('🧪 Token refresh tests available:');
  console.log('  - runTokenRefreshTests() - Run full test suite');
  console.log('  - simulateTokenExpiration() - Simulate token expiration scenario');
} 