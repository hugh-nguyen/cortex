import yaml, os, subprocess

from util import *

parser = argparse.ArgumentParser()
parser.add_argument('--clone', action='store_true')
args = parser.parse_args()

if args.clone:
    print("===========Clone Repositories===========")
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
        os.makedirs("temp")
    apps = set([s["app"] for s in services])
    for app in apps:
        repo = f"{app}-iac"
        subprocess.run(["git", "clone", f"https://github.com/hugh-nguyen/{repo}.git", f"temp/{repo}"], check=True)

print("===========Reading Neuroverse===========")
nv = yaml.safe_load(open("neuroverse.yaml", "r").read())


print("===========Connecting to EKS Cluster===========")
subprocess.run(["aws", "eks", "update-kubeconfig", "--region", "ap-southeast-2", "--name", "cluster"], check=True)

services = nv["services"]
for s in services:
    app, svc, ver = s["app"], s["svc"], s["ver"]
    print("\n====Deploying", f"{app}-{svc}-{ver.replace('.', '-')}====")
    subprocess.run([
        "helm",
        "install",
        f"{app}-{svc}-{ver.replace('.', '-')}",
        f"./temp/{app}-iac/helm/{svc}-chart",
        "--set",
        f"version={ver}",
    ], check=True)
