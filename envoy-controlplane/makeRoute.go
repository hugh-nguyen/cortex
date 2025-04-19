package main

import (
	"fmt"

	core   "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"
	route  "github.com/envoyproxy/go-control-plane/envoy/config/route/v3"
	matcher "github.com/envoyproxy/go-control-plane/envoy/type/matcher/v3"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

type Header struct {
	Name  string
	Value string
}

// helpers (unchanged)
func makeHeaderMatcher(name, exact string) *route.HeaderMatcher {
	return &route.HeaderMatcher{
		Name: name,
		HeaderMatchSpecifier: &route.HeaderMatcher_StringMatch{
			StringMatch: &matcher.StringMatcher{
				MatchPattern: &matcher.StringMatcher_Exact{Exact: exact},
			},
		},
	}
}

func makeHeaderValueOption(key, value string, append bool) *core.HeaderValueOption {
	return &core.HeaderValueOption{
		Header: &core.HeaderValue{
			Key:   key,
			Value: value,
		},
		Append: wrapperspb.Bool(append),
	}
}

func makeRoute(
	prefix, cluster string,
	headers []Header,
	headersToAdd []Header,
	prefixRewrite string,
	hostRewrite string,
) *route.Route {

	if prefixRewrite == "" {
		prefixRewrite = "/"
	}

	// matchers
	var hdrMatchers []*route.HeaderMatcher
	for _, h := range headers {
		hdrMatchers = append(hdrMatchers, makeHeaderMatcher(h.Name, h.Value))
	}

	// header adds
	var reqAdd, respAdd []*core.HeaderValueOption
	for _, h := range headersToAdd {
		reqAdd = append(reqAdd, makeHeaderValueOption(h.Name, h.Value, true))
		cookie := fmt.Sprintf("%s=%s; Path=/; SameSite=Lax", h.Name, h.Value)
		respAdd = append(respAdd, makeHeaderValueOption("Set-Cookie", cookie, true))
	}

	r := &route.Route{
		Match: &route.RouteMatch{
			PathSpecifier: &route.RouteMatch_Prefix{Prefix: prefix},
			Headers:       hdrMatchers,
		},
		Action: &route.Route_Route{
			Route: &route.RouteAction{
				ClusterSpecifier: &route.RouteAction_Cluster{Cluster: cluster},
				PrefixRewrite:    prefixRewrite,
			},
		},
		RequestHeadersToAdd:  reqAdd,
		ResponseHeadersToAdd: respAdd,
	}

	if hostRewrite != "" {
		r.GetRoute().HostRewriteSpecifier =
			&route.RouteAction_HostRewriteLiteral{HostRewriteLiteral: hostRewrite}
	}

	return r
}
