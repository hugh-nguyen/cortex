FROM envoyproxy/envoy:v1.27.1
COPY envoy.yaml /etc/envoy/envoy.yaml
RUN apt-get update && apt-get install -y curl
CMD ["envoy", "-c", "/etc/envoy/envoy.yaml"]
