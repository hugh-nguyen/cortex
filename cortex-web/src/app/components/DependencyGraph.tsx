'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  Paper, 
  Slider, 
  IconButton, 
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

// Define proper interfaces for our data types
interface Service {
  id: string;
  app: string;
  name: string;
  ver: string;
  x: number;
  y: number;
  // Adding calculated absolute positions
  absX?: number;
  absY?: number;
}

interface Dependency {
  source: string;
  target: string;
}

interface App {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GraphData {
  services: Service[];
  dependencies: Dependency[];
  apps: App[];
}

interface DependencyGraphProps {
  customGraphData?: GraphData;
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({ customGraphData }) => {
  const svgRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(0.7); // Default to 70%
  
  // Process data to calculate absolute positions from relative
  const processGraphData = (data: GraphData): GraphData => {
    // Create a copy of the data to avoid mutating the original
    const processedData = {
      ...data,
      services: data.services.map(service => {
        // Find the parent app
        const app = data.apps.find(a => a.id === service.app);
        
        // Calculate absolute position based on relative position to the app
        const absX = app ? app.x + service.x : service.x;
        const absY = app ? app.y + service.y : service.y;
        
        // Return the service with absolute position
        return {
          ...service,
          // Store original x/y as relative positions
          absX,
          absY
        };
      })
    };
    
    return processedData;
  };
  
  // Fetch data from the API when no custom data is provided
  useEffect(() => {
    if (customGraphData) {
      // Process the custom data to calculate absolute positions
      const processedData = processGraphData(customGraphData);
      setGraphData(processedData);
      setLoading(false);
      return;
    }
    
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://127.0.0.1:8000/test_graph');
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        // Process the fetched data to calculate absolute positions
        const processedData = processGraphData(data);
        setGraphData(processedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching graph data:', err);
        setError('Failed to load graph data. Please check the console for details.');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [customGraphData]);
  
  // Render the graph when data is available or zoom changes
  useEffect(() => {
    if (!graphData || !svgRef.current) return;
    
    const { services, dependencies, apps } = graphData;
    
    const width = 800;
    const height = 600;
    
    // Clear existing SVG before redrawing
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create the main SVG element
    const svg = d3.select(svgRef.current)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, width, height])
      .attr('preserveAspectRatio', 'xMidYMid meet');
    
    // Create a group for everything to apply zoom transform
    const g = svg.append('g')
      .attr('transform', `scale(${zoomLevel})`);
    
    // Create proper layering for the visualization
    const backLayer = g.append('g').attr('class', 'back-layer');  // App backgrounds
    const linkLayer = g.append('g').attr('class', 'link-layer');  // Connection lines
    const nodeLayer = g.append('g').attr('class', 'node-layer');  // Service nodes
    
    // Create app backgrounds
    const appGroups = backLayer.selectAll('.app-group')
      .data(apps)
      .join('g')
      .attr('class', 'app-group')
      .attr('id', d => `app-${d.id}`)
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'move');
    
    appGroups.append('rect')
      .attr('class', 'app-bg')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('fill', (d, i) => i === 0 ? '#F8E6EE' : '#FFF5F7') // Slightly darker for first app
      .attr('opacity', 0)
      .transition()
      .duration(400)
      .delay((d, i) => i * 200)
      .attr('height', d => d.height)
      .attr('opacity', 0.8);
    
    appGroups.append('text')
      .attr('class', 'app-title')
      .attr('x', d => d.width/2)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', (d, i) => i === 0 ? '24px' : '20px') // Smaller font for non-main apps
      .attr('font-weight', 'bold')
      .attr('fill', '#4A1D3E')
      .attr('opacity', 0)
      .text(d => d.name)
      .transition()
      .duration(800)
      .delay((d, i) => 300 + i * 200)
      .attr('opacity', 1);
    
    function hexagonPath(size: number): string {
      const points: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 3) - (Math.PI / 6);
        points.push([size * Math.cos(angle), size * Math.sin(angle)]);
      }
      return (d3.line()(points as any) || '') + 'Z';
    }
    
    function createBubbles(selection: any): void {
      const numBubbles = 8;
      const bubbleGroup = selection.append('g').attr('class', 'bubbles');
      
      for (let i = 0; i < numBubbles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 40 + 30;
        const size = Math.random() * 10 + 3;
        const delay = Math.random() * 200 + 800; // Consistent delay base for all nodes
        const duration = Math.random() * 800 + 600;
        
        const bubble = bubbleGroup.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 0)
          .attr('fill', () => {
            const colors = ['#EF5350', '#90CAF9', '#FFD54F'];
            return colors[Math.floor(Math.random() * colors.length)];
          })
          .attr('opacity', 0);
        
        bubble.transition()
          .delay(delay)
          .duration(duration)
          .attr('cx', Math.cos(angle) * distance)
          .attr('cy', Math.sin(angle) * distance)
          .attr('r', size)
          .attr('opacity', 0.3)
          .transition()
          .duration(400)
          .attr('opacity', 0)
          .attr('r', 0)
          .remove();
      }
    }
    
