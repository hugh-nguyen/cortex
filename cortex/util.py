import os, requests, subprocess, yaml
from collections import defaultdict


GITHUB_ENDPOINT = "https://api.github.com"
DEPLOY_LOG_URL = "https://github.com/hugh-nguyen/cortex-deploy-log.git"
ROUTE_REPO_URL = "https://github.com/hugh-nguyen/cortex-routes.git"
GH_PERSONAL_TOKEN = os.environ.get("GH_PERSONAL_TOKEN")
CERT_PATH = os.environ.get("CERT_PATH", None)
HEADERS = {
    "Authorization": f"token {GH_PERSONAL_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

app_lookup = set(["app1", "app2", "shared-app"])

def manifest_sort(filename):
    return int(filename.removesuffix(".yaml").split("-")[-1])

def get_all_files(directory, suffix):
    file_list = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            file_list.append(file_path)
    if suffix:
        return [f for f in file_list if f.endswith(suffix)]
    return file_list

def get_service_configs(args):
    repositories = [r for r in get_repositories("hugh-nguyen") if any(r["name"].startswith(app) for app in app_lookup)]

    if args.clone:
        print("===========Clone Repositories===========")
        if os.path.exists("temp"):
            subprocess.run(["rm", "-rf", "temp"], check=True)
            os.makedirs("temp")
        for repo in repositories:
            clone_or_pull(repo["name"], repo["clone_url"])

    base_dir = "temp"
    result = {}

    for repo in repositories:
        if "iac" in repo["name"]:
            continue
        repo_name = repo["name"]
        with open(f"temp/{repo['name']}/cortex.yaml", "r") as f:
            data = yaml.safe_load(f)
            result[repo_name] = {
                "name": repo_name,
                "latest_tag": get_latest_tag(repo["full_name"]),
                **data,
            }
    return result


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


def get_repositories(org):
    result = []
    prevlen = -1
    page = 1
    while len(result) > prevlen:
        prevlen = len(result)
        endpoint = f"{GITHUB_ENDPOINT}/users/{org}/repos?page={page}&per_page=100" # replace users with orgs
        result += get_endpoint_data(endpoint)
        page += 1
    return result


def clone_or_pull(repo_name, clone_url):
    repo_path = os.path.join("temp", repo_name)
    if not os.path.isdir(repo_path):
        print(f"Cloning {repo_name} from {clone_url} into {repo_path}...")
        subprocess.run(["git", "clone", clone_url, repo_path], check=True)
    else:
        print(f"Pulling latest changes in {repo_path}...")
        subprocess.run(["git", "-C", repo_path, "pull"], check=True)

def get_tags(repo_full_name):
    url = f"{GITHUB_ENDPOINT}/repos/{repo_full_name}/tags"
    result = get_endpoint_data(url)
    return [r["name"] for r in result]
    

def get_latest_tag(repo_full_name):
    url = f"{GITHUB_ENDPOINT}/repos/{repo_full_name}/tags"
    result = get_endpoint_data(url)
    if result:
        return result[0]["name"]
    else:
        return None


def diff_and_name_manifest(
    path_to_existing_manifests,
    output_prefix,
    new_manifest
):
    existing_manifests = os.listdir(path_to_existing_manifests)
    print(existing_manifests)
    print("-=====")
    latest_manifest_number = 0
    
    if existing_manifests:
        latest_manifest_filename = sorted(existing_manifests)[-1]
        latest_manifest_number = int(
            latest_manifest_filename.removesuffix(".yaml").split("-")[-1]
        )
        latest_manifest_path = "{}/{}".format(
            path_to_existing_manifests,
            latest_manifest_filename
        )
        latest_manifest = open(latest_manifest_path, "r").read()

    if not existing_manifests or latest_manifest != new_manifest:
        new_manifest_path = "{}/{}-manifest-{}.yaml".format(
            path_to_existing_manifests,
            output_prefix,
            latest_manifest_number+1
        )
        return {
            "path": new_manifest_path,
            "manifest": new_manifest,
            "version": latest_manifest_number+1
        }
    return None


def clone_repo(url, path):
    final_url = url
    if not url.startswith("https://github.com/"):
        final_url = f"https://github.com/{url}.git"
    subprocess.run(["git", "clone", final_url, path], check=True)


def push_repo(url, path, message):
    os.chdir(path)
    subprocess.run(["git", "add", "."], check=True)
    commit_message = message
    try:
        subprocess.run(["git", "commit", "-m", commit_message], check=True)
        new_remote = f"https://{GH_PERSONAL_TOKEN}@{url}"
        subprocess.run(["git", "remote", "set-url", "origin", new_remote], check=True)
        subprocess.run(["git", "push"], check=True)
    except subprocess.CalledProcessError as e:
        print("No changes to commit or error occurred:", e)


def env_services_sort_key(service):
    return service["app"], service["svc"], service["svc_ver"]


def env_route_sort_key(route):
    app_name_sort_key = "zzzzzzzz"
    app_version_sort_key = 99999999
    add_app_name_sort_key = "zzzzzzzz"
    add_app_version_sort_key = 99999999
    is_override = False
    has_headers_to_add = False

    if "headers" in route:
        if "X-App-Name" in route["headers"]:
            app_name_sort_key = route["headers"]["X-App-Name"]
        if "X-App-Version" in route["headers"]:
            app_version_sort_key = int(route["headers"]["X-App-Version"])

    if "is_override" in route:
        is_override = route["is_override"]

    if "headers_to_add" in route:
        has_headers_to_add = True
        if "App-Name" in route["headers_to_add"]:
            add_app_name_sort_key = route["headers_to_add"]["X-App-Name"]
        if "App-Version" in route["headers_to_add"]:
            add_app_version_sort_key = int(route["headers_to_add"]["X-App-Version"])

    return (
        route["prefix"],
        app_name_sort_key,
        app_version_sort_key,
        add_app_name_sort_key,
        add_app_version_sort_key,
        has_headers_to_add,
        is_override,
        route["cluster"]
    )


def sort_services(services):
    services = set([yaml.dump(ns, sort_keys=False) for ns in services])
    services = [yaml.safe_load(d) for d in services]
    return sorted(services, key=env_services_sort_key)


def choose_route(routes):
    most_recent = routes[0]
    for r in routes:
        if r.get("custom") == True:
            return r
        if r["cluster"] > most_recent["cluster"]:
            most_recent = r
    return most_recent


def sort_routes(routes, sort_signature=True):
    routes = set([yaml.dump(r, sort_keys=False) for r in routes])
    routes = [yaml.safe_load(r) for r in routes]

    if sort_signature:
        groups = defaultdict(list)
        for r in routes:
            signature = r["prefix"]
            if "headers" in r:
                for h in r["headers"]:
                    signature += h["Value"] 
            groups[signature].append(r)
    
    result = []
    for k, group in groups.items():
        result.append(choose_route(group))

    return sorted(result, key=env_route_sort_key)