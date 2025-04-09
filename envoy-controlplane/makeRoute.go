package main

import (
	"fmt"

	core  "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"
	route "github.com/envoyproxy/go-control-plane/envoy/config/route/v3"
	matcher "github.com/envoyproxy/go-control-plane/envoy/type/matcher/v3"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

// ---------- helper types ----------
type Header struct {
	Name  string
	Value string
}

// ---------- helper builders ----------
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

// ---------- main factory ----------
func makeRoute(prefix, cluster string,
	headers []Header,
	headersToAdd []Header) *route.Route {

	// ── 1. matchers ────────────────────────────────────────────────────────────
	var hdrMatchers []*route.HeaderMatcher
	for _, h := range headers {
		hdrMatchers = append(hdrMatchers, makeHeaderMatcher(h.Name, h.Value))
	}

	// ── 2. request‑headers‑to‑add  (upstream) ─────────────────────────────────
	var reqAdd []*core.HeaderValueOption
	for _, h := range headersToAdd {
		// static header (Envoy → upstream)
		reqAdd = append(reqAdd,
			makeHeaderValueOption(h.Name, h.Value, true))

		// dynamic header pulled from cookie (browser → Envoy → upstream)
		//   %REQ_COOKIE(<cookieName>)% is evaluated per request
		// cookieForward := makeHeaderValueOption(
		// 	h.Name,
		// 	fmt.Sprintf("%%REQ_COOKIE(%s)%%", h.Name),
		// 	false) // overwrite static if cookie exists
		// reqAdd = append(reqAdd, cookieForward)
	}

	// ── 3. response‑headers‑to‑add  (downstream) ──────────────────────────────
	var respAdd []*core.HeaderValueOption
	// for _, h := range headersToAdd {
	// 	respAdd = append(respAdd,
	// 		makeHeaderValueOption(h.Name, h.Value, true))
	// }

	for _, h := range headersToAdd {
		// Set‑Cookie so browser stores the version
		cookie := fmt.Sprintf("%s=%s; Path=/; SameSite=Lax", h.Name, h.Value)
		respAdd = append(respAdd,
			makeHeaderValueOption("Set-Cookie", cookie, false))
	}

	// for _, h := range headersToAdd {
	// 	// Set‑Cookie so browser stores the version
	// 	cookie := fmt.Sprintf("%s=%s; Path=/; SameSite=Lax", h.Name, h.Value)
	// 	respAdd = append(respAdd,
	// 		makeHeaderValueOption("Set-Cookie", cookie, false))
	// }

	// (optional) expose header to JS – uncomment if you need it
	// respAdd = append(respAdd,
	//     makeHeaderValueOption("Access-Control-Expose-Headers",
	//         "X-App-Version, X-App-Name", true))

	// ── 4. build and return the Route object ──────────────────────────────────
	return &route.Route{
		Match: &route.RouteMatch{
			PathSpecifier: &route.RouteMatch_Prefix{Prefix: prefix},
			Headers:       hdrMatchers,
		},
		Action: &route.Route_Route{
			Route: &route.RouteAction{
				ClusterSpecifier: &route.RouteAction_Cluster{Cluster: cluster},
				PrefixRewrite:    "/",
			},
		},
		RequestHeadersToAdd:  reqAdd,
		ResponseHeadersToAdd: respAdd,
	}
}
