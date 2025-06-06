import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const DashboardPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="body1">
            Dashboard with metrics and analytics will be implemented here.
            This will include usage statistics, performance metrics, and reports.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardPage; 