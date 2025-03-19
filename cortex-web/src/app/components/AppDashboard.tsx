'use client';

import React, { useEffect, useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  CircularProgress, 
  Alert, 
  Container,
  Avatar,
  CardActionArea
} from '@mui/material';
import { purple } from '@mui/material/colors';
import dynamic from 'next/dynamic';

const AppDetailView = dynamic(
  () => import('@/app/components/AppDetailView'),
  { ssr: false }
);

interface AppData {
  App: string;
  'Service Count': number;
  Versions: number;
  'Last Updated': string;
  Owner: string;
}

const AppDashboard: React.FC = () => {
  const [appData, setAppData] = useState<AppData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAppData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://127.0.0.1:8000/test_apps');
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        setAppData(data.apps);
        setError(null);
      } catch (err) {
        console.error('Error fetching app data:', err);
        setError('Failed to load app data. Please check the console for details.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppData();
  }, []);

  const handleAppClick = (appName: string) => {
    setSelectedApp(appName);
  };

  const handleBackToList = () => {
    setSelectedApp(null);
  };
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ bgcolor: purple[800] }}>
        <Toolbar>
          <Avatar sx={{ bgcolor: 'white', color: purple[800], marginRight: 2 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="9" r="5" />
              <circle cx="15" cy="15" r="5" />
              <path d="M8 15L16 7" />
            </svg>
          </Avatar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Cortex
          </Typography>
        </Toolbar>
      </AppBar>
      
      {selectedApp ? (
        <AppDetailView appName={selectedApp} onBack={handleBackToList} />
      ) : (
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
          
          {!loading && !error && (
            <Box sx={{ mt: 2 }}>
              {appData.map((app) => (
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
                  <CardActionArea onClick={() => handleAppClick(app.App)}>
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
                          <Typography color="text.primary" component="span" sx={{ ml: 1 }}>
                            {app['Last Updated']}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12} sm={2.4}>
                          <Typography color={purple[800]} fontWeight="bold" component="span">
                            Owner:
                          </Typography>
                          <Typography color="text.primary" component="span" sx={{ ml: 1 }}>
                            {app.Owner}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </Container>
      )}
    </Box>
  );
};

export default AppDashboard;