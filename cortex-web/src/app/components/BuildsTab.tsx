import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert,
  Button,
  Chip,
  Stack,
  Paper
} from '@mui/material';
import { purple, grey } from '@mui/material/colors';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useGlobal } from '@/app/GlobalContext';
import WorkflowRunCard from '@/app/components/WorkflowRunCard';

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

const BuildsTab: React.FC = () => {
  const { selectedApp } = useGlobal();
  
  // State for services and dependencies
  const [selectedItem, setSelectedItem] = useState<{type: 'service' | 'dependency', name: string} | null>(null);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);
  
  // Polling interval in milliseconds (5 seconds)
  const POLLING_INTERVAL = 5000;

  // Set default selection to first service when app data loads
  useEffect(() => {
    if (selectedApp && Array.isArray(selectedApp.services) && selectedApp.services.length > 0) {
      setSelectedItem({ type: 'service', name: selectedApp.services[0] });
    }
  }, [selectedApp]);

  // Fetch workflow runs for the selected item
  const fetchWorkflowRuns = async () => {
    if (!selectedItem || !selectedApp) return;
    
    setWorkflowsLoading(true);
    setWorkflowsError(null);
    
    try {
      let repoUrl = '';
      
      if (selectedItem.type === 'service') {
        // Format: https://github.com/hugh-nguyen/app1-mfe-a
        repoUrl = `https://github.com/hugh-nguyen/${selectedApp.App}-${selectedItem.name}`;
      } else {
        // Format: https://github.com/hugh-nguyen/shared-app-service-s
        const parts = selectedItem.name.split('/');
        repoUrl = `https://github.com/hugh-nguyen/${parts[0]}-${parts[1]}`;
      }
      
      const encodedURL = encodeURIComponent(repoUrl);
      const response = await fetch(`http://localhost:8000/get_workflow_runs?app_name=${selectedApp.App}&repo_url=${encodedURL}&workflow_name=ci`);
      
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

  // Fetch workflow runs when selected item changes
  useEffect(() => {
    if (selectedItem) {
      fetchWorkflowRuns();
    }
  }, [selectedItem]);

  // Set up polling for workflow runs if any are in progress
  useEffect(() => {
    // Check if any runs are in progress
    const hasInProgressRuns = workflowRuns.some(
      run => run.status === 'in_progress' || run.status === 'queued' || run.status === 'waiting'
    );
    
    // Only poll if there are in-progress runs
    if (hasInProgressRuns) {
      const intervalId = setInterval(() => {
        fetchWorkflowRuns();
      }, POLLING_INTERVAL);
      
      return () => clearInterval(intervalId);
    }
  }, [workflowRuns]);

  // Handle item selection
  const handleItemSelect = (type: 'service' | 'dependency', name: string) => {
    setSelectedItem({ type, name });
  };

  // Handle refresh
  const handleRefreshWorkflows = () => {
    fetchWorkflowRuns();
  };
  
  if (!selectedApp) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <Typography>No application selected</Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ 
      flexGrow: 1, 
      p: 3, 
      overflow: 'auto',
      bgcolor: '#FFFFFF',
      m: 0,
      borderRadius: 0
    }}>
      <Box sx={{ mb: 3 }}>
        {/* Services section */}
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: grey[700], 
              fontWeight: 'medium',
              mb: 1
            }}
          >
            services:
          </Typography>
          <Stack direction="row" spacing={1}>
            {selectedApp.services && selectedApp.services.map((service: string) => (
              <Chip
                key={`service-${service}`}
                label={service}
                onClick={() => handleItemSelect('service', service)}
                sx={{
                  bgcolor: selectedItem?.type === 'service' && selectedItem?.name === service 
                    ? purple[600] 
                    : grey[300],
                  color: selectedItem?.type === 'service' && selectedItem?.name === service 
                    ? 'white' 
                    : grey[700],
                  '&:hover': {
                    bgcolor: selectedItem?.type === 'service' && selectedItem?.name === service 
                      ? purple[700] 
                      : grey[400],
                  }
                }}
              />
            ))}
          </Stack>
        </Box>
        
        {/* Dependencies section */}
        <Box>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: grey[700], 
              fontWeight: 'medium',
              mb: 1
            }}
          >
            dependencies:
          </Typography>
          <Stack direction="row" spacing={1}>
            {selectedApp.dependencies && selectedApp.dependencies.map((dependency: string) => (
              <Chip
                key={`dependency-${dependency}`}
                label={dependency}
                onClick={() => handleItemSelect('dependency', dependency)}
                sx={{
                  bgcolor: selectedItem?.type === 'dependency' && selectedItem?.name === dependency 
                    ? purple[600] 
                    : grey[300],
                  color: selectedItem?.type === 'dependency' && selectedItem?.name === dependency 
                    ? 'white' 
                    : grey[700],
                  '&:hover': {
                    bgcolor: selectedItem?.type === 'dependency' && selectedItem?.name === dependency 
                      ? purple[700] 
                      : grey[400],
                  }
                }}
              />
            ))}
          </Stack>
        </Box>
      </Box>
      
      {/* Workflow runs section */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: purple[900] }}>
            CI Builds
            {selectedItem && (
              <Typography component="span" variant="subtitle1" sx={{ ml: 1, color: grey[600] }}>
                • {selectedItem.type === 'service' 
                    ? `${selectedApp.App}-${selectedItem.name}` 
                    : selectedItem.name}
              </Typography>
            )}
          </Typography>
          
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
        </Box>
        
        {workflowsLoading && workflowRuns.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : workflowsError ? (
          <Alert severity="info" sx={{ mb: 2 }}>
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
            <Typography variant="h6" color="text.secondary">
              No CI builds found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No workflow runs found for this repository
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
    </Box>
  );
};

export default BuildsTab;