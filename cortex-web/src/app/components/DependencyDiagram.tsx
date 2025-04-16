'use client';

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { M_PLUS_1 } from 'next/font/google';

interface DependencyDiagramProps {
  teamId: number | null;
  onError?: (error: string) => void;
}

interface AppVersion {
  version: number;
  app_name: string;
  services: {
    app: string;
    svc: string;
    svc_ver: string;
  }[];
  dependencies: {
    app: string;
    svc: string;
    svc_ver: string;
  }[];
  links: {
    source: { app: string; svc: string };
    target: { app: string; svc: string };
  }[];
}

interface Data {
  app_versions: AppVersion[];
  dependency_graph: Record<string, DependencyEdge[]>
}

interface Service {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface DependencyEdge {
  target: string;
  appVersion: number;
}

const DependencyDiagram: React.FC<DependencyDiagramProps> = ({ teamId, onError }) => {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(40);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/get_app_dashboard_data?team_id=${teamId ?? 4}`
        );
  
        if (!res.ok) {
          throw new Error(`Server responded ${res.status}`);
        }
  
        const parsedData: Data = await res.json();
  
        setData(parsedData);
        setLoading(false);
      } catch (err: any) {
        setError(`Error loading data: ${err.message ?? 'Unknown error'}`);
        setLoading(false);
      }
    };
  
    fetchData();
  }, [teamId]);

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 10, 100));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 10, 20));
  };

  const handleReset = () => {
    setZoom(40);
  };

  if (loading) return <div className="flex justify-center items-center h-64">Loading data...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div className="text-gray-500">No data available</div>;

  // Extract all unique services and their versions
  // We'll build an object that accumulates sets first, then converts to sorted arrays.
  const serviceVersions: Record<string, Set<string> | string[]> = {};

  // Process services in app_versions
  data.app_versions.forEach((appVersion) => {
    appVersion.services.forEach((svc) => {
      const key = `${svc.app}/${svc.svc}`;
      if (!serviceVersions[key]) {
        serviceVersions[key] = new Set<string>();
      }
      (serviceVersions[key] as Set<string>).add(svc.svc_ver);
    });
  });

  // Process dependencies (for shared services)
  data.app_versions.forEach((appVersion) => {
    appVersion.dependencies.forEach((dep) => {
      const key = `${dep.app}/${dep.svc}`;
      if (!serviceVersions[key]) {
        serviceVersions[key] = new Set<string>();
      }
      (serviceVersions[key] as Set<string>).add(dep.svc_ver);
    });
  });

  // Convert sets to sorted arrays
  Object.keys(serviceVersions).forEach((service) => {
    serviceVersions[service] = Array.from(serviceVersions[service] as Set<string>).sort((a, b) => {
      const verA = a.split('.').map(Number);
      const verB = b.split('.').map(Number);

      for (let i = 0; i < Math.max(verA.length, verB.length); i++) {
        const numA = i < verA.length ? verA[i] : 0;
        const numB = i < verB.length ? verB[i] : 0;
        if (numA !== numB) return numA - numB;
      }
      return 0;
    });
  });

  // Define fixed layout for the services - arranged alphabetically
  const services: Service[] = [
    { id: 'test-app1/mfe-a', x: 250, y: 120, color: '#4299e1' }, // blue
    { id: 'test-app1/service-b', x: 250, y: 260, color: '#ed8936' }, // orange
    { id: 'test-app2/mfe-x', x: 700, y: 120, color: '#ecc94b' }, // yellow
    { id: 'test-app2/service-y', x: 700, y: 260, color: '#48bb78' }, // green
    { id: 'test-shared-app/service-s', x: 475, y: 400, color: '#805ad5' } // purple
  ];

  // Calculate name widths
  const nameWidths: Record<string, number> = {};
  services.forEach((service) => {
    nameWidths[service.id] = service.id.length * 8 + 20;
  });

  // Define hexagon dimensions
  const hexSize = 30;

  // Create a map for quick service lookups
  const serviceMap: Record<string, Service> = {};
  services.forEach((svc) => {
    serviceMap[svc.id] = svc;
  });

  // Build a graph of dependencies
  const dependencyGraph: Record<string, DependencyEdge[]> = data.dependency_graph;

  // Function to find all paths from a source node
  const findAllPaths = (source: string): { paths: Set<string>; nodes: Set<string> } => {
    const visitedForward = new Set<string>();
    const visitedBackward = new Set<string>();
    const paths = new Set<string>();
    const nodes = new Set<string>();

    // Forward traversal - finding all descendants
    const dfsForward = (currentNode: string) => {
      if (visitedForward.has(currentNode)) return;
      visitedForward.add(currentNode);
      nodes.add(currentNode);
      if (dependencyGraph[currentNode]) {
        dependencyGraph[currentNode].forEach((edge) => {
          const edgeId = `${currentNode}|${edge.target}|${edge.appVersion}`;
          paths.add(edgeId);
          nodes.add(edge.target);
          dfsForward(edge.target);
        });
      }
    };

    // Helper: Find incoming edges for a given node
    const findIncomingEdges = (targetNode: string): { source: string; appVersion: number }[] => {
      const incoming: { source: string; appVersion: number }[] = [];
      Object.entries(dependencyGraph).forEach(([src, targets]) => {
        targets.forEach((edge) => {
          if (edge.target === targetNode) {
            incoming.push({
              source: src,
              appVersion: edge.appVersion
            });
          }
        });
      });
      return incoming;
    };

    // Backward traversal - finding all ancestors
    const dfsBackward = (currentNode: string) => {
      if (visitedBackward.has(currentNode)) return;
      visitedBackward.add(currentNode);
      nodes.add(currentNode);
      const incoming = findIncomingEdges(currentNode);
      incoming.forEach((edge) => {
        const edgeId = `${edge.source}|${currentNode}|${edge.appVersion}`;
        paths.add(edgeId);
        nodes.add(edge.source);
        dfsBackward(edge.source);
      });
    };

    dfsForward(source);
    dfsBackward(source);
    return { paths, nodes };
  };

  // Calculate highlight paths
  const highlightedPaths = new Set<string>();
  const highlightedNodes = new Set<string>();

  if (hoveredNode) {
    const { paths, nodes } = findAllPaths(hoveredNode);
    paths.forEach((path) => highlightedPaths.add(path));
    nodes.forEach((node) => highlightedNodes.add(node));
  }

  const scale = zoom / 40; // Base scale is 40%

  // Calculate width for each service box based on the number of hexagons
  const calculateBoxWidth = (serviceId: string): number => {
    const versions = serviceVersions[serviceId] as string[] | undefined;
    const versionsCount = versions ? versions.length : 0;
    const nameWidth = nameWidths[serviceId];
    // Base width (for the name) + width for hexagons
    return Math.max(300, nameWidth + 40 + versionsCount * (hexSize * 2 + 10));
  };

  return (
    <div className="p-4">
      <div className="inline-flex items-center mb-4 bg-white shadow rounded-lg p-2 space-x-2">
        <div className="text-sm text-gray-700">Zoom: {zoom}%</div>
        <div className="flex items-center space-x-2">
          <button onClick={handleZoomOut} className="text-gray-500 hover:text-gray-800 p-1">
            −
          </button>
          <div className="w-20 h-2 bg-gray-200 rounded-full relative">
            <div
              className="absolute h-2 bg-purple-600 rounded-full"
              style={{ width: `${zoom}%` }}
            ></div>
            <div
              className="absolute w-4 h-4 bg-purple-600 rounded-full -mt-1"
              style={{ left: `calc(${zoom}% - 8px)` }}
            ></div>
          </div>
          <button onClick={handleZoomIn} className="text-gray-500 hover:text-gray-800 p-1">
            +
          </button>
          <button onClick={handleReset} className="ml-2 text-gray-500 hover:text-gray-800">
            ↺
          </button>
        </div>
      </div>

      <div className="overflow-auto flex justify-center bg-white" style={{ maxHeight: '1200px', maxWidth: '2400px' }}>
        <svg
          width="100%"
          height={1000 * scale}
          viewBox="0 0 800 1000"
          className="border border-gray-200"
          style={{ backgroundColor: '#ffffff', maxWidth: '100%' }}
        >
          {services.map((service) => {
            const boxWidth = calculateBoxWidth(service.id);
            const hexStartX = service.x - boxWidth / 2 + nameWidths[service.id] + 20;

            return (
              <g key={service.id}>
                {/* Service box */}
                <rect
                  x={service.x - boxWidth / 2}
                  y={service.y - 40}
                  width={boxWidth}
                  height={80}
                  stroke="gray"
                  strokeDasharray="5,5"
                  fill="#f5f5f5"
                  rx={10}
                  ry={10}
                />

                {/* Service name */}
                <text x={service.x - boxWidth / 2 + 10} y={service.y + 5} className="text-sm font-medium">
                  {service.id}
                </text>

                {/* Version hexagons */}
                {(serviceVersions[service.id] as string[] | undefined)?.map((version: string, index: number) => {
                  const cx = hexStartX + index * (hexSize * 2 + 10);
                  const cy = service.y;

                  const nodeKey = `${service.id}@${version}`;
                  const isHighlighted = highlightedNodes.has(nodeKey);

                  // Calculate the six points of the hexagon
                  const points: string[] = [];
                  for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6; // Starting at top point (30 degrees)
                    const x = cx + hexSize * Math.cos(angle);
                    const y = cy + hexSize * Math.sin(angle);
                    points.push(`${x},${y}`);
                  }

                  return (
                    <g
                      key={`${service.id}-${version}`}
                      onMouseEnter={() => setHoveredNode(nodeKey)}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <polygon
                        points={points.join(' ')}
                        fill={service.color}
                        stroke={isHighlighted ? "#10b981" : "none"}
                        strokeWidth={isHighlighted ? 3 : 0}
                        opacity={hoveredNode && !isHighlighted ? 0.5 : 1}
                      />
                      <text
                        x={cx}
                        y={cy + 5}
                        textAnchor="middle"
                        fill="white"
                        className="text-xs font-bold"
                      >
                        {version}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Draw links between services */}
          {(() => {
            // First, organize connections by source-target pairs to handle multiple app versions
            const connectionGroups: Record<
              string,
              { source: string; target: string; appVersion: number }[]
            > = {};

            Object.entries(dependencyGraph).forEach(([source, targets]) => {
              targets.forEach((target) => {
                // Create a key that identifies a specific connection
                const connectionKey = `${source}|${target.target}`;
                if (!connectionGroups[connectionKey]) {
                  connectionGroups[connectionKey] = [];
                }
                connectionGroups[connectionKey].push({
                  source,
                  target: target.target,
                  appVersion: target.appVersion
                });
              });
            });

            // Render each connection group
            return Object.entries(connectionGroups).map(([connectionKey, connections], idx) => {
              // Sort connections by app version
              connections.sort((a, b) => a.appVersion - b.appVersion);

              // Get first connection to extract positioning data
              const firstConn = connections[0];

              // Parse source and target
              const [sourceApp, sourceSvc, sourceVersion] = firstConn.source.split(/\/|@/);
              const [targetApp, targetSvc, targetVersion] = firstConn.target.split(/\/|@/);

              const sourceId = `${sourceApp}/${sourceSvc}`;
              const targetId = `${targetApp}/${targetSvc}`;

              const sourceIndex =
                serviceVersions[sourceId] && (serviceVersions[sourceId] as string[]).indexOf(sourceVersion) !== -1
                  ? (serviceVersions[sourceId] as string[]).indexOf(sourceVersion)
                  : -1;
              const targetIndex =
                serviceVersions[targetId] && (serviceVersions[targetId] as string[]).indexOf(targetVersion) !== -1
                  ? (serviceVersions[targetId] as string[]).indexOf(targetVersion)
                  : -1;

              if (sourceIndex === -1 || targetIndex === -1) return null;

              const sourceService = serviceMap[sourceId];
              const targetService = serviceMap[targetId];

              if (!sourceService || !targetService) return null;

              const sourceBoxWidth = calculateBoxWidth(sourceId);
              const targetBoxWidth = calculateBoxWidth(targetId);

              const sourceHexStartX = sourceService.x - sourceBoxWidth / 2 + nameWidths[sourceId] + 20;
              const targetHexStartX = targetService.x - targetBoxWidth / 2 + nameWidths[targetId] + 20;

              const sourceCx = sourceHexStartX + sourceIndex * (hexSize * 2 + 10);
              const targetCx = targetHexStartX + targetIndex * (hexSize * 2 + 10);

              // Connect to bottom of source hexagon
              const sourceX = sourceCx;
              const sourceY = sourceService.y + hexSize;

              // Connect to top of target hexagon
              const targetX = targetCx;
              const targetY = targetService.y - hexSize;

              // Middle point for the connection
              const midX = (sourceX + targetX) / 2;
              const midY = (sourceY + targetY) / 2;

              // Check if any connection in this group is highlighted
              const isAnyHighlighted = connections.some((conn) => {
                const pathId = `${conn.source}|${conn.target}|${conn.appVersion}`;
                return highlightedPaths.has(pathId);
              });

              // Draw the line
              const line = (
                <line
                  key={`line-${idx}`}
                  x1={sourceX}
                  y1={sourceY}
                  x2={targetX}
                  y2={targetY}
                  stroke={isAnyHighlighted ? "#10b981" : "gray"}
                  strokeWidth={isAnyHighlighted ? 3 : 1}
                  opacity={hoveredNode && !isAnyHighlighted ? 0.3 : 1}
                />
              );

              // Draw the version circles
              let versionCircles: any;
              if (connections.length <= 3) {
                // Show app versions with diagonal offset
                versionCircles = connections.map((conn, connIdx) => {
                  // Add both horizontal and vertical offset for diagonal staggering
                  const offsetX = (connIdx - (connections.length - 1) / 2) * 12;
                  const offsetY = (connIdx - (connections.length - 1) / 2) * 8;

                  const pathId = `${conn.source}|${conn.target}|${conn.appVersion}`;
                  const isThisHighlighted = highlightedPaths.has(pathId);

                  return (
                    <g key={`version-${idx}-${conn.appVersion}`}>
                      <circle
                        cx={midX + offsetX}
                        cy={midY + offsetY}
                        r={isThisHighlighted ? 16 : 12}
                        fill={isThisHighlighted ? "#10b981" : "#718096"}
                        opacity={hoveredNode && !isThisHighlighted ? 0.3 : 1}
                      />
                      <text
                        x={midX + offsetX}
                        y={midY + offsetY + 4}
                        textAnchor="middle"
                        fill="white"
                        className="text-xs font-medium"
                      >
                        {conn.appVersion}
                      </text>
                    </g>
                  );
                });
              } else {
                // Show first, ellipsis, last
                const firstConn = connections[0];
                const lastConn = connections[connections.length - 1];

                const firstPathId = `${firstConn.source}|${firstConn.target}|${firstConn.appVersion}`;
                const lastPathId = `${lastConn.source}|${lastConn.target}|${lastConn.appVersion}`;

                const isFirstHighlighted = highlightedPaths.has(firstPathId);
                const isLastHighlighted = highlightedPaths.has(lastPathId);

                versionCircles = (
                  <>
                    <g key={`version-${idx}-first`}>
                      <circle
                        cx={midX - 12}
                        cy={midY - 8}
                        r={isFirstHighlighted ? 16 : 12}
                        fill={isFirstHighlighted ? "#10b981" : "#718096"}
                        opacity={hoveredNode && !isFirstHighlighted ? 0.3 : 1}
                      />
                      <text
                        x={midX - 12}
                        y={midY - 8 + 4}
                        textAnchor="middle"
                        fill="white"
                        className="text-xs font-medium"
                      >
                        {firstConn.appVersion}
                      </text>
                    </g>
                    <g key={`version-${idx}-ellipsis`}>
                      <circle
                        cx={midX}
                        cy={midY}
                        r={12}
                        fill={isAnyHighlighted ? "#10b981" : "#718096"}
                        opacity={hoveredNode && !isAnyHighlighted ? 0.3 : 1}
                      />
                      <text
                        x={midX}
                        y={midY + 4}
                        textAnchor="middle"
                        fill="white"
                        className="text-xs font-medium"
                      >
                        ...
                      </text>
                    </g>
                    <g key={`version-${idx}-last`}>
                      <circle
                        cx={midX + 12}
                        cy={midY + 8}
                        r={isLastHighlighted ? 16 : 12}
                        fill={isLastHighlighted ? "#10b981" : "#718096"}
                        opacity={hoveredNode && !isLastHighlighted ? 0.3 : 1}
                      />
                      <text
                        x={midX + 12}
                        y={midY + 8 + 4}
                        textAnchor="middle"
                        fill="white"
                        className="text-xs font-medium"
                      >
                        {lastConn.appVersion}
                      </text>
                    </g>
                  </>
                );
              }

              return (
                <g key={`connection-${idx}`}>
                  {line}
                  {versionCircles}
                </g>
              );
            });
          })()}
        </svg>
      </div>
    </div>
  );
};

export default DependencyDiagram;
