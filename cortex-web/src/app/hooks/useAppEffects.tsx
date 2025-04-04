'use client';

import { useEffect } from 'react';
import { Team, AppVersions, GraphData } from '@/app/GlobalContext';
import { fetchTeams, fetchAppVersions } from '@/app/utils/fetch';

export const useAppInitialization = (
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setTeams: (teams: Team[]) => void
) => {
  useEffect(() => {
    fetchTeams(setLoading, setError, setTeams);
  }, [setLoading, setError, setTeams]);
};

export const usePathRouting = (
  pathname: string | null, 
  teams: Team[], 
  router: any,
  setSelectedTeam: (team: Team | null) => void,
  setAppVersions: (versions: AppVersions | null) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  defaultModule: string,
  defaultSubModule: string
) => {
  useEffect(() => {
    if (pathname && teams.length > 0) {
      const parts = pathname.split('/').filter(x => x);
      
      if (parts.length === 0) {
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
          fetchAppVersions(appName, setAppVersions, setLoading, setError);
        }
      }
    }
  }, [pathname, teams, router, setSelectedTeam, setAppVersions, setLoading, setError, defaultModule, defaultSubModule]);
};

export const useAppVersionEffects = (
  selectedAppVersion: number,
  setSelectedAppVersion: (version: number) => void,
  appVersions: AppVersions | null,
  setGraphData: (data: GraphData | null) => void
) => {
  useEffect(() => {
    if (!selectedAppVersion && appVersions) {
      const versions = Object.keys(appVersions).map(Number);
      if (versions.length > 0) {
        setSelectedAppVersion(Math.max(...versions));
      }
    }
  }, [appVersions, selectedAppVersion, setSelectedAppVersion]);

  useEffect(() => {
    if (appVersions && selectedAppVersion && appVersions[selectedAppVersion]) {
      setGraphData(appVersions[selectedAppVersion].graph);
    } else {
      setGraphData(null);
    }
  }, [appVersions, selectedAppVersion, setGraphData]);
};

export const useTeamApps = (
  selectedTeam: Team | null,
  setApps: (apps: any[]) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void
) => {
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
  }, [selectedTeam, setApps, setLoading, setError]);
};