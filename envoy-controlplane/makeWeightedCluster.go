// helper.go
package main

import (
	core "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"
	route "github.com/envoyproxy/go-control-plane/envoy/config/route/v3"
	// "google.golang.org/protobuf/types/known/durationpb"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

type WeightedCluster struct {
    Name                 string   `json:"name"`
    Weight               uint32   `json:"weight"`
    RequestHeadersToAdd []struct {
        Key   string `json:"Key"`
        Value string `json:"Value"`
    } `json:"request_headers_to_add"`
}

func makeWeightedClustersRoute(prefix string, headers []Header, weightedClusters []WeightedCluster) *route.Route {
    r := &route.Route{
        Match: &route.RouteMatch{
            PathSpecifier: &route.RouteMatch_Prefix{
                Prefix: prefix,
            },
        },
        Action: &route.Route_Route{
            Route: &route.RouteAction{
                ClusterSpecifier: &route.RouteAction_WeightedClusters{
                    WeightedClusters: &route.WeightedCluster{
                        Clusters:    []*route.WeightedCluster_ClusterWeight{},
                        // TotalWeight: wrapperspb.UInt32(100),
                    },
                },
                PrefixRewrite: "/",
                // Timeout: &durationpb.Duration{Seconds: 15},
            },
        },
    }

    // Add headers matcher if specified
    for _, header := range headers {
        r.Match.Headers = append(r.Match.Headers, &route.HeaderMatcher{
            Name: header.Name,
            HeaderMatchSpecifier: &route.HeaderMatcher_ExactMatch{
                ExactMatch: header.Value,
            },
        })
    }

    // Add weighted clusters
    // totalWeight := uint32(0)
    weightedClusterAction := r.Action.(*route.Route_Route).Route.ClusterSpecifier.(*route.RouteAction_WeightedClusters).WeightedClusters

    for _, wc := range weightedClusters {
        clusterWeight := &route.WeightedCluster_ClusterWeight{
            Name:   wc.Name,
            Weight: wrapperspb.UInt32(wc.Weight),
        }

        // Add headers to request for this cluster if specified
        for _, header := range wc.RequestHeadersToAdd {
            clusterWeight.RequestHeadersToAdd = append(clusterWeight.RequestHeadersToAdd, &core.HeaderValueOption{
                Header: &core.HeaderValue{
                    Key:   header.Key,
                    Value: header.Value,
                },
                // Append: wrapperspb.Bool(false),
            })
        }

        weightedClusterAction.Clusters = append(weightedClusterAction.Clusters, clusterWeight)
        // totalWeight += wc.Weight
    }

    // Set the total weight
    // weightedClusterAction.TotalWeight = wrapperspb.UInt32(totalWeight)

    return r
}