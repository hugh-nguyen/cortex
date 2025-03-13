import os, yaml, subprocess
from util import *

# if os.path.exists("temp"):
#     subprocess.run(["rm", "-rf", "temp/cortex-stack-log"], check=True)
# subprocess.run(["git", "clone", STACK_LOG_URL, "temp/cortex-stack-log"], check=True)
# subprocess.run(["git", "-C", "temp/cortex-stack-log", "checkout", "model"], check=True)

nexus_dir = "temp/cortex-stack-log/nexus-manifests"

services = []
for manifest in sorted(os.listdir(nexus_dir)):
    
    if manifest.endswith("-0.yaml"):
        continue

    nexus = yaml.safe_load(open(f"{nexus_dir}/{manifest}", "r").read())

    for service in nexus:
        services.append({
            "app": service["app"],
            "svc": service["svc"],
            "ver": service["ver"],
        })

    services = set([yaml.dump(s) for s in services])
    services = [yaml.safe_load(s) for s in services]

    services = sorted(services, key=lambda x: (x["app"], x["svc"], x["ver"]))

routes = []
for manifest in sorted(os.listdir(nexus_dir)):

    if manifest.endswith("-0.yaml"):
        continue

    print(manifest)
    nexus = yaml.safe_load(open(f"{nexus_dir}/{manifest}", "r").read())
    print(nexus)

    for service in nexus:
        app, svc, ver = service["app"], service["svc"], service["ver"]
        route = {
            "prefix": f"/{app}/{svc}/",
            "headers": [
                {"App-Name": "app1"},
                {"App-Stack": service["app_stack_ver"]},
            ],
            "cluster": f"{app}-{svc}-{ver.replace('.', '-')}"
        }
    
    routes.append(route)
    routes = set([yaml.dump(s) for s in routes])
    routes = [yaml.safe_load(s) for s in routes]


    routes = sorted(routes, key=lambda x: (x["prefix"], x["headers"][0]["App-Name"], x["headers"][0]["App-Stack"], x["cluster"]))


open("neuroverse.yaml", "w").write(yaml.dump({"services": services}, sort_keys=False))

