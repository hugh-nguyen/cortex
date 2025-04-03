'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export const defaultModule = "team"
export const defaultSubModule = "applications"

interface Team {
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
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team) => void;
  teamsLoading: boolean;
  teamsError: string | null;

  apps: AppData[];
  setApps: (apps: AppData[]) => void;
  appsLoading: boolean;
  appsError: string | null;
  selectedApp: string;
  setSelectedApp: (app: string) => void;
  selectedAppVersion: number;
  setSelectedAppVersion: (version: number) => void;
  appVersions: AppVersions | null;

  graphData: GraphData | null;
  setGraphData: (data: GraphData | null) => void;

  loading: Boolean;
  error: string | null;
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
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [apps, setApps] = useState<AppData[]>([]);
  const [selectedApp, setSelectedApp] = useState("");
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);

  const [selectedAppVersion, setSelectedAppVersion] = useState<number>(0);
  const [appVersions, setAppVersions] = useState<AppVersions | null>(null);
  const [appVersionLoading, setAppVersionsLoading] = useState(false);

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphKey, setGraphKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = async () => {
    try {
      setTeamsLoading(true);
      setTeamsError(null);
      const response = await fetch('http://127.0.0.1:8000/get_teams');
      const data = await response.json();
      const sortedTeams = data.teams.sort((a: Team, b: Team) => 
        a.team_name.localeCompare(b.team_name)
      );
      setTeams(sortedTeams);

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred while fetching teams';
      setTeamsError(errorMessage);
      console.error('Teams fetch error:', errorMessage);
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchAppVersions = async (appName: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://127.0.0.1:8000/get_app_versions?app=${appName}`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      setAppVersions(data.app_versions)
      
      setError(null);
    } catch (err) {
      console.error('Error fetching app versions:', err);
      setError('Failed to load app versions. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  }

  const pathname = usePathname();
  const router = useRouter();



  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (pathname && teams.length > 0) {
      const parts = pathname.split('/').filter(x => x);
      console.log("*!", parts)
      if (parts.length == 0) {
        router.replace(`/${defaultModule}/${teams[0].team_id}/${defaultSubModule}/`);
      }

      const moduleType = parts.length > 0 ? parts[0] : null;

      if (moduleType === "team") {
        const teamId = parts.length > 0 ? parts[1] : null;
        const subModule = parts.length > 1 ? parts[2] : null;
        const appName = parts.length > 2 ? parts[3] : null;
        const _ = parts.length > 3 ? parts[4] : null;
        const version = parts.length > 4 ? parts[5] : null;

        console.log("$$")
        if (teamId) {
          const teamMap = Object.fromEntries(teams.map(t => [t.team_id, t]))
          console.log("!@", teamMap)
          setSelectedTeam(teamMap[teamId]);
        }
        if (subModule) {
          console.log(subModule)
        }
        console.log("$$", appName)
        if (appName) {
          fetchAppVersions(appName)
        }
        if (version) {
          console.log("Version",version)
          console.log("AVs", appVersions)
        }
      }
    }
  }, [pathname, teams]);

  useEffect(() => {
    console.log("AV3", appVersions)
    console.log(appVersions ? Object.keys(appVersions).length : 0)
    setSelectedAppVersion(appVersions ? Object.keys(appVersions).length : 0);
  }, [appVersions])

  useEffect(() => {
    console.log("AV4", selectedAppVersion)
    setGraphData(appVersions ? appVersions[selectedAppVersion].graph : null);
  }, [selectedAppVersion])

  useEffect(() => {
    const fetchApps = async () => {
      if (!selectedTeam) return;

      try {
        setAppsLoading(true);
        setAppsError(null);
        
        const response = await fetch(`http://127.0.0.1:8000/get_apps?team_id=${selectedTeam.team_id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch apps: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(data)
        setAppsLoading(false);
        
        const sortedApps = [...data.apps].sort((a, b) => 
          a.App.localeCompare(b.App)
        );
        
        setApps(sortedApps);
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'An unknown error occurred while fetching apps';
        
        setAppsError(errorMessage);
        console.error('Apps fetch error:', errorMessage);
        setApps([]);
      } finally {
        setAppsLoading(false);
      }
    };

    fetchApps();
  }, [selectedTeam]);

  return (
    <GlobalContext.Provider value={{ 
      // Teams
      teams, 
      selectedTeam, 
      setSelectedTeam, 
      teamsLoading,
      teamsError,
      
      // Apps
      apps,
      setApps,
      appsLoading,
      appsError,
      selectedApp,
      setSelectedApp,
      selectedAppVersion,
      appVersions,
      setSelectedAppVersion,

      graphData,
      setGraphData,

      loading,
      error,
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

