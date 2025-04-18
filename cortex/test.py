import util

all_hosts = []
all_hosts += util.list_rest_apis()
all_hosts += util.list_http_apis()

print(all_hosts)

