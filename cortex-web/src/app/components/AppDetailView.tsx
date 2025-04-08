import React, { useState, useEffect } from 'react';
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
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import { purple, grey } from '@mui/material/colors';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/GlobalContext';
import GitHubIcon from '@mui/icons-material/GitHub';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeploymentAnimation from '@/app/components/DeploymentAnimation';
import WorkflowRunCard from '@/app/components/WorkflowRunCard';
import BuildsTab from '@/app/components/BuildsTab';

const DependencyGraph = dynamic(
  () => import('@/app/components/DependencyGraph'),
  { ssr: false }
);

interface GraphData {
  services: any[];
  dependencies: any[];
  apps: any[];
}

interface Run {
  id: number;
  name: string;
  run_number: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  created_ago: string;
  html_url: string;
  actor: string;
  head_branch: string;
  duration?: number | null;
  run_attempt: number;
}

interface VersionData {
  app: string;
  version: number;
  graph: GraphData;
  run: Run;
}

interface AppVersions {
  [key: number]: VersionData;
}

interface WorkflowRun {
  id: number;
  name: string;
  run_number: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  created_ago: string;
  html_url: string;
  actor: string;
  head_branch: string;
  duration?: number | null;
  run_attempt: number;
}

interface AppDetailViewProps {
  appName: string;
  onBack?: () => void;
  initialVersion?: number | null;
}

type TabValue = 'versions' | 'deployments' | 'builds';

