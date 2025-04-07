from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
import yaml
import graph
import graph_original
import dynamo_util
import envoy_util

from fastapi import FastAPI, Body
from typing import List, Dict, Any

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "Hello World"}

@app.get("/get_teams")
async def get_teams():
    result = dynamo_util.get_teams()
    return {"teams": result}

@app.get("/get_app")
async def get_app(app_name: str = "app_name"):
    print("##", app_name)
    result = dynamo_util.get_app(app_name)
    print("###", result)
    return {"app": result}

@app.get("/get_apps")
async def get_apps(team_id: int = "team_id"):
    result = dynamo_util.get_apps(team_id)
    return {"apps": result}

@app.get("/get_app_versions")
async def get_apps_versions(app: str = "app1"):
    app_versions = dynamo_util.get_app_versions(app)
    transform = lambda av: {
      "app": av["app_name"],
      "version": av["version"],
      "graph": graph.calculate_graph(av["app_name"], av["yaml"])
    }
    app_versions = {int(av["version"]): transform(av) for av in app_versions}
    return {"app_versions": app_versions}

@app.get("/get_routes")
async def get_routes(team_id: int = "team_id"):
    result = dynamo_util.get_routes(team_id)
    return {"routes": result}

@app.put("/put_route")
async def put_route(payload: Dict[str, Any] = Body(...)):
    print(payload)
    result = dynamo_util.put_route(payload)
    return {"routes": result}

@app.get("/update_envoy")
async def update_envoy():
    url = "http://hn-cortex.click/api/v1/routes"
    # payload = {"routes": transform_routes(routes)}
    envoy_util.update_envoy()
    return {"result": "SUCCESS"}

@app.get("/hello/{name}")
async def read_hello(name: str):
    return {"message": f"Hello {name}"}

@app.get("/test_apps")
async def test_apps():
    return {
        "apps": [
            {"App": "app1", "Service Count": 2, "Versions": 3, "Last Updated": "2 days ago", "Owner": "Hugh"},
            {"App": "app2", "Service Count": 1, "Versions": 1, "Last Updated": "1 week ago", "Owner": "Hugh"},
            {"App": "shared-app", "Service Count": 1, "Versions": 6, "Last Updated": "1 day ago", "Owner": "Hugh"},
        ]
    }

