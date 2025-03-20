import os, yaml
from cortex.deploy_nexus import create_envoy_config

def test_create_envoy_config_1():
    path = os.path.join(
        os.path.dirname(__file__), 
        "nexus-manifests/nexus-manifest-1.yaml"
    )
    nexus_manifest = yaml.safe_load(open(path, "r").read())

    result = create_envoy_config(nexus_manifest)
    path = os.path.join(
        os.path.dirname(__file__), 
        "test_create_envoy_config_1.yaml"
    )
    
    # write_path = "tests/deploy_nexus/test_create_envoy_config_1_compare.yaml"
    # open(write_path, "w").write(yaml.dump(result, sort_keys=False))

    assert yaml.dump(result, sort_keys=False) == open(path, "r").read()