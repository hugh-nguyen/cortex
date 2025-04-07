from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
import yaml
import graph
import graph_original
import dynamo_util
import envoy_util
import git_util

from fastapi import FastAPI, Body
from typing import List, Dict, Any

import requests

import logging


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "Hello World"}

@app.get("/get_teams")
async def get_teams():
    result = dynamo_util.get_teams()
    return {"teams": result}

@app.get("/get_app")
async def get_app(app_name: str = "app_name"):
    print("##", app_name)
    result = dynamo_util.get_app(app_name)
    print("###", result)
    return {"app": result}

@app.get("/get_apps")
async def get_apps(team_id: int = "team_id"):
    result = dynamo_util.get_apps(team_id)
    return {"apps": result}

@app.get("/get_app_versions")
async def get_apps_versions(app: str = "app1"):
    app_versions = dynamo_util.get_app_versions(app)
    transform = lambda av: {
      "app": av["app_name"],
      "version": av["version"],
      "graph": graph.calculate_graph(av["app_name"], av["yaml"])
    }
    app_versions = {int(av["version"]): transform(av) for av in app_versions}
    return {"app_versions": app_versions}

@app.get("/get_routes")
async def get_routes(team_id: int = "team_id"):
    result = dynamo_util.get_routes(team_id)
    return {"routes": result}

@app.put("/put_route")
async def put_route(payload: Dict[str, Any] = Body(...)):
    print(payload)
    result = dynamo_util.put_route(payload)
    return {"routes": result}

@app.get("/update_envoy")
async def update_envoy():
    url = "http://hn-cortex.click/api/v1/routes"
    # payload = {"routes": transform_routes(routes)}
    envoy_util.update_envoy()
    return {"result": "SUCCESS"}

@app.get("/hello/{name}")
async def read_hello(name: str):
    return {"message": f"Hello {name}"}

@app.get("/test_apps")
async def test_apps():
    return {
        "apps": [
            {"App": "app1", "Service Count": 2, "Versions": 3, "Last Updated": "2 days ago", "Owner": "Hugh"},
            {"App": "app2", "Service Count": 1, "Versions": 1, "Last Updated": "1 week ago", "Owner": "Hugh"},
            {"App": "shared-app", "Service Count": 1, "Versions": 6, "Last Updated": "1 day ago", "Owner": "Hugh"},
        ]
    }

@app.get("/deploy_app_version_old")
async def deploy_app_version_old(command_repo: str):
    import os
    import subprocess
    from datetime import datetime
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("deploy")
    
    github_token = os.environ.get("GITHUB_TOKEN")
    
    owner, repo_name = git_util.get_owner_and_repo_from_url(command_repo, logger)
    auth_repo_url = f"https://{github_token}@github.com/{owner}/{repo_name}.git"
    
    original_dir = os.getcwd()
    
    
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    temp_dir = git_util.generate_temp_path(timestamp)
    
    try:
        os.makedirs(temp_dir, exist_ok=True)
        
        git_util.clone(auth_repo_url, temp_dir, logger)
        
        os.chdir(temp_dir)
        
        subprocess.run(["git", "config", "user.name", "Cortex Deploy Bot"], check=True)
        subprocess.run(["git", "config", "user.email", "deploy-bot@example.com"], check=True)
        
        branch_name = f"deploy-{timestamp}"
        
        git_util.checkout_new_branch(branch_name, logger)
        
        deploy_dir = os.path.join(temp_dir, "deploy")
        os.makedirs(deploy_dir, exist_ok=True)
        
        file_path = os.path.join(deploy_dir, "version.txt")
        logger.info(f"Creating file: {file_path}")
        with open(file_path, "w") as f:
            f.write(f"Deploy timestamp: {datetime.now().isoformat()}\n")
            f.write(f"Created by: Cortex Deploy System\n")
        
        git_util.add(file_path, logger)
        
        commit_msg = f"Deploy new version {timestamp}"
        git_util.commit(commit_msg, logger)
        
        git_util.push(branch_name, logger)
        
        os.chdir(original_dir)
        
        return git_util.raise_pull_request(owner, repo_name, github_token, branch_name, logger)
    except Exception as e:
        logger.error(f"Deployment failed: {str(e)}")
        return {"status": "error", "message": f"Deployment failed: {str(e)}"}
    finally:
        os.chdir(original_dir)
        
    
