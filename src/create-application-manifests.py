import os
import requests
import subprocess
import yaml
import argparse

from util import *

parser = argparse.ArgumentParser()
parser.add_argument('--clone', action='store_true')
args = parser.parse_args()

app_lookup = set(["app1", "shared-app"])

def find_app_from_full_name(name):
    print(name)
    result = name
    while result:
        result = "-".join(result.split("-")[:-1])
        print(result)
        if result in app_lookup:
            return result
    return result

repository_data = []
for app in list(app_lookup):
    print(app)
    repository_data += get_repositories("hugh-nguyen", app)

if args.clone:
    print("===========Clone Repositories===========")
    
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
        os.makedirs("temp")
    for repo in repository_data:
        print(repo["name"])
        clone_or_pull(repo["name"], repo["clone_url"])


print("===========Calculating Applicaiton Configs===========")

service_configs = get_service_configs(repository_data)
application_configs = {}
for sc in service_configs.values():
    print("!!", sc)
    app, svc = sc['application-name'], sc['service-name']
    if app not in application_configs:
        application_configs[app] = {}
    application_configs[app][svc] = {
        "app_name": app,
        "service_name": svc,
        "version": sc["latest_tag"],
        "depends_on": [
            {
                "app_name": find_app_from_full_name(d),
                "service_name": d.replace(find_app_from_full_name(d)+"-", ""), 
                "version": service_configs[d]["latest_tag"]
            }
            for d in sc["service-dependencies"]
        ]
    }

if os.path.exists("temp"):
    subprocess.run(["rm", "-rf", "temp/cortex-stack-log"], check=True)
subprocess.run(["git", "clone", STACK_LOG_URL, "temp/cortex-stack-log"], check=True)

print("===========Calculating Manifests===========")

for app_name, data in application_configs.items():
    print("!app_name", app_name)
    manifest_name = f"{app_name}/{app_name}-manifest-1"

    path = f"temp/cortex-stack-log/app-manifests/{app_name}"
    print("!path", path)
    if not os.path.exists(path):
        os.makedirs(path)

    manifests = sorted([f[0:-5] for f in os.listdir(path)])
    manifest_name = f"{app_name}/{app_name}-manifest-1"
    if manifests:
        latest_manifest_number = int(manifests[-1].split("-")[-1])
        print("!!latest_manifest_number", latest_manifest_number)
        manifest_name = f"{app_name}/{app_name}-manifest-{latest_manifest_number+1}"
    print("!manifest_name", manifest_name)

    print(yaml.dump(list(data.values()), sort_keys=False))
    path = f"temp/cortex-stack-log/app-manifests/{manifest_name}.yaml"
    open(path, "w").write(yaml.dump(list(data.values()), sort_keys=False))


print("===========Storing Manifests===========")

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

print("Done")