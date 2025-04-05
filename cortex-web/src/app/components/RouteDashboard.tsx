'use client';

import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  CircularProgress, 
  Alert, 
  Container,
  CardActionArea,
  Typography,
  Tooltip
} from '@mui/material';
import { purple } from '@mui/material/colors';
import { useRouter, usePathname } from 'next/navigation';
import { getRelativeTimeString } from '@/app/utils/relativeTime';
import { useGlobal } from '@/app/GlobalContext';

interface AppData {
  App: string;
  'Service Count': number;
  Versions: number;
  'Last Updated': string;
  Owner: string;
}

const RouteDashboard: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    apps, 
    loading, 
    error,
    setSelectedApp
  } = useGlobal();

  const handleAppClick = (app: AppData) => {
    setSelectedApp(app);
    // router.push(`${pathname}/${app.App}/version/${app.Versions}`);
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {!loading &&  (
        <Box sx={{ mt: 2 }}>
          
        </Box>
      )}
    </Container>
  );
};

export default RouteDashboard;