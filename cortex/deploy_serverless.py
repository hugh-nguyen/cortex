from cortex.util import *

def npm_install():
    try:
        result = subprocess.run(
            ["npm", "install"],
            check=True,
        )
        print("npm install succeeded.")
        print("Output:", result.stdout)
    except subprocess.CalledProcessError as error:
        print("An error occurred during npm install:")
        print("Exit code:", error.returncode)
        print("Error output:", error.stderr)

def deploy_serverless(service, run_id):
    
    code_dir = f"temp/iac/serverless/{service['app']}-{service['svc']}"
    code_url = f"https://github.com/hugh-nguyen/{service['app']}-{service['svc']}.git"
    clone_repo(code_url, code_dir)
    
    cdk_dir = f"temp/iac/serverless/{service['svc']}"
    
    original_dir = os.getcwd()
    os.chdir(code_dir)
    subprocess.run(["git", "checkout", service['svc_ver']], check=True)
    npm_install()
    subprocess.run(["npm", "run", "build"], check=True)
    
    os.chdir(original_dir)
    os.chdir(cdk_dir)
    npm_install()
    subprocess.run(["npx", "cdk", "bootstrap", "aws://495599745704/ap-southeast-2"], check=True)
    subprocess.run(
        [
            "npx", "cdk", "deploy",
            "--require-approval", "never",
            "-c", f"version={service['svc_ver'].replace('.', '-')}",
            "--all",
        ],
        check=True,
    )
    
    all_apis = list_rest_apis()
    
    app, svc, ver = service["app"], service["svc"], service["svc_ver"]
    release_name = f"{app}-{svc}-{ver.replace('.', '-')}"
    
    api_id = ""
    for api in all_apis:
        if api["name"] == release_name:
            api_id = api["id"]
            
    hostname = "{api_id}.execute-api.{client.meta.region_name}.amazonaws.com/prod"
            
    import boto3
    dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-2')
    services_table = dynamodb.Table('Services')
    links = [
        {
            "display_order": 0,
            "label": "View in EKS",
            "url": f"https://ap-southeast-2.console.aws.amazon.com/apigateway/main/apis/{api_id}/resources?api={api_id}&region=ap-southeast-2&url=https%3A%2F%2Fap-southeast-2.console.aws.amazon.com%2Fapigateway%2Fhome%3Fregion%3Dap-southeast-2%23%2Fapis%2F{api_id}%2Fresources",
            "logo": "apigw.png",
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
            "url": f"",
            "logo": "ecr.png",
        },
        {
            "display_order": 4,
            "label": "Build Workflow",
            "url": f"",
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
        "hostname": hostname,
    }
    services_table.put_item(Item=item)
    