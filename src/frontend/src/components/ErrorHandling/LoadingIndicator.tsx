import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingIndicatorProps {
  message?: string;
  testId?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = '로딩 중...',
  testId = 'loading-indicator'
}) => {
  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      gap={2}
      data-testid={testId}
      sx={{ py: 4 }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingIndicator;