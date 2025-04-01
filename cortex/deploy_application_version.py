import yaml, os, subprocess, argparse, json, requests
from cortex.util import *


def transform_headers(headers):
    return [{"Name": str(k), "Value": str(v)} for k, v in headers.items()]


def deploy_services(nexus_services):
    print("======== CONNECT TO KUBERNETES =========")
    subprocess.run([
        "aws",
        "eks",
        "update-kubeconfig",
        "--region",
        "ap-southeast-2",
        "--name",
        "cluster",
    ], check=True)

    print("======== DEPLOY NEXUS SERVICES =========")
    try:
        helm_list_output = subprocess.check_output(["helm", "list", "-q"], text=True)
        deployed_releases = helm_list_output.strip().split('\n') if helm_list_output.strip() else []
        print(f"Found {len(deployed_releases)} existing Helm releases")
    except subprocess.CalledProcessError:
        print("Warning: Failed to get list of deployed releases")
        deployed_releases = []
    
    print(os.path.exists("temp"))
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)

    for repo in get_repositories("hugh-nguyen"):
        if not repo["name"].endswith("iac"):
            continue
        clone_repo(repo["clone_url"], f"temp/{repo['name']}")

    for ns in nexus_services:
        app, svc, ver = ns["app"], ns["svc"], ns["svc_ver"]
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


def deploy_routes(app_name, input_routes):

    deploy_routes = []
    for input_route in input_routes:
        r = {**input_route}
        if "headers" in r:
            r["headers"] = transform_headers(r["headers"])
        if "headers_to_add" in r:
            r["headers_to_add"] = transform_headers(r["headers_to_add"])
        deploy_routes.append(r)

    url = "http://hn-cortex.click:8082/controlplane/api/v1/routes"
    payload = {
        "app_name": app_name,
        "routes": deploy_routes
    }
    print(json.dumps(payload))
    response = requests.post(url, json=payload)
    print("!!",response.text)


if __name__ == '__main__':
    DEPLOY_LOG_PATH = "temp/cortex-deploy-log"

    parser = argparse.ArgumentParser()
    parser.add_argument('--app_name')
    parser.add_argument('--app_ver')
    args = parser.parse_args()
    
    DEPLOY_LOG_PATH = "temp/cortex-deploy-log"
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    clone_repo(DEPLOY_LOG_URL, DEPLOY_LOG_PATH)

    app_name, app_ver = args.app_name, args.app_ver

    if not app_ver:
        path = f"{DEPLOY_LOG_PATH}/app-version-manifests/{app_name}/"
        app_ver = len(os.listdir(path))
        print(app_ver)

    path = f"{DEPLOY_LOG_PATH}/app-version-manifests/{app_name}/{app_ver}.yaml"
    
    manifest = yaml.safe_load(open(path, "r").read())

    deploy_services(manifest["services"])
    deploy_routes(app_name, manifest["routes"])