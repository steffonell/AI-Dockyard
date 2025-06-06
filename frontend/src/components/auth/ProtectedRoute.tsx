import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types';
import { Box, Typography, Alert } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, user } = useAuthStore();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If no user data available, show loading or redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access control
  if (requiredRole) {
    const roleHierarchy: Record<UserRole, number> = {
      developer: 1,
      lead: 2,
      admin: 3,
    };

    const userRoleLevel = roleHierarchy[user.role];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
          p={3}
        >
          <Alert severity="error" sx={{ maxWidth: 500 }}>
            <Typography variant="h6" gutterBottom>
              Access Denied
            </Typography>
            <Typography variant="body2">
              You don't have permission to access this page. 
              Required role: {requiredRole}, your role: {user.role}
            </Typography>
          </Alert>
        </Box>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute; 