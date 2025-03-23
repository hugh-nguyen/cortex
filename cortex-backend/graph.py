import yaml
import math

def add_app_dims_and_positions(main_app, apps, app_services_count):
    total_apps = len(apps)
    
    canvas_width = 1400
    canvas_height = 900
    padding = 40
    base_panel_width = 360
    base_panel_height = 200
    
    app_panel_dims = []
    app_panel_positions = []
    
    if total_apps > 0:
        main_app_index = next((i for i, a in enumerate(apps) if a["id"] == main_app), 0)
        main_app_obj = apps[main_app_index]
        main_app_service_count = app_services_count.get(main_app_obj["id"], 3)
        
        main_width = math.ceil(main_app_service_count / 3) * 360
        main_height = min(60 + main_app_service_count * 140, 480)
        
        if total_apps <= 5:
            app_panel_dims.append({"width": main_width, "height": main_height})
            app_panel_positions.append({"x": padding, "y": padding})
            
            if total_apps > 1:
                secondary_width = base_panel_width
                secondary_height = base_panel_height
                
                start_x = padding + main_width + padding
                start_y = padding
                
                positions = [
                    {"x": start_x, "y": start_y},
                    {"x": start_x, "y": start_y + secondary_height + padding},
                    {"x": padding, "y": padding + main_height + padding},
                    {"x": start_x, "y": start_y + 2 * (secondary_height + padding)}
                ]
                
                for i in range(1, total_apps):
                    app_id = apps[i]["id"]
                    service_count = app_services_count.get(app_id, 1)
                    panel_width = max(secondary_width, service_count * 180)
                    panel_height = max(secondary_height, 60 + service_count * 100)
                    
                    app_panel_dims.append({"width": panel_width, "height": panel_height})
                    app_panel_positions.append(positions[i-1])
        else:
            central_x = (canvas_width - main_width) / 2
            central_y = (canvas_height - main_height) / 2
            
            app_panel_dims.append({"width": main_width, "height": main_height})
            app_panel_positions.append({"x": central_x, "y": central_y})
            
            if total_apps > 1:
                secondary_width = base_panel_width
                secondary_height = base_panel_height
                
                radius = max(main_width, main_height) / 2 + padding + secondary_height / 2
                
                for i in range(1, total_apps):
                    app_id = apps[i]["id"]
                    service_count = app_services_count.get(app_id, 1)
                    panel_width = max(secondary_width, service_count * 180)
                    panel_height = max(secondary_height, 60 + service_count * 100)
                    
                    angle = (i - 1) * (2 * math.pi / (total_apps - 1))
                    x = central_x + main_width/2 + radius * math.cos(angle) * 3 - panel_width/2
                    y = central_y + main_height/2 + radius * math.sin(angle) * 3 - panel_height/2
                    
                    x = max(padding, min(x, canvas_width - panel_width - padding))
                    y = max(padding, min(y, canvas_height - panel_height - padding))
                    
                    app_panel_dims.append({"width": panel_width, "height": panel_height})
                    app_panel_positions.append({"x": x, "y": y})
    for i, a in enumerate(apps):
        if i < len(app_panel_dims) and i < len(app_panel_positions):
            apps[i] = {**a, **app_panel_dims[i], **app_panel_positions[i]}
    return apps

