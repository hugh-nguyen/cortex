'use client';

import React, { useState } from 'react';
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
  Tooltip,
  Chip,
  Avatar,
  Stack,
  LinearProgress,
  Divider,
  IconButton
} from '@mui/material';
import { purple, blue, green, amber, deepOrange, pink } from '@mui/material/colors';
import { useRouter, usePathname } from 'next/navigation';
import { getRelativeTimeString } from '@/app/utils/relativeTime';
import { useGlobal } from '@/app/GlobalContext';
import DevicesIcon from '@mui/icons-material/Devices';
import UpdateIcon from '@mui/icons-material/Update';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LayersIcon from '@mui/icons-material/Layers';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FiberNewIcon from '@mui/icons-material/FiberNew';

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
  
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);

  const handleAppClick = (app: AppData) => {
    setSelectedApp(app);
  };
  
  // Get app color based on its index
  const getAppColor = (index: number) => {
    const colors = [purple, blue, green, deepOrange, pink];
    return colors[index % colors.length];
  };
  
  // Get status based on last updated time
  const getAppStatus = (timeString: string) => {
    if (timeString.includes('min') || timeString.includes('hour')) {
      return {
        label: 'Recently Updated',
        color: green[500],
        hasIcon: true
      };
    }
    
    if (timeString.includes('day') && !timeString.includes('days ago')) {
      return {
        label: 'Updated Today',
        color: blue[500],
        hasIcon: true
      };
    }
    
    return {
      label: 'Active',
      color: amber[700],
      hasIcon: false
    };
  };
  
  // Calculate a vibrant letter for the app avatar
  const getAppLetter = (appName: string) => {
    return appName.charAt(0).toUpperCase();
  };
  
  // Calculate service health as a percentage (simplified example)
  const getServiceHealth = (serviceCount: number, versions: number) => {
    // Example calculation: more services and versions = better health
    const baseScore = Math.min((serviceCount * 20) + (versions * 10), 100);
    return Math.max(baseScore, 60); // Minimum 60% health for visual purposes
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
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
      
      {!loading && (
        <Grid container spacing={3}>
          {apps.map((app, index) => {
            const appColor = getAppColor(index);
            const status = getAppStatus(getRelativeTimeString(app['Last Updated']));
            const serviceHealth = getServiceHealth(app['Service Count'], app.Versions);
            
            return (
              <Grid item xs={12} md={6} key={app.App}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    height: '100%',
                    borderRadius: 2,
                    boxShadow: hoveredApp === app.App ? 8 : 2,
                    borderLeft: `6px solid ${appColor[500]}`,
                    transition: 'all 0.3s ease',
                    transform: hoveredApp === app.App ? 'translateY(-4px)' : 'none',
                    position: 'relative',
                    overflow: 'visible',
                    '&:hover': {
                      borderLeft: `6px solid ${appColor[300]}`,
                    }
                  }}
                  onMouseEnter={() => setHoveredApp(app.App)}
                  onMouseLeave={() => setHoveredApp(null)}
                >
                  <CardActionArea 
                    onClick={() => handleAppClick(app)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ position: 'absolute', top: -20, left: 20 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: appColor[400],
                            width: 50,
                            height: 50,
                            boxShadow: 2,
                            border: '3px solid white'
                          }}
                        >
                          {getAppLetter(app.App)}
                        </Avatar>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: 1.5,
                        mt: 1
                      }}>
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            ml: 7, 
                            color: appColor[700],
                            fontWeight: 'bold'
                          }}
                        >
                          {app.App}
                        </Typography>
                        
                        {status.hasIcon ? (
                          <Chip 
                            label={status.label}
                            size="small"
                            icon={status.label === 'Recently Updated' ? <FiberNewIcon /> : <UpdateIcon />}
                            sx={{ 
                              bgcolor: status.color + '20', 
                              color: status.color,
                              fontWeight: 'medium',
                              borderRadius: 1
                            }}
                          />
                        ) : (
                          <Chip 
                            label={status.label}
                            size="small"
                            sx={{ 
                              bgcolor: status.color + '20', 
                              color: status.color,
                              fontWeight: 'medium',
                              borderRadius: 1
                            }}
                          />
                        )}
                      </Box>
                      
                      <Divider sx={{ my: 1.5 }} />
                      
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <DevicesIcon 
                            sx={{ 
                              color: appColor[400], 
                              mr: 1.5, 
                              fontSize: 20
                            }} 
                          />
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {app['Service Count']} {app['Service Count'] === 1 ? 'Service' : 'Services'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LayersIcon 
                            sx={{ 
                              color: appColor[400], 
                              mr: 1.5, 
                              fontSize: 20 
                            }} 
                          />
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {app.Versions} {app.Versions === 1 ? 'Version' : 'Versions'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTimeIcon 
                            sx={{ 
                              color: appColor[400], 
                              mr: 1.5, 
                              fontSize: 20
                            }} 
                          />
                          <Tooltip title={app['Last Updated']} arrow placement="top">
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              Updated {getRelativeTimeString(app['Last Updated'])}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </Stack>
                      
                      <Box sx={{ mt: 2.5 }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            color: 'text.secondary',
                            mb: 0.5
                          }}
                        >
                          <span>Service Health</span>
                          <span>{serviceHealth}%</span>
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={serviceHealth} 
                          sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            bgcolor: '#f0f0f0',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: serviceHealth > 80 ? green[500] : 
                                       serviceHealth > 60 ? amber[500] : 
                                       deepOrange[400],
                              borderRadius: 3
                            }
                          }}
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                  
                  {hoveredApp === app.App && (
                    <IconButton 
                      size="small"
                      sx={{ 
                        position: 'absolute', 
                        right: 10, 
                        bottom: 10,
                        bgcolor: appColor[50],
                        border: `1px solid ${appColor[200]}`,
                        '&:hover': {
                          bgcolor: appColor[100]
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAppClick(app);
                      }}
                    >
                      <OpenInNewIcon fontSize="small" sx={{ color: appColor[700] }} />
                    </IconButton>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
};

export default AppDashboard;