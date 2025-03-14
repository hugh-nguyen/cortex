import yaml, os, subprocess, argparse, json

from util import *

parser = argparse.ArgumentParser()
parser.add_argument('--clone', action='store_true')
args = parser.parse_args()

print("===========Reading Neuroverse===========")
nv = yaml.safe_load(open("neuroverse.yaml", "r").read())
services = nv["services"]
routes = nv["routes"]

def create_route(prefix, cluster_name, app_name, app_version, present_match=None):
    headers = [
        {
            "name": "X-App-Name",
            "string_match": {
                "exact": app_name
            }
        },
        {
            "name": "X-App-Version",
            "string_match": {
                "exact": app_version
            }
        }
    ]
    if present_match:
        headers[0]["present_match"] = True
    match_ = {
        "prefix": prefix,
        "headers": headers
    }

    route = {
        "cluster": cluster_name,
    }
    route["prefix_rewrite"] = ""
    return {
        "match": match_,
        "route": route
    }


def create_cluster(name, port=80):
    socket_address = {
        "address": name,
        "port_value": port
    }
    address = {
        "socket_address": socket_address
    }
    lb_endpoint_endpoint = {
        "address": address
    }
    lb_endpoint = {
        "endpoint": lb_endpoint_endpoint
    }
    endpoint = {
        "lb_endpoints": [
            lb_endpoint
        ]
    }
    load_assignment = {
        "cluster_name": name,
        "endpoints": [
            endpoint
        ]
    }
    return {
        "name": name,
        "connect_timeout": "0.25s",
        "type": "STRICT_DNS",
        "lb_policy": "ROUND_ROBIN",
        "load_assignment": load_assignment
    }

# print(yaml.dump(create_cluster("app1-mfe-a-0-0-3"),sort_keys=False))

envoy_config = yaml.safe_load(open("base-envoy.yaml", "r").read())

envoy_clusters = []
for s in services:
    app, svc, ver = s["app"], s["svc"], s["ver"]
    release_name = f"{app}-{svc}-{ver.replace('.', '-')}"
    envoy_clusters.append(create_cluster(release_name))

envoy_routes = []
for r in routes:
    route = create_route(r["prefix"], r["cluster"], r["headers"][0]["App-Name"], r["headers"][1]["App-Stack"])
    envoy_routes.append(route)

envoy_config["clusters"] = envoy_clusters
envoy_config["static_resources"]["listeners"] \
    [0]["filter_chains"][0]["filters"][0]["typed_config"] \
    ["route_config"]["virtual_hosts"][0]["routes"] = envoy_routes
open("envoy.yaml", "w").write(yaml.dump(envoy_config, sort_keys=False))

subprocess.run([
    "helm",
    "upgrade",
    "envoy",
    "./envoy.yaml"
], check=True)