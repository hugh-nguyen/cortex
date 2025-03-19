import yaml
import math

def add_app_dims_and_postiions(main_app, apps, app_services_count):
    # Calculate panel sizes and positions
    total_apps = len(apps)
    
    # Canvas dimensions and padding
    canvas_width = 1400
    canvas_height = 900
    padding = 40
    base_panel_width = 360
    base_panel_height = 200
    
    app_panel_dims = []
    app_panel_positions = []
    
    # Calculate sizes and positions based on number of apps
    if total_apps > 0:
        # Get main app service count
        main_app_index = next((i for i, a in enumerate(apps) if a["id"] == main_app), 0)
        main_app_obj = apps[main_app_index]
        main_app_service_count = app_services_count.get(main_app_obj["id"], 3)
        
        # Calculate main app panel dimensions
        main_width = math.ceil(main_app_service_count / 3) * 360
        main_height = min(60 + main_app_service_count * 140, 480)
        
        if total_apps <= 5:
            # Layout for 5 or fewer apps (main app in top left)
            # Place main app first
            app_panel_dims.append({"width": main_width, "height": main_height})
            app_panel_positions.append({"x": padding, "y": padding})
            
            # Position secondary apps in a clockwise pattern
            if total_apps > 1:
                # Calculate positions for secondary apps
                secondary_width = base_panel_width
                secondary_height = base_panel_height
                
                # Start positions to the right of main app
                start_x = padding + main_width + padding
                start_y = padding
                
                # Positions: right, then down, then left
                positions = [
                    {"x": start_x, "y": start_y},  # Top right
                    {"x": start_x, "y": start_y + secondary_height + padding},  # Middle right
                    {"x": padding, "y": padding + main_height + padding},  # Bottom left
                    {"x": start_x, "y": start_y + 2 * (secondary_height + padding)}  # Bottom right
                ]
                
                for i in range(1, total_apps):
                    # Calculate panel sizes based on service count
                    app_id = apps[i]["id"]
                    service_count = app_services_count.get(app_id, 1)
                    panel_width = max(secondary_width, service_count * 180)
                    panel_height = max(secondary_height, 60 + service_count * 100)
                    
                    app_panel_dims.append({"width": panel_width, "height": panel_height})
                    app_panel_positions.append(positions[i-1])
        else:
            # Layout for 6-11 apps (main app in center)
            central_x = (canvas_width - main_width) / 2
            central_y = (canvas_height - main_height) / 2
            
            app_panel_dims.append({"width": main_width, "height": main_height})
            app_panel_positions.append({"x": central_x, "y": central_y})
            
            # Position secondary apps in a full circle around the main app
            if total_apps > 1:
                secondary_width = base_panel_width
                secondary_height = base_panel_height
                
                # Calculate positions for a circular arrangement
                radius = max(main_width, main_height) / 2 + padding + secondary_height / 2
                
                for i in range(1, total_apps):
                    # Calculate panel sizes based on service count
                    app_id = apps[i]["id"]
                    service_count = app_services_count.get(app_id, 1)
                    panel_width = max(secondary_width, service_count * 180)
                    panel_height = max(secondary_height, 60 + service_count * 100)
                    
                    angle = (i - 1) * (2 * math.pi / (total_apps - 1))
                    x = central_x + main_width/2 + radius * math.cos(angle) * 1.6 - panel_width/2
                    y = central_y + main_height/2 + radius * math.sin(angle) * 1.6 - panel_height/2
                    
                    # Ensure panels stay within canvas bounds
                    x = max(padding, min(x, canvas_width - panel_width - padding))
                    y = max(padding, min(y, canvas_height - panel_height - padding))
                    
                    app_panel_dims.append({"width": panel_width, "height": panel_height})
                    app_panel_positions.append({"x": x, "y": y})
    for i, a in enumerate(apps):
        if i < len(app_panel_dims) and i < len(app_panel_positions):
            apps[i] = {**a, **app_panel_dims[i], **app_panel_positions[i]}
    return apps
    

def calculate_graph(main_app, data):
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
    
    services_by_app = {}
    for s in services:
        app_id = s["app"]
        if app_id not in services_by_app:
            services_by_app[app_id] = []
        services_by_app[app_id].append(s)
    
    for app_id, app_services in services_by_app.items():
        for i, service in enumerate(app_services):
            coord_index = i % len(coords)
            service["x"] = coords[coord_index]["x"]
            service["y"] = coords[coord_index]["y"]

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
    app_services_count = {}
    
    for s in services:
        app = s["app"]
        app_services_count[app] = app_services_count.get(app, 0) + 1
        
        if app not in seen:
            seen.add(app)
            apps.append({"id": app, "name": app})

    apps = add_app_dims_and_postiions(main_app, apps, app_services_count)
    
    for service in services:
        app_id = service["app"]
        app_obj = next((a for a in apps if a["id"] == app_id), None)
        
        if app_obj:
            service["x"] = service["x"]
            service["y"] = service["y"]
    
    result = {
        "services": services,
        "dependencies": dependencies,
        "apps": apps
    }
    
    return result