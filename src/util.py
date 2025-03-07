import os, requests, subprocess, yaml


GITHUB_ENDPOINT = "https://api.github.com"
GH_PERSONAL_TOKEN = os.environ.get("GH_PERSONAL_TOKEN")
CERT_PATH = os.environ.get("CERT_PATH", None)
HEADERS = {
    "Authorization": f"token {GH_PERSONAL_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}


def get_endpoint_data(endpoint, headers={}, index=""):
    try:
        result = requests.get(endpoint, verify=CERT_PATH, headers=HEADERS, timeout=10).json()
        if index:
            result = result["values"]
    except Exception as e:
        print("Error retriving endpoint data:", endpoint)
        print(e)
        result = []
    return result


def get_repositories(org, prefix=None):
    result = []
    prevlen = -1
    page = 1
    while len(result) > prevlen:
        prevlen = len(result)
        endpoint = f"{GITHUB_ENDPOINT}/users/{org}/repos?page={page}&per_page=100" # replace users with orgs
        result += get_endpoint_data(endpoint)
        page += 1
    return [r for r in result if r["name"].startswith(prefix)]


def clone_or_pull(repo_name, clone_url):
    repo_path = os.path.join("temp", repo_name)
    if not os.path.isdir(repo_path):
        print(f"Cloning {repo_name} from {clone_url} into {repo_path}...")
        subprocess.run(["git", "clone", clone_url, repo_path], check=True)
    else:
        print(f"Pulling latest changes in {repo_path}...")
        subprocess.run(["git", "-C", repo_path, "pull"], check=True)


def get_latest_tag(repo_name):
    url = f"{GITHUB_ENDPOINT}/repos/{repo_name}/tags"
    result = get_endpoint_data(url)
    if result:
        return result[0]["name"]
    else:
        return None