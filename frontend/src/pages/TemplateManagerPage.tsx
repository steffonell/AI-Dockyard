import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const TemplateManagerPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Template Manager
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="body1">
            Template management functionality will be implemented here.
            This will include CRUD operations for prompt templates with markdown editor.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TemplateManagerPage; 