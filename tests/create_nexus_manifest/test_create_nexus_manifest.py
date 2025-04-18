import os, yaml
from cortex.create_nexus_manifest import create_nexus_manifest

def test_create_nexus_manifest_1():
    result = create_nexus_manifest("tests/create_nexus_manifest")
    path = os.path.join(
        os.path.dirname(__file__),
        "test_create_nexus_manifest_1.yaml"
    )
    write_path = "tests/create_nexus_manifest/test_temp.yaml"
    open(write_path, "w").write(result["manifest"])

    assert result["manifest"] == open(path, "r").read()