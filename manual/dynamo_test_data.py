import boto3
import json
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
apps_table = dynamodb.Table('Apps')
app_versions_table = dynamodb.Table('AppVersions')
teams_table = dynamodb.Table('Teams')
routes_table = dynamodb.Table('Routes')

def upload_team(team_id=None, team_name=None, last_updated=None):
  if last_updated is None:
        last_updated = datetime.now().isoformat()
  
  response = teams_table.put_item(
        Item={
            'team_id': team_id,
            'team_name': team_name,
            'last_updated': last_updated
        }
    )
  return response


def upload_app(name=None, service_count=None, versions=None, team_id=None, command_url=None, last_updated=None):
    if last_updated is None:
        last_updated = datetime.now().isoformat()
        
    response = apps_table.put_item(
        Item={
            'name': name,
            'service_count': service_count,
            'versions': versions,
            'last_updated': last_updated,
            'team_id': team_id,
            "command_repo_url": command_url,
        }
    )
    
    print(f"Uploaded app {name} to DynamoDB")
    return response


def upload_app_version(app_name="", version=None, yaml_data=None, service_count=None, services=None, dependencies=None, links=None, change_count=None):
    response = app_versions_table.put_item(
        Item={
            'app_name': app_name,
            'version': version,
            'yaml': yaml_data,
            'service_count': service_count,
            'change_count': change_count,
            'services': services,
            'dependencies': dependencies,
            'links': links,
            'created_at': datetime.now().isoformat()
        }
    )
    
    print(f"Uploaded version {version} of app {app_name} to DynamoDB")
    return response


def upload_routes(prefix="", team_id=None, targets=None):
    response = routes_table.put_item(
        Item={
            'prefix': prefix,
            'team_id': team_id,
            'targets': targets
        }
    )
    return response

upload_team(
    team_id=4,
    team_name="Team Delta",
)

upload_app(
    name="test-app1",
    service_count=2,
    versions=5,
    team_id=4,
    command_url="",
)
upload_app(
    name="test-app2",
    service_count=2,
    versions=3,
    team_id=4,
    command_url="",
)
upload_app(
    name="test-shared-app",
    service_count=1,
    versions=5,
    team_id=4,
    command_url="",
)

upload_app_version(
    app_name="test-app1",
    version=1,
    yaml_data="",
    service_count=2,
    services=[
        {
            "app": "test-app1",
            "svc": "mfe-a",
            "svc_ver": "0.0.1",
        },
        {
            "app": "test-app1",
            "svc": "service-b",
            "svc_ver": "0.0.1",
        },
    ],
    dependencies=[
        {
            "app": "test-shared-app",
            "svc": "service-s",
            "svc_ver": "0.0.1",
        },
    ],
    links=[
        {
            "source": {
                "app": "test-app1",
                "svc": "mfe-a",
            },
            "target": {
                "app": "test-app1",
                "svc": "service-b",
            },
        },
        {
            "source": {
                "app": "test-app1",
                "svc": "service-b",
            },
            "target": {
                "app": "test-shared-app1",
                "svc": "service-s",
            },
        }
    ],
    change_count=0,
)

upload_app_version(
    app_name="test-app1",
    version=2,
    yaml_data="",
    service_count=2,
    services=[
        {
            "app": "test-app1",
            "svc": "mfe-a",
            "svc_ver": "0.0.2",
        },
        {
            "app": "test-app1",
            "svc": "service-b",
            "svc_ver": "0.0.1",
        },
    ],
    dependencies=[
        {
            "app": "test-shared-app",
            "svc": "service-s",
            "svc_ver": "0.0.2",
        },
    ],
    links=[
        {
            "source": {
                "app": "test-app1",
                "svc": "mfe-a",
            },
            "target": {
                "app": "test-app1",
                "svc": "service-b",
            },
        },
        {
            "source": {
                "app": "test-app1",
                "svc": "service-b",
            },
            "target": {
                "app": "test-shared-app1",
                "svc": "service-s",
            },
        }
    ],
    change_count=0,
)

upload_app_version(
    app_name="test-app1",
    version=3,
    yaml_data="",
    service_count=2,
    services=[
        {
            "app": "test-app1",
            "svc": "mfe-a",
            "svc_ver": "0.0.3",
        },
        {
            "app": "test-app1",
            "svc": "service-b",
            "svc_ver": "0.0.2",
        },
    ],
    dependencies=[
        {
            "app": "test-shared-app",
            "svc": "service-s",
            "svc_ver": "0.0.3",
        },
    ],
    links=[
        {
            "source": {
                "app": "test-app1",
                "svc": "mfe-a",
            },
            "target": {
                "app": "test-app1",
                "svc": "service-b",
            },
        },
        {
            "source": {
                "app": "test-app1",
                "svc": "service-b",
            },
            "target": {
                "app": "test-shared-app1",
                "svc": "service-s",
            },
        }
    ],
    change_count=0,
)

