# Token Refresh System Implementation

## Overview

This implementation solves the token refresh race condition issue where multiple concurrent API requests trigger simultaneous token refresh attempts, causing users to be logged out unexpectedly.

## Architecture

### Core Components

1. **TokenRefreshManager** (`tokenRefreshManager.ts`)
   - Singleton pattern ensures only one refresh operation at a time
   - Request queuing for concurrent requests during refresh
   - Cross-tab coordination using localStorage
   - Exponential backoff for failed attempts
   - Comprehensive error handling

2. **AuthMonitor** (`authMonitor.ts`)
   - Real-time metrics tracking
   - Performance monitoring
   - Event logging
   - Success rate calculation
   - Persistent storage of metrics

3. **PreemptiveRefreshService** (`preemptiveRefresh.ts`)
   - Proactive token refresh before expiration
   - JWT token parsing and expiration detection
   - Automatic scheduling based on token lifetime
   - Cross-tab synchronization

4. **AuthDebugMonitor** (`../components/common/AuthDebugMonitor.tsx`)
   - Development-only monitoring UI
   - Real-time metrics display
   - Export functionality for debugging

## Key Features

### 🔒 Race Condition Prevention
- **Singleton Pattern**: Only one refresh operation can run at a time
- **Promise Caching**: Concurrent requests share the same refresh promise
- **Cross-Tab Coordination**: Uses localStorage locks to prevent multiple tabs from refreshing simultaneously

### 📊 Request Queuing
- Failed requests are queued during token refresh
- Automatic retry with new token after successful refresh
- Queue management with proper error handling

### ⚡ Exponential Backoff
- Progressive delays between retry attempts (1s, 2s, 4s, 8s max)
- Maximum retry limit (3 attempts by default)
- Cooldown period between refresh attempts

### 🔄 Preemptive Refresh
- Automatically refreshes tokens at 80% of their lifetime
- Prevents token expiration during user activity
- Handles system sleep/wake scenarios

### 📈 Comprehensive Monitoring
- Success rate tracking
- Performance metrics (duration, queue size)
- Event logging with timestamps
- Persistent metrics storage

## Usage

### Basic Integration

The system is automatically integrated into the existing auth flow:

```typescript
// Already integrated in authStore.ts and apiClient.ts
import { tokenRefreshManager } from './services/tokenRefreshManager';
import { authMonitor } from './services/authMonitor';
import { preemptiveRefreshService } from './services/preemptiveRefresh';
```

### Development Monitoring

Add the debug monitor to your app (development only):

```tsx
import { AuthDebugMonitor } from './components/common/AuthDebugMonitor';

function App() {
  return (
    <div>
      {/* Your app content */}
      <AuthDebugMonitor isVisible={true} />
    </div>
  );
}
```

### Testing

Run comprehensive tests in browser console:

```javascript
// Run full test suite
runTokenRefreshTests();

// Simulate token expiration scenario
simulateTokenExpiration();
```

## Configuration

### TokenRefreshManager Settings

```typescript
// In tokenRefreshManager.ts
private maxRefreshAttempts: number = 3;
private refreshCooldown: number = 1000; // 1 second
private readonly REFRESH_LOCK_TTL = 30000; // 30 seconds
```

### PreemptiveRefresh Settings

```typescript
// In preemptiveRefresh.ts
private readonly REFRESH_THRESHOLD = 0.8; // Refresh at 80% of token life
private readonly MIN_REFRESH_INTERVAL = 30000; // Minimum 30 seconds
private readonly DEFAULT_TOKEN_DURATION = 15 * 60 * 1000; // 15 minutes
```

## Monitoring & Debugging

### Real-time Metrics

```typescript
import { authMonitor } from './services/authMonitor';

// Get current metrics
const metrics = authMonitor.getMetrics();
console.log('Success Rate:', authMonitor.getSuccessRate());

// Generate detailed report
const report = authMonitor.generateReport();
console.log(report);
```

### Event Tracking

The system automatically tracks:
- Refresh attempts and outcomes
- Concurrent request blocking
- Request queuing
- User logout events
- Performance metrics