@app.get("/deploy_app_version")
async def deploy_app_version(command_repo: str):
    import os
    import logging
    import re
    import requests
    from datetime import datetime
    
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("deploy")
    
    # Get GitHub token from environment variable
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        logger.error("GITHUB_TOKEN environment variable is not set")
        return {"status": "error", "message": "GITHUB_TOKEN environment variable is not set"}
    
    owner, repo_name = git_util.get_owner_and_repo_from_url(command_repo, logger)

    logger.info(f"Triggering GitHub Action in {owner}/{repo_name}")
    
    try:
        # GitHub API endpoint for triggering a workflow
        # We'll use the "workflow_dispatch" event to manually trigger the test.yaml workflow
        api_url = f"https://api.github.com/repos/{owner}/{repo_name}/actions/workflows/create-manifest-and-deploy.yaml/dispatches"
        
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # The workflow_dispatch event requires a ref (branch)
        # We'll use 'main' as the default branch
        payload = {
            "ref": "main"
        }
        
        logger.info(f"Sending request to {api_url}")
        response = requests.post(api_url, headers=headers, json=payload, verify="ca.crt")
        
        if response.status_code == 204:  # GitHub returns 204 No Content for successful workflow triggers
            # Get the URL to view the workflow run
            workflows_url = f"https://github.com/{owner}/{repo_name}/actions"
            logger.info(f"GitHub Action triggered successfully. View at: {workflows_url}")
            
            return {
                "status": "success",
                "message": "GitHub Action triggered successfully",
                "workflows_url": workflows_url,
                "timestamp": datetime.now().isoformat()
            }
        else:
            logger.error(f"Failed to trigger GitHub Action. Status: {response.status_code}, Response: {response.text}")
            return {
                "status": "error",
                "message": f"Failed to trigger GitHub Action: {response.text}",
                "status_code": response.status_code
            }
    
    except Exception as e:
        logger.error(f"Error triggering GitHub Action: {str(e)}")
        return {
            "status": "error",
            "message": f"Error triggering GitHub Action: {str(e)}"
        }


@app.get("/get_workflow_runs")
async def get_workflow_runs(repo_url: str, workflow_name: str = "create-manifest-and-deploy"):
    import os
    import logging
    import re
    import requests
    from datetime import datetime, timezone
    import dateutil.parser
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("workflows")
    
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        logger.error("GITHUB_TOKEN environment variable is not set")
        return {"status": "error", "message": "GITHUB_TOKEN environment variable is not set"}
    
    owner, repo_name = git_util.get_owner_and_repo_from_url(repo_url, logger)

    logger.info(f"Getting workflow runs for {owner}/{repo_name}, filtering for workflow: {workflow_name}")
    
    try:
        workflows_url = f"https://api.github.com/repos/{owner}/{repo_name}/actions/workflows"
        
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        logger.info(f"Fetching workflows from: {workflows_url}")
        workflows_response = requests.get(workflows_url, headers=headers, verify="ca.crt")
        
        if workflows_response.status_code != 200:
            logger.error(f"Failed to get workflows. Status: {workflows_response.status_code}")
            return {
                "status": "error",
                "message": f"Failed to get workflows: {workflows_response.text}",
                "status_code": workflows_response.status_code
            }
        
        workflows_data = workflows_response.json()
        target_workflow = None
        
        for workflow in workflows_data.get("workflows", []):
            if (workflow_name.lower() in workflow.get("name", "").lower() or 
                workflow_name.lower() in workflow.get("path", "").lower()):
                target_workflow = workflow
                break
        
        if not target_workflow:
            logger.warning(f"No workflow found matching '{workflow_name}'")
            return {
                "status": "success",
                "workflow_runs": [],
                "total_count": 0,
                "message": f"No workflow found matching '{workflow_name}'"
            }
        
        # Now get runs for the specific workflow
        workflow_id = target_workflow["id"]
        api_url = f"https://api.github.com/repos/{owner}/{repo_name}/actions/workflows/{workflow_id}/runs"
        
        logger.info(f"Fetching runs for workflow {workflow_id} from: {api_url}")
        response = requests.get(api_url, headers=headers, verify="ca.crt")
        
        if response.status_code == 200:
            workflow_data = response.json()
            
            # Process workflow runs
            processed_runs = []
            for run in workflow_data.get("workflow_runs", []):
                # Convert the created_at time to a more readable format
                created_at = dateutil.parser.parse(run["created_at"])
                updated_at = dateutil.parser.parse(run["updated_at"])
                
                # Calculate how long ago the run was created/updated
                now = datetime.now(timezone.utc)
                created_ago = now - created_at
                updated_ago = now - updated_at
                
                # Format as minutes or hours ago
                if created_ago.days > 0:
                    created_ago_str = f"{created_ago.days} days ago"
                elif created_ago.seconds // 3600 > 0:
                    created_ago_str = f"{created_ago.seconds // 3600} hours ago"
                else:
                    created_ago_str = f"{max(1, created_ago.seconds // 60)} minutes ago"
                
                processed_runs.append({
                    "id": run["id"],
                    "name": target_workflow["name"],  # Use the workflow name directly
                    "run_number": run["run_number"],
                    "status": run["status"],
                    "conclusion": run["conclusion"],
                    "created_at": run["created_at"],
                    "created_ago": created_ago_str,
                    "html_url": run["html_url"],
                    "actor": run["actor"]["login"] if "actor" in run else "Unknown",
                    "head_branch": run["head_branch"],
                    "duration": run.get("duration", 0) / 60 if run.get("duration") else None,
                    "run_attempt": run.get("run_attempt", 1)
                })
            
            return {
                "status": "success",
                "workflow_runs": processed_runs,
                "total_count": workflow_data.get("total_count", 0)
            }
        else:
            logger.error(f"Failed to get workflow runs. Status: {response.status_code}, Response: {response.text}")
            return {
                "status": "error",
                "message": f"Failed to get workflow runs: {response.text}",
                "status_code": response.status_code
            }
    
    except Exception as e:
        logger.error(f"Error getting workflow runs: {str(e)}")
        return {
            "status": "error",
            "message": f"Error getting workflow runs: {str(e)}"
        }