'use client';

import React from 'react';
import { Box, Typography, Modal, CircularProgress } from '@mui/material';
import { keyframes } from '@mui/system';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CloudIcon from '@mui/icons-material/Cloud';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// Define keyframes for animations
const rocketFlightKeyframes = keyframes`
  0% {
    transform: translateY(100px) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  40% {
    transform: translateY(-20px) rotate(5deg);
  }
  50% {
    transform: translateY(-40px) rotate(0deg);
  }
  60% {
    transform: translateY(-60px) rotate(-5deg);
  }
  100% {
    transform: translateY(-300px) rotate(0deg);
    opacity: 0;
  }
`;

const cloudDriftKeyframes = keyframes`
  0% {
    transform: translateX(-50px);
    opacity: 0;
  }
  25% {
    opacity: 0.7;
  }
  75% {
    opacity: 0.7;
  }
  100% {
    transform: translateX(50px);
    opacity: 0;
  }
`;

const sparkleKeyframes = keyframes`
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(1);
    opacity: 0;
  }
`;

interface DeploymentAnimationProps {
  open: boolean;
  message: string;
}

const DeploymentAnimation: React.FC<DeploymentAnimationProps> = ({ open, message }) => {
  // Create array of random sparkle positions
  const sparkles = Array.from({ length: 15 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 15;
    const distance = 30 + Math.random() * 20;
    return {
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      delay: Math.random() * 1,
      duration: 0.5 + Math.random() * 1
    };
  });

  return (
    <Modal
      open={open}
      aria-labelledby="deployment-animation-title"
      aria-describedby="deployment-animation-description"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 300,
          height: 400,
          bgcolor: 'rgba(10, 10, 10, 0.8)',
          borderRadius: 4,
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Animated clouds */}
        <Box sx={{ 
          position: 'absolute', 
          top: '30%', 
          left: 0, 
          right: 0, 
          display: 'flex', 
          justifyContent: 'center',
          zIndex: 1 
        }}>
          <CloudIcon 
            sx={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: 40, 
              animation: message.includes("failed") ? 'none' : `${cloudDriftKeyframes} 6s infinite`,
              animationDelay: '0.5s'
            }} 
          />
          <CloudIcon 
            sx={{ 
              color: 'rgba(255,255,255,0.3)', 
              fontSize: 60, 
              animation: message.includes("failed") ? 'none' : `${cloudDriftKeyframes} 8s infinite`,
              animationDelay: '1s'
            }} 
          />
          <CloudIcon 
            sx={{ 
              color: 'rgba(255,255,255,0.4)', 
              fontSize: 50, 
              animation: message.includes("failed") ? 'none' : `${cloudDriftKeyframes} 7s infinite`,
              animationDelay: '2s'
            }} 
          />
        </Box>
        
        {/* Rocket animation */}
        <Box sx={{ 
          position: 'relative', 
          height: 150, 
          width: 150, 
          display: 'flex', 
          justifyContent: 'center',
          marginBottom: 4,
          zIndex: 2 
        }}>
          <RocketLaunchIcon 
            sx={{ 
              fontSize: 60, 
              color: '#f50057', 
              animation: message.includes("failed") ? 'none' : `${rocketFlightKeyframes} 3s infinite`,
            }} 
          />
          
          {/* Rocket exhaust sparkles */}
          {sparkles.map((sparkle, index) => (
            <AutoAwesomeIcon 
              key={index}
              sx={{ 
                position: 'absolute',
                bottom: '40%',
                left: '50%',
                transform: 'translate(-50%, 0)',
                fontSize: 16, 
                color: '#FFD700',
                opacity: 0,
                '--tx': `${sparkle.tx}px`,
                '--ty': `${sparkle.ty}px`,
                animation: message.includes("failed") ? 'none' : `${sparkleKeyframes} ${sparkle.duration}s infinite`,
                animationDelay: `${sparkle.delay}s`,
              }} 
            />
          ))}
        </Box>
        
        {/* Message */}
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'white', 
            textAlign: 'center',
            marginTop: 2
          }}
        >
          {message}
        </Typography>
        
        {/* Loading indicator or close button */}
        {message.includes("failed") ? (
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#FF9800', 
              marginTop: 2,
              textAlign: 'center'
            }}
          >
            Click the "Close" button to dismiss
          </Typography>
        ) : (
          <CircularProgress 
            sx={{ 
              color: '#f50057', 
              marginTop: 3 
            }} 
          />
        )}
      </Box>
    </Modal>
  );
};

export default DeploymentAnimation;