@app.get("/deploy_app_version")
async def deploy_app_version(command_repo: str):
    import os
    import tempfile
    import subprocess
    import random
    import string
    import time
    import re
    from datetime import datetime
    import logging
    
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("deploy")
    
    # Get GitHub token from environment variable
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        logger.error("GITHUB_TOKEN environment variable is not set")
        return {"status": "error", "message": "GITHUB_TOKEN environment variable is not set"}
    
    # Log the first few characters of the token (for debugging)
    logger.info(f"Using token starting with: {github_token[:4]}...")
    
    match = re.search(r'github\.com/([^/]+)/([^/]+)', command_repo)
    if not match:
        logger.error(f"Invalid GitHub URL format: {command_repo}")
        return {"status": "error", "message": "Invalid GitHub URL format"}
    
    owner = match.group(1)
    repo_name = match.group(2)
    # Remove .git extension if present
    repo_name = repo_name.split('.git')[0] 
    
    # Modified repository URL with token
    auth_repo_url = f"https://{github_token}@github.com/{owner}/{repo_name}.git"
    
    # Store original working directory
    original_dir = os.getcwd()
    logger.info(f"Original directory: {original_dir}")
    
    # Create a unique folder name for cloning
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    unique_folder = f"deploy-temp-{timestamp}-{random_str}"
    
    # Use a specific location for the temp directory
    temp_base = os.path.join(os.path.expanduser("~"), "deploy_temp")
    os.makedirs(temp_base, exist_ok=True)
    temp_dir = os.path.join(temp_base, unique_folder)
    
    try:
        logger.info(f"Creating directory: {temp_dir}")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Check if the directory was created successfully
        if not os.path.isdir(temp_dir):
            logger.error(f"Failed to create directory: {temp_dir}")
            return {"status": "error", "message": f"Failed to create directory: {temp_dir}"}
        
        # Clone the repository
        logger.info(f"Cloning repository: {owner}/{repo_name} to {temp_dir}")
        try:
            clone_process = subprocess.run(
                ["git", "clone", auth_repo_url, temp_dir],
                check=True, capture_output=True, text=True,
                timeout=60  # Add timeout to prevent hanging
            )
            logger.info(f"Clone output: {clone_process.stdout}")
        except subprocess.CalledProcessError as e:
            logger.error(f"Clone failed: {e.stderr}")
            return {"status": "error", "message": f"Git clone failed: {e.stderr}"}
        
        # Change to the repository directory
        logger.info(f"Changing to directory: {temp_dir}")
        os.chdir(temp_dir)
        
        # Configure Git
        logger.info("Configuring Git")
        subprocess.run(["git", "config", "user.name", "Cortex Deploy Bot"], check=True)
        subprocess.run(["git", "config", "user.email", "deploy-bot@example.com"], check=True)
        
        # Create a branch name
        branch_name = f"deploy-{timestamp}-{random_str}"
        logger.info(f"Creating branch: {branch_name}")
        
        # Create a new branch
        try:
            subprocess.run(
                ["git", "checkout", "-b", branch_name],
                check=True, capture_output=True, text=True
            )
        except subprocess.CalledProcessError as e:
            logger.error(f"Branch creation failed: {e.stderr}")
            return {"status": "error", "message": f"Branch creation failed: {e.stderr}"}
        
        # Create deploy directory if it doesn't exist
        deploy_dir = os.path.join(temp_dir, "deploy")
        os.makedirs(deploy_dir, exist_ok=True)
        
        # Create a file with unique content
        file_path = os.path.join(deploy_dir, "version.txt")
        logger.info(f"Creating file: {file_path}")
        with open(file_path, "w") as f:
            f.write(f"Deploy timestamp: {datetime.now().isoformat()}\n")
            f.write(f"Random ID: {random_str}\n")
            f.write(f"Created by: Cortex Deploy System\n")
        
        # Add the file to git
        logger.info("Adding file to git")
        try:
            subprocess.run(
                ["git", "add", file_path],
                check=True, capture_output=True, text=True
            )
        except subprocess.CalledProcessError as e:
            logger.error(f"Git add failed: {e.stderr}")
            return {"status": "error", "message": f"Git add failed: {e.stderr}"}
        
        # Commit the changes
        logger.info("Committing changes")
        commit_msg = f"Deploy new version {timestamp}"
        try:
            subprocess.run(
                ["git", "commit", "-m", commit_msg],
                check=True, capture_output=True, text=True
            )
        except subprocess.CalledProcessError as e:
            logger.error(f"Git commit failed: {e.stderr}")
            return {"status": "error", "message": f"Git commit failed: {e.stderr}"}
        
        # Push the branch
        logger.info(f"Pushing branch {branch_name} to origin")
        try:
            # Set up upstream and push
            push_result = subprocess.run(
                ["git", "push", "-u", "origin", branch_name],
                capture_output=True, text=True, check=True,
                timeout=60  # Add timeout to prevent hanging
            )
            logger.info(f"Push output: {push_result.stdout}")
            if push_result.stderr:
                logger.info(f"Push stderr: {push_result.stderr}")
        except subprocess.CalledProcessError as e:
            logger.error(f"Git push failed: {e.stderr}")
            return {"status": "error", "message": f"Git push failed: {e.stderr}"}
        
        # Return to original directory
        os.chdir(original_dir)
        
        # Create PR URL
        # Use the compare URL which will show a button to create a PR
        pr_url = f"https://github.com/{owner}/{repo_name}/compare/main...{branch_name}?expand=1"
        logger.info(f"PR URL: {pr_url}")
        
        return {
            "status": "success",
            "pr_url": pr_url,
            "message": "Successfully created branch and files",
            "branch_name": branch_name
        }
    
    except Exception as e:
        logger.error(f"Deployment failed: {str(e)}")
        # Try to return to original directory
        try:
            os.chdir(original_dir)
        except:
            pass
        return {"status": "error", "message": f"Deployment failed: {str(e)}"}
    finally:
        # Always try to return to original directory
        try:
            os.chdir(original_dir)
        except:
            pass