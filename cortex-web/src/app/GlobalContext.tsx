'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { fetchTeams, fetchAppVersions } from '@/app/utils/fetch';

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
}

interface GlobalContextType {
  teams: Team[];
  setTeams: (team: Team[]) => void;
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team) => void;

  apps: AppData[];
  setApps: (apps: AppData[]) => void;
  selectedApp: string;
  setSelectedApp: (app: string) => void;
  selectedAppVersion: number;
  setSelectedAppVersion: (version: number) => void;
  appVersions: AppVersions | null;
  setAppVersions: (versions: AppVersions | null) => void;

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

interface VersionData {
  app: string;
  version: number;
  graph: GraphData;
}

interface AppVersions {
  [key: number]: VersionData;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const [apps, setApps] = useState<AppData[]>([]);
  const [selectedApp, setSelectedApp] = useState("");

  const [selectedAppVersion, setSelectedAppVersion] = useState<number>(0);
  const [appVersions, setAppVersions] = useState<AppVersions | null>(null);

  const [graphData, setGraphData] = useState<GraphData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const pathname = usePathname();
  const router = useRouter();

  

  useEffect(() => {
    fetchTeams(setTeams, setLoading, setError);
  }, []);

  useEffect(() => {
    if (pathname && teams.length > 0) {
      const parts = pathname.split('/').filter(x => x);
      if (parts.length == 0) {
        router.replace(`/${defaultModule}/${teams[0].team_id}/${defaultSubModule}/`);
      }

      const moduleType = parts.length > 0 ? parts[0] : null;

      if (moduleType === "team") {
        const teamId = parts.length > 0 ? parts[1] : null;
        const appName = parts.length > 2 ? parts[3] : null;
        const version = parts.length > 4 ? Number(parts[5]) : null;

        if (teamId) {
          const teamMap = Object.fromEntries(teams.map(t => [t.team_id, t]))
          setSelectedTeam(teamMap[teamId]);
        }
        if (appName) {
          fetchAppVersions(appName, setAppVersions, setLoading, setError)
        }
        if (version) {
          setSelectedAppVersion(version)
        }
      }
    }
  }, [pathname, teams]);

  useEffect(() => {
    if (!selectedAppVersion) {
      setSelectedAppVersion(appVersions ? Object.keys(appVersions).length : 0);
    }
  }, [appVersions])

  useEffect(() => {
    setGraphData(appVersions ? appVersions[selectedAppVersion].graph : null);
  }, [appVersions, selectedAppVersion])

  useEffect(() => {
    const fetchApps = async () => {
      if (!selectedTeam) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`http://127.0.0.1:8000/get_apps?team_id=${selectedTeam.team_id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch apps: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(data)
        setLoading(false);
        
        const sortedApps = [...data.apps].sort((a, b) => 
          a.App.localeCompare(b.App)
        );
        
        setApps(sortedApps);
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'An unknown error occurred while fetching apps';
        
        setError(errorMessage);
        console.error('Apps fetch error:', errorMessage);
        setApps([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [selectedTeam]);

  return (
    <GlobalContext.Provider value={{ 
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

