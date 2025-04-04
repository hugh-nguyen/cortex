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

const AppDashboard: React.FC = () => {
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
          {apps.map((app) => (
            <Card 
              key={app.App} 
              variant="outlined" 
              sx={{ 
                mb: 2, 
                borderLeft: `4px solid ${purple[200]}`,
                borderRadius: 1,
                boxShadow: 1,
                '&:hover': {
                  boxShadow: 3,
                  borderLeft: `4px solid ${purple[400]}`,
                },
                transition: 'all 0.2s'
              }}
            >
              <CardActionArea onClick={() => handleAppClick(app)}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={2.4}>
                      <Typography color={purple[800]} fontWeight="bold" component="span">
                        App:
                      </Typography>
                      <Typography color="text.primary" component="span" sx={{ ml: 1 }}>
                        {app.App}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={2.4}>
                      <Typography color={purple[800]} fontWeight="bold" component="span">
                        Service Count:
                      </Typography>
                      <Typography color="text.primary" component="span" sx={{ ml: 1 }}>
                        {app['Service Count']}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={2.4}>
                      <Typography color={purple[800]} fontWeight="bold" component="span">
                        Versions:
                      </Typography>
                      <Typography color="text.primary" component="span" sx={{ ml: 1 }}>
                        {app.Versions}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={2.4}>
                      <Typography color={purple[800]} fontWeight="bold" component="span">
                        Last Updated:
                      </Typography>
                      <Tooltip title={app['Last Updated']} arrow placement="top">
                        <Typography color="text.primary" component="span" sx={{ ml: 1 }}>
                          {/* Convert timestamp to relative time */}
                          {getRelativeTimeString(app['Last Updated'])}
                        </Typography>
                      </Tooltip>
                    </Grid>
                    
                  </Grid>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default AppDashboard;