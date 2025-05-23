import yaml
import requests
import os
from collections import defaultdict
import dynamo_util

def env_route_sort_key(route):
    # --- normalise headers into a dict --------------------------------------
    header_map = {
        (h.get("Name")  or h.get("name")):
        (h.get("Value") or h.get("value"))
        for h in route.get("headers", [])
        if (h.get("Name") or h.get("name"))
    }

    header_cnt            = len(header_map)          # <-- NEW
    app_name_sort_key     = header_map.get("X-App-Name", "zzzzzzzz")
    app_version_sort_key  = int(header_map.get("X-App-Version", 99999999))

    # --- headers_to_add (unchanged) -----------------------------------------
    add_header_map = {
        (h.get("Key")  or h.get("key")):
        (h.get("Value") or h.get("value"))
        for h in route.get("headers_to_add", [])
        if (h.get("Key") or h.get("key"))
    }
    add_app_name_sort_key    = add_header_map.get("X-App-Name", "zzzzzzzz")
    add_app_version_sort_key = int(add_header_map.get("X-App-Version", 99999999))
    has_headers_to_add       = bool(add_header_map)

    is_override = route.get("is_override", False)

    # --------   the sort tuple   --------------------------------------------
    return (
        route["prefix"],        # 1) group by path
        -header_cnt,            # 2) more header matchers → smaller (earlier)
        app_name_sort_key,      # 3… same tie‑break rules as before
        app_version_sort_key,
        add_app_name_sort_key,
        add_app_version_sort_key,
        has_headers_to_add,
        is_override,
        route.get("cluster", "")
    )

def choose_route(routes):
    most_recent = routes[0]
    for r in routes:
        if r.get("custom") == True:
            return {k: v for k, v in r.items() if k != "custom"}
        if "cluster" in r and r["cluster"] > most_recent["cluster"]:
            most_recent = r
    return most_recent

def sort_routes(routes):
    routes = set([yaml.dump(r, sort_keys=False) for r in routes])
    routes = [yaml.safe_load(r) for r in routes]

    groups = defaultdict(list)
    for r in routes:
        signature = r["prefix"]
        if "headers" in r:
            for h in r["headers"]:
                signature += h["Value"] 
        groups[signature].append(r)
    
    result = []
    for k, group in groups.items():
        result.append(choose_route(group))

    return sorted(result, key=env_route_sort_key)

def transform_headers(headers):
    return [{"Name": str(k), "Value": str(v)} for k, v in headers.items()]


def download_manifests(output_path, folder_path="app-version-manifests"):
    owner = "hugh-nguyen"
    repo = "cortex-deploy-log"
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{folder_path}"

    response = requests.get(url, verify="ca.crt")
    if response.status_code == 200:
        items = response.json()
        os.makedirs(output_path, exist_ok=True)
        for item in items:
            if item["type"] == "file":
                download_url = item["download_url"]
                file_response = requests.get(download_url, verify="ca.crt")
                if file_response.status_code == 200:
                    file_path = os.path.join(output_path, item["name"])
                    with open(file_path, "wb") as f:
                        f.write(file_response.content)
                    print(f"Downloaded {item['name']}")
                else:
                    print(f"Failed to download {item['name']}")
            elif item["type"] == "dir":
                sub_output_path = os.path.join(output_path, item["name"])
                download_manifests(sub_output_path, folder_path=item["path"])
    else:
        print("Failed to retrieve folder contents")

def get_all_files(directory, suffix):
    file_list = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            file_list.append(file_path)
    if suffix:
        return [f for f in file_list if f.endswith(suffix)]
    return file_list


def transform_targets(targets, lookup):
    result = []
    for target in targets:
        key = (target['app'], target['svc'], int(target['app_ver']))
        if key not in lookup:
            continue
        svc_ver = lookup[key]
        r = {
            "name": f"{target['app']}-{target['svc']}-{svc_ver.replace('.', '-')}",
            "weight": int(target["weight"]),
            "request_headers_to_add": [
                {
                    "Key": "X-App-Version",
                    "Value": str(target["app_ver"])
                },
                {
                    "Key": "X-App-Name",
                    "Value": target["app"]
                },
            ]
        }
        result.append(r)
    return result


def transform_custom_routes(routes, lookup):
    result = []
    for route in routes:
        r = {
            "prefix": route["prefix"],
            "headers": [],
            "weighted_clusters": transform_targets(route["targets"], lookup),
            "custom": True
        }
        result.append(r)
    return result
        

def transform_routes(routes):
    
    services_lookup = {s["name"].replace("/", "-").replace("@", "-").replace(".", "-"): s for s in dynamo_util.get_services()}
    
    result = []
    for route in routes:
        r = {**route}
        if "headers" in r:
            r["headers"] = transform_headers(r["headers"])
        if "headers_to_add" in r:
            r["headers_to_add"] = transform_headers(r["headers_to_add"])
        
        if route["cluster"] in services_lookup:
            service = services_lookup[route["cluster"]]
            if service.get("platform") == "serverless":
                print(route["cluster"], service.get("platform"))
                r["address"] = service["hostname"]
                r["prefix_rewrite"] = service["rewrite"]
                r["cluster_type"] = "LOGICAL_DNS"
                r["tls"] = True
                r["dn_lookup_family"] = "V4_ONLY"
        
        result.append(r)
        
    return sort_routes(result)


def update_envoy():
    
    import subprocess
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    
    download_manifests("temp")
    avm_paths = get_all_files("temp", "yaml")
    routes = []
    lookup = {}
    sort_key = lambda x: x.split("/")[-1].removesuffix(".yaml")
    for avm_path in sorted(avm_paths, key=sort_key):
        print(avm_path)
        app_version = yaml.safe_load(open(avm_path, "r").read())
        routes += app_version.get("routes", [])
        
        app_ver = int(avm_path.split("/")[-1].removesuffix(".yaml"))
        for service in app_version["services"]:
            print((service["app"], service["svc"], app_ver))
            lookup[(service["app"], service["svc"], app_ver)] = service["svc_ver"]
    
    xroutes = dynamo_util.get_all_rows("routes")
    routes = transform_routes(routes) + transform_custom_routes(xroutes, lookup)
    routes = sort_routes(routes)
    
    # import json; open("test.json", "w").write(json.dumps(sort_routes(routes)))
    
    url = "http://hn-cortex.click/api/v1/routes"
    payload = {"routes": routes}
    response = requests.post(url, json=payload)
    print("!!",response.text)
    