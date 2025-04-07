from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
import yaml
import graph
import graph_original
import dynamo_util
import envoy_util

from fastapi import FastAPI, Body
from typing import List, Dict, Any

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

@app.get("/deploy_app_version")
async def deploy_app_version(command_repo: str):
    import os
    import tempfile
    import subprocess
    import random
    import string
    import time
    import re
    from datetime import datetime
    
    match = re.search(r'github\.com/([^/]+)/([^/]+)', command_repo)
    if not match:
        return {"status": "error", "message": "Invalid GitHub URL format"}
    
    owner = match.group(1)
    repo_name = match.group(2)
    
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            subprocess.run(
                ["git", "clone", command_repo, temp_dir],
                check=True, capture_output=True
            )
            
            os.chdir(temp_dir)
            
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
            branch_name = f"deploy-{timestamp}-{random_str}"
            
            subprocess.run(
                ["git", "checkout", "-b", branch_name],
                check=True, capture_output=True
            )
            
            version_file_path = os.path.join(temp_dir, "deploy", "version.txt")
            os.makedirs(os.path.dirname(version_file_path), exist_ok=True)
            
            with open(version_file_path, "w") as f:
                f.write(f"Deploy timestamp: {datetime.now().isoformat()}\n")
                f.write(f"Deployed by: Cortex Deploy System\n")
            
            subprocess.run(
                ["git", "add", version_file_path],
                check=True, capture_output=True
            )
            
            subprocess.run(
                ["git", "commit", "-m", f"Deploy new version {timestamp}"],
                check=True, capture_output=True
            )
            
            subprocess.run(
                ["git", "push", "-u", "origin", branch_name],
                check=True, capture_output=True
            )
            
            time.sleep(2)  # Simulate API call delay
            
            pr_url = f"https://github.com/{owner}/{repo_name}/pull/new/{branch_name}"
            
            return {
                "status": "success",
                "pr_url": pr_url,
                "message": "Successfully created deployment PR"
            }
            
        except subprocess.CalledProcessError as e:
            return {
                "status": "error",
                "message": f"Git operation failed: {e.stderr.decode('utf-8') if e.stderr else str(e)}"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Deployment failed: {str(e)}"
            }