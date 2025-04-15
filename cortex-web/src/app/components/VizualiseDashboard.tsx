'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  CircularProgress, 
  Alert, 
  Container,
  Typography,
  Paper,
  IconButton,
  Fab,
  Tooltip
} from '@mui/material';
import { purple, blue, amber } from '@mui/material/colors';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useGlobal } from '@/app/GlobalContext';

interface Target {
  app: string;
  svc: string;
  app_ver: number;
  weight: number;
}

interface Route {
  prefix: string;
  team_id: number;
  targets: Target[];
}

const VizualiseDashboard: React.FC = () => {
  const { 
    loading, 
    error,
    routes,
    selectedTeam,
    setRoutes
  } = useGlobal();
  

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, pb: 10 }}>
    </Container>
  );
};

export default VizualiseDashboard;