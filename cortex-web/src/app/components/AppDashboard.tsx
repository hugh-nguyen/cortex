'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  CircularProgress, 
  Alert, 
  Container,
  CardActionArea,
  Typography,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import { purple, blue, green } from '@mui/material/colors';
import { useRouter, usePathname } from 'next/navigation';
import { useGlobal } from '@/app/GlobalContext';
import DevicesIcon from '@mui/icons-material/Devices';
import UpdateIcon from '@mui/icons-material/Update';
import LayersIcon from '@mui/icons-material/Layers';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DependencyDiagram from './DependencyDiagram';

interface AppData {
  App: string;
  'Service Count': number;
  Versions: number;
  'Last Updated': string;
  Owner: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const AppDashboard: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    apps, 
    loading, 
    error,
    selectedTeam
  } = useGlobal();
  
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const handleAppClick = (app: AppData) => {
    router.push(`${pathname}/${app.App}/version/${app.Versions}`);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <DependencyDiagram 
        teamId={selectedTeam?.team_id || null} 
        onError={(errorMsg) => console.error('Dependency diagram error:', errorMsg)}
      />
    </Container>
  );
};

export default AppDashboard;