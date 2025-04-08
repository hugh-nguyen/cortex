import { useEffect } from 'react';
import { fetchTeams, fetchAppVersions, fetchRoutes, fetchApp } from '@/app/utils/fetch';
import { defaultModule, defaultSubModule } from '@/app/GlobalContext';


export function onloadEffect(setTeams: any, setLoading: any, setError: any) {
  useEffect(() => {
    fetchTeams(setTeams, setLoading, setError);
  }, []);
}


export function appVersionsEffect(
  selectedAppVersion: any, 
  appVersions: any, 
  setSelectedAppVersion: any,
  path: any,
) {
  useEffect(() => {
    if (path) {
      const parts = path.split('/').filter((x: string) => x);
      // const version_number = parts.length > 4 ? Number(parts[5]) : 0;
      console.log(2)
      if (parts.length > 4) {
        const version_number = parts.length > 4 ? Number(parts[5]) : 0;
        setSelectedAppVersion(appVersions ? appVersions[version_number] : null);
      } else {
        setSelectedAppVersion(appVersions ? appVersions[Object.keys(appVersions).length] : null);
      }
    }
    
    
  }, [path, appVersions])
}


export function appVersionsSelectedAppVersionEffect(
  appVersions: any, 
  selectedAppVersion: any, 
  setGraphData: any
) {
  useEffect(() => {
    if (selectedAppVersion) {
      setGraphData(appVersions ? appVersions[selectedAppVersion?.version].graph : null);
    }
  }, [selectedAppVersion])
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
  setRoutes: any,
  selectedTeam: any,
  setSelectedApp: any,
  appVersions: any,
  setPath: any,
  path: any,
  selectedApp: any,
) {
  useEffect(() => {
    console.log(1, pathname, path, pathname != path)
    if (pathname && teams.length > 0 && pathname != path) {
      console.log(1.1)
      const parts = pathname.split('/').filter((x: string) => x);

      setPath(pathname)
      if (parts.length == 0) {
        setSubModule(defaultSubModule)
        console.log(3)
        router.replace(`/${defaultModule}/${teams[0].team_id}/${defaultSubModule}/`);
      }

      const moduleType = parts.length > 0 ? parts[0] : null;

      if (moduleType === "team") {
        const teamId = parts.length > 0 ? parts[1] : null;
        const subModule = parts.length > 1 ? parts[2] : null;
        const appName = parts.length > 2 ? parts[3] : null;
        if (teamId) {
          const teamMap = Object.fromEntries(teams.map((t: any) => [t.team_id, t]))
          if (!selectedTeam || teamId != selectedTeam.team_id) {
            setSelectedTeam(teamMap[teamId]);
          }
        }

        setSubModule(subModule)

        if (subModule == "applications") {
          if (appName) {
            console.log(appVersions, selectedApp?.App, appName)
            if (!appVersions || (selectedApp?.App !== appName)) {
              console.log("fetchingApps")
              fetchAppVersions(appName, setAppVersions, setLoading, setError)
            }
            fetchApp(appName, setSelectedApp, setLoading, setError)
          }
          // if (version_number) {
          //   // setSelectedAppVersion(version_number)
          //   setSelectedAppVersion(appVersions ? appVersions[version_number] : null);
          // }
        }
        
        if (subModule == "xroutes") {
          fetchRoutes(teamId, setRoutes, setLoading, setError)
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
  // useEffect(() => {
  //   if (selectedTeam && selectedApp && selectedApp.App && selectedApp.Versions) {
  //     router.push(`${pathname}/${selectedApp.App}/version/${selectedApp.Versions}`);
  //   }
  // }, [pathname, selectedApp]);
}

export function pathNameSelectedTeamEffect(
  pathname: any, 
  router: any,
  selectedTeam: any,
  subModule: any,
) {
  // useEffect(() => {
  //   if (selectedTeam) {
  //     router.push(`/team/${selectedTeam.team_id}/${subModule}`);
  //   }
  // }, [pathname, selectedTeam]);
}