upload_app_version(
    app_name="test-app1",
    version=4,
    yaml_data="",
    service_count=2,
    services=[
        {
            "app": "test-app1",
            "svc": "mfe-a",
            "svc_ver": "0.0.4",
        },
        {
            "app": "test-app1",
            "svc": "service-b",
            "svc_ver": "0.0.3",
        },
    ],
    dependencies=[
        {
            "app": "test-shared-app",
            "svc": "service-s",
            "svc_ver": "0.0.3",
        },
    ],
    links=[
        {
            "source": {
                "app": "test-app1",
                "svc": "mfe-a",
            },
            "target": {
                "app": "test-app1",
                "svc": "service-b",
            },
        },
        {
            "source": {
                "app": "test-app1",
                "svc": "service-b",
            },
            "target": {
                "app": "test-shared-app1",
                "svc": "service-s",
            },
        }
    ],
    change_count=0,
)

upload_app_version(
    app_name="test-app1",
    version=5,
    yaml_data="",
    service_count=2,
    services=[
        {
            "app": "test-app1",
            "svc": "mfe-a",
            "svc_ver": "0.0.4",
        },
        {
            "app": "test-app1",
            "svc": "service-b",
            "svc_ver": "0.0.3",
        },
    ],
    dependencies=[
        {
            "app": "test-shared-app",
            "svc": "service-s",
            "svc_ver": "0.0.4",
        },
    ],
    links=[
        {
            "source": {
                "app": "test-app1",
                "svc": "mfe-a",
            },
            "target": {
                "app": "test-app1",
                "svc": "service-b",
            },
        },
        {
            "source": {
                "app": "test-app1",
                "svc": "service-b",
            },
            "target": {
                "app": "test-shared-app1",
                "svc": "service-s",
            },
        }
    ],
    change_count=0,
)

upload_app_version(
    app_name="test-app2",
    version=1,
    yaml_data="",
    service_count=2,
    services=[
        {
            "app": "test-app2",
            "svc": "mfe-x",
            "svc_ver": "0.0.1",
        },
        {
            "app": "test-app2",
            "svc": "service-y",
            "svc_ver": "0.0.1",
        },
    ],
    dependencies=[
        {
            "app": "test-shared-app",
            "svc": "service-s",
            "svc_ver": "0.0.2",
        },
    ],
    links=[
        {
            "source": {
                "app": "test-app2",
                "svc": "mfe-x",
            },
            "target": {
                "app": "test-app2",
                "svc": "service-y",
            },
        },
        {
            "source": {
                "app": "test-app2",
                "svc": "service-y",
            },
            "target": {
                "app": "test-shared-app2",
                "svc": "service-s",
            },
        }
    ],
    change_count=0,
)

upload_app_version(
    app_name="test-app2",
    version=2,
    yaml_data="",
    service_count=2,
    services=[
        {
            "app": "test-app2",
            "svc": "mfe-x",
            "svc_ver": "0.0.1",
        },
        {
            "app": "test-app2",
            "svc": "service-y",
            "svc_ver": "0.0.2",
        },
    ],
    dependencies=[
        {
            "app": "test-shared-app",
            "svc": "service-s",
            "svc_ver": "0.0.2",
        },
    ],
    links=[
        {
            "source": {
                "app": "test-app2",
                "svc": "mfe-x",
            },
            "target": {
                "app": "test-app2",
                "svc": "service-y",
            },
        },
        {
            "source": {
                "app": "test-app2",
                "svc": "service-y",
            },
            "target": {
                "app": "test-shared-app2",
                "svc": "service-s",
            },
        }
    ],
    change_count=0,
)

upload_app_version(
    app_name="test-app2",
    version=3,
    yaml_data="",
    service_count=2,
    services=[
        {
            "app": "test-app2",
            "svc": "mfe-x",
            "svc_ver": "0.0.2",
        },
        {
            "app": "test-app2",
            "svc": "service-y",
            "svc_ver": "0.0.3",
        },
    ],
    dependencies=[
        {
            "app": "test-shared-app",
            "svc": "service-s",
            "svc_ver": "0.0.5",
        },
    ],
    links=[
        {
            "source": {
                "app": "test-app2",
                "svc": "mfe-x",
            },
            "target": {
                "app": "test-app2",
                "svc": "service-y",
            },
        },
        {
            "source": {
                "app": "test-app2",
                "svc": "service-y",
            },
            "target": {
                "app": "test-shared-app2",
                "svc": "service-s",
            },
        }
    ],
    change_count=0,
)