    // Function to calculate the points where links connect to hexagons
    function calculateLinkPoints() {
      const hexSize = 40; // Size of hexagons
      
      // Update each link path
      links.each(function(d) {
        const sourceNode = services.find(s => s.id === d.source);
        const targetNode = services.find(s => s.id === d.target);
        
        if (!sourceNode || !targetNode) return;
        
        // Use absolute positions for link calculations
        const sourceX = sourceNode.absX || sourceNode.x;
        const sourceY = sourceNode.absY || sourceNode.y;
        const targetX = targetNode.absX || targetNode.x;
        const targetY = targetNode.absY || targetNode.y;
        
        // Calculate angle between nodes
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const angle = Math.atan2(dy, dx);
        
        // Calculate points at the edge of hexagons
        const sourcePoint = {
          x: sourceX + Math.cos(angle) * hexSize,
          y: sourceY + Math.sin(angle) * hexSize
        };
        
        const targetPoint = {
          x: targetX - Math.cos(angle) * hexSize,
          y: targetY - Math.sin(angle) * hexSize
        };
        
        // Calculate control point for the curve
        let controlPoint;
        
        if ((d.source === 'service-a' && d.target === 'service-b') || 
            (d.source === 'service-y' && d.target === 'service-s')) {
          // Custom control for specific connections
          controlPoint = {
            x: sourcePoint.x - 60,
            y: (sourcePoint.y + targetPoint.y) / 2
          };
        } else {
          // Default control point is midway between nodes but offset
          const midX = (sourcePoint.x + targetPoint.x) / 2;
          const midY = (sourcePoint.y + targetPoint.y) / 2;
          
          controlPoint = {
            x: midX,
            y: midY - 40
          };
        }
        
        // Create curved path
        const path = `M${sourcePoint.x},${sourcePoint.y} Q${controlPoint.x},${controlPoint.y} ${targetPoint.x},${targetPoint.y}`;
        d3.select(this).attr('d', path);
      });
    }
    
    // Create links with light gray color by default
    const links = linkLayer.selectAll('.dependency-link')
      .data(dependencies)
      .join('path')
      .attr('class', 'dependency-link')
      .attr('fill', 'none')
      .attr('stroke', '#D3D3D3')  // Light gray color
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .attr('data-source', d => d.source)
      .attr('data-target', d => d.target);
    
    // Initial calculation of link paths
    calculateLinkPoints();
    
    links.transition()
      .duration(1000)
      .delay(1500) // Fixed delay for all links
      .attr('opacity', 1)
      .attrTween('stroke-dasharray', function() {
        const length = 10000;
        return function(t: number) {
          return `${t * length} ${length}`;
        };
    });
    
    // Use the calculated absolute positions for the service nodes
    const serviceNodes = nodeLayer.selectAll('.service')
      .data(services)
      .join('g')
      .attr('class', 'service')
      .attr('id', d => d.id)
      .attr('transform', d => `translate(${d.absX || d.x}, ${d.absY || d.y})`)
      .attr('opacity', 0)
      .style('cursor', 'pointer');  // Changed to pointer to indicate interactivity
    
    // Make all service nodes appear simultaneously
    serviceNodes.transition()
      .duration(600)
      .delay(600) // Fixed delay for all nodes
      .attr('opacity', 1);
    
    // Create bubbles for all nodes with the same timing
    serviceNodes.each(function() {
      createBubbles(d3.select(this as Element) as any);
    });

    // Add hexagons to all nodes simultaneously
    serviceNodes.append('path')
      .attr('class', 'hexagon')
      .attr('d', hexagonPath(0)) // Start with size 0
      .attr('fill', d => {
        if (d.name === 'service-a' || d.name === 'service-y') return '#EF5350'; // Red
        if (d.name === 'service-b') return '#90CAF9'; // Light blue
        return '#FFD54F'; // Yellow for service-s
      })
      .attr('stroke', 'none')
      .transition()
      .duration(800)
      .delay(600) // Same delay for all hexagons
      .attrTween('d', function() {
        return function(t) {
          const elasticT = d3.easeElasticOut.amplitude(1).period(0.3)(t);
          return hexagonPath(40 * elasticT);
        };
      });
    
    // Add service name boxes with animation
    serviceNodes.append('rect')
      .attr('class', 'name-box')
      .attr('x', 40)
      .attr('y', -25)
      .attr('width', 0) // Start with width 0
      .attr('height', 30)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', '#CE93D8')
      .transition()
      .duration(600)
      .delay(800) // Same delay for all name boxes
      .attr('width', 100);
    
    serviceNodes.append('text')
      .attr('class', 'service-name')
      .attr('x', 90)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#4A1D3E')
      .attr('font-weight', 'bold')
      .attr('opacity', 0)
      .text(d => d.name)
      .transition()
      .duration(400)
      .delay(1000) // Same delay for all service names
      .attr('opacity', 1);
    
    serviceNodes.append('rect')
      .attr('class', 'version-box')
      .attr('x', 40)
      .attr('y', 9)
      .attr('width', 0) // Start with width 0
      .attr('height', 20)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', '#F8BBD0')
      .transition()
      .duration(600)
      .delay(900) // Same delay for all version boxes
      .attr('width', 100);
    
