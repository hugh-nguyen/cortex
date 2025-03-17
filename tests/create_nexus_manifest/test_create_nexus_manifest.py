import os, yaml
from cortex.create_nexus_manifest import create_nexus_manifest

def test_create_nexus_manifest_1():
    path = os.path.join(os.path.dirname(__file__), "layer-manifests")
    result = create_nexus_manifest(path)
    path = os.path.join(os.path.dirname(__file__), "test_create_nexus_manifest_1.yaml")
    assert yaml.dump(result) == open(path, "r").read()