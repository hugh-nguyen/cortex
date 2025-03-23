import os, yaml, subprocess, argparse
from cortex.util import *
from collections import defaultdict

def get_manifests(app, path_to_source_repo):
    path = f"{path_to_source_repo}/app-version-manifests"
    
    new_manifests = []
    for file in os.listdir(path):
        new_manifest = {
            "filename": f"{app}-manifest-{file}",
            "manifest": open(f"{path}/{file}", "r").read()
        }
        new_manifests.append(new_manifest)

    return new_manifests


def merge_route_overrides(path_to_deploy_log, path_to_source_repo):
    path = f"{path_to_source_repo}/route-overrides.yaml"
    if not os.path.exists(path):
        return None
    new_manifest = yaml.safe_load(open(path, "r").read())

    path = f"{path_to_deploy_log}/route-overrides-manifests"
    latest_manifest = yaml.safe_load(open(f"{path}/{sorted(os.listdir(path))[-1]}", "r").read())
    new_version = len(os.listdir(path))

    if new_manifest != latest_manifest:
        return {
            "filename": f"route-overrides-manifest-{new_version}.yaml",
            "manifest": yaml.dump({**latest_manifest, **new_manifest})
        }
    return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--sr",
        type=str,
        required=True,
        help="Source Repository"
    )

    source_repository = parser.parse_args().sr
    source_repo_name = source_repository.split("/")[-1]
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    
    path_to_deploy_log = "temp/cortex-deploy-log"
    path_to_source_repo = f"temp/{source_repo_name}"
    clone_repo(source_repository, f"temp/{source_repo_name}")
    clone_repo(DEPLOY_LOG_URL, path_to_deploy_log)

    app = source_repo_name.removesuffix("-cortex-command")

    new_app_manifests = get_manifests(app, path_to_source_repo)
    new_route_manifest = merge_route_overrides(
        path_to_deploy_log, path_to_source_repo
    )

    path = f"{path_to_deploy_log}/app-version-manifests"
    if not os.path.exists(f"{path}/{app}"):
        os.makedirs(f"{path}/{app}")

    commit_message = "Update"
    for new_app_manifest in new_app_manifests:
        new_path = f"{path}/{app}/{new_app_manifest['filename']}"
        open(new_path, "w").write(new_app_manifest["manifest"])
        commit_message += f" {new_app_manifest['filename']}"

    if new_route_manifest:
        path = f"{path_to_deploy_log}/route-overrides-manifests"
        new_path = f"{path}/{new_route_manifest['filename']}"
        open(new_path, "w").write(new_route_manifest["manifest"])
    
    push_repo(
        "github.com/hugh-nguyen/cortex-deploy-log.git", 
        path_to_deploy_log,
        commit_message
    )