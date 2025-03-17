import os
import requests
import subprocess
import yaml
import argparse
from collections import defaultdict

from util import *

def find_app_from_full_name(name):
    result = name
    while result:
        result = "-".join(result.split("-")[:-1])
        if result in app_lookup:
            return result
    return result


def create_new_application_manifests(service_configs):
    application_configs = defaultdict(dict)
    for sc in service_configs.values():
        app, svc = sc['application-name'], sc['service-name']
        application_configs[app][svc] = {
            "app": app,
            "svc": svc,
            "ver": sc["latest_tag"],
            "depends_on": [
                {
                    "app": find_app_from_full_name(k),
                    "svc": k.replace(find_app_from_full_name(k)+"-", ""), 
                    "ver": service_configs[d]["latest_tag"] if v == "latest" else v
                }
                for k, v in sc["service-dependencies"].items()
            ]
        }

    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp/cortex-stack-log"], check=True)
    subprocess.run(["git", "clone", STACK_LOG_URL, "temp/cortex-stack-log"], check=True)

    print("===========Calculating Manifests===========")

    for app_name, data in application_configs.items():
        manifest_name = f"{app_name}/{app_name}-manifest-1"

        path = f"temp/cortex-stack-log/app-manifests/{app_name}"
        if not os.path.exists(path):
            os.makedirs(path)

        manifests = sorted([f[0:-5] for f in os.listdir(path)])
        
        new_manifest_name = f"{app_name}/{app_name}-manifest-1"

        if manifests:
            latest_manifest = open(f"{path}/{manifests[-1]}.yaml", "r").read()
            latest_manifest_number = int(manifests[-1].split("-")[-1])
            new_manifest_name = f"{app_name}/{app_name}-manifest-{latest_manifest_number+1}"

        new_manifest = yaml.dump(list(data.values()), sort_keys=False)

        if not manifests or latest_manifest != new_manifest:
            path = f"temp/cortex-stack-log/app-manifests/{new_manifest_name}.yaml"
            open(path, "w").write(new_manifest)


    # print("===========Storing Manifests===========")

    # os.chdir("temp/cortex-stack-log")
    # subprocess.run(["git", "add", "."], check=True)
    # commit_message = f"Update {manifest_name}"
    # try:
    #     subprocess.run(["git", "commit", "-m", commit_message], check=True)
    #     new_remote = f"https://{GH_PERSONAL_TOKEN}@github.com/hugh-nguyen/cortex-stack-log.git"
    #     subprocess.run(["git", "remote", "set-url", "origin", new_remote], check=True)
    #     subprocess.run(["git", "push"], check=True)
    # except subprocess.CalledProcessError as e:
    #     print("No changes to commit or error occurred:", e)

    print("Done")


if __name__ == '__main__':
    print("===========Calculating Applicaiton Configs===========")
    parser = argparse.ArgumentParser()
    parser.add_argument('--clone', action='store_true')

    service_configs = get_service_configs(parser.parse_args())
    create_new_application_manifests(service_configs)
    