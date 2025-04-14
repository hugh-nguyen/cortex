from cortex.util import *


def deploy_kubernetes(service):
    subprocess.run(["aws","eks","update-kubeconfig", "--region","ap-southeast-2","--name","cluster",], check=True)
    try:
        helm_list_output = subprocess.check_output(["helm", "list", "-q"], text=True)
        deployed_releases = helm_list_output.strip().split('\n') if helm_list_output.strip() else []
        print(f"Found {len(deployed_releases)} existing Helm releases")
    except subprocess.CalledProcessError:
        print("Warning: Failed to get list of deployed releases")
        deployed_releases = []
        
    app, svc, ver = service["app"], service["svc"], service["svc_ver"]
    release_name = f"{app}-{svc}-{ver.replace('.', '-')}"
    
    if release_name in deployed_releases:
        print(f"\n====Skipping {release_name} (already deployed)====")
    else:
        print(f"\n====Deploying {release_name}====")
        try:
            subprocess.run([
                "helm",
                "install",
                release_name,
                f"./temp/iac/kubernetes/{svc}",
                "--set",
                f"version={ver}",
            ], check=True, stderr=subprocess.PIPE, text=True)
        except subprocess.CalledProcessError as e:
            error_message = e.stderr
            print(f"ERROR: Helm deployment failed:\n{error_message}")
            raise Exception(f"Helm deployment failed: {error_message}") from e