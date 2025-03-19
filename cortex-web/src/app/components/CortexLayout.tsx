'use client';

import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import { purple } from '@mui/material/colors';
import Link from 'next/link';

interface CortexLayoutProps {
  children: React.ReactNode;
}

const CortexLayout: React.FC<CortexLayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ bgcolor: purple[800] }}>
        <Toolbar>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: 2,
              backgroundColor: 'white',
              borderRadius: '50%', // Make it circular
              padding: '-12px',
              height: 46,
              width: 46,
              overflow: 'hidden' // Ensure content stays within circle
            }}>
              <img 
                src="/cortex-logo.png" 
                alt="Cortex Logo" 
                style={{ 
                  height: '85%', // Slightly reduced to prevent overflow issues
                  width: '85%',
                  objectFit: 'contain'
                }} 
              />
            </Box>
            <Typography variant="h6" component="div" sx={{ color: 'white' }}>
              Cortex
            </Typography>
          </Link>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );
};

export default CortexLayout;