import yaml
import requests
import os
from collections import defaultdict
import cortex.dynamo_util

def env_route_sort_key(route):
    app_name_sort_key = "zzzzzzzz"
    app_version_sort_key = 99999999
    add_app_name_sort_key = "zzzzzzzz"
    add_app_version_sort_key = 99999999
    is_override = False
    has_headers_to_add = False

    if "headers" in route:
        if "X-App-Name" in route["headers"]:
            app_name_sort_key = route["headers"]["X-App-Name"]
        if "X-App-Version" in route["headers"]:
            app_version_sort_key = int(route["headers"]["X-App-Version"])

    if "is_override" in route:
        is_override = route["is_override"]

    if "headers_to_add" in route:
        has_headers_to_add = True
        if "App-Name" in route["headers_to_add"]:
            add_app_name_sort_key = route["headers_to_add"]["X-App-Name"]
        if "App-Version" in route["headers_to_add"]:
            add_app_version_sort_key = int(route["headers_to_add"]["X-App-Version"])

    return (
        route["prefix"],
        app_name_sort_key,
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
        if r["cluster"] > most_recent["cluster"]:
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


def request_get(url):
    CERT_PATH = os.environ.get("CERT_PATH", None)
    if CERT_PATH:
        return requests.get(url, verify=CERT_PATH)
    return requests.get(url)


def download_manifests(output_path, folder_path="app-version-manifests"):
    
    owner = "hugh-nguyen"
    repo = "cortex-deploy-log"
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{folder_path}"
    print(url)
    response = request_get(url)
    if response.status_code == 200:
        items = response.json()
        os.makedirs(output_path, exist_ok=True)
        for item in items:
            if item["type"] == "file":
                download_url = item["download_url"]
                file_response = request_get(download_url)
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
    result = []
    for route in routes:
        r = {**route}
        if "headers" in r:
            r["headers"] = transform_headers(r["headers"])
        if "headers_to_add" in r:
            r["headers_to_add"] = transform_headers(r["headers_to_add"])
        result.append(r)
    return sort_routes(result)


def update_envoy(url="http://hn-cortex.click/api/v1/routes"):
    
    import subprocess
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
        
    download_manifests("temp")
    avm_paths = get_all_files("temp", "yaml")
    routes = []
    lookup = {}
    sort_key = lambda x: x.split("/")[-1].removesuffix(".yaml")
    for avm_path in sorted(avm_paths, key=sort_key):
        app_version = yaml.safe_load(open(avm_path, "r").read())
        print(avm_path)
        routes += app_version.get("routes", [])
        
        app_ver = int(avm_path.split("/")[-1].removesuffix(".yaml"))
        for service in app_version["services"]:
            print((service["app"], service["svc"], app_ver))
            lookup[(service["app"], service["svc"], app_ver)] = service["svc_ver"]
    
    xroutes = cortex.dynamo_util.get_all_rows("routes")
    routes = transform_routes(routes) + transform_custom_routes(xroutes, lookup)
    
    # import json; open("test.json", "w").write(json.dumps(sort_routes(routes)))
    
    payload = {"routes": routes}
    response = requests.post(url, json=payload)
    print("!!",response.text)
    