from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
import yaml

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

@app.get("/")
async def read_root():
    return {"message": "Hello World"}

@app.get("/hello/{name}")
async def read_hello(name: str):
    return {"message": f"Hello {name}"}

@app.get("/test")
async def get_hello():
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

    return {
        "services": services, 
        "dependencies": dependencies,
        "apps": apps
    }

@app.get("/get_graph")
async def get_graph(name: str = "Graph User"):
    return {"message": f"Hello {name}, here is your graph"}