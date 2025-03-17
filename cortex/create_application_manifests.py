import os
import requests
import subprocess
import yaml
import argparse
from collections import defaultdict

from cortex.util import *

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
            yaml.dump(list(data.values()), sort_keys=False)
        )
        if new_manifest:
            result.append(new_manifest)

    return result

    print("===========Storing Manifests===========")


if __name__ == '__main__':
    print("===========Calculating Applicaiton Configs===========")
    parser = argparse.ArgumentParser()
    parser.add_argument('--clone', action='store_true')

    service_configs = get_service_configs(parser.parse_args())

    clone_repo(DEPLOY_LOG_URL, "temp/cortex-deploy-log")

    new_manifests = create_new_application_manifests(
        service_configs,
        "temp/cortex-deploy-log/app-manifests"
    )
    
    for manifest in new_manifests:
        open(manifest["path"], "w").write(manifest["manifest"])

    push_repo(
        "github.com/hugh-nguyen/cortex-deploy-log.git", 
        "temp/cortex-deploy-log"
    )