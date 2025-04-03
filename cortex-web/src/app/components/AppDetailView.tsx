'use client';

import React, { useEffect, useState } from 'react';
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

// Dynamically import with no SSR
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
  isRoutedPage?: boolean;
}

const AppDetailView: React.FC<AppDetailViewProps> = ({ 
  appName, 
  onBack, 
  initialVersion = null,
  isRoutedPage = false
}) => {
  const { selectedTeam } = useGlobal();
  const router = useRouter();
  const [appVersions, setAppVersions] = useState<AppVersions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<number | null>(initialVersion);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  
  // Add a graphKey state to force re-render when switching versions
  const [graphKey, setGraphKey] = useState(0);
  
  useEffect(() => {
    const fetchAppVersions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:8000/get_app_versions?app=${appName}`);
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        setAppVersions(data.app_versions);
        
        // If no initial version is provided or it's invalid, set to highest version
        if (activeVersion === null || !data.app_versions[activeVersion]) {
          const highestVersion = Math.max(...Object.keys(data.app_versions).map(Number));
          setActiveVersion(highestVersion);
          
          // Update URL if using routing
          if (isRoutedPage) {
            router.replace(`/appdetail/${appName}/${highestVersion}`);
          }
          
          // Set the graph data for the active version
          setGraphData(data.app_versions[highestVersion].graph);
        } else {
          // Set graph data for specified initial version
          setGraphData(data.app_versions[activeVersion].graph);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching app versions:', err);
        setError('Failed to load app versions. Please check the console for details.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppVersions();
  }, [appName, router, activeVersion, initialVersion, isRoutedPage]);

  const handleVersionClick = (version: number) => {
    if (activeVersion === version) return;
    
    setActiveVersion(version);
    
    if (appVersions && appVersions[version]) {
      setGraphData(appVersions[version].graph);
      
      // Update key to force re-render of the graph
      setGraphKey(prevKey => prevKey + 1);
      
      // Update URL if using routing
      if (isRoutedPage) {
        router.replace(`/appdetail/${appName}/${version}`);
      }
    }
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else if (isRoutedPage) {
      router.push('/');
    }
  };
  
  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Side panel with versions */}
      <Box 
        component={Paper} 
        sx={{ 
          width: 215, 
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
            {appName}
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
                .sort((a, b) => b - a) // Sort versions in descending order
                .map((version) => (
                  <ListItem key={version} disablePadding>
                    <ListItemButton 
                      selected={activeVersion === version}
                      onClick={() => handleVersionClick(version)}
                      sx={{ 
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
                            fontWeight: activeVersion === version ? 'bold' : 'normal'
                          }
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
          </List>
        )}
      </Box>
      
      {/* Main content with dependency graph */}
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