'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Divider
} from '@mui/material';
import { purple } from '@mui/material/colors';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/GlobalContext';

const DependencyGraph = dynamic(
  () => import('@/app/components/DependencyGraph'),
  { ssr: false }
);

interface GraphData {
  services: any[];
  dependencies: any[];
  apps: any[];
}

interface VersionData {
  app: string;
  version: number;
  graph: GraphData;
}

interface AppVersions {
  [key: number]: VersionData;
}

interface AppDetailViewProps {
  appName: string;
  onBack?: () => void;
  initialVersion?: number | null;
}

const AppDetailView: React.FC<AppDetailViewProps> = ({ 
  appName, 
}) => {
  const { 
    selectedTeam,
    loading, error, appVersions, 
    selectedAppVersion, setSelectedAppVersion, 
    graphData, setGraphData 
  } = useGlobal();
  const router = useRouter();
  const [graphKey, setGraphKey] = useState(0);
  
  const defaultModule = "team"
  const defaultSubModule = "applications"


  const handleVersionClick = (version: number) => {
    if (selectedAppVersion === version) return;
    
    setSelectedAppVersion(version);
    
    if (appVersions && appVersions[version]) {
      setGraphData(appVersions[version].graph);
      
      setGraphKey(prevKey => prevKey + 1);
      
      router.replace(`/${defaultModule}/${selectedTeam?.team_id}/${defaultSubModule}/app1/version/${version}`);
    }
  };

  const handleBackClick = () => {
    // if (onBack) {
    //   onBack();
    // } else if (isRoutedPage) {
    //   router.push('/');
    // }
  };
  
  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <Box 
        component={Paper} 
        sx={{ 
          width: 140, 
          bgcolor: '#FDF4FA', 
          flexShrink: 0,
          borderRight: '1px solid #E0E0E0',
          display: 'flex',
          flexDirection: 'column'
        }}
        elevation={0}
      >
        <Box sx={{ p: 2 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: purple[800], 
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
            onClick={handleBackClick}
          >
            Versions
          </Typography>
        </Box>
        <Divider />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          </Box>
        ) : (
          <List sx={{ pt: 0 }}>
            {appVersions && 
              Object.keys(appVersions)
                .map(Number)
                .sort((a, b) => b - a)
                .map((version) => (
                  <ListItem key={version} disablePadding>
                    <ListItemButton 
                      selected={selectedAppVersion === version}
                      onClick={() => handleVersionClick(version)}
                      sx={{ 
                        padding: '4px',
                        pl: 2,
                        '&.Mui-selected': {
                          bgcolor: purple[50],
                          '&:hover': {
                            bgcolor: purple[100],
                          }
                        },
                        '&:hover': {
                          bgcolor: purple[50],
                        }
                      }}
                    >
                      <ListItemText 
                        primary={`Version ${version}`}
                        primaryTypographyProps={{
                          sx: { 
                            color: purple[900],
                            fontWeight: selectedAppVersion === version ? 'bold' : 'normal'
                          }
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
          </List>
        )}
      </Box>
      
      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">
            {error}
          </Alert>
        ) : graphData ? (
          <DependencyGraph key={graphKey} customGraphData={graphData} />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography>No graph data available</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AppDetailView;