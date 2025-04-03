'use client';

import React, { useEffect, useState } from 'react';
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
import { useRouter } from 'next/navigation';
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
  const { 
    apps, 
    appsLoading, 
    selectedTeam 
  } = useGlobal();
  const [appData, setAppData] = useState<AppData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAppData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://127.0.0.1:8000/get_apps?team_id=1');
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        const sortedApps = [...data.apps].sort((a, b) => 
          a.App.localeCompare(b.App)
        );
        
        setAppData(sortedApps);
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
    router.push(`/appdetail/${appName}`);
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
                      <Tooltip title={app['Last Updated']} arrow placement="top">
                        <Typography color="text.primary" component="span" sx={{ ml: 1 }}>
                          {/* Convert timestamp to relative time */}
                          {getRelativeTimeString(app['Last Updated'])}
                        </Typography>
                      </Tooltip>
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
  );
};

export default AppDashboard;