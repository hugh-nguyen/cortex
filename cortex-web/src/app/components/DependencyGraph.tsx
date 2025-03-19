'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

// Define proper interfaces for our data types
interface Service {
  id: string;
  app: string;
  name: string;
  ver: string;
  x: number;
  y: number;
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

const DependencyGraph: React.FC = () => {
  const svgRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch data from the API
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://127.0.0.1:8000/test');
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        setGraphData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching graph data:', err);
        setError('Failed to load graph data. Please check the console for details.');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);
  
  // Render the graph when data is available
  useEffect(() => {
    if (!graphData || !svgRef.current) return;
    
    const { services, dependencies, apps } = graphData;
    
    const width = 3800;
    const height = 500;
    
    // Create the main SVG element
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);
    
    // Create proper layering for the visualization
    const backLayer = svg.append('g').attr('class', 'back-layer');  // App backgrounds
    const linkLayer = svg.append('g').attr('class', 'link-layer');  // Connection lines
    const nodeLayer = svg.append('g').attr('class', 'node-layer');  // Service nodes
    
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
      .attr('fill', '#FFF5F7')
      .attr('opacity', 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 200)
      .attr('height', d => d.height)
      .attr('opacity', 0.8);
    
    appGroups.append('text')
      .attr('class', 'app-title')
      .attr('x', d => d.width/2)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .attr('fill', '#4A1D3E')
      .attr('opacity', 0)
      .text(d => d.name)
      .transition()
      .duration(800)
      .delay((d, i) => 300 + i * 200)
      .attr('opacity', 1);
    
    const serviceNodes = nodeLayer.selectAll('.service')
      .data(services)
      .join('g')
      .attr('class', 'service')
      .attr('id', d => d.id)
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .attr('opacity', 0)
      .style('cursor', 'move');
    
    serviceNodes.transition()
      .duration(600)
      .delay((d, i) => 600 + i * 300)
      .attr('opacity', 1);
    
    // Calculate relative positions of services to their apps
    const serviceRelativePositions = services.map(service => {
      const app = apps.find(a => a.id === service.app);
      return {
        id: service.id,
        app: service.app,
        relX: app ? service.x - app.x : 0,
        relY: app ? service.y - app.y : 0
      };
    });
    
    function hexagonPath(size: number): string {
      const points: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 3) - (Math.PI / 6);
        points.push([size * Math.cos(angle), size * Math.sin(angle)]);
      }
      return (d3.line()(points as any) || '') + 'Z';
    }
    
    function createBubbles(selection: any, index: number): void {
      const numBubbles = 8;
      const bubbleGroup = selection.append('g').attr('class', 'bubbles');
      
      for (let i = 0; i < numBubbles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 40 + 30;
        const size = Math.random() * 10 + 3;
        const delay = Math.random() * 200 + (index * 300);
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
    
    serviceNodes.each(function(d, i) {
      createBubbles(d3.select(this as Element) as any, i);
    });

    serviceNodes.append('path')
      .attr('class', 'hexagon')
      .attr('d', hexagonPath(40))
      .attr('fill', d => {
        if (d.name === 'service-a') return '#EF5350'; // Red
        if (d.name === 'service-b') return '#90CAF9'; // Light blue
        return '#FFD54F'; // Yellow for service-s
      })
      .attr('stroke', 'none')
      .transition()
      .duration(800)
      .delay((d, i) => 600 + i * 300)
      .attrTween('d', function() {
        return function(t) {
          const elasticT = d3.easeElasticOut.amplitude(1).period(0.3)(t);
          return hexagonPath(40 * elasticT);
        };
      });
    
    // Add service name boxes with animation
    serviceNodes.append('rect')
      .attr('class', 'name-box')
      .attr('x', 60)
      .attr('y', -20)
      .attr('width', 100)
      .attr('height', 30)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', '#CE93D8')
      .transition()
      .duration(600)
      .delay((d, i) => 800 + i * 300)
      .attr('width', 100);
    
    serviceNodes.append('text')
      .attr('class', 'service-name')
      .attr('x', 110)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#4A1D3E')
      .attr('font-weight', 'bold')
      .attr('opacity', 0)
      .text(d => d.name)
      .transition()
      .duration(400)
      .delay((d, i) => 1000 + i * 300)
      .attr('opacity', 1);
    
    serviceNodes.append('rect')
      .attr('class', 'version-box')
      .attr('x', 60)
      .attr('y', 20)
      .attr('width', 100)
      .attr('height', 30)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', '#F8BBD0')
      .transition()
      .duration(600)
      .delay((d, i) => 900 + i * 300)
      .attr('width', 100);
    
    serviceNodes.append('text')
      .attr('class', 'version-number')
      .attr('x', 110)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#4A1D3E')
      .attr('font-size', '13px')
      .attr('opacity', 0)
      .text(d => d.ver)
      .transition()
      .duration(400)
      .delay((d, i) => 1100 + i * 300)
      .attr('opacity', 1);
    
    const links = linkLayer.selectAll('.dependency-link')
      .data(dependencies)
      .join('path')
      .attr('class', 'dependency-link')
      .attr('fill', 'none')
      .attr('stroke', '#2C5282')
      .attr('stroke-width', 2)
      .attr('opacity', 0);
    
    // Function to calculate the points where links connect to hexagons
    function calculateLinkPoints() {
      const hexSize = 40; // Size of hexagons
      
      // Update each link path
      links.each(function(d) {
        const sourceNode = services.find(s => s.id === d.source);
        const targetNode = services.find(s => s.id === d.target);
        
        if (!sourceNode || !targetNode) return;
        
        // Calculate angle between nodes
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const angle = Math.atan2(dy, dx);
        
        // Calculate points at the edge of hexagons
        const sourcePoint = {
          x: sourceNode.x + Math.cos(angle) * hexSize,
          y: sourceNode.y + Math.sin(angle) * hexSize
        };
        
        const targetPoint = {
          x: targetNode.x - Math.cos(angle) * hexSize,
          y: targetNode.y - Math.sin(angle) * hexSize
        };
        
        // Calculate control point for the curve
        let controlPoint;
        
        if (d.source === 'service-a' && d.target === 'service-b') {
          // Custom control for this specific connection
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
    
    // Initial calculation of link paths
    calculateLinkPoints();
    
    links.transition()
      .duration(1000)
      .delay((d, i) => 1500 + i * 300)
      .attr('opacity', 1)
      .attrTween('stroke-dasharray', function() {
        const length = 10000;
        return function(t: number) {
          return `${t * length} ${length}`;
        };
    });
    
    // Make service nodes draggable
    serviceNodes.call(
      (d3.drag() as any)
        .on('start', function(this: any, event: any, d: Service) {
          d3.select(this).raise().attr('stroke', 'black');
        })
        .on('drag', function(this: any, event: any, d: Service) {
          // Update the node position
          d.x = event.x;
          d.y = event.y;
          d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);
          
          // Update the relative position to its app
          const relPos = serviceRelativePositions.find(p => p.id === d.id);
          if (relPos) {
            const app = apps.find(a => a.id === d.app);
            if (app) {
              relPos.relX = d.x - app.x;
              relPos.relY = d.y - app.y;
            }
          }
          
          // Update links
          calculateLinkPoints();
        })
        .on('end', function(this: any, event: any, d: Service) {
          d3.select(this).attr('stroke', null);
          calculateLinkPoints();
        })
    );

    // Make app groups draggable
    appGroups.call(
      (d3.drag() as any)
        .on('start', function(this: any, event: any, d: App) {
          d3.select(this).attr('opacity', 0.8);
        })
        .on('drag', function(this: any, event: any, d: App) {
          // Update app position
          d.x = event.x;
          d.y = event.y;
          d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);
          
          // Update all services in this app
          services.forEach(service => {
            if (service.app === d.id) {
              // Find this service's relative position
              const relPos = serviceRelativePositions.find(p => p.id === service.id);
              if (relPos) {
                // Update service position based on app's position and relative offset
                service.x = d.x + relPos.relX;
                service.y = d.y + relPos.relY;
                
                // Update service visual position
                d3.select(`#${service.id}`).attr('transform', `translate(${service.x}, ${service.y})`);
              }
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
    
  }, [graphData]);
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {loading && (
        <div className="flex justify-center items-center h-64">
          <p>Loading graph data...</p>
        </div>
      )}
      {error && (
        <div className="border border-red-500 bg-red-100 p-4 rounded mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      {!loading && !error && (
        <div className="rounded p-4 bg-white">
          <div ref={svgRef} className="w-full h-96"></div>
        </div>
      )}
    </div>
  );
};

export default DependencyGraph;