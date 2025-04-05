import yaml
import requests
import os
from collections import defaultdict
import dynamo_util

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
        route["cluster"]
    )

def choose_route(routes):
    most_recent = routes[0]
    for r in routes:
        if r.get("custom") == True:
            return r
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

def update_envoy():
    download_manifests("temp")
    avm_paths = get_all_files("temp", "yaml")
    routes = []
    sort_key = lambda x: x.split("/")[-1].removesuffix(".yaml")
    for avm_path in sorted(avm_paths, key=sort_key):
        routes += yaml.safe_load(open(avm_path, "r").read()).get("routes", [])
    print(routes)
    
    xroutes = dynamo_util.get_all_rows("routes")
    for r in xroutes:
        print(r)