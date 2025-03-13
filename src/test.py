import os, yaml, subprocess
from util import *

if os.path.exists("temp"):
    subprocess.run(["rm", "-rf", "temp/cortex-stack-log"], check=True)
subprocess.run(["git", "clone", STACK_LOG_URL, "temp/cortex-stack-log"], check=True)
subprocess.run(["git", "-C", "temp/cortex-stack-log", "checkout", "model"], check=True)

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

services = set([yaml.dump(s, sort_keys=False) for s in services])
services = [yaml.safe_load(s) for s in services]

sort_key = lambda x: (x["app"], x["svc"], x["ver"])
services = sorted(services, key=sort_key)

routes = []
for manifest in sorted(os.listdir(nexus_dir)):

    if manifest.endswith("-0.yaml"):
        continue

    nexus = yaml.safe_load(open(f"{nexus_dir}/{manifest}", "r").read())

    nexus_number = manifest.split(".")[0].split("-")[-1]

    for service in nexus:
        app, svc, ver = service["app"], service["svc"], service["ver"]
        route = {
            "prefix": f"/{app}/{svc}/",
            "headers": [
                {"App-Name": app},
                {"App-Stack": service["app_stack_ver"]},
            ],
            "cluster": f"{app}-{svc}-{ver.replace('.', '-')}"
        }            
    
        routes.append(route)

        if "required_by" in service:
            for required_by_app in service["required_by"]:
                route = {
                    "prefix": f"/{app}/{svc}/",
                    "headers": [
                        {"App-Name": required_by_app},
                        {"App-Stack": service["app_stack_ver"]},
                    ],
                    "cluster": f"{app}-{svc}-{ver.replace('.', '-')}"
                }
                routes.append(route)


routes = set([yaml.dump(r, sort_keys=False) for r in routes])
routes = [yaml.safe_load(r) for r in routes]

sort_key = lambda x: (
    x["prefix"], 
    x["headers"][0]["App-Name"], 
    x["headers"][1]["App-Stack"], 
    x["cluster"]
)
routes = sorted(routes, key=sort_key)


neuroverse = {"services": services, "routes": routes}
open("neuroverse.yaml", "w").write(yaml.dump(neuroverse, sort_keys=False))

