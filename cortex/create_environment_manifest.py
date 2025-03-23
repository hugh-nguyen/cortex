import os, subprocess
from cortex.util import *

def create_env_service(deployment):
    return {
        "app": deployment["app"],
        "svc": deployment["svc"],
        "svc_ver": deployment["ver"],
    }


def create_route(
    prefix, 
    release_name,
    headers=[],
    headers_to_add=[],
    is_override=False
):
    result = {"prefix": prefix}
    if headers:
        result["headers"] = headers
    result = {**result, "cluster": release_name}
    if headers_to_add:
        result["headers_to_add"] = headers_to_add
    if is_override:
        result["is_override"] = True
    return result


def env_services_sort_key(service):
    return service["app"], service["svc"], service["svc_ver"]


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


def create_environment_manifest(path_to_deploy_log):

    env_services = []
    env_routes = []

    # avm_paths -> application_version_manifest_paths
    avm_paths = get_all_files(f"{path_to_deploy_log}/app-version-manifests", "yaml")
    


    prefixes = set()
    for avm_path in sorted(avm_paths):
        print(avm_path)
        avm_services = yaml.safe_load(open(avm_path, "r"))

        for avm_service in avm_services:
            env_services.append(create_env_service(avm_service))

            app, svc, svc_ver = avm_service["app"], avm_service["svc"], avm_service["ver"]
            app_ver = int(avm_path.removesuffix(".yaml").split("-")[-1])

            prefix = f"/{app}/{svc}/"
            release_name = f"{app}-{svc}-{svc_ver.replace('.', '-')}"

            # 1
            headers = {"X-App-Version": app_ver}
            headers_to_add = {"X-App-Name": app}
            env_routes.append(create_route(prefix, release_name, headers, headers_to_add))

            # 2
            if prefix not in prefixes:
                env_routes.append(create_route(prefix, release_name))
            
            # 3
            for dep in avm_service.get("depends_on", []):
                if 'app' not in dep or dep['app'] == app:
                    continue

                prefix = f"/{dep['app']}/{dep['svc']}/"
                release_name = f"{dep['app']}-{dep['svc']}-{dep['ver'].replace('.', '-')}"
                headers["X-App-Name"] = app
                env_routes.append(create_route(prefix, release_name, headers))


    env_services = set([yaml.dump(ns, sort_keys=False) for ns in env_services])
    env_services = [yaml.safe_load(d) for d in env_services]
    env_services = sorted(env_services, key=env_services_sort_key)

    env_routes = set([yaml.dump(r, sort_keys=False) for r in env_routes])
    env_routes = [yaml.safe_load(r) for r in env_routes]
    env_routes = sorted(env_routes, key=env_route_sort_key)

    new_manifest = {"services": env_services, "routes": env_routes}
    new_manifest = yaml.dump(new_manifest, sort_keys=False)

    path_to_env_manifests = f"{path_to_deploy_log}/environment-manifests"
    existing_manifests = os.listdir(path_to_env_manifests)
    version = len(existing_manifests)

    latest_manifest = open(f"{path_to_env_manifests}/{sorted(existing_manifests)[-1]}")

    if latest_manifest != new_manifest:
        manifest_name = f"environment-manifest-{version}.yaml"
        new_manifest_path = f"{path_to_env_manifests}/{manifest_name}"
    
    return {
        "path": new_manifest_path,
        "manifest": new_manifest,
    }


if __name__ == '__main__':

    path_to_deploy_log = "temp/cortex-deploy-log"
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    clone_repo(DEPLOY_LOG_URL, path_to_deploy_log)
    
    new_manifest = create_environment_manifest(path_to_deploy_log)
    if new_manifest:
        open("cortex/environment.yaml", "w").write(new_manifest["manifest"])
