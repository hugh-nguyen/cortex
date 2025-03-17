import os, yaml
from cortex.deploy_nexus import create_envoy_config

def test_create_envoy_config_1():
    path = os.path.join(os.path.dirname(__file__), "nexus-manifests/nexus-manifest-1.yaml")
    result = create_envoy_config(path)
    path = os.path.join(os.path.dirname(__file__), "test_create_envoy_config_1.yaml")
    open("t.yaml", "w").write(yaml.dump(result))
    assert yaml.dump(result) == open(path, "r").read()