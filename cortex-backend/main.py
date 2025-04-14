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

# @app.get("/get_app_versions")
# async def get_apps_versions(app: str = "app1"):
#     app_versions = dynamo_util.get_app_versions(app)
#     transform = lambda av: {
#       "app": av["app_name"],
#       "version": av["version"],
#       "graph": graph.calculate_graph(av["app_name"], av["yaml"]),
#       "run_id": av["run_id"],
#     }
#     app_versions = {int(av["version"]): transform(av) for av in app_versions}
    
#     repo_url = f"https://github.com/hugh-nguyen/{app}-cortex-command"
#     workflow_name = "create-manifest-and-deploy"
#     runs = git_util.get_workflow_runs(repo_url, workflow_name)["workflow_runs"]
#     lookup = {r["id"]: r for r in runs}
    
#     app_versions = {k: {**av, "run": lookup[av["run_id"]]} for k, av in app_versions.items() if "run_id" in av}
#     # app_versions = {k: av for k, av in app_versions.items() if "run_id" in av}
#     # app_versions = {k: av for k, av in app_versions.items()}
    
#     return {"app_versions": app_versions}

@app.get("/get_app_versions")
async def get_apps_versions(app: str = "app1"):
    app_versions = dynamo_util.get_app_versions(app)
    transform = lambda av: {
      "app": av["app_name"],
      "version": av["version"],
      "graph": graph.calculate_graph(av["app_name"], av["yaml"]),
      "run_id": av["run_id"],
    }
    app_versions = {int(av["version"]): transform(av) for av in app_versions}
    print("!!!", len(app_versions))
    
    repo_url = f"https://github.com/hugh-nguyen/{app}-cortex-command"
    workflow_name = "create-manifest-and-deploy"
    runs = git_util.get_workflow_runs(repo_url, workflow_name)["workflow_runs"]
    lookup = {r["id"]: r for r in runs}
    
    app_versions = {k: {**av, "run": lookup.get(av["run_id"])} for k, av in app_versions.items() if "run_id" in av}
    print("!!!!!!", len(app_versions))  
    
    # Check for in-progress workflows that don't correspond to existing versions
    # This will be our "deploying" version
    existing_run_ids = {av.get("run_id") for av in app_versions.values() if "run_id" in av}
    deploying_runs = [r for r in runs if 
                      #r["id"] not in existing_run_ids and 
                     (r["status"] == "in_progress" or r["status"] == "queued" or r["status"] == "waiting")]
    
    # If we have any deploying runs, add a special "deploying" version
    if deploying_runs:
        # Sort by creation time (newest first) and take the most recent
        newest_deploying = sorted(deploying_runs, key=lambda r: r["created_at"], reverse=True)[0]
        
        # Create a dummy version with a special indicator
        app_versions["deploying"] = {
            "app": app,
            "version": "deploying",  # Special marker for frontend
            "graph": None,  # No graph data yet
            "run": newest_deploying,
            "is_deploying": True
        }
    
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
async def deploy_app_version(app_name: str, command_repo: str):
    # from datetime import datetime
    # from create_application_version_manifest import create_application_version_manifest
    # new_manifest = create_application_version_manifest(app_name)

    # if not new_manifest:
    #     return {"status": "error", "message": "No New Manifest"}
    # return {
    #     "status": "success",
    #     "message": "GitHub Action triggered successfully",
    #     "workflows_url": "www.google.com",
    #     "manifest": new_manifest,
    #     "graph": graph.calculate_graph(app_name, new_manifest["manifest"]),
    #     "timestamp": datetime.now().isoformat()
    # }
    
    return git_util.run_workflow(command_repo, "create-manifest-and-deploy")
    

@app.get("/get_workflow_runs")
async def get_workflow_runs(app_name: str, repo_url: str, workflow_name: str = "create-manifest-and-deploy", mode: str = "builds"):
    
    result = git_util.get_workflow_runs(repo_url, workflow_name)
    
    if mode == "builds":
        return result
    
    app_versions = dynamo_util.get_app_versions(app_name)
    lookup = {av["run_id"]: av["version"] for av in app_versions if "run_id" in av}
    
    result["workflow_runs"] = [{**r, "app_version": lookup.get(r["id"])} for r in result["workflow_runs"]]
    return result