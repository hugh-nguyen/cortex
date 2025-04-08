'use client';

import React from 'react';
import { Box, Typography, Link as MuiLink } from '@mui/material';
import Link from 'next/link';
import { useGlobal } from '@/app/GlobalContext';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useRouter } from 'next/navigation';



const Breadcrumb = () => {
    const router = useRouter();
    const { selectedTeam, selectedApp, selectedAppVersion, subModule } = useGlobal();

  const handleApplicationsClick = () => {
    router.replace(`/team/${selectedTeam?.team_id}/applications/`);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center',
        mb: 2,
        fontSize: '0.8rem'
      }}
    >
      <Typography component="span" fontSize="0.8rem">Teams</Typography>
      <ChevronRightIcon sx={{ mx: 1, fontSize: '1rem', color: 'text.secondary' }} />
      
      {selectedTeam && (
        <>
          <Typography component="span" fontSize="0.8rem">{selectedTeam.team_name}</Typography>
          <ChevronRightIcon sx={{ mx: 1, fontSize: '1rem', color: 'text.secondary' }} />
        </>
      )}
      
      {!selectedApp && subModule =='applications' &&
        <Typography onClick={handleApplicationsClick} style={{cursor: 'pointer', textDecoration: 'underline'}} color="text.primary" fontWeight="medium" fontSize="0.8rem">
          Applications
        </Typography>
      }
      
      {selectedApp && subModule =='applications' && (
        <>
          <Typography color="text.primary" fontWeight="medium" fontSize="0.8rem">Applications</Typography>
          <ChevronRightIcon sx={{ mx: 1, fontSize: '1rem', color: 'text.secondary' }} />
          <Typography component="span" fontSize="0.8rem">{selectedApp.App}</Typography>
        </>
      )}

      {subModule =='xroutes' &&
        <Typography onClick={handleApplicationsClick} style={{cursor: 'pointer', textDecoration: 'underline'}} color="text.primary" fontWeight="medium" fontSize="0.8rem">
          Routes
        </Typography>
      }

      {selectedAppVersion && selectedAppVersion.version !== 0 && subModule =='applications' && (
        <>
          <ChevronRightIcon sx={{ mx: 1, fontSize: '1rem', color: 'text.secondary' }} />
          <Typography color="text.primary" fontWeight="medium" fontSize="0.8rem">Versions</Typography>
          <ChevronRightIcon sx={{ mx: 1, fontSize: '1rem', color: 'text.secondary' }} />
          <Typography component="span" fontSize="0.8rem">{selectedAppVersion.version}</Typography>
        </>
      )}
    </Box>
  );
};

export default Breadcrumb;