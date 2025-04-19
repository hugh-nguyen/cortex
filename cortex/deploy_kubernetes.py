from cortex.util import *


def deploy_kubernetes(service, run_id):
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
    
    import boto3
    dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-2')
    services_table = dynamodb.Table('Services')
    links = [
        {
            "display_order": 0,
            "label": "View in EKS",
            "url": f"https://ap-southeast-2.console.aws.amazon.com/eks/clusters/cluster/deployments/{release_name}?namespace=default&region=ap-southeast-2",
            "logo": "eks.png",
        },
        {
            "display_order": 1,
            "label": "Deployment Link",
            "url": f"http://k8s-eksingressgroup-$$subdomain.ap-southeast-2.elb.amazonaws.com/{app}/{svc}/",
            "logo": "deployment.png",
        },
        {
            "display_order": 2,
            "label": "Deploy Workflow",
            "url": f"https://github.com/hugh-nguyen/{app}-cortex-command/actions/runs/{run_id}",
            "logo": "gh-workflow.png",
        },
        {
            "display_order": 3,
            "label": "Build Artifact",
            "url": f"https://ap-southeast-2.console.aws.amazon.com/ecr/repositories/private/495599745704/{app}-{svc}?region=ap-southeast-2",
            "logo": "ecr.png",
        },
        {
            "display_order": 4,
            "label": "Build Workflow",
            "url": f"https://github.com/hugh-nguyen/{app}-{svc}/actions",
            "logo": "gh-workflow.png",
        },
        {
            "display_order": 5,
            "label": "Source Code",
            "url": f"https://github.com/hugh-nguyen/{app}-{svc}/releases/tag/{ver}",
            "logo": "github.png",
        },
    ]
    item = {
        "name": f"{app}/{svc}@{ver}",
        "app": app,
        "svc": svc,
        "ver": ver,
        "links": links,
        "status": "Good",
        "platform": "kubernetes",
    }
    services_table.put_item(Item=item)