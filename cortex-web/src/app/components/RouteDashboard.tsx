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
import RouteEditModal from './RouteEditModal';

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

const RouteDashboard: React.FC = () => {
  const { 
    loading, 
    error,
    routes,
    selectedTeam,
    setRoutes
  } = useGlobal();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  
  // Function to refresh routes after edits
  const fetchRoutes = async () => {
    if (!selectedTeam) return;
    
    try {
      const response = await fetch(`http://localhost:8000/get_routes?team_id=${selectedTeam.team_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch routes');
      }
      
      const data = await response.json();
      if (data.routes) {
        setRoutes(data.routes);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  // Refresh routes when modal closes
  useEffect(() => {
    if (!modalOpen) {
      fetchRoutes();
    }
  }, [modalOpen, selectedTeam]);
  
  const handleEditRoute = (route: Route) => {
    setSelectedRoute(route);
    setModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedRoute(null);
  };
  
  const handleAddRoute = () => {
    // Create a new empty route template
    setSelectedRoute(null);
    setModalOpen(true);
  };
  
  const handleDeleteRoute = async (route: Route) => {
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete route: ${route.prefix}?`)) {
      return;
    }
    
    fetchRoutes();
  };

  const RouteCard = ({ route }: { route: Route }) => {
    return (
      <Card 
        variant="outlined" 
        className="route-card"
        sx={{ 
          mb: 4, 
          borderRadius: 2,
          boxShadow: 2,
          overflow: 'hidden',
          position: 'relative',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: 6,
            transform: 'translateY(-3px)',
            borderColor: purple[200]
          }
        }}
      >
        <Box sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 1
        }}>
          <Tooltip title="Edit route">
            <IconButton 
              size="small" 
              onClick={() => handleEditRoute(route)}
              sx={{ 
                bgcolor: purple[50],
                transition: 'all 0.2s ease',
                '&:hover': { 
                  bgcolor: purple[100],
                  transform: 'rotate(15deg)'
                }
              }}
            >
              <EditIcon fontSize="small" sx={{ color: purple[700] }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete route">
            <IconButton 
              size="small" 
              onClick={() => handleDeleteRoute(route)}
              sx={{ 
                bgcolor: '#ffebee',
                transition: 'all 0.2s ease',
                '&:hover': { 
                  bgcolor: '#ffcdd2',
                  transform: 'rotate(-15deg)'
                }
              }}
            >
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <CardContent sx={{ pb: 3 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: purple[900], 
              fontWeight: 'bold',
              mb: 3,
              pr: 12 // Make room for the buttons
            }}
          >
            Route: {route.prefix}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Paper 
              elevation={0}
              sx={{ 
                backgroundColor: '#4CAF50', 
                color: 'white',
                py: 1,
                px: 2,
                borderRadius: 1,
                width: 'fit-content',
                minWidth: 160,
                fontWeight: 'medium',
                transition: 'all 0.2s ease',
                position: 'relative',
                zIndex: 1,
                '&:hover': {
                  backgroundColor: '#388E3C',
                  transform: 'scale(1.02)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                },
                '.route-card:hover &::after': {
                  content: '""',
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  right: -2,
                  bottom: -2,
                  borderRadius: '4px',
                  border: `3px solid ${purple[300]}`,
                  pointerEvents: 'none',
                  zIndex: 2
                }
              }}
            >
              {route.prefix}
            </Paper>
            
            {/* Arrow connecting route to targets */}
            <Box sx={{ 
              position: 'relative',
              height: route.targets.length > 1 ? 80 : 2, 
              width: 40, 
              mx: 2,
              display: 'flex',
              alignItems: 'center',
              zIndex: 0
            }}>
              {/* Horizontal line */}
              <Box sx={{ 
                position: 'absolute',
                height: 2, 
                width: '100%', 
                bgcolor: '#333'
              }} />
              
              {route.targets.length > 1 && (
                <>
                  {/* Vertical line for multiple targets */}
                  <Box sx={{ 
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: 2,
                    height: '100%',
                    bgcolor: '#333'
                  }} />
                  
                  {/* Horizontal lines to each target */}
                  {route.targets.map((_, idx) => {
                    const yPos = (idx / (route.targets.length - 1)) * 80;
                    return (
                      <Box key={idx} sx={{ 
                        position: 'absolute',
                        right: -20,
                        top: yPos,
                        width: 20,
                        height: 2,
                        bgcolor: '#333',
                        transform: 'translateY(-50%)'
                      }} />
                    );
                  })}
                  
                  {/* Arrow tips */}
                  {route.targets.map((_, idx) => {
                    const yPos = (idx / (route.targets.length - 1)) * 80;
                    return (
                      <Box key={idx} sx={{ 
                        position: 'absolute',
                        right: -30,
                        top: yPos,
                        width: 0,
                        height: 0,
                        borderTop: '5px solid transparent',
                        borderBottom: '5px solid transparent',
                        borderLeft: '10px solid #333',
                        transform: 'translateY(-50%)'
                      }} />
                    );
                  })}
                </>
              )}
              
              {/* Simple straight arrow for single target */}
              {route.targets.length === 1 && (
                <>
                  {/* Arrow tip */}
                  <Box sx={{ 
                    position: 'absolute',
                    right: -10,
                    width: 0,
                    height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderLeft: '10px solid #333',
                  }} />
                </>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
              {route.targets.map((target, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: index !== route.targets.length - 1 ? 2 : 0 }}>
                  <Box sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center',
                    ml: 2
                  }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        width: 'fit-content',
                        maxWidth: 500,
                        border: '3px solid transparent',
                        borderRadius: '4px',
                        position: 'relative',
                        '.route-card:hover &': {
                          borderColor: purple[300]
                        }
                      }}
                    >
                      <Box sx={{ 
                        backgroundColor: blue[700],
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '4px 0 0 4px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        minWidth: 220,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: blue[800],
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }
                      }}>
                        {`${target.app}-${target.svc} @ V${target.app_ver}`}
                      </Box>
                      <Box sx={{ 
                        width: `${target.weight}%`, 
                        backgroundColor: amber[500],
                        borderRadius: '0 4px 4px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        minWidth: 60,
                        maxWidth: 120,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: amber[600],
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }
                      }}>
                        {target.weight}%
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, pb: 10 }}>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {!loading && (
        <Box sx={{ mt: 2 }}>
          {routes.length > 0 ? (
            routes.map((route, index) => (
              <RouteCard key={index} route={route} />
            ))
          ) : (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No routes found for this team.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Routes will appear here once they are defined.
              </Typography>
            </Box>
          )}
        </Box>
      )}
      
      {/* Fixed Add Button */}
      <Tooltip title="Add new route">
        <Fab 
          color="primary" 
          aria-label="add" 
          onClick={handleAddRoute}
          sx={{ 
            position: 'fixed',
            bottom: 24,
            right: 24,
            boxShadow: 3,
            transition: 'transform 0.2s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'scale(1.1) rotate(90deg)',
              boxShadow: 6
            }
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
      
      {/* Edit Route Modal */}
      <RouteEditModal 
        open={modalOpen}
        onClose={handleCloseModal}
        route={selectedRoute}
      />
    </Container>
  );
};

export default RouteDashboard;