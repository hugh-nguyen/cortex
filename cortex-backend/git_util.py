import os
import tempfile
import subprocess
import random
import string
import time
import re
from datetime import datetime
import logging
import requests

def get_owner_and_repo_from_url(url, logger):
    match = re.search(r'github\.com/([^/]+)/([^/]+)', url)
    if not match:
        logger.error(f"Invalid GitHub URL format: {url}")
        return {"status": "error", "message": "Invalid GitHub URL format"}
    
    owner = match.group(1)
    repo_name = match.group(2)
    return owner, repo_name

def generate_temp_path(timestamp):
    unique_folder = f"deploy-temp-{timestamp}"
    
    temp_base = os.path.join(os.path.expanduser("~"), "deploy_temp")
    os.makedirs(temp_base, exist_ok=True)
    return os.path.join(temp_base, unique_folder)

def clone(auth_repo_url, temp_dir, logger):
    try:
        subprocess.run(
            ["git", "clone", auth_repo_url, temp_dir],
            check=True, capture_output=True, text=True,
            timeout=15
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"Clone failed: {e.stderr}")
        return {"status": "error", "message": f"Git clone failed: {e.stderr}"}

def checkout_new_branch(branch_name, logger):
    logger.info(f"Creating branch: {branch_name}")
    
    try:
        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            check=True, capture_output=True, text=True
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"Branch creation failed: {e.stderr}")
        return {"status": "error", "message": f"Branch creation failed: {e.stderr}"}
    
def add(file_path, logger):
    try:
        subprocess.run(
            ["git", "add", file_path],
            check=True, capture_output=True, text=True
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"Git add failed: {e.stderr}")
        return {"status": "error", "message": f"Git add failed: {e.stderr}"}

def commit(commit_msg, logger):
    try:
        subprocess.run(
            ["git", "commit", "-m", commit_msg],
            check=True, capture_output=True, text=True
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"Git commit failed: {e.stderr}")
        return {"status": "error", "message": f"Git commit failed: {e.stderr}"}

def push(branch_name, logger):
    try:
        push_result = subprocess.run(
            ["git", "push", "-u", "origin", branch_name],
            capture_output=True, text=True, check=True,
            timeout=60
        )
        logger.info(f"Push output: {push_result.stdout}")
        if push_result.stderr:
            logger.info(f"Push stderr: {push_result.stderr}")
    except subprocess.CalledProcessError as e:
        logger.error(f"Git push failed: {e.stderr}")
        return {"status": "error", "message": f"Git push failed: {e.stderr}"}

def raise_pull_request(owner, repo_name, github_token, branch_name, logger):
    try:
        # Define PR details
        pr_title = f"Deploy new version"
        pr_body = f"Automated deployment created by Cortex Deploy System\n\nTimestamp: {datetime.now().isoformat()}\n"
        
        # GitHub API endpoint for creating a PR
        api_url = f"https://api.github.com/repos/{owner}/{repo_name}/pulls"
        
        # Headers for GitHub API
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # PR data
        pr_data = {
            "title": pr_title,
            "body": pr_body,
            "head": branch_name,
            "base": "main"  # Assuming your default branch is "main"
        }
        
        # Make the API request to create the PR
        logger.info(f"Creating PR via GitHub API: {api_url}")
        response = requests.post(api_url, headers=headers, json=pr_data, verify="ca.crt")
        
        # Check if PR was created successfully
        if response.status_code in (201, 200):
            pr_info = response.json()
            pr_url = pr_info["html_url"]
            pr_number = pr_info["number"]
            logger.info(f"PR created successfully: {pr_url}")
            
            return {
                "status": "success",
                "pr_url": pr_url,
                "pr_number": pr_number,
                "message": "Successfully created deployment PR",
                "branch_name": branch_name
            }
        else:
            logger.error(f"Failed to create PR. Status: {response.status_code}, Response: {response.text}")
            # Still return success for branch creation, but include error about PR
            compare_url = f"https://github.com/{owner}/{repo_name}/compare/main...{branch_name}?expand=1"
            return {
                "status": "partial_success",
                "message": f"Branch created but PR creation failed: {response.text}",
                "compare_url": compare_url,
                "branch_name": branch_name
            }
    except Exception as e:
        logger.error(f"Error creating PR: {str(e)}")
        # Still return success for branch creation
        compare_url = f"https://github.com/{owner}/{repo_name}/compare/main...{branch_name}?expand=1"
        return {
            "status": "partial_success",
            "message": f"Branch created but PR creation failed: {str(e)}",
            "compare_url": compare_url,
            "branch_name": branch_name
        }

