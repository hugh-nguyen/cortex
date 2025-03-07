#!/usr/bin/env python3

import os
import requests
import subprocess
import yaml
import argparse

from util import *


def get_service_configs(repository_data):
    base_dir = "temp"
    result = {}

    for repo in repository_data:
        repo_name = repo["full_name"]
        with open(f"temp/{repo['name']}/meta.yaml", "r") as f:
            data = yaml.safe_load(f)
            result[repo_name] = {
                "name": repo_name,
                "latest_tag": get_latest_tag(repo_name),
                **data,
            }

    return result


def create_application_manifests(service_configs):
    result = {}

    for sc in service_configs.values():
        print(sc)
        app, svc = sc['application-name'], sc['service-name']
        if app not in result:
            result[app] = {}
        result[app][svc] = {
            "version": sc["latest_tag"],
            "depends_on": 'hugh-nguyen/service-b'
        }
    
    for app_name, data in result.items():
        x = [{k: v} for k, v in data.items()]
        print(yaml.dump(data, sort_keys=False))
        open(f"temp/{app_name}", "w").write(yaml.dump(data, sort_keys=False))


parser = argparse.ArgumentParser()
parser.add_argument('--clone', action='store_true')
args = parser.parse_args()

repository_data = get_repositories("hugh-nguyen", "app1")
if args.clone:
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
        os.makedirs("temp")
    for repo in repository_data:
        print(repo["name"])
        clone_or_pull(repo["name"], repo["clone_url"])

service_configs = get_service_configs(repository_data)

create_application_manifests(service_configs)
