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
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckIcon from '@mui/icons-material/Check';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';

// Custom icons that match the screenshot
const ApplicationsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);

const RoutesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
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

const CortexLayout: React.FC<CortexLayoutProps> = ({ children }) => {
  const [team, setTeam] = useState("Team Alpha");
  const [selectedApp, setSelectedApp] = useState("");
  const [anchorElTeam, setAnchorElTeam] = useState<HTMLElement | null>(null);
  const [anchorElApp, setAnchorElApp] = useState<HTMLElement | null>(null);

  const handleTeamClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElTeam(event.currentTarget);
    setAnchorElApp(null);
  };

  const handleAppClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElApp(event.currentTarget);
    setAnchorElTeam(null);
  };

  const handleCloseTeam = () => {
    setAnchorElTeam(null);
  };

  const handleCloseApp = () => {
    setAnchorElApp(null);
  };

  const handleTeamSelect = (newTeam: string) => {
    setTeam(newTeam);
    handleCloseTeam();
  };

  const handleAppSelect = (newApp: string) => {
    setSelectedApp(newApp);
    handleCloseApp();
  };

  const openTeam = Boolean(anchorElTeam);
  const openApp = Boolean(anchorElApp);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{ marginRight: 8 }}>
              <path d="M19.5 12.5V12h2v-.5A8.5 8.5 0 0 0 4.03 6.974l.835.323A7.5 7.5 0 0 1 20.5 11.5V12h2v-.5A9.5 9.5 0 0 0 3.255 6.316l.837.324A8.5 8.5 0 0 1 21.5 11.5V12h2v-.5a10.5 10.5 0 0 0-21 0s0 0 0 0H1.033C1.015 11.67 1 11.837 1 12h2c0-.17.014-.337.033-.5h-.533s0 0 0 0a11.5 11.5 0 0 1 23 0V12h-6v.5h.5Z"></path>
            </svg>
            <Typography variant="h6">snyk</Typography>
          </Box>
          <IconButton sx={{ color: 'white' }}>
            <MenuIcon />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* Tenant selector */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>TENANT</Typography>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 1, 
              cursor: 'pointer' 
            }}
            onClick={handleTeamClick}
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
              <Typography>{team === "Team Alpha" ? "A" : "B"}</Typography>
            </Box>
            <Typography sx={{ flexGrow: 1 }}>{team}</Typography>
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

        {/* Main navigation */}
        <List sx={{ px: 0 }}>
          <ListItem 
            button
            sx={{ 
              py: 1.5,
              pl: 2
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>
              <ApplicationsIcon />
            </ListItemIcon>
            <ListItemText primary="Applications" />
          </ListItem>

          <ListItem 
            button
            sx={{ 
              py: 1.5,
              pl: 2
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>
              <RoutesIcon />
            </ListItemIcon>
            <ListItemText primary="Routes" />
          </ListItem>

          <ListItem 
            button
            sx={{ 
              py: 1.5,
              pl: 2
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Members" />
          </ListItem>
          
          <ListItem 
            button
            sx={{ 
              py: 1.5,
              pl: 2
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItem>
        </List>

        {/* Application picker */}
        <Box sx={{ px: 2, py: 1, mt: 1 }}>
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
        </Box>

        {/* Flexible spacer to push the footer to the bottom */}
        <Box sx={{ flexGrow: 1 }} />

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        
        {/* Bottom section */}
        <Box sx={{ p: 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 2 
            }}
          >
            <Box 
              sx={{ 
                position: 'relative',
                mr: 1
              }}
            >
              <NotificationsIcon />
              <Box 
                sx={{ 
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  bgcolor: 'red',
                  borderRadius: '50%',
                  width: 16,
                  height: 16,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: 10
                }}
              >
                1
              </Box>
            </Box>
            <Typography>Product updates</Typography>
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
            <Typography variant="body2" sx={{ opacity: 0.8, flexGrow: 1 }}>Hugh.Nguyen1@iag.com</Typography>
            <ArrowDropDownIcon />
          </Box>
        </Box>

        {/* Team selector popover */}
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
              <ListItem 
                button 
                onClick={() => handleTeamSelect("Team Alpha")}
                sx={{ 
                  borderBottom: '1px solid #e0e0e0',
                  py: 1.5
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
                  <Typography>A</Typography>
                </Box>
                <ListItemText primary="Team Alpha" />
                {team === "Team Alpha" && <CheckIcon sx={{ color: 'primary.main' }} />}
              </ListItem>
              <ListItem 
                button 
                onClick={() => handleTeamSelect("Team Beta")}
                sx={{ py: 1.5 }}
              >
                <Box 
                  sx={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    bgcolor: '#3f51b5', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    mr: 2
                  }}
                >
                  <Typography>B</Typography>
                </Box>
                <ListItemText primary="Team Beta" />
                {team === "Team Beta" && <CheckIcon sx={{ color: 'primary.main' }} />}
              </ListItem>
            </List>
          </Paper>
        </Popover>

        {/* App selector popover */}
        <Popover
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
                button 
                onClick={() => handleAppSelect("app1")}
                sx={{ 
                  borderBottom: '1px solid #e0e0e0',
                  py: 1.5
                }}
              >
                <ListItemText primary="app1" />
                {selectedApp === "app1" && <CheckIcon sx={{ color: 'primary.main' }} />}
              </ListItem>
              <ListItem 
                button 
                onClick={() => handleAppSelect("app2")}
                sx={{ py: 1.5 }}
              >
                <ListItemText primary="app2" />
                {selectedApp === "app2" && <CheckIcon sx={{ color: 'primary.main' }} />}
              </ListItem>
            </List>
          </Paper>
        </Popover>
      </Drawer>
      
      {/* Main content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3,
          bgcolor: '#f9fafb'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default CortexLayout;