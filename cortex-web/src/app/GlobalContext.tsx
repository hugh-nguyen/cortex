'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';

// Define interfaces for your data structures
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
  // Teams-related state
  teams: Team[];
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team) => void;
  teamsLoading: boolean;
  teamsError: string | null;

  // Apps-related state
  apps: AppData[];
  setApps: (apps: AppData[]) => void;
  appsLoading: boolean;
  appsError: string | null;
  selectedApp: string;
  setSelectedApp: (app: string) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  // Apps state
  const [apps, setApps] = useState<AppData[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState("");

  // Fetch teams on initial load
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setTeamsLoading(true);
        setTeamsError(null);
        
        const response = await fetch('http://127.0.0.1:8000/get_teams');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch teams: ${response.status}`);
        }
        
        const data = await response.json();
        
        const sortedTeams = data.teams.sort((a: Team, b: Team) => 
          a.team_name.localeCompare(b.team_name)
        );
        
        setTeams(sortedTeams);
        
        // Explicitly set the first team as selected
        if (sortedTeams.length > 0) {
          setSelectedTeam(sortedTeams[0]);
        }
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

    fetchTeams();
  }, []);

  // Fetch apps when selected team changes
  useEffect(() => {
    const fetchApps = async () => {
      console.log("!!!!")
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
      setSelectedApp
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

// Custom hook to use the global context
export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};