### Debug Logging

All components provide detailed console logging:
- `[TokenRefreshManager]` - Core refresh operations
- `[AuthMonitor]` - Metrics and events
- `[PreemptiveRefresh]` - Scheduled refresh operations

## Error Handling

### Automatic Recovery
- Failed refreshes trigger exponential backoff
- Maximum retry limits prevent infinite loops
- Automatic logout after max attempts exceeded

### Cross-Tab Safety
- localStorage locks prevent race conditions across tabs
- Timeout mechanisms prevent deadlocks
- Status synchronization across browser tabs

### Network Resilience
- Handles network connectivity issues
- Graceful degradation during service outages
- Request queuing maintains user experience

## Performance Optimizations

### Efficient Request Handling
- Single refresh operation serves multiple concurrent requests
- Minimal memory footprint with bounded queues
- Lazy initialization of services

### Smart Scheduling
- Preemptive refresh reduces reactive refresh needs
- Intelligent timing based on actual token expiration
- System sleep/wake detection and handling

### Monitoring Overhead
- Lightweight metrics collection
- Bounded event history (100 events max)
- Optional development-only features

## Security Considerations

### Token Storage
- Refresh tokens persist in localStorage (encrypted storage recommended)
- Access tokens are memory-only for security
- Automatic cleanup on logout

### Cross-Tab Communication
- Uses localStorage for coordination (not sensitive data)
- Timeout mechanisms prevent lock hijacking
- Status-only communication (no token data)

### Error Information
- Sanitized error messages in production
- Detailed logging available in development
- No sensitive data in error reports

## Migration Guide

### From Existing Implementation

1. **Replace direct refresh calls**:
   ```typescript
   // Old
   await authStore.refreshTokens();
   
   // New (automatically handled by interceptors)
   // No changes needed in application code
   ```

2. **Add monitoring (optional)**:
   ```tsx
   // Add to your main app component
   <AuthDebugMonitor isVisible={import.meta.env.DEV} />
   ```

3. **Enable preemptive refresh**:
   ```typescript
   // Already integrated in authStore.ts
   // Automatically enabled on login
   ```

### Backward Compatibility

- Existing auth flows continue to work unchanged
- Progressive enhancement approach
- No breaking changes to public APIs

## Troubleshooting

### Common Issues

1. **Multiple refresh attempts**
   - Check browser console for `[AuthMonitor]` logs
   - Verify singleton pattern is working
   - Check cross-tab coordination

2. **Requests failing after refresh**
   - Verify queue processing logic
   - Check token update in auth store
   - Validate API client interceptor integration

3. **Preemptive refresh not working**
   - Check JWT token format and expiration
   - Verify service is enabled after login
   - Check browser focus/sleep handling

### Debug Commands

```javascript
// Check current status
console.log('Refresh Manager:', tokenRefreshManager.isCurrentlyRefreshing());
console.log('Auth Metrics:', authMonitor.getMetrics());
console.log('Preemptive Status:', preemptiveRefreshService.getStatus());

// Reset for clean testing
authMonitor.resetMetrics();
tokenRefreshManager.clearQueue();

// Force operations
preemptiveRefreshService.forceRefresh();
```

## Future Enhancements

### Planned Features
- Circuit breaker pattern for auth service calls
- Advanced retry strategies (jitter, custom backoff)
- WebSocket-based token refresh notifications
- Enhanced security with token rotation

### Monitoring Improvements
- Integration with application monitoring services
- Custom alerting for high failure rates
- Performance analytics dashboard
- A/B testing framework for refresh strategies

## Contributing

When modifying the token refresh system:

1. Run the test suite: `runTokenRefreshTests()`
2. Test cross-tab scenarios manually
3. Verify monitoring metrics are accurate
4. Update documentation for any API changes
5. Test with various network conditions

## Support

For issues or questions:
1. Check browser console logs for detailed error information
2. Use the debug monitor for real-time insights
3. Run the test suite to validate functionality
4. Generate and review the auth monitor report 