import os, yaml, subprocess, argparse
from cortex.util import *
from collections import defaultdict

import boto3
import json
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
apps_table = dynamodb.Table('Apps')
app_versions_table = dynamodb.Table('AppVersions')

def upload_app(name, service_count, versions, owner, last_updated=None):
    if last_updated is None:
        last_updated = datetime.now().isoformat()
        
    response = apps_table.put_item(
        Item={
            'name': name,
            'service_count': service_count,
            'versions': versions,
            'last_updated': last_updated,
            'owner': owner
        }
    )
    
    print(f"Uploaded app {name} to DynamoDB")
    return response


def upload_app_version(app_name, version, yaml_data, service_count, change_count):
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


def get_manifests(app, path_to_source_repo):
    path = f"{path_to_source_repo}/app-version-manifests"
    
    new_manifests = []
    for file in os.listdir(path):
        content = open(f"{path}/{file}", "r").read()
        if content:
            new_manifest = {
                "filename": f"{app}-manifest-{file}",
                "manifest": content,
                "version": int(file.removesuffix(".yaml")),
                "app_name": app,
                "service_count": len(yaml.safe_load(content))
            }
            new_manifests.append(new_manifest)

    return new_manifests


def merge_route_overrides(path_to_deploy_log, path_to_source_repo):
    path = f"{path_to_source_repo}/route-overrides.yaml"
    if not os.path.exists(path):
        return None
    new_manifest = yaml.safe_load(open(path, "r").read())

    if not new_manifest:
        return None
        
    path = f"{path_to_deploy_log}/route-overrides-manifests"
    lm_path = f"{path}/{sorted(os.listdir(path), key=manifest_sort)[-1]}"
    latest_manifest = yaml.safe_load(open(lm_path, "r").read())
    new_version = len(os.listdir(path))

    new_manifest_yaml = yaml.dump(new_manifest, sort_keys=False)
    latest_manifest_yaml = yaml.dump(latest_manifest, sort_keys=False)
    if new_manifest_yaml != latest_manifest_yaml:
        return {
            "filename": f"route-overrides-manifest-{new_version}.yaml",
            "manifest": yaml.dump({**latest_manifest, **new_manifest}),
        }
    return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--sr",
        type=str,
        required=True,
        help="Source Repository"
    )
    
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    
    path_to_deploy_log = "temp/cortex-deploy-log"
    clone_repo(DEPLOY_LOG_URL, path_to_deploy_log)

    source_repository = parser.parse_args().sr

    if source_repository == "ALL":
        repos = ["app1-cortex-command", "app2-cortex-command", "shared-app-cortex-command"]
    else:
        source_repo_name = source_repository.split("/")[-1]
        repos = [source_repo_name]

    for source_repo_name in repos:
        path_to_source_repo = f"temp/{source_repo_name}"
        clone_repo(f"hugh-nguyen/{source_repo_name}", f"temp/{source_repo_name}")

        app = source_repo_name.removesuffix("-cortex-command")

        new_app_manifests = get_manifests(app, path_to_source_repo)
        new_route_manifest = merge_route_overrides(
            path_to_deploy_log, path_to_source_repo
        )

        path = f"{path_to_deploy_log}/app-version-manifests"
        if not os.path.exists(f"{path}/{app}"):
            os.makedirs(f"{path}/{app}")

        commit_message = "Update"
        for new_app_manifest in new_app_manifests:
            new_path = f"{path}/{app}/{new_app_manifest['filename']}"
            open(new_path, "w").write(new_app_manifest["manifest"])
            commit_message += f" {new_app_manifest['filename']}"
            upload_app(
                new_app_manifest["app_name"], new_app_manifest["service_count"], 
                new_app_manifest["version"], "Hugh Nguyen"
            )
            upload_app_version(
                new_app_manifest["app_name"], new_app_manifest["version"], 
                new_app_manifest["manifest"], new_app_manifest["service_count"], 0
            )

        if new_route_manifest:
            path = f"{path_to_deploy_log}/route-overrides-manifests"
            new_path = f"{path}/{new_route_manifest['filename']}"
            open(new_path, "w").write(new_route_manifest["manifest"])
        
        if new_app_manifests or new_route_manifest:
            print(source_repo_name) 
            push_repo(
                "github.com/hugh-nguyen/cortex-deploy-log.git", 
                path_to_deploy_log,
                commit_message
            )
            os.chdir("../..")

