'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  IconButton,
  TextField,
  InputAdornment,
  Paper,
  Popover
} from '@mui/material';
import Link from 'next/link';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import SearchIcon from '@mui/icons-material/Search';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckIcon from '@mui/icons-material/Check';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import Breadcrumb from '@/app/components/BreadCrumb';
import { useGlobal } from '@/app/GlobalContext';
import TerminalIcon from '@mui/icons-material/Terminal';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import { useRouter, usePathname } from 'next/navigation';

// Custom icons that match the screenshot
const ApplicationsIcon = () => (
  <TerminalIcon sx={{ fontSize: 20 }} />
);

const RoutesIcon = () => (
  <AltRouteIcon sx={{ fontSize: 20 }} />
);

const ExternalLinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7"/>
    <path d="M7 7H17V17"/>
  </svg>
);

interface CortexLayoutProps {
  children: React.ReactNode;
}

interface Team {
  team_id: number;
  team_name: string;
}

const CortexLayout: React.FC<CortexLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    teams, 
    selectedTeam, 
    setSelectedTeam,
    subModule,
  } = useGlobal();

  const [anchorElTeam, setAnchorElTeam] = useState<HTMLElement | null>(null);
  const [anchorElApp, setAnchorElApp] = useState<HTMLElement | null>(null);

  const handleTeamPopoverClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElTeam(event.currentTarget);
    setAnchorElApp(null);
  };

  // const handleAppClick = (event: React.MouseEvent<HTMLElement>) => {
  //   setAnchorElApp(event.currentTarget);
  //   setAnchorElTeam(null);
  // };

  const handleCloseTeam = () => {
    setAnchorElTeam(null);
  };

  // const handleCloseApp = () => {
  //   setAnchorElApp(null);
  // };

  const handleTeamSelect = (newTeam: Team) => {
    // setSelectedTeam(newTeam);
    router.replace(`/team/${newTeam.team_id}/${subModule}`);
    handleCloseTeam();
  };

  // const handleAppSelect = (newApp: string) => {
  //   setSelectedApp(newApp);
  //   handleCloseApp();
  // };

  const handleApplicationsClick = () => {
    console.log("imposible2")
    router.push(`/team/${selectedTeam?.team_id}/applications`);
  }

  const handleRoutesClick = () => {
    console.log("??!!!")
    router.push(`/team/${selectedTeam?.team_id}/xroutes`);
  }

  const openTeam = Boolean(anchorElTeam);
  const openApp = Boolean(anchorElApp);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 210,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 210,
            boxSizing: 'border-box',
            bgcolor: "#220459",
            color: "white",
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: 2,
              backgroundColor: 'white',
              borderRadius: '50%',
              padding: '-12px',
              height: 32,
              width: 32,
              overflow: 'hidden'
            }}>
              <img 
                src="/cortex-logo.png" 
                alt="Cortex Logo" 
                style={{ 
                  height: '85%', 
                  width: '85%',
                  objectFit: 'contain'
                }} 
              />
            </Box>
            <Typography variant="h6">Cortex</Typography>
          </Box>
          <IconButton sx={{ color: 'white' }}>
            <MenuIcon />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>TEAM</Typography>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 1, 
              cursor: 'pointer',
            }}
            onClick={handleTeamPopoverClick}
          >
            <Box 
              sx={{ 
                width: 28, 
                height: 28, 
                borderRadius: '50%', 
                bgcolor: '#f48c06', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                mr: 1
              }}
            >
              <Typography>
                {selectedTeam ? selectedTeam.team_name.split(" ")[1].charAt(0) : ''}
              </Typography>
            </Box>
            <Typography sx={{ flexGrow: 1 }}>{selectedTeam?.team_name}</Typography>
            <IconButton 
              size="small" 
              sx={{ 
                color: 'white',
                bgcolor: '#3a1980',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 1,
                width: 28,
                height: 28,
                '&:hover': {
                  bgcolor: '#4b2d89',
                }
              }}
            >
              <ExternalLinkIcon />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 1 }} />

        <List sx={{ px: 0 }}>
          <ListItem
            component="a"
            sx={{ 
              py: 1.5,
              pl: 2,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              },
              padding: '6px 9px',
              backgroundColor: (subModule == 'applications' ?  'purple' : null)
            }}
            onClick={handleApplicationsClick}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>
              <ApplicationsIcon />
            </ListItemIcon>
            <ListItemText primary="Applications" />
          </ListItem>

          <ListItem
            component="a"
            href="#"
            sx={{ 
              py: 1.5,
              pl: 2,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              },
              padding: '6px 9px',
              backgroundColor: (subModule == 'xroutes' ?  'purple' : null)
            }}
            onClick={handleRoutesClick}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>
              <RoutesIcon />
            </ListItemIcon>
            <ListItemText primary="Routes" />
          </ListItem>

          <ListItem
            component="a"
            href="#"
            sx={{ 
              py: 1.5,
              pl: 2,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              },
              padding: '6px 9px'
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Members" />
          </ListItem>
          
          <ListItem
            component="a"
            href="#"
            sx={{ 
              py: 1.5,
              pl: 2,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              },
              padding: '6px 9px'
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItem>
        </List>

        {/* <Box sx={{ px: 2, py: 1, mt: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>APPLICATION</Typography>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 1, 
              cursor: 'pointer' 
            }}
            onClick={handleAppClick}
          >
            <SearchIcon sx={{ fontSize: 20, mr: 1, opacity: 0.7 }} />
            <Typography sx={{ flexGrow: 1, opacity: selectedApp ? 1 : 0.7 }}>
              {selectedApp || "Select an app"}
            </Typography>
            <IconButton 
              size="small" 
              sx={{ 
                color: 'white',
                bgcolor: '#3a1980',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 1,
                width: 28,
                height: 28,
                '&:hover': {
                  bgcolor: '#4b2d89',
                }
              }}
            >
              <ExternalLinkIcon />
            </IconButton>
          </Box>
        </Box> */}

        <Box sx={{ flexGrow: 1 }} />

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        
        <Box sx={{ p: 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 2 
            }}
          >
          </Box>
          
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mb: 2,
              cursor: 'pointer' 
            }}
          >
            <HelpIcon sx={{ mr: 1 }} />
            <Typography sx={{ flexGrow: 1 }}>Help</Typography>
            <ArrowDropDownIcon />
          </Box>
          
          <Link href="#" style={{ textDecoration: 'none', color: 'white' }}>
            <Typography sx={{ mb: 1 }}>Settings</Typography>
          </Link>
          
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer' 
            }}
          >
            <Box 
              sx={{ 
                width: 28, 
                height: 28, 
                borderRadius: '50%', 
                bgcolor: '#f48c06', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                mr: 1
              }}
            >
              <Typography>H</Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.8, flexGrow: 1 }}>Hugh.Nguyen</Typography>
            <ArrowDropDownIcon />
          </Box>
        </Box>

        <Popover
          open={openTeam}
          anchorEl={anchorElTeam}
          onClose={handleCloseTeam}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Paper sx={{ width: 300, maxHeight: 400, overflow: 'auto' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle1" fontWeight="500">CHOOSE A TENANT</Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Search for a tenant"
                margin="dense"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            
            <List sx={{ p: 0 }}>
              {teams.map((teamItem) => (
                <ListItem 
                  key={teamItem.team_id}
                  onClick={() => handleTeamSelect(teamItem)}
                  sx={{ 
                    borderBottom: '1px solid #e0e0e0',
                    py: 1.5,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: '50%', 
                      bgcolor: '#f48c06', 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      mr: 2
                    }}
                  >
                    <Typography>{teamItem.team_name.split(" ")[1].charAt(0)}</Typography>
                  </Box>
                  <ListItemText primary={teamItem.team_name} />
                  {selectedTeam?.team_name === teamItem.team_name && <CheckIcon sx={{ color: 'primary.main' }} />}
                </ListItem>
              ))}
            </List>
          </Paper>
        </Popover>

        {/* <Popover
          open={openApp}
          anchorEl={anchorElApp}
          onClose={handleCloseApp}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Paper sx={{ width: 300, maxHeight: 400, overflow: 'auto' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle1" fontWeight="500">CHOOSE AN APPLICATION</Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Search for an app"
                margin="dense"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <List sx={{ p: 0 }}>
              <ListItem 
                onClick={() => handleAppSelect("app1")}
                sx={{ 
                  borderBottom: '1px solid #e0e0e0',
                  py: 1.5,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <ListItemText primary="app1" />
                {selectedApp === "app1" && <CheckIcon sx={{ color: 'primary.main' }} />}
              </ListItem>
              <ListItem 
                onClick={() => handleAppSelect("app2")}
                sx={{ 
                  py: 1.5,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <ListItemText primary="app2" />
                {selectedApp === "app2" && <CheckIcon sx={{ color: 'primary.main' }} />}
              </ListItem>
            </List>
          </Paper>
        </Popover> */}
      </Drawer>
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3,
          bgcolor: '#f9fafb'
        }}
      >
        <Breadcrumb />
        {children}
      </Box>
    </Box>
  );
};

export default CortexLayout;