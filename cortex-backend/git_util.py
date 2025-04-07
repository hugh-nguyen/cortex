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