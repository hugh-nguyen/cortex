'use client';

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { M_PLUS_1 } from 'next/font/google';

const SUBDOMAIN = "e31e0db899-1642361493";

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

interface ServiceInfo {
  service: {
    ver: string;
    links: {
      display_order: number;
      logo: string;
      label: string;
      url: string;
    }[];
    app: string;
    name: string;
    svc: string;
    status: string;
  };
}

const DependencyDiagram: React.FC<DependencyDiagramProps> = ({ teamId, onError, zoom, selectedApp, setSelectedApp, handleAppClick, apps }) => {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [serviceInfoLoading, setServiceInfoLoading] = useState<boolean>(false);

  // Mock services for testing
  const servicesM: Service[] = [
    { id: 'app1/mfe-a', x: -150, y: 120, color: '#4299e1' },
    { id: 'app1/service-b', x: -150, y: 260, color: '#ed8936' },
    { id: 'app2/mfe-x', x: 300, y: 120, color: '#ecc94b' },
    { id: 'app2/service-y', x: 300, y: 260, color: '#48bb78' },
    { id: 'shared-app/service-s', x: 55, y: 400, color: '#805ad5' }
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

  // Fetch service info when a node is selected
  useEffect(() => {
    const fetchServiceInfo = async () => {
      if (!selectedNode) {
        setServiceInfo(null);
        return;
      }

      setServiceInfoLoading(true);
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/get_service?full_name=${encodeURIComponent(selectedNode)}`
        );

        if (!res.ok) {
          throw new Error(`Server responded ${res.status}`);
        }

        const info: ServiceInfo = await res.json();
        setServiceInfo(info);
      } catch (err: any) {
        console.error(`Error loading service info: ${err.message ?? 'Unknown error'}`);
      } finally {
        setServiceInfoLoading(false);
      }
    };

    fetchServiceInfo();
  }, [selectedNode]);

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

  // Calculate highlighted paths and nodes
  const highlightedPaths = new Set<string>();
  const highlightedNodes = new Set<string>();

  // First check for a selected node (clicked)
  if (selectedNode) {
    const { paths, nodes } = findAllPaths(selectedNode);
    paths.forEach((path) => highlightedPaths.add(path));
    nodes.forEach((node) => highlightedNodes.add(node));
  }
  // If no selection, use hover highlight
  else if (hoveredNode) {
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

  const calculateBoxWidth = (serviceId: string): number => {
    const versions = serviceVersions[serviceId] as string[] | undefined;
    const versionsCount = versions ? versions.length : 0;
    const nameWidth = nameWidths[serviceId];
    return Math.max(300, nameWidth + 40 + versionsCount * (hexSize * 2 + 10));
  };

  // Handle hexagon click to select a node
  const handleNodeClick = (nodeKey: string) => {
    if (selectedNode === nodeKey) {
      // If clicking on already selected node, deselect it
      setSelectedNode(null);
    } else {
      // Otherwise, select the clicked node
      setSelectedNode(nodeKey);
    }
  };

  // Render the service info panel
  const renderServiceInfoPanel = () => {
    if (!serviceInfo) return null;
    
    const { service } = serviceInfo;
    
    // Determine status color
    let statusColor = 'yellow';
    if (service.status === 'Good') {
      statusColor = 'green';
    } else if (service.status === 'Bad') {
      statusColor = 'red';
    }
    
    return (
      <div className="absolute top-4 right-4 bg-white shadow-lg rounded-lg p-4 w-80 z-10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex-1 text-purple-700 font-medium">{`${service.app}/${service.svc}`}</div>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm font-medium ml-2">
            {service.ver}
          </div>
        </div>
        
        <div className="space-y-1">
          {service.links
            .sort((a, b) => a.display_order - b.display_order)
            .map((link, index) => (
              <a 
                key={index} 
                href={(() => link.url.replace("$$subdomain", SUBDOMAIN))()} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center hover:bg-gray-100 p-2 rounded transition-colors text-sm"
              >
                <img 
                  src={`/${link.logo}`} 
                  alt={link.label} 
                  className="w-6 h-6 mr-3" 
                />
                <span className="text-black underline">{link.label}</span>
              </a>
            ))
          }
        </div>
        
        <div className="flex justify-end mt-3 items-center">
          <span className="text-sm mr-2">Status:</span>
          <div className="flex items-center">
            <span className="mr-1">{service.status}</span>
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: statusColor }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 relative" style={{ margin: "0px", padding: "0px"}}>
      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      {serviceInfoLoading ? (
        <div className="absolute top-4 right-4 bg-white shadow-lg rounded-lg p-4 w-64 z-10 flex justify-center">
          <CircularProgress size={30} />
        </div>
      ) : (
        renderServiceInfoPanel()
      )}
  
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
                  style={{cursor: "pointer"}}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAppClick(Object.fromEntries(apps.map(app => [app.App, app]))[appPrefix]);
                  }}
                >
                  {service.id}
                </text>
  
                {(serviceVersions[service.id] as string[] | undefined)?.map((version: string, index: number) => {
                  const cx = hexStartX + index * (hexSize * 2 + 10);
                  const cy = service.y;
  
                  const nodeKey = `${service.id}@${version}`;
                  const isHighlighted = highlightedNodes.has(nodeKey);
                  const isSelected = selectedNode === nodeKey;
                  
                  // Use blue for the selected node and any node in its highlight path
                  const useBlueHighlight = selectedNode && isHighlighted;
                  
                  // Use green for hover highlights when no node is selected
                  const useGreenHighlight = !selectedNode && isHighlighted;
  
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
                      onMouseEnter={() => !selectedNode && setHoveredNode(nodeKey)}
                      onMouseLeave={() => !selectedNode && setHoveredNode(null)}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the parent onClick
                        handleNodeClick(nodeKey);
                      }}
                      style={{ cursor: 'pointer', ...fade(index * 0.06) }}
                    >
                      <polygon
                        points={points.join(' ')}
                        fill={service.color}
                        stroke={useBlueHighlight || isSelected ? "#2adbfa" : useGreenHighlight ? "#2ade4b" : "none"}
                        strokeWidth={useBlueHighlight || isSelected || useGreenHighlight ? 3 : 0}
                        opacity={(selectedNode && !isSelected && !isHighlighted) || 
                                 (hoveredNode && !selectedNode && !isHighlighted) ? 0.5 : 1}
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
  
              // Determine if any connections in this group are highlighted
              const isAnyHighlighted = connections.some((conn) => {
                const pathId = `${conn.source}|${conn.target}|${conn.appVersion}`;
                return highlightedPaths.has(pathId);
              });
              
              // Check if this is part of a selection
              const isAnySelected = selectedNode && isAnyHighlighted;
              
              // Use blue for selected paths, green for hover paths
              const highlightColor = isAnySelected ? "#2adbfa" : "#2ade4b";
              const isActive = isAnySelected || (!selectedNode && isAnyHighlighted);
  
              const line = (
                <line
                  key={`line-${idx}`}
                  x1={sourceX}
                  y1={sourceY}
                  x2={targetX}
                  y2={targetY}
                  stroke={isActive ? highlightColor : "gray"}
                  strokeWidth={isActive ? 3 : 1}
                  opacity={
                    (selectedNode && !isAnySelected) || 
                    (hoveredNode && !selectedNode && !isAnyHighlighted) ? 0.3 : 1
                  }
                />
              );
  
              let versionCircles: any;
              if (connections.length <= 3) {
                versionCircles = connections.map((conn, connIdx) => {
                  const offsetX = (connIdx - (connections.length - 1) / 2) * 12;
                  const offsetY = (connIdx - (connections.length - 1) / 2) * 8;
  
                  const pathId = `${conn.source}|${conn.target}|${conn.appVersion}`;
                  const isThisHighlighted = highlightedPaths.has(pathId);
                  const isThisSelected = selectedNode && isThisHighlighted;
                  const isThisActive = isThisSelected || (!selectedNode && isThisHighlighted);
                  
                  const circleHighlightColor = isThisSelected ? "#2adbfa" : "#2ade4b";
  
                  return (
                    <g key={`version-${idx}-${conn.appVersion}`}>
                      <circle
                        cx={midX + offsetX}
                        cy={midY + offsetY}
                        r={isThisActive ? 16 : 12}
                        fill={isThisActive ? circleHighlightColor : "#718096"}
                        opacity={
                          (selectedNode && !isThisSelected) || 
                          (hoveredNode && !selectedNode && !isThisHighlighted) ? 0.3 : 1
                        }
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
                
                const isFirstSelected = selectedNode && isFirstHighlighted;
                const isLastSelected = selectedNode && isLastHighlighted;
                
                const isFirstActive = isFirstSelected || (!selectedNode && isFirstHighlighted);
                const isLastActive = isLastSelected || (!selectedNode && isLastHighlighted);
                
                const firstHighlightColor = isFirstSelected ? "#2adbfa" : "#2ade4b";
                const lastHighlightColor = isLastSelected ? "#2adbfa" : "#2ade4b";
                const middleHighlightColor = isAnySelected ? "#2adbfa" : "#2ade4b";

                versionCircles = (
                  <>
                    <g key={`version-${idx}-first`}>
                      <circle
                        cx={midX - 12}
                        cy={midY - 8}
                        r={isFirstActive ? 16 : 12}
                        fill={isFirstActive ? firstHighlightColor : "#718096"}
                        opacity={
                          (selectedNode && !isFirstSelected) || 
                          (hoveredNode && !selectedNode && !isFirstHighlighted) ? 0.3 : 1
                        }
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
                        fill={isActive ? middleHighlightColor : "#718096"}
                        opacity={
                          (selectedNode && !isAnySelected) || 
                          (hoveredNode && !selectedNode && !isAnyHighlighted) ? 0.3 : 1
                        }
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
                        r={isLastActive ? 16 : 12}
                        fill={isLastActive ? lastHighlightColor : "#718096"}
                        opacity={
                          (selectedNode && !isLastSelected) || 
                          (hoveredNode && !selectedNode && !isLastHighlighted) ? 0.3 : 1
                        }
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