import os, yaml
from cortex.create_nexus_manifest import create_nexus_manifest

def test_create_nexus_manifest_1():
    result = create_nexus_manifest("tests/create_nexus_manifest")
    path = os.path.join(
        os.path.dirname(__file__),
        "test_create_nexus_manifest_1.yaml"
    )
    assert result["manifest"] == open(path, "r").read()