import React from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  CircularProgress,
  Button,
} from '@mui/material';
import { purple } from '@mui/material/colors';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WorkflowRunCard from '@/app/components/WorkflowRunCard';

// Define a color scheme object with explicit color values
const colorSchemes = {
  progress: {
    main: '#FF9800', // orange
    light: '#FFE0B2', // light orange
    dark: '#F57C00', // dark orange
    border: '#FFCC80', // medium light orange
    hover: '#FFF3E0', // very light orange
    text: '#E65100' // very dark orange
  },
  success: {
    main: '#4CAF50', // green
    light: '#C8E6C9', // light green
    dark: '#388E3C', // dark green
    border: '#A5D6A7', // medium light green
    hover: '#E8F5E9', // very light green
    text: '#1B5E20' // very dark green
  },
  error: {
    main: '#F44336', // red
    light: '#FFCDD2', // light red
    dark: '#D32F2F', // dark red
    border: '#EF9A9A', // medium light red
    hover: '#FFEBEE', // very light red
    text: '#B71C1C' // very dark red
  }
};

interface DeployingVersionViewProps {
  workflowRun: any;
  onViewWorkflowClick: () => void;
}

const DeployingVersionView: React.FC<DeployingVersionViewProps> = ({ 
  workflowRun,
  onViewWorkflowClick
}) => {
  // Determine status of workflow
  const isInProgress = workflowRun?.status === 'in_progress' || 
                      workflowRun?.status === 'queued' || 
                      workflowRun?.status === 'waiting';
  const isSuccess = workflowRun?.conclusion === 'success';
  const isFailed = workflowRun?.conclusion === 'failure' || 
                  workflowRun?.conclusion === 'cancelled' || 
                  workflowRun?.conclusion === 'timed_out';
  
  // Set up colors and icons based on status
  let colorScheme = colorSchemes.progress;
  let StatusIcon = RocketLaunchIcon;
  let statusText = "Deploying New Version...";
  let statusDescription = "A new version is being created. This process typically takes 1-2 minutes to complete.";
  let bgColor = '#FFF9F0';
  
  if (!isInProgress) {
    if (isSuccess) {
      colorScheme = colorSchemes.success;
      StatusIcon = CheckCircleIcon;
      statusText = "Deployment Successful";
      statusDescription = "The new version was successfully created. You will be automatically redirected to it shortly.";
      bgColor = '#F0FFF4';
    } else if (isFailed) {
      colorScheme = colorSchemes.error;
      StatusIcon = ErrorIcon;
      statusText = "Deployment Failed";
      statusDescription = "The deployment process encountered an error. Please check the workflow logs for details.";
      bgColor = '#FFF0F0';
    }
  }
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%',
      p: 4
    }}>
      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          borderRadius: 2,
          border: `1px solid ${colorScheme.border}`,
          bgcolor: bgColor,
          mb: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {isInProgress ? (
            <CircularProgress 
              size={24} 
              sx={{ color: colorScheme.dark, mr: 2 }} 
            />
          ) : (
            <StatusIcon 
              sx={{ 
                color: colorScheme.dark, 
                mr: 2,
                fontSize: 28
              }} 
            />
          )}
          <Typography 
            variant="h5" 
            sx={{ 
              color: colorScheme.text,
              fontWeight: 'bold'
            }}
          >
            {statusText}
          </Typography>
        </Box>
        
        <Typography sx={{ mb: 3, color: 'text.secondary' }}>
          {statusDescription}
          {isInProgress && " You can track the progress in the workflow run below."}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={onViewWorkflowClick}
            startIcon={<StatusIcon />}
            sx={{ 
              color: colorScheme.text,
              borderColor: colorScheme.border,
              '&:hover': {
                borderColor: colorScheme.main,
                bgcolor: colorScheme.hover
              }
            }}
          >
            View GitHub Workflow
          </Button>
        </Box>
      </Paper>
      
      {workflowRun && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'medium' }}>
            Current Workflow Run
          </Typography>
          <WorkflowRunCard run={workflowRun} />
        </Box>
      )}
      
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        p: 4,
        borderRadius: 2,
        border: `1px dashed ${purple[200]}`,
        bgcolor: '#F9F7FF'
      }}>
        <RocketLaunchIcon sx={{ fontSize: 48, color: purple[300], mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Dependency Graph Will Appear Here
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
          Once deployment is complete, the new version's dependency graph will be displayed
        </Typography>
      </Box>
    </Box>
  );
};

export default DeployingVersionView;