'use client';

import React, { useEffect, useRef } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography,
  Chip,
  Link,
  Button
} from '@mui/material';
import { 
  green, 
  red, 
  blue, 
  amber, 
  grey,
  purple
} from '@mui/material/colors';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import GitHubIcon from '@mui/icons-material/GitHub';

interface WorkflowRunProps {
  run: {
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
  };
}

const getRainbowBorderKeyframes = () => {
  let styles = '';
  
  // Create a gradient of colors that rotates
  for (let i = 0; i <= 100; i += 1) {
    const hue = (i * 3.6) % 360; // 360 degrees / 100 steps = 3.6 degrees per step
    styles += `
      ${i}% {
        border-image: linear-gradient(${hue}deg, 
          hsl(${hue}, 100%, 50%), 
          hsl(${(hue + 60) % 360}, 100%, 50%), 
          hsl(${(hue + 120) % 360}, 100%, 50%), 
          hsl(${(hue + 180) % 360}, 100%, 50%), 
          hsl(${(hue + 240) % 360}, 100%, 50%), 
          hsl(${(hue + 300) % 360}, 100%, 50%)
        ) 1;
      }
    `;
  }
  
  return `@keyframes rainbowBorder {
    ${styles}
  }`;
};

const getRocketAnimationKeyframes = () => {
  return `
    @keyframes rocketAnimation {
      0% {
        transform: translateY(0) rotate(-10deg);
      }
      10% {
        transform: translateY(-5px) rotate(-15deg);
      }
      20% {
        transform: translateY(-10px) rotate(-10deg);
      }
      30% {
        transform: translateY(-15px) rotate(-5deg);
      }
      40% {
        transform: translateY(-10px) rotate(0deg);
      }
      50% {
        transform: translateY(-5px) rotate(5deg);
      }
      60% {
        transform: translateY(0) rotate(10deg);
      }
      70% {
        transform: translateY(5px) rotate(5deg);
      }
      80% {
        transform: translateY(10px) rotate(0deg);
      }
      90% {
        transform: translateY(5px) rotate(-5deg);
      }
      100% {
        transform: translateY(0) rotate(-10deg);
      }
    }
    
    @keyframes flame {
      0%, 100% {
        box-shadow: 0 0 10px 5px rgba(255, 165, 0, 0.8);
        background: linear-gradient(to bottom, #f83600, #fe8c00);
      }
      50% {
        box-shadow: 0 0 15px 8px rgba(255, 165, 0, 0.5);
        background: linear-gradient(to bottom, #f83600, #fed100);
      }
    }
  `;
};

const WorkflowRunCard: React.FC<WorkflowRunProps> = ({ run }) => {
  const isInProgress = run.status === 'in_progress' || run.status === 'queued' || run.status === 'waiting';
  const isCompleted = run.status === 'completed';
  const isSuccess = isCompleted && run.conclusion === 'success';
  const isFailure = isCompleted && (run.conclusion === 'failure' || run.conclusion === 'cancelled');
  
  // Get color based on status
  const getStatusColor = () => {
    if (isInProgress) return blue[500];
    if (isSuccess) return green[500];
    if (isFailure) return red[500];
    return grey[500]; // Default color
  };
  
  // Status icon based on state
  const getStatusIcon = () => {
    if (isInProgress) return <PlayArrowIcon />;
    if (isSuccess) return <CheckCircleIcon />;
    if (isFailure) return <ErrorIcon />;
    return <PauseIcon />;
  };
  
  // Create refs for rocket elements
  const rocketRef = useRef<HTMLDivElement>(null);
  const flameRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isInProgress) {
      // Add animation to rocket when in progress
      if (rocketRef.current) {
        rocketRef.current.style.animation = 'rocketAnimation 2s infinite';
      }
      if (flameRef.current) {
        flameRef.current.style.animation = 'flame 1s infinite';
      }
    } else {
      // Remove animation when not in progress
      if (rocketRef.current) {
        rocketRef.current.style.animation = 'none';
      }
      if (flameRef.current) {
        flameRef.current.style.animation = 'none';
      }
    }
  }, [isInProgress]);
  
  return (
    <>
      <style>
        {isInProgress && getRainbowBorderKeyframes()}
        {isInProgress && getRocketAnimationKeyframes()}
      </style>
      <Card
        sx={{
          mb: 2,
          borderRadius: 2,
          boxShadow: 1,
          transition: 'all 0.3s ease',
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: getStatusColor(),
          ...(isInProgress && {
            borderWidth: 3,
            animation: 'rainbowBorder 5s linear infinite',
            boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)',
          }),
          '&:hover': {
            boxShadow: 3,
            transform: 'translateY(-2px)'
          }
        }}
      >
        <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Top row with rocket animation and main content */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {/* Rocket animation section */}
            {isInProgress && (
            <Box sx={{ 
                position: 'relative',
                width: 60, 
                height: 120, 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center',
                mr: 2
            }}>
                <Box
                ref={rocketRef}
                sx={{
                    position: 'relative',
                    zIndex: 2
                }}
                >
                <RocketLaunchIcon 
                    sx={{ 
                    fontSize: 40,
                    color: purple[500],
                    transform: 'rotate(-10deg)'
                    }}
                />
                <Box
                    ref={flameRef}
                    sx={{
                    position: 'absolute',
                    bottom: -15,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(180deg)',
                    width: 10,
                    height: 15,
                    borderRadius: '50% 50% 0 0',
                    background: 'linear-gradient(to bottom, #f83600, #fe8c00)',
                    boxShadow: '0 0 10px 5px rgba(255, 165, 0, 0.5)',
                    zIndex: 1
                    }}
                />
                </Box>
            </Box>
            )}
            
            {/* Main content section */}
            <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Deployment Workflow
                </Typography>
                <Chip
                icon={getStatusIcon()}
                label={isInProgress ? 'In Progress' : (isSuccess ? 'Success' : (isFailure ? 'Failed' : run.status))}
                sx={{
                    bgcolor: `${getStatusColor()}20`,
                    color: getStatusColor(),
                    fontWeight: 'medium',
                    height: 24
                }}
                size="small"
                />
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    #{run.run_number}
                </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5, color: grey[600] }} />
                <Typography variant="body2" color="text.secondary">
                    {run.created_ago}
                </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ fontSize: 16, mr: 0.5, color: grey[600] }} />
                <Typography variant="body2" color="text.secondary">
                    {run.actor}
                </Typography>
                </Box>

                {run.duration && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5, color: grey[600] }} />
                    <Typography variant="body2" color="text.secondary">
                    {run.duration.toFixed(1)} min
                    </Typography>
                </Box>
                )}
                
                <Chip
                label={run.head_branch}
                size="small"
                sx={{ 
                    height: 20,
                    bgcolor: amber[100],
                    color: amber[800],
                    fontSize: '0.7rem'
                }}
                />
            </Box>
            </Box>
        </Box>
        
        {/* Bottom row with View Details link moved to the left */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* View Details link now on the left */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GitHubIcon sx={{ fontSize: 18, mr: 0.5, color: blue[600] }} />
            <Button
                size="small"
                component="a"
                href={run.html_url}
                target="_blank"
                sx={{
                textTransform: 'none',
                color: blue[600],
                '&:hover': {
                    bgcolor: blue[50]
                }
                }}
            >
                View details
            </Button>
            </Box>
            
            {/* You can add something on the right side if needed */}
            <Box></Box>
        </Box>
        </CardContent>
      </Card>
    </>
  );
};

export default WorkflowRunCard;