import os
import requests
import subprocess
import yaml
import argparse
from collections import defaultdict

from cortex.util import *

import boto3
import json
from datetime import datetime

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


def choose_version(service, tags, semver):
    print(service, tags, semver)
    if semver == "*":
        return tags[0]
    if semver.startswith("~"):
        return tags[0]
    return semver


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


def create_application_version_manifest(app_name, service_repo_metadata_lookup, path_to_deploy_log):
    services = []
    routes = []
    prefixes = set()

    app_ver = 1
    path_to_env_manifests = f"{path_to_deploy_log}/app-version-manifests/{app_name}"
    existing_manifests = os.listdir(path_to_env_manifests)
    if existing_manifests:
        app_ver = len(existing_manifests)+1

    path = f"temp/{app_name}-cortex-command/package.yaml"

    package_yaml = yaml.safe_load(open(path, "r").read())
    for component in package_yaml["components"]:
        package_service = list(component.keys())[0]
        package_semver  = list(component.values())[0]

        lookup = f'{app_name}/{package_service}'

        tags = service_repo_metadata_lookup[lookup]["tags"]

        service = {
            "app": app_name,
            "svc": service_repo_metadata_lookup[lookup]["svc"],
            "svc_ver": choose_version(package_service, tags, package_semver),
        }
        services.append(service)


    for service in services:

        svc, svc_ver = service["svc"], service["svc_ver"]

        prefix = f"/{app_name}/{svc}/"
        release_name = f"{app_name}-{svc}-{svc_ver.replace('.', '-')}"

        # 1
        headers = {"X-App-Version": app_ver}
        routes.append(create_route(prefix, release_name, headers))

        # 2
        if prefix not in prefixes:
            prefixes.add(prefix)
            routes.append(create_route(prefix, release_name))
        
    
    for dep in package_yaml["dependencies"]:
        dep_lookup = list(dep.keys())[0]
        dep_app = dep_lookup.split("/")[0]
        dep_svc = dep_lookup.split("/")[1]
        dep_semver  = list(dep.values())[0]

        tags = service_repo_metadata_lookup[dep_lookup]["tags"]
        version = choose_version(dep_svc, tags, dep_semver)

        prefix = f"/{dep_app}/{dep_svc}/"
        release_name = f"{dep_app}-{dep_svc}-{version.replace('.', '-')}"

        # 3
        headers = {
            "X-App-Name": app_name,
            "X-App-Version": app_ver
        }
        routes.append(create_route(prefix, release_name, headers))

        # 4
        headers = {"X-App-Name": app_name}
        routes.append(create_route(prefix, release_name, headers))


    services = set([yaml.dump(ns, sort_keys=False) for ns in services])
    services = [yaml.safe_load(d) for d in services]
    services = sorted(services, key=env_services_sort_key)
    
    routes = set([yaml.dump(r, sort_keys=False) for r in routes])
    routes = [yaml.safe_load(r) for r in routes]
    routes = sorted(routes, key=env_route_sort_key)

    new_manifest = {"services": services, "routes": routes}
    new_manifest = yaml.dump(new_manifest, sort_keys=False)
    existing_manifests = os.listdir(path_to_env_manifests)

    manifest_name = f"{app_ver}.yaml"
    if existing_manifests:
        latest_manifest = open(f"{path_to_env_manifests}/{sorted(existing_manifests, key=manifest_sort)[-1]}")
        if latest_manifest == new_manifest:
            return None
    
    return {
        "filename": manifest_name,
        "manifest": new_manifest,
    }


if __name__ == '__main__':
    print("===========Calculating Applicaiton Configs===========")
    DEPLOY_LOG_PATH = "temp/cortex-deploy-log"

    parser = argparse.ArgumentParser()
    parser.add_argument('--clone', action='store_true')
    parser.add_argument('--app_name')
    args = parser.parse_args()

    orgs = ["hugh-nguyen"]
    app_lookup = set(["app1", "app2", "shared-app"])

    repos = []
    for org in orgs:
        condition = lambda r: any(r["name"].startswith(app) for app in app_lookup)
        repos += [r for r in get_repositories(org) if condition(r)]

    if args.clone:
        print("===========Clone Repositories===========")
        if os.path.exists("temp"):
            subprocess.run(["rm", "-rf", "temp"], check=True)
            os.makedirs("temp")
        for repo in repos:
            clone_or_pull(repo["name"], repo["clone_url"])
        clone_repo(DEPLOY_LOG_URL, DEPLOY_LOG_PATH)
    
    service_repos = []
    command_repos = []
    for repo in repos:
        if os.path.exists(f"temp/{repo['name']}/cortex.yaml"):
            service_repos.append(repo)
        if repo["name"].endswith("-cortex-command"):
            command_repos.append(repo)
    
    service_repo_metadata_lookup = {}
    for repo in service_repos:
        if not os.path.exists(f"temp/{repo['name']}/cortex.yaml"):
            continue
        cortex_yaml_file = open(f"temp/{repo['name']}/cortex.yaml", "r")
        data = yaml.safe_load(cortex_yaml_file.read())
        app_name = data["application-name"]
        svc_name = data["service-name"]
        service = {
            "app": app_name,
            "svc": svc_name,
            "tags": get_tags(repo["full_name"]),
        }
        service_repo_metadata_lookup[f"{app_name}/{svc_name}"] = service
    
    new_manifest = create_application_version_manifest(
        args.app_name, service_repo_metadata_lookup, DEPLOY_LOG_PATH
    )

    if new_manifest:
        path = f"{DEPLOY_LOG_PATH}/app-version-manifests/{args.app_name}"
        new_path = f"{path}/{new_manifest['filename']}"
        open(new_path, "w").write(new_manifest["manifest"])
        open(new_manifest["filename"], "w").write(new_manifest["manifest"])