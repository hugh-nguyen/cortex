import boto3
import os
import warnings
from botocore.config import Config
from boto3.dynamodb.conditions import Key, Attr
CERT_PATH = os.environ.get("CERT_PATH", None)

def get_dynamodb_resource():
    warnings.filterwarnings('ignore', message='Unverified HTTPS request')
    
    if os.environ.get('USE_LOCAL_DYNAMODB', 'false').lower() == 'true':
        return boto3.resource(
            'dynamodb', 
            endpoint_url='http://localhost:8000',
            region_name='ap-southeast-2',
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY", None),
            aws_secret_access_key=os.environ.get("AWS_SECRET_KEY", None)
        )
    
    # For development with AWS DynamoDB but SSL verification issues
    boto_config = Config(
        region_name='ap-southeast-2',  # Based on error message in your stack trace
        signature_version='v4',
        retries={
            'max_attempts': 10,
            'mode': 'standard'
        }
    )
    
    session = boto3.Session()
    return session.resource(
        'dynamodb',
        config=boto_config,
        verify=False  # Disable SSL verification
    )

# Initialize DynamoDB resources
dynamodb = get_dynamodb_resource()
apps_table = dynamodb.Table('Apps')
app_versions_table = dynamodb.Table('AppVersions')
teams_table = dynamodb.Table('Teams')
routes_table = dynamodb.Table('Routes')
services_table = dynamodb.Table('Services')


def get_all_rows(table_name, region_name='ap-southeast-2'):
    dynamodb = boto3.resource('dynamodb', region_name=region_name)
    
    all_items = []
    response = routes_table.scan()
    all_items.extend(response.get('Items', []))
    
    while 'LastEvaluatedKey' in response:
        response = routes_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        all_items.extend(response.get('Items', []))
    
    return all_items

def get_teams():
    try:
        response = teams_table.scan()
        items = response.get('Items', [])
        
        # Format the response to match the existing API
        result = []
        for item in items:
            result.append({
                "team_id": item.get('team_id'),
                "team_name": item.get('team_name'),
            })
        
        return result
    except Exception as e:
        print(f"Error in get_all_apps: {str(e)}")
        return []

def get_app(app_name=None):
    try:
        response = apps_table.scan()
        items = response.get('Items', [])
        
        for item in items:
            if app_name == item.get("name", ""):
                return {
                    **item,
                    "App": item.get('name'),
                    "Service Count": item.get('service_count'),
                    "Versions": item.get('versions'),
                    "Last Updated": item.get('last_updated'),
                    "Owner": item.get('owner'),
                    "CommandRepoURL": item.get('command_repo_url'),
                    "services": item.get('services'),
                    "dependencies": item.get('dependencies'),
                }
        return None
    except Exception as e:
        print(f"Error in get_all_apps: {str(e)}")
        return []

def get_apps(team_id=None):
    try:
        response = apps_table.scan()
        items = response.get('Items', [])
        
        formatted_apps = []
        for item in items:
            if team_id and int(item.get("team_id", "0")) == int(team_id):
                formatted_apps.append({
                    **item,
                    "App": item.get('name'),
                    "Service Count": item.get('service_count'),
                    "Versions": item.get('versions'),
                    "Last Updated": item.get('last_updated'),
                    "Owner": item.get('owner'),
                    "CommandRepoURL": item.get('command_repo_url')
                })
        
        return formatted_apps
    except Exception as e:
        print(f"Error in get_all_apps: {str(e)}")
        return []

def get_app_by_name(name):
    try:
        response = apps_table.get_item(
            Key={
                'name': name
            }
        )
        return response.get('Item')
    except Exception as e:
        print(f"Error in get_app_by_name: {str(e)}")
        return None

# Functions for AppVersions table
def get_app_versions(app_name):
    """
    Get all versions of a specific app
    
    Parameters:
    app_name (str): App name
    
    Returns:
    dict: Dictionary with version numbers as keys and app version data as values
    """
    try:
        response = app_versions_table.query(
            KeyConditionExpression=Key('app_name').eq(app_name)
        )
        
        result = []
        for item in response.get('Items', []):
            version_num = item.get('version')
            
            graph_data = item.get('graph', {})
            if isinstance(graph_data, str):
                import json
                try:
                    graph_data = json.loads(graph_data)
                except:
                    graph_data = {}
            
            result.append({
                "app_name": app_name,
                "version": item.get('version'),
                "yaml": item.get('yaml', ''),
                "run_id": int(item.get('run_id', '')),
            })
        
        return result
    except Exception as e:
        print(f"Error in get_app_versions: {str(e)}")
        return {}

def get_app_versions2(app_name):
    try:
        response = app_versions_table.query(
            KeyConditionExpression=Key('app_name').eq(app_name)
        )
        
        result = []
        for item in response.get('Items', []):
            result.append(item)
        
        return result
    except Exception as e:
        print(f"Error in get_app_versions2: {str(e)}")
        return {}

def get_app_version(app_name, version):
    """
    Get a specific version of an app
    
    Parameters:
    app_name (str): App name
    version (int): Version number
    
    Returns:
    dict: App version item or None if not found
    """
    try:
        response = app_versions_table.get_item(
            Key={
                'app_name': app_name,
                'version': version
            }
        )
        return response.get('Item')
    except Exception as e:
        print(f"Error in get_app_version: {str(e)}")
        return None

# For testing - creates a fallback table if needed
def ensure_tables_exist():
    """
    Create tables if they don't exist (for development)
    """
    try:
        # Check if Apps table exists
        try:
            apps_table.table_status
        except:
            print("Creating Apps table...")
            dynamodb.create_table(
                TableName='Apps',
                KeySchema=[
                    {'AttributeName': 'name', 'KeyType': 'HASH'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'name', 'AttributeType': 'S'}
                ],
                ProvisionedThroughput={'ReadCapacityUnits': 5, 'WriteCapacityUnits': 5}
            )
        
        # Check if AppVersions table exists
        try:
            app_versions_table.table_status
        except:
            print("Creating AppVersions table...")
            dynamodb.create_table(
                TableName='AppVersions',
                KeySchema=[
                    {'AttributeName': 'app_name', 'KeyType': 'HASH'},
                    {'AttributeName': 'version', 'KeyType': 'RANGE'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'app_name', 'AttributeType': 'S'},
                    {'AttributeName': 'version', 'AttributeType': 'N'}
                ],
                ProvisionedThroughput={'ReadCapacityUnits': 5, 'WriteCapacityUnits': 5}
            )
            
        return True
    except Exception as e:
        print(f"Error ensuring tables exist: {str(e)}")
        return False
    

def get_routes(team_id):
    try:
        response = routes_table.query(
            IndexName='TeamIdIndex',
            KeyConditionExpression=Key('team_id').eq(team_id)
        )
        return response.get('Items', [])
    except Exception as e:
        print(f"Error in get_routes: {str(e)}")
        return None

def put_route(payload):
    response = routes_table.put_item(
        Item={
            'prefix': payload["prefix"],
            'team_id': payload["team_id"],
            'targets': payload["targets"],
        }
    )
    return response

def get_service(full_name=None):
    try:
        response = services_table.get_item(
            Key={
                'name': full_name
            }
        )
        return response.get('Item')
    except Exception as e:
        print(f"Error in get_service: {str(e)}")
        return None
    
def get_services():
    try:
        response = services_table.scan()
        return response.get('Items', [])
    except Exception as e:
        print(f"Error in get_services: {str(e)}")
        return []