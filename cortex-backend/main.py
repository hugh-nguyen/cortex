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

