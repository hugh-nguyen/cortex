import yaml 

def calculate_graph(data):
    coords = [
        {"x": 200, "y": 150},
        {"x": 160, "y": 320},
        {"x": 580, "y": 250},
    ]
    services = []
    seen = set()
    for s in yaml.safe_load(data):
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
    for s in yaml.safe_load(data):
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