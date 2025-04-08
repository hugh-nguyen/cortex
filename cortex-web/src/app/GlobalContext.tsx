'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  onloadEffect, 
  pathNameTeamsEffect, 
  appVersionsEffect, 
  selectedTeamEffect,
  appVersionsSelectedAppVersionEffect,
  pathNameSelectedAppEffect,
  pathNameSelectedTeamEffect
} from '@/app/utils/effects';

export const defaultModule = "team"
export const defaultSubModule = "applications"

export interface Team {
  team_id: number;
  team_name: string;
}

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

interface GlobalContextType {
  subModule: string;
  setSubModule: (subModule: string) => void;

  teams: Team[];
  setTeams: (team: Team[]) => void;
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team) => void;

  apps: AppData[];
  setApps: (apps: AppData[]) => void;
  selectedApp: AppData | null;
  setSelectedApp: (app: AppData) => void;
  selectedAppVersion: VersionData | null;
  setSelectedAppVersion: (version: VersionData | null) => void;
  appVersions: AppVersions | null;
  setAppVersions: (versions: AppVersions | null) => void;

  routes: Route[];  
  setRoutes: (routes: Route[]) => void;

  graphData: GraphData | null;
  setGraphData: (data: GraphData | null) => void;

  loading: Boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

interface GraphData {
  services: any[];
  dependencies: any[];
  apps: any[];
}

interface Run {
  id: number;
  name: string;
  run_number: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  created_ago: string;
  html_url: string;
  actor: string;
  head_branch: string;
  duration?: number | null;
  run_attempt: number;
}

interface VersionData {
  app: string;
  version: number | "deploying";  // Add "deploying" as a possible type
  graph: GraphData | null;
  run: Run;
  is_deploying?: boolean;  // Flag to identify deploying versions
}

interface AppVersions {
  [key: number | string]: VersionData;
}

interface Route {
  prefix: string,
  team_id: number,
  targets: Target[],
}

interface Target {
  app: string;
  svc: string;
  app_ver: number;
  weight: number;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subModule, setSubModule] = useState("");

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const [apps, setApps] = useState<AppData[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppData | null>(null);

  const [selectedAppVersion, setSelectedAppVersion] = useState<VersionData | null>(null);
  const [appVersions, setAppVersions] = useState<AppVersions | null>(null);

  const [graphData, setGraphData] = useState<GraphData | null>(null);

  const [routes, setRoutes] = useState<Route[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const pathname = usePathname();
  const router = useRouter();

  const [path, setPath] = useState("")

  
  onloadEffect(setTeams, setLoading, setError)

  appVersionsEffect(selectedAppVersion, appVersions, setSelectedAppVersion, path)
  appVersionsSelectedAppVersionEffect(appVersions, selectedAppVersion, setGraphData)
  pathNameTeamsEffect(
    pathname, teams, router, setAppVersions, setLoading, 
    setError, setSelectedTeam, setSelectedAppVersion, setSubModule,
    setRoutes, selectedTeam, setSelectedApp, appVersions, setPath, path,
    selectedApp
  )
  selectedTeamEffect(selectedTeam, setLoading, setError, setApps)
  pathNameSelectedAppEffect(pathname, selectedApp, router, selectedTeam)
  pathNameSelectedTeamEffect(pathname, router, selectedTeam, subModule)

  return (
    <GlobalContext.Provider value={{
      subModule,
      setSubModule,

      // Teams
      teams, 
      setTeams,
      selectedTeam, 
      setSelectedTeam, 
      
      // Apps
      apps,
      setApps,
      selectedApp,
      setSelectedApp,
      selectedAppVersion,
      appVersions,
      setAppVersions,
      setSelectedAppVersion,

      routes,
      setRoutes,

      graphData,
      setGraphData,

      loading,
      setLoading,
      error,
      setError
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};

