// Create a new file at app/components/Breadcrumb.tsx
'use client';

import React from 'react';
import { Box, Typography, Link as MuiLink } from '@mui/material';
import Link from 'next/link';
import { useGlobal } from '@/app/GlobalContext';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const Breadcrumb = ({ currentPage = 'Applications' }) => {
  const { selectedTeam, selectedApp, selectedAppVersion } = useGlobal();
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center',
        mb: 2,
        fontSize: '0.8rem'
      }}
    >
      <Link href="/" passHref>
        <MuiLink 
          color="text.secondary" 
          sx={{ 
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
            fontSize: '0.8rem'
          }}
        >
          <Typography component="span" fontSize="0.8rem">Teams</Typography>
        </MuiLink>
      </Link>
      
      <ChevronRightIcon sx={{ mx: 1, fontSize: '1rem', color: 'text.secondary' }} />
      
      {selectedTeam && (
        <>
          <Link href="/" passHref>
            <MuiLink 
              color="text.secondary" 
              sx={{ 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
                fontSize: '0.8rem'
              }}
            >
              <Typography component="span" fontSize="0.8rem">{selectedTeam.team_name}</Typography>
            </MuiLink>
          </Link>
          
          <ChevronRightIcon sx={{ mx: 1, fontSize: '1rem', color: 'text.secondary' }} />
        </>
      )}
      
      {!selectedApp && 
        <Typography color="text.primary" fontWeight="medium" fontSize="0.8rem">
          Applications
        </Typography>
      }
      

      {selectedApp && (
        <>
          <Typography color="text.primary" fontWeight="medium" fontSize="0.8rem">
            Applications
          </Typography>
          <ChevronRightIcon sx={{ mx: 1, fontSize: '1rem', color: 'text.secondary' }} />

          <Link href="/" passHref>
            <MuiLink 
              color="text.secondary" 
              sx={{ 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
                fontSize: '0.8rem'
              }}
            >
              <Typography component="span" fontSize="0.8rem">{selectedApp}</Typography>
            </MuiLink>
          </Link>
        </>
      )}

      {selectedAppVersion && (
        <>
          <ChevronRightIcon sx={{ mx: 1, fontSize: '1rem', color: 'text.secondary' }} />
          <Typography color="text.primary" fontWeight="medium" fontSize="0.8rem">
            Versions
          </Typography>
          <ChevronRightIcon sx={{ mx: 1, fontSize: '1rem', color: 'text.secondary' }} />

          <Link href="/" passHref>
            <MuiLink 
              color="text.secondary" 
              sx={{ 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
                fontSize: '0.8rem'
              }}
            >
              <Typography component="span" fontSize="0.8rem">{selectedAppVersion}</Typography>
            </MuiLink>
          </Link>
        </>
      )}
    </Box>
  );
};

export default Breadcrumb;