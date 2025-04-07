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

dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-2')
apps_table = dynamodb.Table('Apps')
app_versions_table = dynamodb.Table('AppVersions')

def upload_app(name=None, service_count=None, versions=None, team_id=None, command_url=None, last_updated=None):
    if last_updated is None:
        last_updated = datetime.now().isoformat()
        
    response = apps_table.put_item(
        Item={
            'name': name,
            'service_count': service_count,
            'versions': versions,
            'last_updated': last_updated,
            'team_id': team_id,
            "command_repo_url": command_url,
        }
    )
    
    print(f"Uploaded app {name} to DynamoDB")
    return response


def upload_app_version(app_name="", version=None, yaml_data=None, service_count=None, change_count=None):
    response = app_versions_table.put_item(
        Item={
            'app_name': app_name,
            'version': version,
            'yaml': yaml_data,
            'service_count': service_count,
            'change_count': change_count,
            'created_at': datetime.now().isoformat()
        }
    )
    
    print(f"Uploaded version {version} of app {app_name} to DynamoDB")
    return response

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


def create_application_version_manifest(app_name, service_repo_metadata_lookup, path_to_deploy_log):
    services = []
    routes = []
    prefixes = set()

    app_ver = 1
    path_to_env_manifests = f"{path_to_deploy_log}/app-version-manifests/{app_name}"
    existing_manifests = []
    if os.path.exists(path_to_env_manifests):
        existing_manifests = os.listdir(path_to_env_manifests)
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
        
    
    dependencies = []
    for dep in package_yaml.get("dependencies", []):
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
        
        transformed_dep = {
            "app": dep_app, 
            "svc": dep_svc, 
            "svc_ver": version
        }
        dependencies.append(transformed_dep)
        
    # dependencies = []
    # for dep in package_yaml.get("dependences", []):
    #     app, svc = dep.split("/")[0], dep.split("/")[1]
    #     transform_dep = {
    #         "app": app,
    #         "svc": svc,
    #         "svc_ver": choose_version(),
    #     }
    #     dependencies.append({})

    links = []
    getComponents = lambda x: (x.split("/")[0], x.split("/")[1]) if "/" in x else (app_name, x)
    for link in package_yaml.get("links", []):
        src_app, src_svc = getComponents(link["source"])
        tgt_app, tgt_svc = getComponents(link["target"])
        source = {"app": src_app, "svc": src_svc}
        target = {"app": tgt_app, "svc": tgt_svc}
        links.append({"source": source, "target": target})
            

    services = sort_services(services)
    routes = sort_routes(routes, False)

    new_manifest = {"services": services, "routes": routes, "dependencies": dependencies, "links": links}
    new_manifest = yaml.dump(new_manifest, sort_keys=False)

    manifest_name = f"{app_ver}.yaml"
    if existing_manifests:
        latest_manifest = open(f"{path_to_env_manifests}/{sorted(existing_manifests, key=manifest_sort)[-1]}")
        if latest_manifest == new_manifest:
            return None
    
    return {
        "filename": manifest_name,
        "manifest": new_manifest,
        "services": services,
        "version": app_ver,
    }


if __name__ == '__main__':
    print("===========Calculating Applicaiton Configs===========")
    DEPLOY_LOG_PATH = "temp/cortex-deploy-log"

    team_lookup = {
        "app1": 1,
        "app2": 1,
        "shared-app": 2,
    }

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
        os.makedirs(path, exist_ok=True)
        new_path = f"{path}/{new_manifest['filename']}"
        open(new_path, "w").write(new_manifest["manifest"])
        # open(new_manifest["filename"], "w").write(new_manifest["manifest"])

        upload_app(
            args.app_name, len(new_manifest["services"]), 
            new_manifest["version"], team_lookup[args.app_name],
            f"https://github.com/hugh-nguyen/{args.app_name}-cortex-command"
        )
        upload_app_version(
            args.app_name, new_manifest["version"], 
            new_manifest["manifest"], len(new_manifest["services"]), 0
        )
        
        push_repo(
            "github.com/hugh-nguyen/cortex-deploy-log.git", 
            DEPLOY_LOG_PATH,
            f"Updated {new_manifest['filename']}"
        )
        
        