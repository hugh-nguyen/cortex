package main

import (
	route "github.com/envoyproxy/go-control-plane/envoy/config/route/v3"
	core "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"
	matcher "github.com/envoyproxy/go-control-plane/envoy/type/matcher/v3"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

type Header struct {
	Name  string
	Value string
}

func makeHeaderMatcher(name string, match string) *route.HeaderMatcher {
	return &route.HeaderMatcher{
		Name: name,
		HeaderMatchSpecifier: &route.HeaderMatcher_StringMatch{
			StringMatch: &matcher.StringMatcher{
				MatchPattern: &matcher.StringMatcher_Exact{
					Exact: match,
				},
			},
		},
	}
}

func makeHeaderValueOption(key, value string) *core.HeaderValueOption {
	return &core.HeaderValueOption{
		Header: &core.HeaderValue{
			Key:   key,
			Value: value,
		},
		Append: wrapperspb.Bool(true),
	}
}

func makeRoute(prefix string, cluster string, headers []Header, headersToAdd []Header) *route.Route {
	var headerMatchers []*route.HeaderMatcher
	for _, h := range headers {
		headerMatchers = append(headerMatchers, makeHeaderMatcher(h.Name, h.Value))
	}

	var reqHeadersToAdd []*core.HeaderValueOption
	for _, h := range headersToAdd {
		reqHeadersToAdd = append(reqHeadersToAdd, makeHeaderValueOption(h.Name, h.Value))
	}

	r := &route.Route{
		Match: &route.RouteMatch{
			PathSpecifier: &route.RouteMatch_Prefix{
				Prefix: prefix,
			},
			Headers: headerMatchers,
		},
		Action: &route.Route_Route{
			Route: &route.RouteAction{
				ClusterSpecifier: &route.RouteAction_Cluster{
					Cluster: cluster,
				},
				PrefixRewrite: "/",
				// RequestHeadersToAdd: reqHeadersToAdd,
				// Timeout: &route.RouteAction_Timeout{Seconds: 15},
			},

		},
		RequestHeadersToAdd: reqHeadersToAdd,
	}
	return r
}
