import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { lightTheme } from './theme';
import { useAuthStore } from './store/authStore';

// Pages (we'll create these)
import LoginPage from './pages/LoginPage';
import TeamworkIssuesPage from './pages/TeamworkIssuesPage';
import PromptWizardPage from './pages/PromptWizardPage';
import TemplateManagerPage from './pages/TemplateManagerPage';
import IssueToPromptPage from './pages/IssueToPromptPage';
import DashboardPage from './pages/DashboardPage';

// Components
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.response?.status === 401) return false;
        
        // Handle rate limiting - wait longer before retrying
        if (error?.response?.status === 429) {
          return failureCount < 2; // Only retry twice for rate limits
        }
        
        // Standard retry logic for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex, error: any) => {
        // For rate limiting, use a longer delay
        if (error?.response?.status === 429) {
          const retryAfter = error?.response?.data?.error?.retryAfter;
          return retryAfter ? retryAfter * 1000 : Math.min(1000 * 2 ** attemptIndex, 30000);
        }
        
        // Standard exponential backoff for other errors
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
    },
  },
});

function App() {
  const { isAuthenticated, isInitialized, isLoading, initialize } = useAuthStore();

  // Initialize auth on app startup
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show loading spinner while initializing
  if (!isInitialized || isLoading) {
    return (
      <ThemeProvider theme={lightTheme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={lightTheme}>
          <CssBaseline />
          <Router>
            <Routes>
              {/* Public routes */}
              <Route 
                path="/login" 
                element={
                  isAuthenticated ? 
                    <Navigate to="/issues" replace /> : 
                    <LoginPage />
                } 
              />
              
              {/* Protected routes */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/issues" replace />} />
                <Route path="issues" element={<TeamworkIssuesPage />} />
                <Route path="prompts/new" element={<PromptWizardPage />} />
                <Route path="issue-to-prompt" element={<IssueToPromptPage />} />
                <Route 
                  path="templates" 
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <TemplateManagerPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="dashboard" 
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <DashboardPage />
                    </ProtectedRoute>
                  } 
                />
              </Route>
              
              {/* Catch all - redirect to login if not authenticated */}
              <Route 
                path="*" 
                element={
                  isAuthenticated ? 
                    <Navigate to="/issues" replace /> : 
                    <Navigate to="/login" replace />
                } 
              />
            </Routes>
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App; 