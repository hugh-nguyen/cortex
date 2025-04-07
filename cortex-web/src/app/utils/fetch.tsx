import { Team } from '@/app/GlobalContext';

export const fetchTeams = async (setTeams: any, setLoading: any, setError: any) => {
    try {
        setLoading(true);
        setError(null);
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
        setError(errorMessage);
        console.error('Teams fetch error:', errorMessage);
    } finally {
        setLoading(false);
    }
};

export const fetchApp = async (appName: string, setSelectedApp: any, setLoading: any, setError: any) => {
    try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:8000/get_app?app_name=${appName}`);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log("!", data.app)
        setSelectedApp(data.app)
        
        setError(null);
    } catch (err) {
        console.error('Error fetching app:', err);
        setError('Failed to load app versions. Please check the console for details.');
    } finally {
        setLoading(false);
    }
}

export const fetchAppVersions = async (appName: string, setAppVersions: any, setLoading: any, setError: any) => {
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

export const fetchRoutes = async (teamId: string, setRoutes: any, setLoading: any, setError: any) => {
    try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:8000/get_routes?team_id=${teamId}`);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        setRoutes(data.routes)
        
        setError(null);
    } catch (err) {
        console.error('Error fetching app versions:', err);
        setError('Failed to load app versions. Please check the console for details.');
    } finally {
        setLoading(false);
    }
}