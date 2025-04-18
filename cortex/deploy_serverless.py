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

def deploy_serverless(service):
    
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
    subprocess.run(["npx", "cdk", "deploy", "--require-approval", "never", "--all"], check=True)