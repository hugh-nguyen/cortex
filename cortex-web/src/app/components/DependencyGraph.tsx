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
    
    const width = 800;
    const height = 500;
    
    // Create the main SVG element
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);
    
    // Create arrow marker for link ends
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#2C5282')
      .attr('d', 'M0,-5L10,0L0,5');
    
    // Add application backgrounds with animation
    const appBg = svg.selectAll<SVGRectElement, App>('.app-bg')
      .data(apps)
      .join('rect')
      .attr('class', 'app-bg')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.width)
      .attr('height', 0) 
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('fill', '#FFF5F7')
      .attr('opacity', 0);
    
    // Animate app backgrounds
    appBg.transition()
      .duration(800)
      .delay((d, i) => i * 200)
      .attr('height', d => d.height)
      .attr('opacity', 1);
    
    // Add app titles with animation
    const appTitles = svg.selectAll<SVGTextElement, App>('.app-title')
      .data(apps)
      .join('text')
      .attr('class', 'app-title')
      .attr('x', d => d.x + d.width/2)
      .attr('y', d => d.y + 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .attr('fill', '#4A1D3E')
      .attr('opacity', 0)
      .text(d => d.name);
    
    // Animate app titles
    appTitles.transition()
      .duration(800)
      .delay((d, i) => 300 + i * 200)
      .attr('opacity', 1);
    
    // Create a container for links that will be below nodes
    const linksGroup = svg.append('g').attr('class', 'links');
    
    // Helper function to create hexagon path
    function hexagonPath(size: number): string {
      const points: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 3) - (Math.PI / 6);
        points.push([size * Math.cos(angle), size * Math.sin(angle)]);
      }
      return d3.line()(points) + 'Z';
    }
    
    // Function to determine hexagon color based on service
    function getHexagonColor(service: Service): string {
      if (service.name === 'service-a') return '#EF5350'; // Red
      if (service.name === 'service-b') return '#90CAF9'; // Light blue
      return '#FFD54F'; // Yellow for service-s
    }
    
    // Create a group for each service that will be draggable
    const serviceGroups = svg.append('g')
      .selectAll<SVGGElement, Service>('.service')
      .data(services)
      .join('g')
      .attr('class', 'service')
      .attr('id', d => d.id)
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .attr('opacity', 0)
      .style('cursor', 'move');
    
    // Animate service groups appearance
    serviceGroups.transition()
      .duration(600)
      .delay((d, i) => 600 + i * 300)
      .attr('opacity', 1);
    
    // Function to create bubbles around hexagons for bubbly effect
    function createBubbles(selection: d3.Selection<SVGGElement, Service, null, undefined>, index: number): void {
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
    
    // Create bubbles as nodes appear
    serviceGroups.each(function(d, i) {
      createBubbles(d3.select<SVGGElement, Service>(this), i);
    });
    
    // Add hexagons to service groups
    const hexagons = serviceGroups.append('path')
      .attr('class', 'hexagon')
      .attr('d', hexagonPath(0))
      .attr('fill', d => getHexagonColor(d))
      .attr('stroke', 'none');
    
    // Animate hexagons
    hexagons.transition()
      .duration(800)
      .delay((d, i) => 600 + i * 300)
      .attr('d', hexagonPath(40))
      .attrTween('d', function() {
        return function(t) {
          const elasticT = d3.easeElasticOut.amplitude(1).period(0.3)(t);
          return hexagonPath(40 * elasticT);
        };
      });
    
    // Add service name boxes
    const nameBoxes = serviceGroups.append('rect')
      .attr('class', 'name-box')
      .attr('x', 60)
      .attr('y', -20)
      .attr('width', 0)
      .attr('height', 30)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', '#CE93D8'); // Purple
    
    // Animate service name boxes
    nameBoxes.transition()
      .duration(600)
      .delay((d, i) => 800 + i * 300)
      .attr('width', 100);
    
    // Add service names with animation
    const serviceNames = serviceGroups.append('text')
      .attr('class', 'service-name')
      .attr('x', 110)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#4A1D3E')
      .attr('font-weight', 'bold')
      .attr('opacity', 0)
      .text(d => d.name);
    
    // Animate service names
    serviceNames.transition()
      .duration(400)
      .delay((d, i) => 1000 + i * 300)
      .attr('opacity', 1);
    
    // Add version boxes
    const versionBoxes = serviceGroups.append('rect')
      .attr('class', 'version-box')
      .attr('x', 60)
      .attr('y', 20)
      .attr('width', 0)
      .attr('height', 30)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', '#F8BBD0'); // Light pink
    
    // Animate version boxes
    versionBoxes.transition()
      .duration(600)
      .delay((d, i) => 900 + i * 300)
      .attr('width', 100);
    
    // Add version numbers with animation
    const versionNumbers = serviceGroups.append('text')
      .attr('class', 'version-number')
      .attr('x', 110)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#4A1D3E')
      .attr('font-size', '13px')
      .attr('opacity', 0)
      .text(d => d.ver);
    
    // Animate version numbers
    versionNumbers.transition()
      .duration(400)
      .delay((d, i) => 1100 + i * 300)
      .attr('opacity', 1);
    
    // Create the link paths
    const linkPaths = linksGroup
      .selectAll<SVGPathElement, Dependency>('path')
      .data(dependencies)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#2C5282')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .attr('marker-end', 'url(#arrow)')
      .attr('pointer-events', 'none');
    
    // Function to get service position by ID
    function getServicePos(id: string): {x: number, y: number} | null {
      const service = services.find(s => s.id === id);
      return service ? { x: service.x, y: service.y } : null;
    }
    
    // Function to update link paths
    function updateLinks(): void {
      linkPaths.each(function(d) {
        const source = getServicePos(d.source);
        const target = getServicePos(d.target);
        
        if (!source || !target) return;
        
        let controlPoint: {x: number, y: number};
        
        if (d.source === 'service-a' && d.target === 'service-b') {
          controlPoint = {
            x: source.x - 80, 
            y: (source.y + target.y) / 2
          };
        } else {
          controlPoint = {
            x: (source.x + target.x) / 2,
            y: (source.y + target.y) / 2 - 60
          };
        }
        
        const pathData = `M${source.x},${source.y} Q${controlPoint.x},${controlPoint.y} ${target.x},${target.y}`;
        d3.select(this).attr('d', pathData);
      });
    }
    
    // Set initial link positions
    setTimeout(updateLinks, 100);
    
    // Animate link appearance
    linkPaths.transition()
      .duration(1000)
      .delay((d, i) => 1500 + i * 300)
      .attr('opacity', 1)
      .attrTween('stroke-dasharray', function() {
        const length = this.getTotalLength() || 100;
        return function(t) {
          return `${t * length} ${length}`;
        };
      })
      .on('end', updateLinks);
    
    // Make service groups draggable
    serviceGroups.call(d3.drag<SVGGElement, Service>()
      .on('start', dragStarted)
      .on('drag', dragging)
      .on('end', dragEnded));
    
    function dragStarted(event: d3.D3DragEvent<SVGGElement, Service, Service>, d: Service): void {
      d3.select<SVGGElement, Service>(event.sourceEvent.currentTarget).raise().attr('stroke', 'black');
    }
    
    function dragging(event: d3.D3DragEvent<SVGGElement, Service, Service>, d: Service): void {
      d.x = event.x;
      d.y = event.y;
      
      d3.select<SVGGElement, Service>(event.sourceEvent.currentTarget)
        .attr('transform', `translate(${d.x}, ${d.y})`);
      
      requestAnimationFrame(updateLinks);
    }
    
    function dragEnded(event: d3.D3DragEvent<SVGGElement, Service, Service>, d: Service): void {
      d3.select<SVGGElement, Service>(event.sourceEvent.currentTarget)
        .attr('stroke', null);
      
      updateLinks();
      setTimeout(updateLinks, 50);
    }
    
  }, [graphData]);
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* <h2 className="text-xl font-bold mb-4">Service Dependency Graph</h2> */}
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