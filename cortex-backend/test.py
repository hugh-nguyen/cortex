import graph

input = """
services:
- app: app1
  svc: mfe-a
  svc_ver: 0.0.1
- app: app1
  svc: service-b
  svc_ver: 0.0.1
routes:
- prefix: /app1/mfe-a/
  headers:
    X-App-Version: 1
  cluster: app1-mfe-a-0-0-1
- prefix: /app1/mfe-a/
  cluster: app1-mfe-a-0-0-1
- prefix: /app1/service-b/
  headers:
    X-App-Version: 1
  cluster: app1-service-b-0-0-1
- prefix: /app1/service-b/
  cluster: app1-service-b-0-0-1
- prefix: /shared-app/service-s/
  headers:
    X-App-Name: app1
    X-App-Version: 1
  cluster: shared-app-service-s-0-0-1
- prefix: /shared-app/service-s/
  headers:
    X-App-Name: app1
  cluster: shared-app-service-s-0-0-1
dependencies:
- app: shared-app
  svc: service-s
  svc_ver: 0.0.1
links:
- source:
    app: app1
    svc: mfe-a
  target:
    app: app1
    svc: service-b
- source:
    app: app1
    svc: service-b
  target:
    app: shared-app
    svc: service-s
"""

g = graph.calculate_graph("app1", input)

import yaml
open("test2.yaml", "w").write(yaml.dump(g))