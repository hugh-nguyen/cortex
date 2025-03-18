import os, yaml, subprocess
from cortex.util import *
from collections import defaultdict

def create_deployment(deployment):
    return {
        "app": deployment["app"],
        "svc": deployment["svc"],
        "svc_ver": deployment["ver"],
    }


def create_route(
    prefix, 
    release_name, 
    app_name=None, 
    app_version=None, 
    custom=False
):
    result = {"prefix": prefix}
    if app_name:
        result["headers"] = [{"App-Name": app_name}]
        if app_version:
            result["headers"].append({"App-Version": app_version})
    return {**result, "cluster": release_name, "custom": custom}


def nexus_services_sort_key(service):
    return service["app"], service["svc"], service["svc_ver"]


def nexus_route_sort_key(route):
    app_name_sort_key = "zzzzzzzz"
    app_version_sort_key = 99999999
    if "headers" in route:
        app_name_sort_key = route["headers"][0]["App-Name"]
    if "headers" in route and len(route["headers"]) == 2:
        app_version_sort_key = route["headers"][1]["App-Version"]
    return (
        not route["custom"],
        route["prefix"],
        app_name_sort_key,
        app_version_sort_key,
        route["cluster"]
    )


def create_nexus_manifest(path_to_data):

    path_to_manifests = f"{path_to_data}/cortex-deploy-log"
    path_to_routes = f"{path_to_data}/cortex-routes"

    #
    app_manifest_file_paths = get_all_files(f"{path_to_manifests}/app-manifests")
    app_manifest_lookup = defaultdict(dict)
    for path in app_manifest_file_paths:
        app = path.split("/")[-2]
        app_ver = int(path.removesuffix(".yaml").split("-")[-1])
        data = yaml.safe_load(open(path, "r").read())
        app_manifest_lookup[app][app_ver] = {d["svc"]: d["ver"] for d in data}

    nexus_services = []
    nexus_routes = []

    app_dirs = os.listdir(f"{path_to_routes}/apps")
    for app_name in os.listdir(f"{path_to_routes}/apps"):
        routes = yaml.safe_load(open(f"{path_to_routes}/apps/{app_name}/routes.yaml", "r"))
        for prefix, config in routes.items():
            app, svc, app_ver = config["app"], config["svc"], config["app_ver"]
            svc_ver = app_manifest_lookup[app][app_ver][svc]
            release_name = f"{app}-{svc}-{svc_ver.replace('.', '-')}"
            route = create_route(prefix, release_name, app, app_ver, custom=True)
            nexus_routes.append(route)

    #
    prefixes = set()
    for app_manifest_file_path in sorted(app_manifest_file_paths):

        app_manifest_file = open(app_manifest_file_path, "r")
        app_manifest_services = yaml.safe_load(app_manifest_file.read())

        for app_manifest_service in app_manifest_services:

            nexus_services.append(create_deployment(app_manifest_service))

            app = app_manifest_service["app"]
            app_ver = int(app_manifest_file_path[:-5].split("-")[-1])
            svc, svc_ver = app_manifest_service["svc"], app_manifest_service["ver"]

            prefix = f"/{app}/{svc}/"
            release_name = f"{app}-{svc}-{svc_ver.replace('.', '-')}"

            nexus_routes.append(create_route(prefix, release_name, app, app_ver))
            
            if prefix not in prefixes:
                nexus_routes.append(create_route(prefix, release_name, app))
                nexus_routes.append(create_route(prefix, release_name))

                prefixes.add(prefix)

            if "depends_on" not in app_manifest_service:
                continue

            for dep in app_manifest_service["depends_on"]:
                prefix = f"/{dep['app']}/{dep['svc']}/"
                release_name = f"{dep['app']}-{dep['svc']}-{dep['ver'].replace('.', '-')}"

                nexus_routes.append(create_route(prefix, release_name, app, app_ver))

                extended_prefix = prefix+app
                if extended_prefix not in prefixes:
                    nexus_routes.append(create_route(prefix, release_name, app))
                    prefixes.add(extended_prefix)
            

    nexus_services = set([yaml.dump(ns, sort_keys=False) for ns in nexus_services])
    nexus_services = [yaml.safe_load(d) for d in nexus_services]
    nexus_services = sorted(nexus_services, key=nexus_services_sort_key)

    nexus_routes = set([yaml.dump(r, sort_keys=False) for r in nexus_routes])
    nexus_routes = [yaml.safe_load(r) for r in nexus_routes]
    nexus_routes = sorted(nexus_routes, key=nexus_route_sort_key)

    new_manifest = {"services": nexus_services, "routes": nexus_routes}
    return diff_and_name_manifest(
        f"{path_to_manifests}/nexus-manifests",
        "nexus",
        yaml.dump(new_manifest, sort_keys=False)
    )


if __name__ == '__main__':

    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    clone_repo(DEPLOY_LOG_URL, "temp/cortex-deploy-log")
    clone_repo(ROUTE_REPO_URL, "temp/cortex-routes")

    nexus_manifest = create_nexus_manifest("temp")
    if nexus_manifest:
        open(nexus_manifest["path"], "w").write(nexus_manifest["manifest"])

        push_repo(
            "github.com/hugh-nguyen/cortex-deploy-log.git", 
            "temp/cortex-deploy-log",
            f"Update {nexus_manifest['path'].split('/')[-1]}"
        )