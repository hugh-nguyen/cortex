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
    
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp/cortex-stack-log"], check=True)
    subprocess.run(["git", "clone", STACK_LOG_URL, "temp/cortex-stack-log"], check=True)

    for app_name, data in result.items():

        manifest_name = f"{app_name}/{app_name}-stack-1"

        path = f"temp/cortex-stack-log/app-stacks/{app_name}"
        print(path)
        if not os.path.exists(path):
            os.makedirs(path)

        manifests = sorted([f[0:-5] for f in os.listdir(path)])
        if manifests:
            latest_stack_number = int(manifests[-1].split("-")[-1])
            manifest_name = f"{app_name}/{app_name}-stack-{latest_stack_number}"

        # x = [{k: v} for k, v in data.items()]
        print(yaml.dump(data, sort_keys=False))
        path = f"temp/cortex-stack-log/app-stacks/{manifest_name}.yaml"
        open(path, "w").write(yaml.dump(data, sort_keys=False))
    
    os.chdir("temp/cortex-stack-log")
    subprocess.run(["git", "add", "."], check=True)
    commit_message = f"Update {manifest_name}"
    try:
        subprocess.run(["git", "commit", "-m", commit_message], check=True)
        new_remote = f"https://{GH_PERSONAL_TOKEN}@github.com/hugh-nguyen/cortex-stack-log.git"
        subprocess.run(["git", "remote", "set-url", "origin", new_remote], check=True)
        subprocess.run(["git", "push"], check=True)
    except subprocess.CalledProcessError as e:
        print("No changes to commit or error occurred:", e)



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
