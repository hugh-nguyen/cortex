import { useEffect } from 'react';
import { fetchTeams, fetchAppVersions } from '@/app/utils/fetch';
import { defaultModule, defaultSubModule } from '@/app/GlobalContext';


export function onloadEffect(setTeams: any, setLoading: any, setError: any) {
  useEffect(() => {
    fetchTeams(setTeams, setLoading, setError);
  }, []);
}


export function appVersionsEffect(
  selectedAppVersion: any, 
  appVersions: any, 
  setSelectedAppVersion: any
) {
  useEffect(() => {
    if (!selectedAppVersion) {
      setSelectedAppVersion(appVersions ? Object.keys(appVersions).length : 0);
    }
  }, [appVersions])
}


export function appVersionsSelectedAppVersionEffect(
  appVersions: any, 
  selectedAppVersion: any, 
  setGraphData: any
) {
  useEffect(() => {
    setGraphData(appVersions ? appVersions[selectedAppVersion].graph : null);
  }, [appVersions, selectedAppVersion])
}


export function pathNameTeamsEffect(
  pathname: any, 
  teams: any, 
  router: any, 
  setAppVersions: any, 
  setLoading: any, 
  setError: any, 
  setSelectedTeam: any, 
  setSelectedAppVersion: any,
  setSubModule: any,
) {
  useEffect(() => {
    console.log("?!")
    if (pathname && teams.length > 0) {
      const parts = pathname.split('/').filter((x: string) => x);
      if (parts.length == 0) {
        setSubModule(defaultSubModule)
        router.replace(`/${defaultModule}/${teams[0].team_id}/${defaultSubModule}/`);
        console.log("$")
      }

      const moduleType = parts.length > 0 ? parts[0] : null;

      if (moduleType === "team") {
        const teamId = parts.length > 0 ? parts[1] : null;
        const subModule = parts.length > 1 ? parts[2] : null;
        const appName = parts.length > 2 ? parts[3] : null;
        const version = parts.length > 4 ? Number(parts[5]) : null;

        if (teamId) {
          const teamMap = Object.fromEntries(teams.map((t: any) => [t.team_id, t]))
          setSelectedTeam(teamMap[teamId]);
        }

        setSubModule(subModule)

        if (subModule == "applications") {
          if (appName) {
            fetchAppVersions(appName, setAppVersions, setLoading, setError)
          }
          if (version) {
            setSelectedAppVersion(version)
          }
        }
        
        if (subModule == "xroutes") {
          // if (appName) {
          //   fetchAppVersions(appName, setAppVersions, setLoading, setError)
          // }
          // if (version) {
          //   setSelectedAppVersion(version)
          // }
        }
      }

    }
  }, [pathname, teams]);
}


export function selectedTeamEffect(selectedTeam: any, setLoading: any, setError: any, setApps: any) {
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
  }, [selectedTeam])
}

export function pathNameSelectedAppEffect(
  pathname: any, 
  selectedApp: any, 
  router: any,
  selectedTeam: any 
) {
  useEffect(() => {
    if (selectedTeam && selectedApp && selectedApp.App && selectedApp.Versions) {
      router.push(`${pathname}/${selectedApp.App}/version/${selectedApp.Versions}`);
    }
  }, [pathname, selectedApp]);
}

export function pathNameSelectedTeamEffect(
  pathname: any, 
  router: any,
  selectedTeam: any,
  subModule: any,
) {
  useEffect(() => {
    if (selectedTeam) {
      router.push(`/team/${selectedTeam.team_id}/${subModule}`);
    }
  }, [pathname, selectedTeam]);
}