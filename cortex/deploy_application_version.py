import yaml, os, subprocess, argparse, json, requests
from cortex.util import *

import boto3
import json
from datetime import datetime

from cortex.deploy_kubernetes import deploy_kubernetes
from cortex.deploy_serverless import deploy_serverless
from cortex.deploy_mulesoft import deploy_mulesoft

dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-2')
apps_table = dynamodb.Table('Apps')
app_versions_table = dynamodb.Table('AppVersions')

def upload_app(name=None, service_count=None, versions=None, team_id=None, command_url=None, services=None, dependencies=None, last_updated=None):
    if last_updated is None:
        last_updated = datetime.now().isoformat()
        
    response = apps_table.put_item(
        Item={
            'name': name,
            'service_count': service_count,
            'versions': versions,
            'last_updated': last_updated,
            'team_id': team_id,
            "command_repo_url": command_url,
            "services": services,
            "dependencies": dependencies,
        }
    )
    
    print(f"Uploaded app {name} to DynamoDB")
    return response


def upload_app_version(app_name="", version=None, yaml_data=None, service_count=None, change_count=None, run_id=None, services=None, dependencies=None, links=None):
    response = app_versions_table.put_item(
        Item={
            'app_name': app_name,
            'version': version,
            'yaml': yaml_data,
            'service_count': service_count,
            'change_count': change_count,
            'run_id': run_id,
            "services": services,
            "dependencies": dependencies,
            "links": links,
            'created_at': datetime.now().isoformat()
        }
    )
    
    print(f"Uploaded version {version} of app {app_name} to DynamoDB")
    return response


def transform_routes(routes):
    result = []
    for route in routes:
        r = {**route}
        if "headers" in r:
            r["headers"] = transform_headers(r["headers"])
        if "headers_to_add" in r:
            r["headers_to_add"] = transform_headers(r["headers_to_add"])
        result.append(r)
    return sort_routes(result)


def transform_headers(headers):
    return [{"Name": str(k), "Value": str(v)} for k, v in headers.items()]


def deploy_services(path_to_deploy_log, app_name, app_ver, run_id):
    
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    print(path_to_deploy_log, DEPLOY_LOG_PATH)
    clone_repo(DEPLOY_LOG_URL, DEPLOY_LOG_PATH)
    
    if not app_ver:
        path = f"{DEPLOY_LOG_PATH}/app-version-manifests/{app_name}/"
        app_ver = len(os.listdir(path))
        print(app_ver)

    path = f"{DEPLOY_LOG_PATH}/app-version-manifests/{app_name}/{app_ver}.yaml"
    
    raw_yaml = open(path, "r").read()
    manifest = yaml.safe_load(raw_yaml)
    print(manifest)
    service_lookup = {s["svc"]: s for s in manifest["services"]}
    
    print(os.path.exists("temp"))
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    
    clone_repo(f"hugh-nguyen/{app_name}-cortex-command", "temp")
    
    print(os.listdir("temp/iac/"))
    
    for platform in os.listdir("temp/iac/"):
        print(platform)
        for service_name in os.listdir(f"temp/iac/{platform}"):
            print("\t", service_name)
            if service_name not in service_lookup:
                continue
            
            service = service_lookup[service_name]
            # if platform == "kubernetes":
            #     deploy_kubernetes(service, run_id)
            if platform == "serverless":
                deploy_serverless(service)
            # if platform == "mulesoft":
            #     deploy_mulesoft(service)

                
    team_lookup = {
        "app1": 1,
        "app2": 1,
        "shared-app": 2,
    }
      
    upload_app(
        app_name, len(manifest["services"]), 
        app_ver, team_lookup[app_name],
        f"https://github.com/hugh-nguyen/{app_name}-cortex-command",
        [s["svc"] for s in manifest["services"]],
        [f"{d['app']}/{d['svc']}" for d in manifest["dependencies"]]
    )
    upload_app_version(
        app_name, app_ver, 
        raw_yaml, len(manifest["services"]), 0,
        run_id, manifest["services"], manifest["dependencies"], manifest["links"]
    )
    
    
            
def deploy_routes(path_to_deploy_log):
    
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    print(DEPLOY_LOG_URL, DEPLOY_LOG_PATH)
    clone_repo(DEPLOY_LOG_URL, DEPLOY_LOG_PATH)

    path = f"{path_to_deploy_log}/app-version-manifests"
    avm_paths = get_all_files(path, "yaml")
    print(avm_paths)
    
    routes = []
    sort_key = lambda x: x.split("/")[-1].removesuffix(".yaml")
    for avm_path in sorted(avm_paths, key=sort_key):
        routes += yaml.safe_load(open(avm_path, "r").read()).get("routes", [])
    
    print(routes)
    url = "http://hn-cortex.click/api/v1/routes"
    payload = {"routes": transform_routes(routes)}
    print(payload)
    response = requests.post(url, json=payload)
    print("!!",response.text)


if __name__ == '__main__':

    parser = argparse.ArgumentParser()
    parser.add_argument('--app_name')
    parser.add_argument('--app_ver')
    parser.add_argument('--run_id')
    parser.add_argument('--testing', action='store_true', default=False)
    args = parser.parse_args()
    
    DEPLOY_LOG_PATH = "temp/cortex-deploy-log"
    
    app_name, app_ver = args.app_name, args.app_ver
    
    if not args.testing:
        deploy_services(DEPLOY_LOG_PATH, app_name, app_ver, args.run_id)
    
    import cortex.envoy_util
    cortex.envoy_util.update_envoy()