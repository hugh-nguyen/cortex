import yaml
import math

def add_app_dims_and_positions(main_app, apps, app_services_count):
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
                    x = central_x + main_width/2 + radius * math.cos(angle) * 3 - panel_width/2
                    y = central_y + main_height/2 + radius * math.sin(angle) * 3 - panel_height/2
                    
                    # Ensure panels stay within canvas bounds
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
    # Build a reverse dependency graph (who depends on what)
    reverse_deps = {}
    for service in services:
        reverse_deps[service["id"]] = []
    
    # Fill the reverse dependency graph
    for dep in dependencies:
        if dep["target"] in reverse_deps:
            reverse_deps[dep["target"]].append(dep["source"])
    
    # Find services that no one depends on (top tier)
    top_tier = [s["id"] for s in services if not reverse_deps[s["id"]]]
    
    # Assign tiers
    tiers = {}
    for service_id in top_tier:
        tiers[service_id] = 0
    
    # Forward dependency graph for tier assignment
    forward_deps = {}
    for service in services:
        forward_deps[service["id"]] = []
    
    for dep in dependencies:
        if dep["source"] in forward_deps:
            forward_deps[dep["source"]].append(dep["target"])
    
    # Process each tier until we've assigned tiers to all services
    visited = set(top_tier)
    current_tier = 0
    
    while True:
        next_tier = []
        for service_id in [s_id for s_id, tier in tiers.items() if tier == current_tier]:
            # Add dependencies of this service to the next tier
            for dep_id in forward_deps.get(service_id, []):
                if dep_id not in visited:
                    next_tier.append(dep_id)
                    visited.add(dep_id)
        
        if not next_tier:
            break
        
        # Assign tier to all services in next_tier
        current_tier += 1
        for service_id in next_tier:
            tiers[service_id] = current_tier
    
    # Assign a default tier for any remaining services
    for service in services:
        if service["id"] not in tiers:
            tiers[service["id"]] = current_tier + 1
    
    return tiers

def calculate_graph(main_app, data):
    # Default service positions within each app panel
    coords = [
        {"x": 160, "y": 110},
        {"x": 120, "y": 280},
        {"x": 140, "y": 110},
    ]
    
    # Parse YAML data
    yaml_data = yaml.safe_load(data)
    
    # Extract services
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
    
    # Extract dependencies
    dependencies = []
    for s in yaml_data:
        for d in s.get("depends_on", []):
            dep = {
                "source": s["svc"],
                "target": d["svc"],
            }
            dependencies.append(dep)
    
    # Calculate dependency tiers
    dependency_tiers = calculate_dependency_tiers(services, dependencies)
    
    # Group services by app
    services_by_app = {}
    for s in services:
        app_id = s["app"]
        if app_id not in services_by_app:
            services_by_app[app_id] = []
        services_by_app[app_id].append(s)
    
    # Position services within each app panel
    for app_id, app_services in services_by_app.items():
        # For the main app, position services based on hierarchy
        if app_id == main_app:
            # Group services by tier
            services_by_tier = {}
            for service in app_services:
                tier = dependency_tiers.get(service["id"], 0)
                if tier not in services_by_tier:
                    services_by_tier[tier] = []
                services_by_tier[tier].append(service)
            
            # Fixed y positions per tier
            y_positions = {
                0: 100,  # Top tier
                1: 240,  # Second tier
                2: 360   # Third tier (if needed)
            }
            
            # Position services in each tier
            for tier in sorted(services_by_tier.keys()):
                tier_services = services_by_tier[tier]
                service_count = len(tier_services)
                
                # Calculate horizontal positions
                if service_count == 1:
                    # Center a single service
                    tier_services[0]["x"] = 180
                    tier_services[0]["y"] = y_positions.get(tier, 100 + tier * 120)
                else:
                    # Evenly space multiple services
                    x_spacing = 1000 / (service_count + 1)
                    for i, service in enumerate(tier_services):
                        service["x"] = -200 + 30 + (i + 1) * x_spacing
                        service["y"] = y_positions.get(tier, 100 + tier * 120)
        else:
            # For non-main apps, use the original coordinate assignment
            for i, service in enumerate(app_services):
                coord_index = i % len(coords)
                service["x"] = coords[coord_index]["x"]
                service["y"] = coords[coord_index]["y"]
    
    # Count services per app for panel sizing
    app_services_count = {}
    for s in services:
        app = s["app"]
        app_services_count[app] = app_services_count.get(app, 0) + 1
    
    # Extract unique apps
    apps = []
    seen = set()
    for s in services:
        app = s["app"]
        if app not in seen:
            seen.add(app)
            apps.append({"id": app, "name": app})
    
    # Sort apps - main app first
    if main_app and any(a["id"] == main_app for a in apps):
        # Find and move main app to front
        main_app_index = next((i for i, a in enumerate(apps) if a["id"] == main_app), -1)
        if main_app_index > 0:
            main_app_obj = apps.pop(main_app_index)
            apps.insert(0, main_app_obj)
    
    # Calculate app panel dimensions and positions
    apps = add_app_dims_and_positions(main_app, apps, app_services_count)
    
    # Build result
    result = {
        "services": services,
        "dependencies": dependencies,
        "apps": apps
    }
    
    return result