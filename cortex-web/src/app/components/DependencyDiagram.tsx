'use client';

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { M_PLUS_1 } from 'next/font/google';

interface AppData {
  App: string;
  'Service Count': number;
  Versions: number;
  'Last Updated': string;
  Owner: string;
  CommandRepoURL: string;
  services: string[];
  dependencies: string[];
}
interface DependencyDiagramProps {
  teamId: number | null;
  onError?: (error: string) => void;
  zoom: number;
  selectedApp: string | undefined;
  setSelectedApp: CallableFunction;
  handleAppClick: CallableFunction;
  apps: AppData[];
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
  dependency_graph: Record<string, DependencyEdge[]>;
  services: any[];
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

const DependencyDiagram: React.FC<DependencyDiagramProps> = ({ teamId, onError, zoom, selectedApp, setSelectedApp, handleAppClick, apps }) => {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // const services: Service[] = [
  //   { id: 'test-app1/mfe-a', x: 250, y: 120, color: '#4299e1' }, // blue
  //   { id: 'test-app1/service-b', x: 250, y: 260, color: '#ed8936' }, // orange
  //   { id: 'test-app2/mfe-x', x: 700, y: 120, color: '#ecc94b' }, // yellow
  //   { id: 'test-app2/service-y', x: 700, y: 260, color: '#48bb78' }, // green
  //   { id: 'test-shared-app/service-s', x: 475, y: 400, color: '#805ad5' } // purple
  // ];
  const servicesM: Service[] = [
    { id: 'app1/mfe-a', x: 250, y: 120, color: '#4299e1' },
    { id: 'app1/service-b', x: 250, y: 260, color: '#ed8936' },
    { id: 'app2/mfe-x', x: 700, y: 120, color: '#ecc94b' },
    { id: 'app2/service-y', x: 700, y: 260, color: '#48bb78' },
    { id: 'shared-app/service-s', x: 475, y: 400, color: '#805ad5' }
  ];

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
        console.log("PPP", parsedData);
        setServices(servicesM.filter(m => parsedData.services.includes(m.id)))
      } catch (err: any) {
        setError(`Error loading data: ${err.message ?? 'Unknown error'}`);
        onError?.(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId, onError]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div className="text-gray-500">No data available</div>;

  const serviceVersions: Record<string, Set<string> | string[]> = {};

  data.app_versions.forEach((appVersion) => {
    appVersion.services.forEach((svc) => {
      const key = `${svc.app}/${svc.svc}`;
      if (!serviceVersions[key]) {
        serviceVersions[key] = new Set<string>();
      }
      (serviceVersions[key] as Set<string>).add(svc.svc_ver);
    });
  });

  data.app_versions.forEach((appVersion) => {
    appVersion.dependencies.forEach((dep) => {
      const key = `${dep.app}/${dep.svc}`;
      if (!serviceVersions[key]) {
        serviceVersions[key] = new Set<string>();
      }
      (serviceVersions[key] as Set<string>).add(dep.svc_ver);
    });
  });

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

  

  const nameWidths: Record<string, number> = {};
  services.forEach((service) => {
    nameWidths[service.id] = service.id.length * 8 + 20;
  });

  const hexSize = 30;

  const serviceMap: Record<string, Service> = {};
  services.forEach((svc) => {
    serviceMap[svc.id] = svc;
  });

  const dependencyGraph: Record<string, DependencyEdge[]> = data.dependency_graph;

// Complete replacement for findAllPaths with fixed bidirectional traversal
const findAllPaths = (source: string): { paths: Set<string>; nodes: Set<string> } => {
  const paths = new Set<string>();
  const nodes = new Set<string>();
  
  // We need to build a reverse graph to efficiently find parents
  const reverseGraph: Record<string, {source: string; appVersion: number}[]> = {};
  
  // Build the reverse graph for efficient parent lookup
  Object.entries(dependencyGraph).forEach(([source, targets]) => {
    targets.forEach(edge => {
      if (!reverseGraph[edge.target]) {
        reverseGraph[edge.target] = [];
      }
      reverseGraph[edge.target].push({
        source: source,
        appVersion: edge.appVersion
      });
    });
  });
  
  // Track visited nodes to avoid cycles
  const visited = new Set<string>();
  
  // Forward traversal - find all downstream dependencies
  function traverseForward(node: string, appVersion: number) {
    const visitKey = `${node}|${appVersion}|forward`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);
    
    nodes.add(node);
    
    // Follow edges with matching app version
    if (dependencyGraph[node]) {
      dependencyGraph[node].forEach(edge => {
        if (edge.appVersion === appVersion) {
          const pathId = `${node}|${edge.target}|${appVersion}`;
          paths.add(pathId);
          nodes.add(edge.target);
          traverseForward(edge.target, appVersion);
        }
      });
    }
  }
  
  // Backward traversal - find all upstream dependencies
  function traverseBackward(node: string, appVersion: number) {
    const visitKey = `${node}|${appVersion}|backward`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);
    
    nodes.add(node);
    
    // Follow incoming edges with matching app version
    if (reverseGraph[node]) {
      reverseGraph[node].forEach(edge => {
        if (edge.appVersion === appVersion) {
          const pathId = `${edge.source}|${node}|${appVersion}`;
          paths.add(pathId);
          nodes.add(edge.source);
          traverseBackward(edge.source, appVersion);
        }
      });
    }
  }

