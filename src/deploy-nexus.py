import yaml, os, subprocess, argparse, json

from util import *

parser = argparse.ArgumentParser()
parser.add_argument('--clone', action='store_true')
args = parser.parse_args()

print("===========Reading Neuroverse===========")
nv = yaml.safe_load(open("neuroverse.yaml", "r").read())
services = nv["services"]

if args.clone:
    print("===========Clone Repositories===========")
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
        os.makedirs("temp")
    apps = set([s["app"] for s in services])
    for app in apps:
        repo = f"{app}-iac"
        subprocess.run(["git", "clone", f"https://github.com/hugh-nguyen/{repo}.git", f"temp/{repo}"], check=True)

print("===========Connecting to EKS Cluster===========")
subprocess.run(["aws", "eks", "update-kubeconfig", "--region", "ap-southeast-2", "--name", "cluster"], check=True)

# Get list of already deployed Helm releases
try:
    helm_list_output = subprocess.check_output(["helm", "list", "-q"], text=True)
    deployed_releases = helm_list_output.strip().split('\n') if helm_list_output.strip() else []
    print(f"Found {len(deployed_releases)} existing Helm releases")
except subprocess.CalledProcessError:
    print("Warning: Failed to get list of deployed releases")
    deployed_releases = []

for s in services:
    app, svc, ver = s["app"], s["svc"], s["ver"]
    release_name = f"{app}-{svc}-{ver.replace('.', '-')}"
    
    if release_name in deployed_releases:
        print(f"\n====Skipping {release_name} (already deployed)====")
        continue
    
    print(f"\n====Deploying {release_name}====")
    subprocess.run([
        "helm",
        "install",
        release_name,
        f"./temp/{app}-iac/helm/{svc}-chart",
        "--set",
        f"version={ver}",
    ], check=True)