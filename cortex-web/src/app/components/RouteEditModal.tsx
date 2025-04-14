'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid,
  InputBase,
  Paper,
  CircularProgress
} from '@mui/material';
import { purple, blue, amber, grey } from '@mui/material/colors';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
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

interface RouteEditModalProps {
  open: boolean;
  onClose: () => void;
  route: Route | null;
}

const RouteEditModal: React.FC<RouteEditModalProps> = ({ open, onClose, route }) => {
  const { selectedTeam } = useGlobal();
  
  const [prefix, setPrefix] = useState<string>('');
  const [targets, setTargets] = useState<Target[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset form when modal opens with a route
  useEffect(() => {
    if (route) {
      setPrefix(route.prefix);
      setTargets([...route.targets]); // Create a deep copy
    } else {
      resetForm();
    }
  }, [route, open]);
  
  const resetForm = () => {
    setPrefix('');
    setTargets([
      { app: '', svc: '', app_ver: 1, weight: 100 }
    ]);
  };
  
  const handleAddTarget = () => {
    // Get values from the most recent target
    const lastTarget = targets[targets.length - 1];
    
    // Create a new target with copied values (except weight)
    const newTarget = {
      app: lastTarget.app,
      svc: lastTarget.svc,
      app_ver: lastTarget.app_ver,
      weight: 0 // Start with 0 weight
    };
    
    // Add the new target to the list
    const newTargets = [...targets, newTarget];
    setTargets(newTargets);
    
    // Recalculate weights to ensure they sum to 100%
    distributeWeights(newTargets);
  };
  
  const handleRemoveTarget = (index: number) => {
    const newTargets = targets.filter((_, i) => i !== index);
    setTargets(newTargets);
    
    // Recalculate weights to ensure they sum to 100%
    distributeWeights(newTargets);
  };
  
  const distributeWeights = (targetList: Target[]) => {
    if (targetList.length === 0) return;
    
    // For single target, always set to 100%
    if (targetList.length === 1) {
      targetList[0].weight = 100;
      return;
    }
    
    // For multiple targets, distribute evenly but sum to 100
    const baseWeight = Math.floor(100 / targetList.length);
    let remainingWeight = 100 - (baseWeight * targetList.length);
    
    targetList.forEach((target, index) => {
      target.weight = baseWeight;
      if (index === 0 && remainingWeight > 0) {
        target.weight += remainingWeight;
      }
    });
  };
  
  const handleTargetChange = (index: number, field: keyof Target, value: string | number) => {
    const newTargets = [...targets];
    
    if (field === 'app_ver' || field === 'weight') {
      // Convert string to number for numeric fields, but handle already-numeric values
      const numValue = typeof value === 'string' ? Number(value) : value;
      
      // Special handling for weight to ensure they sum to 100%
      if (field === 'weight' && newTargets.length === 2) {
        // Only adjust weights automatically when there are exactly 2 targets
        const otherIndex = index === 0 ? 1 : 0;
        
        // Make sure weight is between 0 and 100
        const clampedValue = Math.max(0, Math.min(100, numValue));
        
        // Set this target's weight
        newTargets[index].weight = clampedValue;
        
        // Adjust the other target's weight to maintain sum of 100
        newTargets[otherIndex].weight = 100 - clampedValue;
      } else {
        // For other numeric fields or when not exactly 2 targets
        newTargets[index][field] = numValue;
      }
    } else {
      newTargets[index][field] = value as string;
    }
    
    setTargets(newTargets);
  };
  
  const handleCancel = () => {
    onClose();
  };
  
  const handleReset = () => {
    if (route) {
      setPrefix(route.prefix);
      setTargets([...route.targets]);
    } else {
      resetForm();
    }
  };
  
  const handleApply = async () => {
    if (!selectedTeam) return;
    
    try {
      setIsSubmitting(true);
      
      // Validate form data
      if (!prefix.trim()) {
        alert('Please enter a route prefix');
        setIsSubmitting(false);
        return;
      }
      
      // Check if all targets have app and svc values
      const invalidTargets = targets.some(t => !t.app.trim() || !t.svc.trim());
      if (invalidTargets) {
        alert('Please fill in all application and service fields');
        setIsSubmitting(false);
        return;
      }
      
      // Prepare payload to match the fastapi endpoint's expectations
      const payload = {
        prefix: prefix,
        team_id: selectedTeam.team_id,
        targets: targets.map(t => ({
          app: t.app,
          svc: t.svc,
          app_ver: t.app_ver,
          weight: t.weight
        }))
      };
      
      // Send to API - Make sure we're sending the payload directly in the request body
      const putRouteResponse = await fetch('http://localhost:8000/put_route', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!putRouteResponse.ok) {
        throw new Error('Failed to save route');
      }
      
      // After putting the route, call update_envoy
      const updateEnvoyResponse = await fetch('http://localhost:8000/update_envoy');
      
      if (!updateEnvoyResponse.ok) {
        throw new Error('Failed to update Envoy configuration');
      }
      
      // Everything succeeded, close the modal
      onClose();
    } catch (error) {
      console.error('Error saving route:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Failed to save route'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'white', 
        color: purple[900],
        fontWeight: 'bold',
        fontSize: '1.5rem',
        pb: 1
      }}>
        {route ? 'Update Route' : 'Create Route'}
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
            prefix:
          </Typography>
          <TextField
            fullWidth
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="/app1/main/"
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#e8f5e9',
                borderRadius: 1
              }
            }}
          />
        </Box>
        
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
            targets:
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} container spacing={2}>
              <Grid item xs={3}>
                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                  application:
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle2">
                  service:
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle2">
                  version:
                </Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography variant="subtitle2">
                  weight:
                </Typography>
              </Grid>
              <Grid item xs={1}></Grid>
            </Grid>
          </Grid>
          
          {targets.map((target, index) => (
            <Grid container spacing={2} sx={{ mb: 2 }} key={index}>
              <Grid item xs={3}>
                <Paper
                  component="div"
                  sx={{
                    backgroundColor: blue[100],
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5
                  }}
                >
                  <InputBase
                    fullWidth
                    value={target.app}
                    onChange={(e) => handleTargetChange(index, 'app', e.target.value)}
                    placeholder="app"
                    sx={{
                      '& .MuiInputBase-input': {
                        py: 0.75
                      }
                    }}
                  />
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper
                  component="div"
                  sx={{
                    backgroundColor: blue[100],
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5
                  }}
                >
                  <InputBase
                    fullWidth
                    value={target.svc}
                    onChange={(e) => handleTargetChange(index, 'svc', e.target.value)}
                    placeholder="service-a"
                    sx={{
                      '& .MuiInputBase-input': {
                        py: 0.75
                      }
                    }}
                  />
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper
                  component="div"
                  sx={{
                    backgroundColor: blue[100],
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5
                  }}
                >
                  <InputBase
                    fullWidth
                    value={target.app_ver}
                    onChange={(e) => handleTargetChange(index, 'app_ver', e.target.value)}
                    placeholder="1"
                    type="number"
                    sx={{
                      '& .MuiInputBase-input': {
                        py: 0.75
                      }
                    }}
                  />
                </Paper>
              </Grid>
              <Grid item xs={2}>
                <Paper
                  component="div"
                  sx={{
                    backgroundColor: amber[200],
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5
                  }}
                >
                  <InputBase
                    fullWidth
                    value={target.weight}
                    onChange={(e) => handleTargetChange(index, 'weight', e.target.value)}
                    placeholder="100"
                    type="number"
                    sx={{
                      '& .MuiInputBase-input': {
                        py: 0.75
                      }
                    }}
                  />
                </Paper>
              </Grid>
              <Grid item xs={1} sx={{ display: 'flex', alignItems: 'center' }}>
                {/* Only show remove button if there's more than one target */}
                {targets.length > 1 && (
                  <IconButton 
                    onClick={() => handleRemoveTarget(index)}
                    sx={{ color: grey[500] }}
                  >
                    <RemoveCircleIcon />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          ))}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <IconButton 
              onClick={handleAddTarget}
              sx={{ color: grey[500] }}
            >
              <AddCircleIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={handleCancel}
          variant="contained"
          color="inherit"
          disabled={isSubmitting}
          sx={{ 
            mr: 1,
            bgcolor: grey[300],
            '&:hover': {
              bgcolor: grey[400]
            }
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleReset}
          variant="contained"
          color="inherit"
          disabled={isSubmitting}
          sx={{ 
            mr: 1,
            bgcolor: grey[300],
            '&:hover': {
              bgcolor: grey[400]
            }
          }}
        >
          Reset
        </Button>
        <Button 
          onClick={handleApply}
          variant="contained"
          disabled={isSubmitting}
          sx={{ 
            bgcolor: purple[700],
            '&:hover': {
              bgcolor: purple[800]
            }
          }}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSubmitting ? 'Applying...' : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RouteEditModal;