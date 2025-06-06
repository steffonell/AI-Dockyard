import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const IssueListPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Issues
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="body1">
            Issue list functionality will be implemented here.
            This will include filtering, sorting, and selection of issues for prompt generation.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default IssueListPage; 