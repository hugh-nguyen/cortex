'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const DependencyGraph = () => {
  const svgRef = useRef(null);
  
  useEffect(() => {
    // Data for services - this needs to be accessible throughout
    const services = [
      { id: "service-a", app: "app1", name: "service-a", ver: "0.0.30", x: 160, y: 150 },
      { id: "service-b", app: "app1", name: "service-b", ver: "0.0.7", x: 160, y: 320 },
      { id: "service-s", app: "shared-app", name: "service-s", ver: "0.0.4", x: 580, y: 250 }
    ];
    
    // Data for dependencies between services
    const dependencies = [
      { source: "service-a", target: "service-b" },
      { source: "service-b", target: "service-s" }
    ];
    
    // Application groupings
    const apps = [
      { id: "app1", name: "app1", x: 40, y: 40, width: 360, height: 430 },
      { id: "shared-app", name: "shared-app", x: 440, y: 40, width: 360, height: 430 }
    ];
    
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
    const appBg = svg.selectAll('.app-bg')
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
    const appTitles = svg.selectAll('.app-title')
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
    function hexagonPath(size) {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 3) - (Math.PI / 6);
        points.push([size * Math.cos(angle), size * Math.sin(angle)]);
      }
      return d3.line()(points) + 'Z';
    }
    
    // Function to determine hexagon color based on service
    function getHexagonColor(service) {
      if (service.name === 'service-a') return '#EF5350'; // Red
      if (service.name === 'service-b') return '#90CAF9'; // Light blue
      return '#FFD54F'; // Yellow for service-s
    }
    
    // Create a group for each service that will be draggable
    const serviceGroups = svg.append('g')
      .selectAll('.service')
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
    function createBubbles(selection, index) {
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
      createBubbles(d3.select(this), i);
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
      .attr('font-size', '13px') // Medium font size
      .attr('opacity', 0)
      .text(d => d.ver);
    
    // Animate version numbers
    versionNumbers.transition()
      .duration(400)
      .delay((d, i) => 1100 + i * 300)
      .attr('opacity', 1);
    
    // COMPLETELY REDESIGNED LINK HANDLING
    
    // Create the link paths
    const linkPaths = linksGroup
      .selectAll('path')
      .data(dependencies)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#2C5282')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .attr('marker-end', 'url(#arrow)')
      .attr('pointer-events', 'none'); // So they don't capture mouse events
    
    // Function to get service position by ID
    function getServicePos(id) {
      const service = services.find(s => s.id === id);
      return service ? { x: service.x, y: service.y } : null;
    }
    
    // Function to update link paths
    function updateLinks() {
      linkPaths.each(function(d) {
        const source = getServicePos(d.source);
        const target = getServicePos(d.target);
        
        if (!source || !target) return;
        
        // Create a curved path based on the relationship
        let controlPoint;
        
        if (d.source === 'service-a' && d.target === 'service-b') {
          // Create more of a curved vertical path
          controlPoint = {
            x: source.x - 80, 
            y: (source.y + target.y) / 2
          };
        } else {
          // Create a curved diagonal path
          controlPoint = {
            x: (source.x + target.x) / 2,
            y: (source.y + target.y) / 2 - 60
          };
        }
        
        // Draw the path
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
        // Get the total length for the line drawing animation
        const length = this.getTotalLength() || 100;
        return function(t) {
          return `${t * length} ${length}`;
        };
      })
      .on('end', updateLinks);
    
    // Make service groups draggable
    serviceGroups.call(d3.drag()
      .on('start', dragStarted)
      .on('drag', dragging)
      .on('end', dragEnded));
    
    function dragStarted(event, d) {
      // Highlight the node being dragged
      d3.select(this).raise().attr('stroke', 'black');
    }
    
    function dragging(event, d) {
      // Update service data position
      d.x = event.x;
      d.y = event.y;
      
      // Update group position
      d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);
      
      // Update links (using requestAnimationFrame for better performance)
      requestAnimationFrame(updateLinks);
    }
    
    function dragEnded(event, d) {
      // Remove highlight
      d3.select(this).attr('stroke', null);
      
      // Final link update
      updateLinks();
      
      // Force another update after a small delay to ensure links are drawn correctly
      setTimeout(updateLinks, 50);
    }
    
  }, []);
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Service Dependency Graph</h2>
      <div className="border rounded p-4 bg-white">
        <div ref={svgRef} className="w-full h-96"></div>
      </div>
    </div>
  );
};

export default DependencyGraph;