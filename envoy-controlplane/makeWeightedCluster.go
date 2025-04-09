package main

import (
	"fmt"

	route "github.com/envoyproxy/go-control-plane/envoy/config/route/v3"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

// ---------- helper types ----------
type WeightedCluster struct {
	Name   string `json:"name"`
	Weight uint32 `json:"weight"`
	RequestHeadersToAdd []struct {
		Key   string `json:"Key"`
		Value string `json:"Value"`
	} `json:"request_headers_to_add"`
}

// ---------- factory ----------
func makeWeightedClustersRoute(prefix string,
	matchHeaders []Header,
	weightedClusters []WeightedCluster) *route.Route {

	// base Route object
	r := &route.Route{
		Match: &route.RouteMatch{
			PathSpecifier: &route.RouteMatch_Prefix{Prefix: prefix},
		},
		Action: &route.Route_Route{
			Route: &route.RouteAction{
				ClusterSpecifier: &route.RouteAction_WeightedClusters{
					WeightedClusters: &route.WeightedCluster{},
				},
				PrefixRewrite: "/",
			},
		},
	}

	// add matchers (if any)
	for _, h := range matchHeaders {
		r.Match.Headers = append(r.Match.Headers,
			makeHeaderMatcher(h.Name, h.Value))
	}

	// pointer to the WeightedClusters block
	wcBlock := r.GetRoute().GetWeightedClusters()

	// build each cluster weight
	for _, wc := range weightedClusters {

		cw := &route.WeightedCluster_ClusterWeight{
			Name:   wc.Name,
			Weight: wrapperspb.UInt32(wc.Weight),
		}

		for _, hdr := range wc.RequestHeadersToAdd {
			// upstream static header
			cw.RequestHeadersToAdd = append(cw.RequestHeadersToAdd,
				makeHeaderValueOption(hdr.Key, hdr.Value, true))
            
            cw.ResponseHeadersToAdd = append(cw.ResponseHeadersToAdd,
                makeHeaderValueOption(hdr.Key, hdr.Value, true))

			// downstream cookie
			// cookie := fmt.Sprintf("%s=%s; Path=/; SameSite=Lax",
			// 	hdr.Key, hdr.Value)
			// cw.ResponseHeadersToAdd = append(cw.ResponseHeadersToAdd,
			// 	makeHeaderValueOption("Set-Cookie", cookie, false))

			// upstream cookie‑forwarder
			// cw.RequestHeadersToAdd = append(cw.RequestHeadersToAdd,
			// 	makeHeaderValueOption(hdr.Key,
			// 		fmt.Sprintf("%%REQ_COOKIE(%s)%%", hdr.Key), false))
		}

		wcBlock.Clusters = append(wcBlock.Clusters, cw)
	}

	return r
}