def get_workflow_runs(repo_url, workflow_name):
    import os
    import logging
    import requests
    from datetime import datetime, timezone
    import dateutil.parser
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("workflows")
    
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        logger.error("GITHUB_TOKEN environment variable is not set")
        return {"status": "error", "message": "GITHUB_TOKEN environment variable is not set"}
    
    owner, repo_name = get_owner_and_repo_from_url(repo_url, logger)

    logger.info(f"Getting workflow runs for {owner}/{repo_name}, filtering for workflow: {workflow_name}")
    
    try:
        workflows_url = f"https://api.github.com/repos/{owner}/{repo_name}/actions/workflows"
        
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        logger.info(f"Fetching workflows from: {workflows_url}")
        workflows_response = requests.get(workflows_url, headers=headers, verify="ca.crt")
        
        if workflows_response.status_code != 200:
            logger.error(f"Failed to get workflows. Status: {workflows_response.status_code}")
            return {
                "status": "error",
                "message": f"Failed to get workflows: {workflows_response.text}",
                "status_code": workflows_response.status_code
            }
        
        workflows_data = workflows_response.json()
        target_workflow = None
        
        for workflow in workflows_data.get("workflows", []):
            if (workflow_name.lower() in workflow.get("name", "").lower() or 
                workflow_name.lower() in workflow.get("path", "").lower()):
                target_workflow = workflow
                break
        
        if not target_workflow:
            logger.warning(f"No workflow found matching '{workflow_name}'")
            return {
                "status": "success",
                "workflow_runs": [],
                "total_count": 0,
                "message": f"No workflow found matching '{workflow_name}'"
            }
        
        # Now get runs for the specific workflow
        workflow_id = target_workflow["id"]
        api_url = f"https://api.github.com/repos/{owner}/{repo_name}/actions/workflows/{workflow_id}/runs"
        
        logger.info(f"Fetching runs for workflow {workflow_id} from: {api_url}")
        response = requests.get(api_url, headers=headers, verify="ca.crt")
        
        if response.status_code == 200:
            workflow_data = response.json()
            
            # Process workflow runs
            processed_runs = []
            for run in workflow_data.get("workflow_runs", []):
                # Convert the created_at time to a more readable format
                created_at = dateutil.parser.parse(run["created_at"])
                updated_at = dateutil.parser.parse(run["updated_at"])
                
                # Calculate how long ago the run was created/updated
                now = datetime.now(timezone.utc)
                created_ago = now - created_at
                updated_ago = now - updated_at
                
                # Format as minutes or hours ago
                if created_ago.days > 0:
                    created_ago_str = f"{created_ago.days} days ago"
                elif created_ago.seconds // 3600 > 0:
                    created_ago_str = f"{created_ago.seconds // 3600} hours ago"
                else:
                    created_ago_str = f"{max(1, created_ago.seconds // 60)} minutes ago"
                
                processed_runs.append({
                    "id": run["id"],
                    "name": target_workflow["name"],  # Use the workflow name directly
                    "run_number": run["run_number"],
                    "status": run["status"],
                    "conclusion": run["conclusion"],
                    "created_at": run["created_at"],
                    "created_ago": created_ago_str,
                    "html_url": run["html_url"],
                    "actor": run["actor"]["login"] if "actor" in run else "Unknown",
                    "head_branch": run["head_branch"],
                    "duration": run.get("duration", 0) / 60 if run.get("duration") else None,
                    "run_attempt": run.get("run_attempt", 1)
                })
            
            return {
                "status": "success",
                "workflow_runs": processed_runs,
                "total_count": workflow_data.get("total_count", 0)
            }
        else:
            logger.error(f"Failed to get workflow runs. Status: {response.status_code}, Response: {response.text}")
            return {
                "status": "error",
                "message": f"Failed to get workflow runs: {response.text}",
                "status_code": response.status_code
            }
    
    except Exception as e:
        logger.error(f"Error getting workflow runs: {str(e)}")
        return {
            "status": "error",
            "message": f"Error getting workflow runs: {str(e)}"
        }


def run_workflow(repo_url, workflow_name, ref="main"):
    import os
    import logging
    import re
    import requests
    from datetime import datetime
    
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("deploy")
    
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        logger.error("GITHUB_TOKEN environment variable is not set")
        return {"status": "error", "message": "GITHUB_TOKEN environment variable is not set"}
    
    owner, repo_name = get_owner_and_repo_from_url(repo_url, logger)

    logger.info(f"Triggering GitHub Action in {owner}/{repo_name}")
    
    try:
        api_url = f"https://api.github.com/repos/{owner}/{repo_name}/actions/workflows/{workflow_name}.yaml/dispatches"
        
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        payload = {
            "ref": ref
        }
        
        logger.info(f"Sending request to {api_url}")
        response = requests.post(api_url, headers=headers, json=payload, verify="ca.crt")
        
        if response.status_code == 204:  # GitHub returns 204 No Content for successful workflow triggers
            # Get the URL to view the workflow run
            workflows_url = f"https://github.com/{owner}/{repo_name}/actions"
            logger.info(f"GitHub Action triggered successfully. View at: {workflows_url}")
            
            return {
                "status": "success",
                "message": "GitHub Action triggered successfully",
                "workflows_url": workflows_url,
                "timestamp": datetime.now().isoformat()
            }
        else:
            logger.error(f"Failed to trigger GitHub Action. Status: {response.status_code}, Response: {response.text}")
            return {
                "status": "error",
                "message": f"Failed to trigger GitHub Action: {response.text}",
                "status_code": response.status_code
            }
    
    except Exception as e:
        logger.error(f"Error triggering GitHub Action: {str(e)}")
        return {
            "status": "error",
            "message": f"Error triggering GitHub Action: {str(e)}"
        }