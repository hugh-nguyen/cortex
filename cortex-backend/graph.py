import yaml

def calculate_graph(data):
    coords = [
        {"x": 160, "y": 110},
        {"x": 120, "y": 280},
        {"x": 140, "y": 110},
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
    
    app_panel_dims = [
        { "width": 360, "height": 430 },
        { "width": 360, "height": 180 }
    ]
    app_panel_positions = [
        { "x": 40, "y": 40 },
        { "x": 440, "y": 40 }
    ]

    for i, a in enumerate(apps):
        apps[i] = {**a, **app_panel_dims[i], **app_panel_positions[i]}

    result = {
        "services": services, 
        "dependencies": dependencies,
        "apps": apps
    }
    print(result)
    return result

    