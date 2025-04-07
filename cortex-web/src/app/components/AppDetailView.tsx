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
  Divider,
  Button,
  Snackbar,
} from '@mui/material';
import { purple } from '@mui/material/colors';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/GlobalContext';
import GitHubIcon from '@mui/icons-material/GitHub';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import DeploymentAnimation from '@/app/components/DeploymentAnimation';

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
    graphData, setGraphData, selectedApp,
  } = useGlobal();
  const router = useRouter();
  const [graphKey, setGraphKey] = useState(0);
  const [deploymentLoading, setDeploymentLoading] = useState(false);
  const [deploymentMessage, setDeploymentMessage] = useState("Preparing to deploy new version...");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  
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

  const handleDeployNewVersionClick = async () => {
    if (!selectedApp?.CommandRepoURL) {
      setSnackbarMessage("No repository URL found for this application");
      setSnackbarOpen(true);
      return;
    }

    try {
      setDeploymentLoading(true);
      setDeploymentMessage("Preparing to deploy new version...");
      
      // Start the deployment process
      setTimeout(() => setDeploymentMessage("Cloning repository..."), 1000);
      setTimeout(() => setDeploymentMessage("Creating deployment branch..."), 3000);
      setTimeout(() => setDeploymentMessage("Adding deployment files..."), 5000);
      setTimeout(() => setDeploymentMessage("Pushing changes..."), 7000);
      setTimeout(() => setDeploymentMessage("Creating pull request..."), 9000);
      
      // Call the backend API
      const encodedURL = encodeURIComponent(selectedApp.CommandRepoURL);
      const response = await fetch(`http://localhost:8000/deploy_app_version?command_repo=${encodedURL}`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === "success") {
        setDeploymentMessage("Deployment successful! Redirecting to PR...");
        
        // Wait a moment to show success message before closing animation
        setTimeout(() => {
          setDeploymentLoading(false);
          // Open the PR URL in a new tab
          window.open(data.pr_url, '_blank');
        }, 2000);
      } else {
        throw new Error(data.message || "Deployment failed");
      }
    } catch (error) {
      console.error("Deployment error:", error);
      setDeploymentMessage("Deployment failed!");
      
      // Wait a moment with the error message before closing
      setTimeout(() => {
        setDeploymentLoading(false);
        setSnackbarMessage(`Deployment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        setSnackbarOpen(true);
      }, 2000);
    }
  };

  const handleCommandRepoClick = () => {
    if (selectedApp?.CommandRepoURL) {
      window.open(selectedApp.CommandRepoURL, '_blank');
    } else {
      setSnackbarMessage("No repository URL available");
      setSnackbarOpen(true);
    }
  };
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: 'calc(100vh - 64px)',
      mx: 0,
      p: 0
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        p: 2,
        gap: 2
      }}>
        <Button 
          variant="contained" 
          startIcon={<GitHubIcon />}
          sx={{ 
            bgcolor: '#000', 
            color: '#FFF',
            fontSize: '11px',
            '&:hover': { bgcolor: '#333' },
            borderRadius: 1,
            px: 2
          }}
          onClick={handleCommandRepoClick}
          disabled={!selectedApp?.CommandRepoURL}
        >
          Command Repo
        </Button>
        
        <Button 
          variant="contained" 
          startIcon={<RocketLaunchIcon />}
          sx={{ 
            bgcolor: purple[700], 
            '&:hover': { bgcolor: purple[800] },
            borderRadius: 1,
            px: 2,
            fontSize: '12px',
          }}
          onClick={handleDeployNewVersionClick}
          disabled={deploymentLoading || !selectedApp?.CommandRepoURL}
        >
          Deploy New Version
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <Box 
          component={Paper} 
          sx={{ 
            width: 140, 
            bgcolor: '#FDF4FA', 
            flexShrink: 0,
            borderRight: '1px solid #E0E0E0',
            display: 'flex',
            flexDirection: 'column',
            m: 0,
            borderRadius: 0
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
        
        <Box sx={{ 
          flexGrow: 1, 
          p: 2, 
          overflow: 'auto',
          bgcolor: '#FFFFFF',
          m: 0,
          borderRadius: 0
        }}>
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
      
      {/* Deployment Animation */}
      <DeploymentAnimation 
        open={deploymentLoading} 
        message={deploymentMessage} 
      />
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default AppDetailView;