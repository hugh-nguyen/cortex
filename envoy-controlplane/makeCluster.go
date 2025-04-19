package main

import (
	"strings"

	cluster  "github.com/envoyproxy/go-control-plane/envoy/config/cluster/v3"
	core     "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"
	endpoint "github.com/envoyproxy/go-control-plane/envoy/config/endpoint/v3"
	tls      "github.com/envoyproxy/go-control-plane/envoy/extensions/transport_sockets/tls/v3"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/durationpb"
)

// map cluster_type string → enum
func clusterDiscoveryType(t string) cluster.Cluster_DiscoveryType {
	switch strings.ToUpper(t) {
	case "LOGICAL_DNS":
		return cluster.Cluster_LOGICAL_DNS
	default:
		return cluster.Cluster_STRICT_DNS
	}
}

// map dns_lookup_family string → enum
func dnsLookupFamily(f string) cluster.Cluster_DnsLookupFamily {
	switch strings.ToUpper(f) {
	case "V4_ONLY":
		return cluster.Cluster_V4_ONLY
	case "V6_ONLY":
		return cluster.Cluster_V6_ONLY
	default:
		return cluster.Cluster_AUTO
	}
}

func makeCluster(
	clusterName, host string,
	port uint32,
	cType, dnsFam string,
	useTLS bool,
) *cluster.Cluster {

	if useTLS {
		port = 443
	}

	c := &cluster.Cluster{
		Name:           clusterName,
		ConnectTimeout: &durationpb.Duration{Seconds: 1},
		ClusterDiscoveryType: &cluster.Cluster_Type{
			Type: clusterDiscoveryType(cType),
		},
		DnsLookupFamily: dnsLookupFamily(dnsFam),
		LbPolicy:        cluster.Cluster_ROUND_ROBIN,
		LoadAssignment: &endpoint.ClusterLoadAssignment{
			ClusterName: clusterName,
			Endpoints: []*endpoint.LocalityLbEndpoints{{
				LbEndpoints: []*endpoint.LbEndpoint{{
					HostIdentifier: &endpoint.LbEndpoint_Endpoint{
						Endpoint: &endpoint.Endpoint{
							Address: &core.Address{
								Address: &core.Address_SocketAddress{
									SocketAddress: &core.SocketAddress{
										Protocol: core.SocketAddress_TCP,
										Address:  host,
										PortSpecifier: &core.SocketAddress_PortValue{
											PortValue: port,
										},
									},
								},
							},
						},
					},
				}},
			}},
		},
	}

	if useTLS {
		ctx, _ := anypb.New(&tls.UpstreamTlsContext{Sni: host})
		c.TransportSocket = &core.TransportSocket{
			Name: "envoy.transport_sockets.tls",
			ConfigType: &core.TransportSocket_TypedConfig{
				TypedConfig: ctx,
			},
		}
	}

	return c
}
