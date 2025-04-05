import boto3
import json
from datetime import datetime

def delete_all_table_items(table_name, region_name='us-east-1'):
    """Delete all items from a specific DynamoDB table"""
    dynamodb = boto3.resource('dynamodb', region_name=region_name)
    table = dynamodb.Table(table_name)
    
    key_schema = table.key_schema
    hash_key = next(item['AttributeName'] for item in key_schema if item['KeyType'] == 'HASH')
    range_key = None
    if len(key_schema) > 1:
        range_key = next(item['AttributeName'] for item in key_schema if item['KeyType'] == 'RANGE')
    
    items = []
    scan_response = table.scan()
    items.extend(scan_response.get('Items', []))
    
    while 'LastEvaluatedKey' in scan_response:
        scan_response = table.scan(ExclusiveStartKey=scan_response['LastEvaluatedKey'])
        items.extend(scan_response.get('Items', []))
    
    print(f"Found {len(items)} items in {table_name}")
    
    if not items:
        print(f"No items to delete in {table_name}")
        return
    
    with table.batch_writer() as batch:
        for item in items:
            key = {hash_key: item[hash_key]}
            if range_key:
                key[range_key] = item[range_key]
            batch.delete_item(Key=key)
    
    print(f"Successfully deleted all items from {table_name}")

if __name__ == "__main__":
    region = 'ap-southeast-2'
    
    print("Deleting items from Apps table...")
    delete_all_table_items('Apps', region)
    
    print("\nDeleting items from AppVersions table...")
    delete_all_table_items('AppVersions', region)
    
    print("\nDeleting items from Teams table...")
    delete_all_table_items('Teams', region)
    
    print("\nDeletion complete!")

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


def upload_app(name=None, service_count=None, versions=None, team_id=None, last_updated=None):
    if last_updated is None:
        last_updated = datetime.now().isoformat()
        
    response = apps_table.put_item(
        Item={
            'name': name,
            'service_count': service_count,
            'versions': versions,
            'last_updated': last_updated,
            'team_id': team_id
        }
    )
    
    print(f"Uploaded app {name} to DynamoDB")
    return response


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


def upload_routes(prefix="", team_id=None, targets=None):
    response = routes_table.put_item(
        Item={
            'prefix': prefix,
            'team_id': team_id,
            'targets': targets
        }
    )
    return response


#####################
##### TEAMS #####
###################
upload_team(
    team_id=1,
    team_name="Team Alpha",
)
upload_team(
    team_id=2,
    team_name="Team Beta",
)
upload_team(
    team_id=3,
    team_name="Team Gamma",
)

#####################
##### APPS #####
###################
upload_app(
    "app1",
    2,
    1,
    1
)
upload_app(
    "app2",
    1,
    1,
    1
)
upload_app(
    "shared-app",
    1,
    1,
    2
)
upload_app(
    "test-app",
    6,
    3,
    3
)

#####################
##### TEST APP #####
###################

y = """- app: test-app
  svc: service-a
  ver: 0.0.36
  depends_on:
  - app: test-app
    svc: service-b
    ver: 0.0.7
- app: test-app
  svc: service-b
  ver: 0.0.7
  depends_on:
  - app: shared-app
    svc: service-s
    ver: 0.0.4"""
upload_app_version(
    "test-app",
    1,
    y,
    2,
    0
)

y = """- app: test-app
  svc: service-a
  ver: 0.0.36
  depends_on:
  - app: test-app
    svc: service-b
    ver: 0.0.7
  - app: test-app
    svc: service-c
    ver: 0.0.1
  - app: app2
    svc: service-y
    ver: 0.0.2
- app: test-app
  svc: service-b
  ver: 0.0.7
  depends_on:
  - app: shared-app
    svc: service-s
    ver: 0.0.4
- app: test-app
  svc: service-c
  ver: 0.0.1
  depends_on:
  - app: app3
    svc: service-z
    ver: 0.0.3
  - app: app4
    svc: service-x
    ver: 0.0.9
- app: test-app
  svc: service-d
  ver: 0.0.1
  depends_on:
  - app: test-app
    svc: service-c
    ver: 0.0.1
  - app: test-app
    svc: service-e
    ver: 0.0.8
- app: test-app
  svc: service-e
  ver: 0.0.8"""
upload_app_version(
    "test-app",
    2,
    y,
    5,
    0
)

y = """- app: test-app
  svc: service-a
  ver: 0.0.36
  depends_on:
  - app: test-app
    svc: service-b
    ver: 0.0.7
  - app: test-app
    svc: service-c
    ver: 0.0.1
  - app: app2
    svc: service-y
    ver: 0.0.2
- app: test-app
  svc: service-b
  ver: 0.0.7
  depends_on:
  - app: shared-app
    svc: service-s
    ver: 0.0.4
  - app: test-app
    svc: service-f
    ver: 0.0.1
- app: test-app
  svc: service-c
  ver: 0.0.1
  depends_on:
  - app: app3
    svc: service-z
    ver: 0.0.3
  - app: app4
    svc: service-x
    ver: 0.0.9
- app: test-app
  svc: service-d
  ver: 0.0.1
  depends_on:
  - app: test-app
    svc: service-c
    ver: 0.0.1
  - app: app5
    svc: service-t
    ver: 0.0.4
  - app: test-app
    svc: service-e
    ver: 0.0.8
- app: test-app
  svc: service-e
  ver: 0.0.8
- app: test-app
  svc: service-f
  ver: 0.0.3"""
upload_app_version(
    "test-app",
    3,
    y,
    6,
    0
)

upload_routes(
    "/app1/main/",
    1,
    [
      {
        "app": "app1",
        "svc": "service-a",
        "app_ver": 1,
        "weight": 60
      },
      {
        "app": "app1",
        "svc": "service-a",
        "app_ver": 2,
        "weight": 40
      }
    ]
)

upload_routes(
    "/app1/service-a/",
    1,
    [
      {
        "app": "app1",
        "svc": "service-a",
        "app_ver": 1,
        "weight": 100
      }
    ]
)