def calculate_dependency_tiers(services, dependencies):
    """
    Calculate dependency tiers for each service.
    Tier 0: Services that no other service depends on (top of hierarchy).
    Tier 1: Services that only Tier 0 services depend on.
    And so on.
    """
    reverse_deps = {}
    for service in services:
        reverse_deps[service["id"]] = []
    
    for dep in dependencies:
        if dep["target"] in reverse_deps:
            reverse_deps[dep["target"]].append(dep["source"])
    
    top_tier = [s["id"] for s in services if not reverse_deps[s["id"]]]
    
    tiers = {}
    for service_id in top_tier:
        tiers[service_id] = 0
    
    forward_deps = {}
    for service in services:
        forward_deps[service["id"]] = []
    
    for dep in dependencies:
        if dep["source"] in forward_deps:
            forward_deps[dep["source"]].append(dep["target"])
    
    visited = set(top_tier)
    current_tier = 0
    
    while True:
        next_tier = []
        for service_id in [s_id for s_id, tier in tiers.items() if tier == current_tier]:
            for dep_id in forward_deps.get(service_id, []):
                if dep_id not in visited:
                    next_tier.append(dep_id)
                    visited.add(dep_id)
        
        if not next_tier:
            break
        
        current_tier += 1
        for service_id in next_tier:
            tiers[service_id] = current_tier
    
    for service in services:
        if service["id"] not in tiers:
            tiers[service["id"]] = current_tier + 1
    
    return tiers

def add_context(main_app, data):
    services = yaml.safe_load(data)
    lookup = {}
    for s in services:
        lookup[s["svc"]] = s["ver"]
    
    for s in services:
        service = {**s}
        if "depends_on" in s:
            for d in s["depends_on"]:
                if "app" not in d:
                    d["app"] = main_app
                if "ver" not in d:
                    d["ver"] = lookup[d["svc"]]
        
    return services


def calculate_graph(main_app, data):
    coords = [
        {"x": 130, "y": 110},
        {"x": 90, "y": 280},
        {"x": 110, "y": 110},
    ]
    
    yaml_data = add_context(main_app, data)
    print(yaml_data)
    
    services = []
    seen = set()
    
    for s in yaml_data:
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
        
        for d in s.get("depends_on", []):
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
    
    dependencies = []
    for s in yaml_data:
        for d in s.get("depends_on", []):
            dep = {
                "source": s["svc"],
                "target": d["svc"],
            }
            dependencies.append(dep)
    
    dependency_tiers = calculate_dependency_tiers(services, dependencies)
    
    services_by_app = {}
    for s in services:
        app_id = s["app"]
        if app_id not in services_by_app:
            services_by_app[app_id] = []
        services_by_app[app_id].append(s)
    
    for app_id, app_services in services_by_app.items():
        if app_id == main_app:
            services_by_tier = {}
            for service in app_services:
                tier = dependency_tiers.get(service["id"], 0)
                if tier not in services_by_tier:
                    services_by_tier[tier] = []
                services_by_tier[tier].append(service)
            
            y_positions = {
                0: 100,
                1: 240,
                2: 360 
            }
            
            for tier in sorted(services_by_tier.keys()):
                tier_services = services_by_tier[tier]
                service_count = len(tier_services)
                
                if service_count == 1:
                    tier_services[0]["x"] = 140
                    tier_services[0]["y"] = y_positions.get(tier, 100 + tier * 120)
                else:
                    x_spacing = 1000 / (service_count + 1)
                    for i, service in enumerate(tier_services):
                        service["x"] = -200 + 30 + (i + 1) * x_spacing
                        service["y"] = y_positions.get(tier, 100 + tier * 120)
        else:
            for i, service in enumerate(app_services):
                coord_index = i % len(coords)
                service["x"] = coords[coord_index]["x"]
                service["y"] = coords[coord_index]["y"]
    
    app_services_count = {}
    for s in services:
        app = s["app"]
        app_services_count[app] = app_services_count.get(app, 0) + 1
    
    apps = []
    seen = set()
    for s in services:
        app = s["app"]
        if app not in seen:
            seen.add(app)
            apps.append({"id": app, "name": app})
    
    if main_app and any(a["id"] == main_app for a in apps):
        main_app_index = next((i for i, a in enumerate(apps) if a["id"] == main_app), -1)
        if main_app_index > 0:
            main_app_obj = apps.pop(main_app_index)
            apps.insert(0, main_app_obj)
    
    apps = add_app_dims_and_positions(main_app, apps, app_services_count)
    
    result = {
        "services": services,
        "dependencies": dependencies,
        "apps": apps
    }
    
    return result