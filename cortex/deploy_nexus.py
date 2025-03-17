import yaml, os, subprocess, argparse, json
from util import *


def create_route(prefix, cluster_name, headers=None):
    match_ = { "prefix": prefix }
    if headers:
        match_["headers"] = headers

    route = { "cluster": cluster_name }
    route["prefix_rewrite"] = "/"

    return {
        "match": match_,
        "route": route
    }


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


parser = argparse.ArgumentParser()
parser.add_argument('--clone', action='store_true')
args = parser.parse_args()

def create_envoy_config(path):
    nexus_manifest = yaml.safe_load(open(path, "r").read())
    nexus_services = nexus_manifest["services"]
    nexus_routes = nexus_manifest["routes"]

    envoy_clusters = []
    for ns in nexus_services:
        app, svc, ver = ns["app"], ns["svc"], ns["svc_ver"]
        release_name = f"{app}-{svc}-{ver.replace('.', '-')}"
        envoy_clusters.append(create_cluster(release_name))

    envoy_routes = []
    for i, nexus_route in enumerate(nexus_routes):
        prefix, cluster = nexus_route["prefix"], nexus_route["cluster"]
        
        if "headers" in nexus_route:
            app_name = nexus_route["headers"][0]["App-Name"]

            if len(nexus_route["headers"]) == 2:
                app_version = f"{nexus_route['headers'][1]['App-Version']}"
                headers = [
                    create_header("X-App-Name", app_name),
                    create_header("X-App-Version", app_version),
                ]
                envoy_routes.append(create_route(prefix, cluster, headers))

            else:
                headers = [create_header("X-App-Name", app_name)]
                envoy_routes.append(create_route(prefix, cluster, headers))

        else:
            envoy_routes.append(create_route(prefix, cluster))

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


def deploy_nexus(path):
    nexus_manifest = yaml.safe_load(open(path, "r").read())
    nexus_services = nexus_manifest["services"]
    nexus_routes = nexus_manifest["routes"]

    # print("======== DEPLOY NEXUS SERVICES =========")
    # try:
    #     helm_list_output = subprocess.check_output(["helm", "list", "-q"], text=True)
    #     deployed_releases = helm_list_output.strip().split('\n') if helm_list_output.strip() else []
    #     print(f"Found {len(deployed_releases)} existing Helm releases")
    # except subprocess.CalledProcessError:
    #     print("Warning: Failed to get list of deployed releases")
    #     deployed_releases = []

    # for ns in nexus_services:
    #     app, svc, ver = s["app"], s["svc"], s["ver"]
    #     release_name = f"{app}-{svc}-{ver.replace('.', '-')}"
        
    #     if release_name in deployed_releases:
    #         print(f"\n====Skipping {release_name} (already deployed)====")
    #         continue

    #     print(f"\n====Deploying {release_name}====")
    #     subprocess.run([
    #         "helm",
    #         "install",
    #         release_name,
    #         f"./temp/{app}-iac/helm/{svc}-chart",
    #         "--set",
    #         f"version={ver}",
    #     ], check=True)


    print("======== DEPLOY NEXUS ROUTES =========")

    envoy_config = create_envoy_config(path)

    open("envoy.yaml", "w").write(yaml.dump(envoy_config, sort_keys=False))

    # open("envoy.yaml", "w").write(yaml.dump(envoy_config, sort_keys=False))

    # subprocess.run([
    #     "helm",
    #     "upgrade",
    #     "envoy",
    #     "./envoy.yaml"
    # ], check=True)

if __name__ == '__main__':
    deploy_nexus("temp/cortex-stack-log/nexus-manifests/nexus-manifest-1.yaml")