const AppDetailView: React.FC<AppDetailViewProps> = ({ 
  appName, 
}) => {
  // State definitions and hooks...
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
  const [deploymentStartTime, setDeploymentStartTime] = useState<number | null>(null);
  const [workflowUrl, setWorkflowUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('versions');
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);
  
  const defaultModule = "team"
  const defaultSubModule = "applications"
  
  // Polling interval in milliseconds (5 seconds)
  const POLLING_INTERVAL = 5000;

  // Handler functions...
  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
    // Load workflow runs when switching to deployments tab
    if (newValue === 'deployments' && selectedApp) {
      fetchWorkflowRuns();
    }
  };

  const handleVersionClick = (version: number) => {
    if (selectedAppVersion?.version === version) return;
    
    // const appVersion = appVersions ? appVersions[version] : null;
    // setSelectedAppVersion(appVersion);
    
    // if (appVersions && appVersions[version]) {
    //   setGraphData(appVersions[version].graph);
      
    //   setGraphKey(prevKey => prevKey + 1);
      
    //   router.replace(`/${defaultModule}/${selectedTeam?.team_id}/${defaultSubModule}/app1/version/${version}`);
    // }

    const url = `/${defaultModule}/${selectedTeam?.team_id}/${defaultSubModule}/${selectedApp?.App}/version/${version}`
    window.history.replaceState(null, '', url);

  };

  const handleBackClick = () => {
    // if (onBack) {
    //   onBack();
    // } else if (isRoutedPage) {
    //   router.push('/');
    // }
  };

  // Effect to ensure minimum animation time
  useEffect(() => {
    if (deploymentStartTime && workflowUrl) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - deploymentStartTime;
      const minDuration = 4000; // 4 seconds minimum duration
      
      if (elapsedTime >= minDuration) {
        // If minimum duration has passed, close animation immediately
        finishDeployment();
      } else {
        // Otherwise, wait for the remaining time
        const remainingTime = minDuration - elapsedTime;
        const timer = setTimeout(() => {
          finishDeployment();
        }, remainingTime);
        
        return () => clearTimeout(timer);
      }
    }
  }, [deploymentStartTime, workflowUrl]);
  
  const finishDeployment = () => {
    setDeploymentMessage("Deployment successful! Opening GitHub Actions...");
    setTimeout(() => {
      setDeploymentLoading(false);
      if (workflowUrl) {
        window.open(workflowUrl, '_blank');
        // Switch to deployments tab and fetch latest runs
        setActiveTab('deployments');
        fetchWorkflowRuns();
      }
      setWorkflowUrl(null);
      setDeploymentStartTime(null);
    }, 1000);
  };

  // Fetch workflow runs from the backend
  const fetchWorkflowRuns = async () => {
    if (!selectedApp?.CommandRepoURL) {
      setWorkflowsError("No repository URL found for this application");
      return;
    }

    setWorkflowsLoading(true);
    setWorkflowsError(null);

    try {
      const encodedURL = encodeURIComponent(selectedApp.CommandRepoURL);
      // Add the workflow_name parameter to filter for the "test" workflow
      const response = await fetch(`http://localhost:8000/get_workflow_runs?app_name=${selectedApp.App}&repo_url=${encodedURL}&mode=deployments`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === "success") {
        setWorkflowRuns(data.workflow_runs);
        
        // If we have an empty list but got a message, show it as an info message
        if (data.workflow_runs.length === 0 && data.message) {
          setWorkflowsError(data.message);
        }
      } else {
        throw new Error(data.message || "Failed to fetch workflow runs");
      }
    } catch (error) {
      console.error("Error fetching workflow runs:", error);
      setWorkflowsError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setWorkflowsLoading(false);
    }
  };

  // Set up polling for workflow runs if any are in progress
  useEffect(() => {
    // Check if any runs are in progress
    const hasInProgressRuns = workflowRuns.some(
      run => run.status === 'in_progress' || run.status === 'queued' || run.status === 'waiting'
    );
    
    // Only poll if deployments tab is active and there are in-progress runs
    if (activeTab === 'deployments' && hasInProgressRuns) {
      const intervalId = setInterval(() => {
        fetchWorkflowRuns();
      }, POLLING_INTERVAL);
      
      return () => clearInterval(intervalId);
    }
  }, [workflowRuns, activeTab]);

  // Fetch workflow runs when the component mounts or when app changes
  useEffect(() => {
    if (activeTab === 'deployments' && selectedApp) {
      fetchWorkflowRuns();
    }
  }, [activeTab, selectedApp]);

  const handleDeployNewVersionClick = async () => {
    if (!selectedApp?.CommandRepoURL) {
      setSnackbarMessage("No repository URL found for this application");
      setSnackbarOpen(true);
      return;
    }

    try {
      // Start the animation
      setDeploymentLoading(true);
      setDeploymentStartTime(Date.now());
      setDeploymentMessage("Preparing to deploy new version...");
      
      // Animation message sequence
      setTimeout(() => {
        if (deploymentLoading) setDeploymentMessage("Connecting to GitHub...");
      }, 1000);
      setTimeout(() => {
        if (deploymentLoading) setDeploymentMessage("Triggering GitHub Action workflow...");
      }, 2000);
      setTimeout(() => {
        if (deploymentLoading) setDeploymentMessage("Scheduling pipeline execution...");
      }, 3000);
      
      // Call the backend API to trigger the GitHub Action
      const encodedURL = encodeURIComponent(selectedApp.CommandRepoURL);
      const response = await fetch(`http://localhost:8000/deploy_app_version?command_repo=${encodedURL}`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === "success") {
        setWorkflowUrl(data.workflows_url);
        // Animation will continue for at least 4 seconds total due to the useEffect
        setTimeout(() => {
          if (deploymentLoading) setDeploymentMessage("GitHub Action started successfully!");
        }, 3500);
      } else {
        throw new Error(data.message || "Failed to trigger GitHub Action");
      }
    } catch (error) {
      console.error("Deployment error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setDeploymentMessage(`Deployment failed: ${errorMessage}`);
      
      // Don't close animation on error - user must click close button
      setSnackbarMessage(`Deployment failed: ${errorMessage}`);
      setSnackbarOpen(true);
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
  
  const handleRefreshWorkflows = () => {
    fetchWorkflowRuns();
  };
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: 'calc(100vh - 64px)',
      mx: 0,
      p: 0
    }}>
      {/* Tab navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              minWidth: 100,
              fontWeight: 'medium',
              color: grey[700],
              '&.Mui-selected': {
                color: purple[700],
                fontWeight: 'bold',
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: purple[700],
              height: 3,
            }
          }}
        >
          <Tab value="versions" label="Versions" />
          <Tab value="deployments" label="Deployments" />
          <Tab value="builds" label="Builds" />
        </Tabs>
      </Box>
      
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Versions Tab */}
        {activeTab === 'versions' && (
          <>
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
                            selected={selectedAppVersion?.version === version}
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
                              },
                              // bgcolor: selectedAppVersion?.version === version ? purple[500]: purple[900]
                            }}
                          >
                            <ListItemText 
                              primary={`Version ${version}`}
                              primaryTypographyProps={{
                                sx: { 
                                  color: purple[900],
                                  fontWeight: selectedAppVersion?.version === version ? 'bold' : 'normal'
                                  // fontWeight: (() => {console.log("inline", selectedAppVersion); return selectedAppVersion?.version === version ? 'bold' : 'normal'})()
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
              {/* {selectedAppVersion &&
                  <WorkflowRunCard key={selectedAppVersion.run.id} run={selectedAppVersion.run} />
              } */}
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
          </>
        )}
        
        {/* Deployments Tab */}
        {activeTab === 'deployments' && (
          <Box sx={{ 
            flexGrow: 1, 
            p: 3, 
            overflow: 'auto',
            bgcolor: '#FFFFFF',
            m: 0,
            borderRadius: 0
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: purple[900] }}>
                Deployment History
              </Typography>
              
              <Stack direction="row" spacing={1}>
                <Button 
                  variant="outlined" 
                  startIcon={<RefreshIcon />}
                  onClick={handleRefreshWorkflows}
                  disabled={workflowsLoading}
                  sx={{ 
                    borderColor: grey[400],
                    color: grey[700],
                    '&:hover': {
                      borderColor: grey[600],
                      bgcolor: grey[100]
                    }
                  }}
                >
                  Refresh
                </Button>
                
                <Button 
                  variant="contained" 
                  startIcon={<GitHubIcon />}
                  size="small"
                  sx={{ 
                    bgcolor: '#000', 
                    color: '#FFF',
                    fontSize: '14px',
                    '&:hover': { bgcolor: '#333' },
                    borderRadius: 1,
                  }}
                  onClick={handleCommandRepoClick}
                  disabled={!selectedApp?.CommandRepoURL}
                >
                  Command Repo
                </Button>
                
                <Button 
                  variant="contained" 
                  startIcon={<RocketLaunchIcon />}
                  size="small"
                  sx={{ 
                    bgcolor: purple[700], 
                    '&:hover': { bgcolor: purple[800] },
                    borderRadius: 1,
                    fontSize: '14px',
                  }}
                  onClick={deploymentLoading && deploymentMessage.includes("failed") 
                    ? () => setDeploymentLoading(false) // Close animation on click if error occurred
                    : handleDeployNewVersionClick
                  }
                  disabled={deploymentLoading && !deploymentMessage.includes("failed") || !selectedApp?.CommandRepoURL}
                >
                  {deploymentLoading && deploymentMessage.includes("failed") 
                    ? "Close" 
                    : "Deploy New Version"
                  }
                </Button>
              </Stack>
            </Box>
            
            {workflowsLoading && workflowRuns.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : workflowsError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {workflowsError}
              </Alert>
            ) : workflowRuns.length === 0 ? (
              <Box sx={{ 
                py: 8, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f9f9f9',
                borderRadius: 2,
                border: '1px dashed #ccc'
              }}>
                <RocketLaunchIcon sx={{ fontSize: 48, color: grey[400], mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No deployments found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Click "Deploy New Version" to trigger a workflow
                </Typography>
              </Box>
            ) : (
              <>
                {workflowsLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Refreshing...
                    </Typography>
                  </Box>
                )}
                
                {workflowRuns.map(run => (
                  <WorkflowRunCard key={run.id} run={run} />
                ))}
              </>
            )}
          </Box>
        )}
        
        {/* Builds Tab */}
        {activeTab === 'builds' && (
          <BuildsTab />
        )}
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