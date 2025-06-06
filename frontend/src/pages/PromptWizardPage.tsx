import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const PromptWizardPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Generate Prompt
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="body1">
            Prompt generation wizard will be implemented here.
            This will include template selection, variable configuration, and prompt preview.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PromptWizardPage; 