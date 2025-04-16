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
  Snackbar,
  Tabs,
  Button,
  Tab,
  Select, MenuItem
} from '@mui/material';
import { purple, blue, green } from '@mui/material/colors';
import { useRouter, usePathname } from 'next/navigation';
import { useGlobal } from '@/app/GlobalContext';
import DevicesIcon from '@mui/icons-material/Devices';
import UpdateIcon from '@mui/icons-material/Update';
import LayersIcon from '@mui/icons-material/Layers';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DependencyDiagram from './DependencyDiagram';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

import DeploymentAnimation from '@/app/components/DeploymentAnimation';


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
    selectedTeam,
    selectedApp,
    setSelectedApp,
  } = useGlobal();
  
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [zoom, setZoom] = useState<number>(40);
  // const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [deploymentLoading, setDeploymentLoading] = useState(false);
  const [deploymentMessage, setDeploymentMessage] = useState("Preparing to deploy new version...");
  const [deploymentStartTime, setDeploymentStartTime] = useState<number | null>(null);

  const appNames = Array.from(new Set(apps.map(a => a.App.split('/')[0]))).sort();

  const handleAppClick = (app: AppData) => {
    router.push(`${pathname}/${app.App}/version/${app.Versions}`);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleZoomIn = () => {
      setZoom(Math.min(zoom + 10, 100));
    };
  
  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 10, 20));
  };

  const handleReset = () => {
    setZoom(40);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleDeployNewVersionClick = async () => {
    if (!selectedApp?.CommandRepoURL) {
      setSnackbarMessage("No repository URL found for this application");
      setSnackbarOpen(true);
      return;
    }

    try {
      setDeploymentLoading(true);
      setDeploymentStartTime(Date.now());
      setDeploymentMessage("Preparing to deploy new version...");

      setTimeout(() => {
        if (deploymentLoading) setDeploymentMessage("Connecting to GitHub...");
      }, 500);
      setTimeout(() => {
        if (deploymentLoading) setDeploymentMessage("Triggering GitHub Action workflow...");
      }, 1000);
      setTimeout(() => {
        if (deploymentLoading) setDeploymentMessage("Scheduling pipeline execution...");
      }, 1500);

    } catch (error) {
      console.error("Deployment error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setDeploymentMessage(`Deployment failed: ${errorMessage}`);
      
      setSnackbarMessage(`Deployment failed: ${errorMessage}`);
      setSnackbarOpen(true);
    }
  }
  return (
    <Container maxWidth={false} disableGutters sx={{ mt: 4, mb: 8 }}>
      <div className="inline-flex items-center justify-between w-full mb-4 bg-white shadow rounded-lg p-2 space-x-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Zoom: {zoom}%</span>

          <button onClick={handleZoomOut} className="text-gray-500 hover:text-gray-800 p-1">−</button>

          <div className="w-20 h-2 bg-gray-200 rounded-full relative">
            <div
              className="absolute h-2 bg-purple-600 rounded-full"
              style={{ width: `${zoom}%` }}
            />
            <div
              className="absolute w-4 h-4 bg-purple-600 rounded-full -mt-1"
              style={{ left: `calc(${zoom}% - 8px)` }}
            />
          </div>

          <button onClick={handleZoomIn} className="text-gray-500 hover:text-gray-800 p-1">+</button>
          {/* <button onClick={handleReset} className="ml-2 text-gray-500 hover:text-gray-800">↺</button> */}
        </div>
        <div className="flex items-center space-x-2 ml-auto">
          <Button 
            variant="contained" 
            startIcon={<RocketLaunchIcon />}
            sx={{ 
              bgcolor: purple[700], 
              '&:hover': { bgcolor: purple[800] },
              borderRadius: 1,
              fontSize: '14px',
              textTransform: 'uppercase',
              margin: '12px'
            }}
            onClick={handleDeployNewVersionClick}
            disabled={!selectedApp?.CommandRepoURL}
          >
            Deploy New Version
          </Button>
          <div>of</div>
          <Select
            value={selectedApp ? selectedApp.App.split('/')[0] : ''}
            onChange={(e) => {
              setSelectedApp(Object.fromEntries(apps.map(app => [app.App, app]))[e.target.value] ?? null);
            }}
            displayEmpty
            size="small"
            sx={{ minWidth: 180, bgcolor: 'white', margin: '6px' }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {appNames.map((name) => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </Select>
        </div>
      </div>
      
      <DependencyDiagram 
        teamId={selectedTeam?.team_id || null}
        onError={(errorMsg) => console.error('Dependency diagram error:', errorMsg)}
        zoom={zoom}
        selectedApp={selectedApp?.App}
        setSelectedApp={setSelectedApp}
        apps={apps}
      />

      <DeploymentAnimation 
        open={deploymentLoading} 
        message={deploymentMessage} 
      />
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default AppDashboard;