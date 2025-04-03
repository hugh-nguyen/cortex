'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';

// ... existing interfaces

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Apps state
  const [apps, setApps] = useState<AppData[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState("");

  // Fetch teams on initial load
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setTeamsLoading(true);
        const response = await fetch('http://127.0.0.1:8000/get_teams');
        const data = await response.json();
        
        const sortedTeams = data.teams.sort((a: Team, b: Team) => 
          a.team_name.localeCompare(b.team_name)
        );
        
        setTeams(sortedTeams);
        
        // Explicitly set the first team as selected
        if (sortedTeams.length > 0) {
          const firstTeam = sortedTeams[0];
          setSelectedTeam(firstTeam);
        }
      } catch (error) {
        console.error('Failed to fetch teams', error);
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Fetch apps when selected team changes
  useEffect(() => {
    const fetchApps = async () => {
      if (!selectedTeam) return;

      try {
        setAppsLoading(true);
        const response = await fetch(`http://127.0.0.1:8000/get_apps?team_id=${selectedTeam.team_id}`);
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        const sortedApps = [...data.apps].sort((a, b) => 
          a.App.localeCompare(b.App)
        );
        
        setApps(sortedApps);
      } catch (error) {
        console.error('Failed to fetch apps', error);
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
      
      // Apps
      apps,
      setApps,
      appsLoading,
      selectedApp,
      setSelectedApp
    }}>
      {children}
    </GlobalContext.Provider>
  );
};