import React, { useEffect, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { WifiOff } from '@mui/icons-material';

const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <Alert 
      severity="warning" 
      data-testid="network-status"
      icon={<WifiOff />}
      sx={{ width: '100%', mb: 2 }}
    >
      <Box data-testid="offline-message">
        <Typography variant="body2">
          오프라인 상태입니다. 인터넷 연결을 확인해주세요.
        </Typography>
      </Box>
    </Alert>
  );
};

export default NetworkStatus;