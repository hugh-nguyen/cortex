import os, yaml, subprocess
from util import *

# if os.path.exists("temp"):
#     subprocess.run(["rm", "-rf", "temp/cortex-stack-log"], check=True)
# subprocess.run(["git", "clone", STACK_LOG_URL, "temp/cortex-stack-log"], check=True)
# subprocess.run(["git", "-C", "temp/cortex-stack-log", "checkout", "model"], check=True)

def create_deployment(deployment):
    return {
        "app": deployment["app"],
        "svc": deployment["svc"],
        "svc_ver": deployment["ver"],
    }


def create_route(prefix, release_name, app_name=None, app_version=None):
    result = {"prefix": prefix}
    if app_name:
        result["headers"] = [{"App-Name": app_name}]
        if app_version:
            result["headers"].append({"App-Version": app_version})
    return {**result, "cluster": release_name}


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
        route["prefix"],
        app_name_sort_key,
        app_version_sort_key,
        route["cluster"]
    )


def create_nexus_manifest(path_to_app_manifests):

    app_manifest_file_paths = get_all_files(path_to_app_manifests)

    nexus_services = []
    nexus_routes = []
    prefixes = set()
    for app_manifest_file_path in sorted(app_manifest_file_paths):

        print(app_manifest_file_path)
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

    return {"services": nexus_services, "routes": nexus_routes}


if __name__ == '__main__':
    nexus_manifest = create_nexus_manifest("temp/cortex-stack-log/app-manifests")

    existing_nexus_manifests = os.listdir("temp/cortex-stack-log/nexus-manifests")
    latest_number = int(sorted([f[0:-5] for f in existing_nexus_manifests])[-1].split("-")[-1])
    latest_manifest = open(f"temp/cortex-stack-log/nexus-manifests/{sorted(existing_nexus_manifests)[-1]}", "r").read()

    new_manifest = yaml.dump(nexus_manifest, sort_keys=False)
    if latest_manifest != new_manifest:
        path = f"temp/cortex-stack-log/nexus-manifests/nexus-manifest-{latest_number+1}.yaml"
        open(path, "w").write(new_manifest)
