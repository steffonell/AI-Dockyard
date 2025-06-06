import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { lightTheme } from './theme';
import { useAuthStore } from './store/authStore';

// Pages (we'll create these)
import LoginPage from './pages/LoginPage';
import IssueListPage from './pages/IssueListPage';
import PromptWizardPage from './pages/PromptWizardPage';
import TemplateManagerPage from './pages/TemplateManagerPage';
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
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
    },
  },
});

function App() {
  const { isAuthenticated, user, refreshToken: refreshTokenValue, refreshTokens } = useAuthStore();

  // Auth initialization logic directly in App component
  useEffect(() => {
    // If we have a user and refresh token but no access token, try to refresh
    if (user && refreshTokenValue && !useAuthStore.getState().accessToken) {
      refreshTokens().catch(() => {
        // If refresh fails, user will be logged out automatically
        console.log('Failed to refresh token on app init');
      });
    }
  }, [user, refreshTokenValue, refreshTokens]);

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
                <Route path="issues" element={<IssueListPage />} />
                <Route path="prompts/new" element={<PromptWizardPage />} />
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