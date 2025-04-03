import boto3
import json
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
apps_table = dynamodb.Table('Apps')
app_versions_table = dynamodb.Table('AppVersions')

def upload_app_version(app_name="", version=None, yaml_data=None, service_count=None, change_count=None):
    response = app_versions_table.put_item(
        Item={
            'app_name': app_name,
            'version': version,
            'yaml': yaml_data,
            'service_count': service_count,
            'change_count': change_count,
            'created_at': datetime.now().isoformat()
        }
    )
    
    print(f"Uploaded version {version} of app {app_name} to DynamoDB")
    return response


#####################
##### SHARED APP ###
###################
y = """
- app: shared-app
  svc: service-s
  ver: 0.0.1
  depends_on: []
"""
upload_app_version(
    app_name="shared-app",
    version=1,
    yaml_data=y,
    service_count=1,
    change_count=0
)

y = """
- app: shared-app
  svc: service-s
  ver: 0.0.2
  depends_on: []
"""
upload_app_version(
    app_name="shared-app",
    version=2,
    yaml_data=y,
    service_count=1,
    change_count=0
)

y = """
- app: shared-app
  svc: service-s
  ver: 0.0.3
  depends_on: []
"""
upload_app_version(
    app_name="shared-app",
    version=3,
    yaml_data=y,
    service_count=1,
    change_count=0
)

#####################
##### APP1 ###
###################
y = """
- app: app1
  svc: mfe-a
  ver: 0.0.1
  depends_on:
  - svc: service-b
- app: app1
  svc: service-b
  ver: 0.0.1
  depends_on:
  - app: shared-app
    svc: service-s
    ver: 0.0.1
"""
upload_app_version(
    app_name="app1",
    version=1,
    yaml_data=y,
    service_count=2,
    change_count=0
)

y = """
- app: app1
  svc: mfe-a
  ver: 0.0.1
  depends_on:
  - svc: service-b
- app: app1
  svc: service-b
  ver: 0.0.2
  depends_on:
  - app: shared-app
    svc: service-s
    ver: 0.0.3
"""
upload_app_version(
    app_name="app1",
    version=2,
    yaml_data=y,
    service_count=2,
    change_count=0
)

#####################
##### APP2 ###
###################
y = """
- app: app2
  svc: mfe-x
  ver: 0.0.1
  depends_on:
  - svc: service-y
- app: app2
  svc: service-y
  ver: 0.0.1
  depends_on:
  - app: shared-app
    svc: service-s
    ver: 0.0.2
"""
upload_app_version(
    app_name="app2",
    version=1,
    yaml_data=y,
    service_count=2,
    change_count=0
)