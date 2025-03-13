import os
import requests
import subprocess
import yaml
import argparse

from util import *

if os.path.exists("temp"):
    subprocess.run(["rm", "-rf", "temp/cortex-stack-log"], check=True)
subprocess.run(["git", "clone", STACK_LOG_URL, "temp/cortex-stack-log"], check=True)

log_dir = "temp/cortex-stack-log/app-manifests"

app_stacks = []
for app_stack_directory in os.listdir(log_dir):
    print(app_stack_directory)
    app_stack_files = os.listdir(f"{log_dir}/{app_stack_directory}")
    for app_stack_file in app_stack_files:
        print("\t", app_stack_file)
    app_stacks.append(f"{app_stack_directory}/{sorted(app_stack_files)[-1]}")
    # app_stacks += [f"{app_stack_directory}/{f}" for f in app_stack_files]
    
print("===========App Stacks===========")
for app_stack in app_stacks:
    print(app_stack)

nexus = []
for app_stack in app_stacks:
    app_stack_path = f"{log_dir}/{app_stack}"
    for service in yaml.safe_load(open(app_stack_path, "r").read()):
        print(service)
        nexus.append()
    # content = {
    #     **data,
    #     app_stack_version: app_stack.split(".")[0].split("-")[-1]
    # }
    # nexus.update(content)
    # print(content)

# print("===========Nexus===========")
# print(nexus)
# print()
# print(yaml.dump(nexus))

# manifests = sorted([f[0:-5] for f in os.listdir("temp/cortex-stack-log/nexus-manifests")])
# manifest_name = "nexus-manifest-1"
# if manifests:
#     latest_manifest_number = int(manifests[-1].split("-")[-1])
#     manifest_name = f"nexus-manifest-{latest_manifest_number+1}"
# path = f"temp/cortex-stack-log/nexus-manifests/{manifest_name}.yaml"
# open(path, "w").write(yaml.dump(nexus))

# print("===========Storing Stacks===========")

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

# print("Done")