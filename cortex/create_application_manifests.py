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


def find_app_from_full_name(name):
    result = name
    while result:
        result = "-".join(result.split("-")[:-1])
        if result in app_lookup:
            return result
    return result


def determine_version(svc, ver):
    if ver == "latest":
        return service_configs[svc]["latest_tag"]
    return ver


def create_new_application_manifests(service_configs, path_to_app_manifests):
    application_configs = defaultdict(dict)
    for sc in service_configs.values():
        app, svc = sc['application-name'], sc['service-name']
        application_configs[app][svc] = {
            "app": app,
            "svc": svc,
            "ver": sc["latest_tag"],
            "depends_on": sc["service-dependencies"]
        }

    print("===========Calculating Manifests===========")
    result = []
    for app_name, data in application_configs.items():

        path = f"{path_to_app_manifests}/{app_name}"
        if not os.path.exists(path):
            os.makedirs(path)

        new_manifest = diff_and_name_manifest(
            f"{path_to_app_manifests}/{app_name}",
            app_name,
            yaml.dump(list(data.values()), sort_keys=False)
        )

        if new_manifest:
            new_manifest["app_name"] = app_name
            new_manifest["service_count"] = len(data.values())
            new_manifest["owner"] = "Hugh Nguyen"
            result.append(new_manifest)

    return result


if __name__ == '__main__':
    print("===========Calculating Applicaiton Configs===========")
    parser = argparse.ArgumentParser()
    parser.add_argument('--clone', action='store_true')

    service_configs = get_service_configs(parser.parse_args())

    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    clone_repo(DEPLOY_LOG_URL, "temp/cortex-deploy-log")

    new_manifests = create_new_application_manifests(
        service_configs,
        "temp/cortex-deploy-log/app-manifests"
    )
    
    commit_message = "Update "
    for manifest in new_manifests:
        open(manifest["path"], "w").write(manifest["manifest"])
        commit_message += manifest["path"].split('/')[-2] + " "
        upload_app(
            manifest["app_name"], manifest["service_count"], 
            manifest["version"], manifest["owner"]
        )
        upload_app_version(
            manifest["app_name"], manifest["version"], 
            manifest["manifest"], manifest["service_count"], 0
        )
            

    push_repo(
        "github.com/hugh-nguyen/cortex-deploy-log.git", 
        "temp/cortex-deploy-log",
        commit_message
    )