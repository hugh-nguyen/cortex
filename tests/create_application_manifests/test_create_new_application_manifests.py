import os, yaml
from cortex.create_application_manifests import create_new_application_manifests

def test_create_new_application_manifests_1():
    input_path = os.path.join(
        os.path.dirname(__file__),
        "service_configs.yaml"
    )
    result = create_new_application_manifests(
        yaml.safe_load(open(input_path, "r").read()),
        "tests/create_application_manifests/app-manifests"
    )
    path = os.path.join(
        os.path.dirname(__file__),
        "test_create_new_application_manifests_1.yaml"
    )
    assert yaml.dump(result) == open(path, "r").read()