import os, yaml, subprocess
from cortex.util import *
from collections import defaultdict

def pull_manifests():
    print("PULL!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--sr",
        type=str,
        required=True,
        help="Source Repository"
    )

    source_repository = args.sr
    if os.path.exists("temp"):
        subprocess.run(["rm", "-rf", "temp"], check=True)
    
    clone_repo(source_repository)

    pull_manifests()