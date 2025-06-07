import React, { useState, useEffect } from 'react';
import { authMonitor, AuthMetrics } from '../../services/authMonitor';
import { tokenRefreshManager } from '../../services/tokenRefreshManager';
import { getPreemptiveRefreshService } from '../../services/preemptiveRefresh';

interface AuthDebugMonitorProps {
  isVisible?: boolean;
}

export const AuthDebugMonitor: React.FC<AuthDebugMonitorProps> = ({ isVisible = false }) => {
  const [metrics, setMetrics] = useState<AuthMetrics>(authMonitor.getMetrics());
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setMetrics(authMonitor.getMetrics());
      setRefreshing(tokenRefreshManager.isCurrentlyRefreshing());
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible || !import.meta.env.DEV) {
    return null;
  }

  const handleGenerateReport = () => {
    const report = authMonitor.generateReport();
    console.log(report);
    
    // Also show in modal or download as file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetMetrics = () => {
    if (confirm('Are you sure you want to reset all authentication metrics?')) {
      authMonitor.resetMetrics();
      setMetrics(authMonitor.getMetrics());
    }
  };

  const successRate = authMonitor.getSuccessRate();
  const recentEvents = authMonitor.getRecentEvents(3);

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        minWidth: '280px',
        maxWidth: '400px',
        border: '1px solid #333',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <strong>🔐 Auth Monitor</strong>
        <span style={{ fontSize: '10px' }}>
          {refreshing ? '🔄 Refreshing...' : '✅ Idle'} {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <>
          <div style={{ marginBottom: '8px', padding: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
            <div><strong>Success Rate:</strong> <span style={{ color: successRate >= 90 ? '#4ade80' : successRate >= 70 ? '#fbbf24' : '#ef4444' }}>{successRate}%</span></div>
            <div><strong>Total Attempts:</strong> {metrics.refreshAttempts}</div>
            <div><strong>Avg Duration:</strong> {Math.round(metrics.averageRefreshDuration)}ms</div>
            <div><strong>Max Queue:</strong> {metrics.maxConcurrentRequests}</div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <div><strong>Successes:</strong> {metrics.refreshSuccesses}</div>
            <div><strong>Failures:</strong> {metrics.refreshFailures}</div>
            <div><strong>Concurrent Blocked:</strong> {metrics.concurrentRefreshAttempts}</div>
            <div><strong>Logouts:</strong> {metrics.logoutEvents}</div>
          </div>

          {recentEvents.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Recent Events:</strong>
              {recentEvents.map((event, idx) => (
                <div key={idx} style={{ fontSize: '10px', marginLeft: '8px', color: '#ccc' }}>
                  {new Date(event.timestamp).toLocaleTimeString()} - {event.type}
                  {event.duration && ` (${event.duration}ms)`}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerateReport}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              📊 Export Report
            </button>
            <button
              onClick={handleResetMetrics}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              🗑️ Reset
            </button>
            <button
              onClick={() => {
                console.log('Current Auth Metrics:', metrics);
                console.log('Recent Events:', authMonitor.getRecentEvents(10));
              }}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              🔍 Log Details
            </button>
          </div>

          <div style={{ marginTop: '8px', fontSize: '10px', color: '#888', textAlign: 'center' }}>
            Dev Mode Only • Refresh to update
          </div>
        </>
      )}
    </div>
  );
};

export default AuthDebugMonitor; 