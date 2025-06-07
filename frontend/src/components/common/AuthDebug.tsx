import React from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { useAuthStore } from '../../store/authStore';

const AuthDebug: React.FC = () => {
  const authStore = useAuthStore();

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      <Typography variant="h6">Auth Debug Info</Typography>
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2">
          <strong>Authenticated:</strong> {authStore.isAuthenticated ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          <strong>Initialized:</strong> {authStore.isInitialized ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          <strong>Loading:</strong> {authStore.isLoading ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          <strong>Has User:</strong> {authStore.user ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          <strong>Has Access Token:</strong> {authStore.accessToken ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          <strong>Has Refresh Token:</strong> {authStore.refreshToken ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          <strong>User ID:</strong> {authStore.user?.id || 'N/A'}
        </Typography>
        <Typography variant="body2">
          <strong>User Role:</strong> {authStore.user?.role || 'N/A'}
        </Typography>
      </Box>
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => authStore.initialize()}
          disabled={authStore.isLoading}
        >
          Re-initialize
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            console.log('Current auth state:', authStore);
          }}
        >
          Log State
        </Button>
      </Box>
    </Alert>
  );
};

export default AuthDebug; 