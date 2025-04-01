import yaml, os, subprocess, argparse, json
from cortex.util import *


def create_route(
    prefix, 
    cluster_name, 
    headers=None,
    headers_to_add=None
):
    match_ = { "prefix": prefix }
    if headers:
        match_["headers"] = headers

    route = { "cluster": cluster_name }
    route["prefix_rewrite"] = "/"

    result = {
        "match": match_,
        "route": route
    }

    if headers_to_add:
        result["request_headers_to_add"] = headers_to_add
    
    return result


def create_cluster(name, port=80):
    path = os.path.join(os.path.dirname(__file__), "base-cluster.yaml")
    base_yaml = open(path, "r").read()
    return yaml.safe_load(base_yaml.format(name, port))


def create_header(header_name, match_value):
    return {
        "name": header_name,
        "string_match": {
            "exact": match_value
        }
    }

def create_header_to_add(key, value):
    return {"header": {"key": key, "value": value}}

parser = argparse.ArgumentParser()
parser.add_argument('--clone', action='store_true')
args = parser.parse_args()

def create_envoy_config(nexus_manifest):
    nexus_routes = nexus_manifest["routes"]
    nexus_services = nexus_manifest["services"]

    envoy_clusters = []
    for ns in nexus_services:
        app, svc, ver = ns["app"], ns["svc"], ns["svc_ver"]
        release_name = f"{app}-{svc}-{ver.replace('.', '-')}"
        envoy_clusters.append(create_cluster(release_name))

    envoy_routes = []
    for i, nexus_route in enumerate(nexus_routes):
        prefix, cluster = nexus_route["prefix"], nexus_route["cluster"]
        
        headers = []
        if "headers" in nexus_route:
            headers = [
                create_header(k, str(v))
                for k, v in nexus_route["headers"].items()
            ]
        headers_to_add = []
        if "headers_to_add" in nexus_route:
            headers_to_add = [
                create_header_to_add(k, str(v))
                for k, v in nexus_route["headers_to_add"].items()
            ]
        envoy_routes.append(create_route(prefix, cluster, headers, headers_to_add))

    route = {
        "match": { "prefix": "/" },
        "direct_response": {
            "status": 404,
            "body": { "inline_string": "Invalid API Route" }
        }
    }
    envoy_routes.append(route)

    
    path = os.path.join(os.path.dirname(__file__), "base-envoy.yaml")
    envoy_config = yaml.safe_load(open(path, "r").read())
    envoy_config["static_resources"]["clusters"] = envoy_clusters
    envoy_config["static_resources"]["listeners"] \
        [0]["filter_chains"][0]["filters"][0]["typed_config"] \
        ["route_config"]["virtual_hosts"][0]["routes"] = envoy_routes

    return envoy_config


def deploy_helm_charts(nexus_services):
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


def deploy_services(nexus_services):
    deploy_helm_charts(nexus_services)


def deploy_routes(nexus_manifest):
    envoy_config = create_envoy_config(nexus_manifest)
    open("cortex/envoy.yaml", "w").write(
        yaml.dump(envoy_config, sort_keys=False)
    )
    open("charts/envoy-gateway/files/envoy.yaml", "w").write(
        yaml.dump(envoy_config, sort_keys=False)
    )
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

    print("======== Deploy Routes =========")
    subprocess.run([
        "helm",
        "upgrade",
        "envoy",
        "./charts/envoy-gateway",
    ], check=True)


if __name__ == '__main__':
    
    deploy_log_path = "temp/cortex-deploy-log"
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    clone_repo(DEPLOY_LOG_URL, deploy_log_path)

    manifests_path = f"{deploy_log_path}/environment-manifests"
    latest_manifest_name = sorted(os.listdir(manifests_path), key=manifest_sort)[-1]
    latest_manifest_path = f"{manifests_path}/{latest_manifest_name}"
    manifest = yaml.safe_load(open(latest_manifest_path, "r").read())

    deploy_services(manifest["services"])
    deploy_routes(manifest)