    serviceNodes.append('text')
      .attr('class', 'version-number')
      .attr('x', 90)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#4A1D3E')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('opacity', 0)
      .text(d => d.ver)
      .transition()
      .duration(400)
      .delay(1100) // Same delay for all version numbers
      .attr('opacity', 1);
    
    // Add hover effects to service nodes for link highlighting
    serviceNodes
      .on('mouseover', function(event, d) {
        // Highlight the current node
        d3.select(this).select('.hexagon')
          .transition()
          .duration(200)
          .attr('stroke', '#333')
          .attr('stroke-width', 2);
        
        // Find all connected links (both as source and target)
        links.each(function(linkData) {
          if (linkData.source === d.id || linkData.target === d.id) {
            // Highlight connected links
            d3.select(this)
              .transition()
              .duration(200)
              .attr('stroke', '#2C5282')  // Darker blue color for highlighted links
              .attr('stroke-width', 3);
          }
        });
      })
      .on('mouseout', function() {
        // Reset node highlighting
        d3.select(this).select('.hexagon')
          .transition()
          .duration(200)
          .attr('stroke', 'none');
        
        // Reset link highlighting
        links
          .transition()
          .duration(200)
          .attr('stroke', '#D3D3D3')  // Back to light gray
          .attr('stroke-width', 2);
      });
    
    // Make service nodes draggable with updated positioning logic
    serviceNodes.call(
      (d3.drag() as any)
        .on('start', function(this: any, event: any, d: Service) {
          d3.select(this).raise().select('.hexagon').attr('stroke', '#333');
        })
        .on('drag', function(this: any, event: any, d: Service) {
          d.absX = event.x;
          d.absY = event.y;
          
          // Update the visual position
          d3.select(this).attr('transform', `translate(${d.absX}, ${d.absY})`);
          
          // Update the relative position to its app
          const app = apps.find(a => a.id === d.app);
          if (app) {
            // Calculate new relative position
            d.x = (d.absX ? d.absX : 0) - app.x;
            d.y = (d.absY ? d.absY : 0) - app.y;
          }
          
          // Update links
          calculateLinkPoints();
        })
    );

    // Make app groups draggable with updated positioning logic
    appGroups.call(
      (d3.drag() as any)
        .on('start', function(this: any, event: any, d: App) {
          d3.select(this).attr('opacity', 0.8);
        })
        .on('drag', function(this: any, event: any, d: App) {
          // Calculate position change
          const deltaX = event.x - d.x;
          const deltaY = event.y - d.y;
          
          // Update app position
          d.x = event.x;
          d.y = event.y;
          d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);
          
          // Update all services in this app
          services.forEach(service => {
            if (service.app === d.id) {
              // Update absolute position based on app movement
              service.absX = (service.absX || service.x) + deltaX;
              service.absY = (service.absY || service.y) + deltaY;
              
              // Update service visual position
              d3.select(`#${service.id}`).attr('transform', `translate(${service.absX}, ${service.absY})`);
            }
          });
          
          // Update links
          calculateLinkPoints();
        })
        .on('end', function(this: any, event: any, d: App) {
          d3.select(this).attr('opacity', 1);
          calculateLinkPoints();
        })
    );
        
    // Ensure proper layering
    backLayer.lower(); // App backgrounds at the back
    nodeLayer.raise(); // Service nodes at the front
    
  }, [graphData, zoomLevel]);
  
  const handleZoomChange = (_event: Event, newValue: number | number[]) => {
    setZoomLevel(newValue as number);
  };
  
  const zoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 0.1, 1.5));
  };
  
  const zoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 0.1, 0.3));
  };
  
  const resetZoom = () => {
    setZoomLevel(0.7);
  };
  
  return (
    <Box sx={{ width: '100%', height: '100%', minHeight: '600px', position: 'relative' }}>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}
      
      {!loading && !error && (
        <>
          <Box 
            ref={svgRef} 
            sx={{ 
              width: '100%', 
              height: '100%', 
              minHeight: '600px',
              bgcolor: 'white',
              borderRadius: 1
            }}
          />
          
          {/* Zoom Controls */}
          <Paper 
            elevation={3} 
            sx={{ 
              position: 'absolute', 
              bottom: 16, 
              right: 16, 
              p: 1.5, 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Typography variant="caption" sx={{ mb: 0.5 }}>
              Zoom: {Math.round(zoomLevel * 100)}%
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Zoom Out">
                <IconButton 
                  size="small" 
                  onClick={zoomOut}
                  disabled={zoomLevel <= 0.3}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Slider
                value={zoomLevel}
                min={0.3}
                max={1.5}
                step={0.1}
                onChange={handleZoomChange}
                sx={{ width: 100 }}
              />
              
              <Tooltip title="Zoom In">
                <IconButton 
                  size="small" 
                  onClick={zoomIn}
                  disabled={zoomLevel >= 1.5}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Reset Zoom">
                <IconButton size="small" onClick={resetZoom}>
                  <RestartAltIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default DependencyGraph;