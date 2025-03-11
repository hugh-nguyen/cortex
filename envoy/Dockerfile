FROM --platform=linux/amd64 envoyproxy/envoy:v1.25.1
COPY envoy.yaml /etc/envoy/envoy.yaml
RUN apt-get update && apt-get install -y curl
CMD ["envoy", "-c", "/etc/envoy/envoy.yaml"]