  // Find all relevant app versions for this node
  const relevantAppVersions = new Set<number>();
  
  // Check outgoing connections from this node
  if (dependencyGraph[source]) {
    dependencyGraph[source].forEach(edge => {
      relevantAppVersions.add(edge.appVersion);
    });
  }
  
  // Check incoming connections to this node
  if (reverseGraph[source]) {
    reverseGraph[source].forEach(edge => {
      relevantAppVersions.add(edge.appVersion);
    });
  }
  
  // If we couldn't find any app versions, use all versions in the graph
  if (relevantAppVersions.size === 0) {
    Object.values(dependencyGraph).forEach(edges => {
      edges.forEach(edge => {
        relevantAppVersions.add(edge.appVersion);
      });
    });
  }
  
  // Traverse in both directions for each relevant app version
  relevantAppVersions.forEach(appVersion => {
    traverseForward(source, appVersion);
    traverseBackward(source, appVersion);
  });
  
  return { paths, nodes };
};

  const highlightedPaths = new Set<string>();
  const highlightedNodes = new Set<string>();

  if (hoveredNode) {
    const { paths, nodes } = findAllPaths(hoveredNode);
    paths.forEach((path) => highlightedPaths.add(path));
    nodes.forEach((node) => highlightedNodes.add(node));
  }

  const scale = zoom / 40;

  const CONNECTION_PHASE_OFFSET = 0.5;

  const fade = (delay: number, offset: number = 0): React.CSSProperties => ({
    opacity: 0,
    animation: `fadeInUp 0.5s ease forwards ${delay + offset}s`,
  });

  const GlobalKeyframes = (
    <style jsx global>{`
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  );

  const calculateBoxWidth = (serviceId: string): number => {
    const versions = serviceVersions[serviceId] as string[] | undefined;
    const versionsCount = versions ? versions.length : 0;
    const nameWidth = nameWidths[serviceId];
    return Math.max(300, nameWidth + 40 + versionsCount * (hexSize * 2 + 10));
  };

  return (
    <div className="p-4" style={{ margin: "0px", padding: "0px"}}>
      {GlobalKeyframes}
  
      <div className="overflow-auto flex justify-center bg-white" style={{ maxHeight: '1200px', maxWidth: '2400px' }}>
        <svg
          width="100%"
          height={1000 * scale}
          viewBox="0 0 800 1000"
          className="border border-gray-200"
          style={{ backgroundColor: '#ffffff', maxWidth: '100%' }}
        >
          {services.map((service, svcIdx) => {
            const appPrefix = service.id.split('/')[0];
            const appSelected = selectedApp === appPrefix;
            const boxWidth = calculateBoxWidth(service.id);
            const hexStartX = service.x - boxWidth / 2 + nameWidths[service.id] + 32;
  
            return (
              <g 
                key={service.id} 
                style={{ ...fade(svcIdx * 0.04) }}
                onClick={() => setSelectedApp(Object.fromEntries(apps.map(app => [app.App, app]))[appPrefix])}
              >
                <rect
                  x={service.x - boxWidth / 2}
                  y={service.y - 40}
                  width={boxWidth}
                  height={80}
                  stroke="gray"
                  strokeDasharray="5,5"
                  fill={appSelected ? '#F3E8FF' : '#f5f5f5'}
                  rx={10}
                  ry={10}
                />
  
                <text 
                  x={service.x - boxWidth / 2 + 10} y={service.y + 5}
                  fill="#009ae8"
                  // style={{textDecoration: "underline"}}
                  style={{cursor: "pointer"}}
                  onClick={() => handleAppClick(Object.fromEntries(apps.map(app => [app.App, app]))[appPrefix])}
                >
                  {service.id}
                </text>
  
                {(serviceVersions[service.id] as string[] | undefined)?.map((version: string, index: number) => {
                  const cx = hexStartX + index * (hexSize * 2 + 10);
                  const cy = service.y;
  
                  const nodeKey = `${service.id}@${version}`;
                  const isHighlighted = highlightedNodes.has(nodeKey);
  
                  const points: string[] = [];
                  for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6;
                    const x = cx + hexSize * Math.cos(angle);
                    const y = cy + hexSize * Math.sin(angle);
                    points.push(`${x},${y}`);
                  }
  
                  return (
                    <g
                      key={`${service.id}-${version}`}
                      onMouseEnter={() => setHoveredNode(nodeKey)}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{ cursor: 'pointer', ...fade(index * 0.06) }}
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
                        style={{ fontSize: 14, fontWeight: 700 }}
                      >
                        {version}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
  
          {(() => {
            const connectionGroups: Record<
              string,
              { source: string; target: string; appVersion: number }[]
            > = {};
  
            Object.entries(dependencyGraph).forEach(([source, targets]) => {
              targets.forEach((target) => {
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
  
            return Object.entries(connectionGroups).map(([connectionKey, connections], idx) => {
              connections.sort((a, b) => a.appVersion - b.appVersion);
  
              const firstConn = connections[0];
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
  
              const sourceHexStartX = sourceService.x - sourceBoxWidth / 2 + nameWidths[sourceId] + 32;
              const targetHexStartX = targetService.x - targetBoxWidth / 2 + nameWidths[targetId] + 32;
  
              const sourceCx = sourceHexStartX + sourceIndex * (hexSize * 2 + 10);
              const targetCx = targetHexStartX + targetIndex * (hexSize * 2 + 10);
  
              const sourceX = sourceCx;
              const sourceY = sourceService.y + hexSize;
  
              const targetX = targetCx;
              const targetY = targetService.y - hexSize;
  
              const midX = (sourceX + targetX) / 2;
              const midY = (sourceY + targetY) / 2;
  
              const isAnyHighlighted = connections.some((conn) => {
                const pathId = `${conn.source}|${conn.target}|${conn.appVersion}`;
                return highlightedPaths.has(pathId);
              });
  
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
  
              let versionCircles: any;
              if (connections.length <= 3) {
                versionCircles = connections.map((conn, connIdx) => {
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
                        style={{ fontSize: 14, fontWeight: 700 }}
                      >
                        {conn.appVersion}
                      </text>
                    </g>
                  );
                });
              } else {
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
                <g key={`connection-${idx}`} style={fade(idx * 0.03, CONNECTION_PHASE_OFFSET)}>
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
