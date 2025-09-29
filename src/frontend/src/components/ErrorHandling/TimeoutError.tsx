import React from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';

interface TimeoutErrorProps {
  message?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

const TimeoutError: React.FC<TimeoutErrorProps> = ({ 
  message = '요청 시간이 초과되었습니다.',
  onRetry,
  onCancel
}) => {
  return (
    <Alert 
      severity="error" 
      data-testid="timeout-error"
      sx={{ width: '100%' }}
    >
      <Typography variant="body1" gutterBottom>
        {message}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        {onRetry && (
          <Button 
            variant="contained" 
            size="small" 
            onClick={onRetry}
            data-testid="retry-button"
          >
            다시 시도
          </Button>
        )}
        {onCancel && (
          <Button 
            variant="outlined" 
            size="small" 
            onClick={onCancel}
            data-testid="cancel-button"
          >
            취소
          </Button>
        )}
      </Stack>
    </Alert>
  );
};

export default TimeoutError;