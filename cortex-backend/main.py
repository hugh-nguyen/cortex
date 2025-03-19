from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
import yaml
import graph
import graph_original

app = FastAPI(
    title="Hello World API",
    description="A simple API that returns Hello World",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only. In production, specify your domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graph_app1v3_yaml = """
- app: app1
  svc: service-a
  ver: 0.0.36
  depends_on:
  - app: app1
    svc: service-b
    ver: 0.0.7
  - app: app5
    svc: service-t
    ver: 0.0.4
- app: app1
  svc: service-b
  ver: 0.0.7
  depends_on:
  - app: shared-app
    svc: service-s
    ver: 0.0.4
  - app: app2
    svc: service-y
    ver: 0.0.2
  - app: app3
    svc: service-z
    ver: 0.0.3
  - app: app4
    svc: service-x
    ver: 0.0.9
"""

graph_app1v2_yaml = """
- app: app1
  svc: service-a
  ver: 0.0.36
  depends_on:
  - app: app1
    svc: service-b
    ver: 0.0.7
- app: app1
  svc: service-b
  ver: 0.0.7
  depends_on:
  - app: shared-app
    svc: service-s
    ver: 0.0.4
"""


@app.get("/")
async def read_root():
    return {"message": "Hello World"}

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

@app.get("/test_app_versions")
async def test_app_versions(app: str = "app1"):
    graph_app1v3 = {'services': [{'id': 'service-a', 'app': 'app1', 'name': 'service-a', 'ver': '0.0.36', 'x': 200, 'y': 150}, {'id': 'service-b', 'app': 'app1', 'name': 'service-b', 'ver': '0.0.7', 'x': 160, 'y': 320}, {'id': 'service-s', 'app': 'shared-app', 'name': 'service-s', 'ver': '0.0.4', 'x': 580, 'y': 250}], 'dependencies': [{'source': 'service-a', 'target': 'service-b'}, {'source': 'service-b', 'target': 'service-s'}], 'apps': [{'id': 'app1', 'name': 'app1', 'x': 40, 'y': 40, 'width': 360, 'height': 430}, {'id': 'shared-app', 'name': 'shared-app', 'x': 440, 'y': 40, 'width': 360, 'height': 430}]}
    graph_app1v2 = {'services': [{'id': 'service-a', 'app': 'app1', 'name': 'service-a', 'ver': '0.0.35', 'x': 200, 'y': 150}, {'id': 'service-b', 'app': 'app1', 'name': 'service-b', 'ver': '0.0.6', 'x': 160, 'y': 320}, {'id': 'service-s', 'app': 'shared-app', 'name': 'service-s', 'ver': '0.0.4', 'x': 580, 'y': 250}], 'dependencies': [{'source': 'service-a', 'target': 'service-b'}, {'source': 'service-b', 'target': 'service-s'}], 'apps': [{'id': 'app1', 'name': 'app1', 'x': 40, 'y': 40, 'width': 360, 'height': 430}, {'id': 'shared-app', 'name': 'shared-app', 'x': 440, 'y': 40, 'width': 360, 'height': 430}]}
    graph_app1v1 = {'services': [{'id': 'service-a', 'app': 'app1', 'name': 'service-a', 'ver': '0.0.35', 'x': 200, 'y': 150}, {'id': 'service-b', 'app': 'app1', 'name': 'service-b', 'ver': '0.0.5', 'x': 160, 'y': 320}, {'id': 'service-s', 'app': 'shared-app', 'name': 'service-s', 'ver': '0.0.3', 'x': 580, 'y': 250}], 'dependencies': [{'source': 'service-a', 'target': 'service-b'}, {'source': 'service-b', 'target': 'service-s'}], 'apps': [{'id': 'app1', 'name': 'app1', 'x': 40, 'y': 40, 'width': 360, 'height': 430}, {'id': 'shared-app', 'name': 'shared-app', 'x': 440, 'y': 40, 'width': 360, 'height': 430}]}
    graph_app2v1 = {'services': [{'id': 'service-a', 'app': 'app2', 'name': 'service-y', 'ver': '0.0.1', 'x': 200, 'y': 150}, {'id': 'service-s', 'app': 'shared-app', 'name': 'service-s', 'ver': '0.0.4', 'x': 580, 'y': 250}], 'dependencies': [{'source': 'service-y', 'target': 'service-s'}], 'apps': [{'id': 'app2', 'name': 'app2', 'x': 40, 'y': 40, 'width': 360, 'height': 430}, {'id': 'shared-app', 'name': 'shared-app', 'x': 440, 'y': 40, 'width': 360, 'height': 430}]}
    graph_shared_appv1 = {'services': [{'id': 'service-s', 'app': 'shared-app', 'name': 'service-s', 'ver': '0.0.3', 'x': 580, 'y': 250}], 'dependencies': [], 'apps': [{'id': 'shared-app', 'name': 'shared-app', 'x': 40, 'y': 40, 'width': 360, 'height': 430}]}
    graph_shared_appv2 = {'services': [{'id': 'service-s', 'app': 'shared-app', 'name': 'service-s', 'ver': '0.0.4', 'x': 580, 'y': 250}], 'dependencies': [], 'apps': [{'id': 'shared-app', 'name': 'shared-app', 'x': 40, 'y': 40, 'width': 360, 'height': 430}]}
    graph_shared_appv3 = {'services': [{'id': 'service-s', 'app': 'shared-app', 'name': 'service-s', 'ver': '0.0.5', 'x': 580, 'y': 250}], 'dependencies': [], 'apps': [{'id': 'shared-app', 'name': 'shared-app', 'x': 40, 'y': 40, 'width': 360, 'height': 430}]}
    
    database = {
        "app1": {
            3: {"app": "app1", "version": 3, "graph": graph.calculate_graph("app1", graph_app1v3_yaml)},
            2: {"app": "app1", "version": 2, "graph": graph_original.calculate_graph(graph_app1v2_yaml)},
            1: {"app": "app1", "version": 1, "graph": graph_app1v1},
        },
        "app2": {
            1: {"app": "app2", "version": 3, "graph": graph_app2v1},
        },
        "shared-app": {
            3: {"app": "shared-app", "version": 3, "graph": graph_shared_appv3},
            2: {"app": "shared-app", "version": 3, "graph": graph_shared_appv2},
            1: {"app": "shared-app", "version": 3, "graph": graph_shared_appv1},
        },
    }
    return {
        "app_versions": database[app]
    }

@app.get("/test_graph")
async def test_graph():
    test_yaml = """
- app: app1
  svc: service-a
  ver: 0.0.36
  depends_on:
  - app: app1
    svc: service-b
    ver: 0.0.7
- app: app1
  svc: service-b
  ver: 0.0.7
  depends_on:
  - app: shared-app
    svc: service-s
    ver: 0.0.4
"""
    coords = [
        {"x": 200, "y": 150},
        {"x": 160, "y": 320},
        {"x": 580, "y": 250},
    ]
    services = []
    seen = set()
    for s in yaml.safe_load(test_yaml):
        svc = {
            "id": s["svc"],
            "app": s["app"],
            "name": s["svc"],
            "ver": s["ver"],
        }
        key = f"{s['app']}-{s['svc']}"
        if key not in seen:
            seen.add(key)
            services.append(svc)
        for d in s["depends_on"]:
            svc = {
                "id": d["svc"],
                "app": d["app"],
                "name": d["svc"],
                "ver": d["ver"],
            }
            key = f"{d['app']}-{d['svc']}"
            if key not in seen:
                seen.add(key)
                services.append(svc)
    for i, s in enumerate(services):
        s["x"] = coords[i]["x"]
        s["y"] = coords[i]["y"]


    dependencies = []
    for s in yaml.safe_load(test_yaml):
        for d in s["depends_on"]:
            dep = {
                "source": s["svc"],
                "target": d["svc"],
            }
            dependencies.append(dep)
    
    apps = []
    seen = set()
    for s in services:
        app = s["app"]
        if app not in seen:
            seen.add(app)
            apps.append({"id": app, "name": app})
    dims = [
        { "x": 40, "y": 40, "width": 360, "height": 430 },
        { "x": 440, "y": 40, "width": 360, "height": 430 }
    ]

    for i, a in enumerate(apps):
        apps[i] = {**a, **dims[i]}

    result = {
        "services": services, 
        "dependencies": dependencies,
        "apps": apps
    }
    print(result)
    return result

@app.get("/get_graph")
async def get_graph(name: str = "Graph User"):
    return {"message": f"Hello {name}, here is your graph"}