package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"sync"

	cluster "github.com/envoyproxy/go-control-plane/envoy/config/cluster/v3"
	core "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"
	listener "github.com/envoyproxy/go-control-plane/envoy/config/listener/v3"
	route "github.com/envoyproxy/go-control-plane/envoy/config/route/v3"
	discovery "github.com/envoyproxy/go-control-plane/envoy/service/discovery/v3"
	hcm "github.com/envoyproxy/go-control-plane/envoy/extensions/filters/network/http_connection_manager/v3"
	router "github.com/envoyproxy/go-control-plane/envoy/extensions/filters/http/router/v3"
	matcher "github.com/envoyproxy/go-control-plane/envoy/type/matcher/v3"
	"github.com/envoyproxy/go-control-plane/pkg/cache/types"
	cache "github.com/envoyproxy/go-control-plane/pkg/cache/v3"
	resource "github.com/envoyproxy/go-control-plane/pkg/resource/v3"
	xds "github.com/envoyproxy/go-control-plane/pkg/server/v3"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/durationpb"
)

var (
	snapshotCache cache.SnapshotCache
	configMutex   sync.Mutex
	version       int
	clusters      = make(map[string]*cluster.Cluster)
	routes        = make(map[string]*route.RouteConfiguration)
	listeners     = make(map[string]*listener.Listener)
)

type ClusterConfig struct {
	Name string `json:"name"`
	Host string `json:"host"`
	Port uint32 `json:"port"`
}

type HeaderMatcher struct {
	Name       string `json:"name"`
	ExactMatch string `json:"exact_match"`
}

type RouteMatch struct {
	Prefix  string         `json:"prefix"`
	Headers []HeaderMatcher `json:"headers,omitempty"`
}

type DirectResponse struct {
	Status int    `json:"status"`
	Body   string `json:"body"`
}

type RouteAction struct {
	Cluster       string `json:"cluster"`
	PrefixRewrite string `json:"prefix_rewrite,omitempty"`
}

type RouteEntry struct {
	Match          RouteMatch     `json:"match"`
	RouteAction    *RouteAction   `json:"route,omitempty"`
	DirectResponse *DirectResponse `json:"direct_response,omitempty"`
}

type VirtualHost struct {
	Name    string       `json:"name"`
	Domains []string     `json:"domains"`
	Routes  []RouteEntry `json:"routes"`
}

type RouteConfig struct {
	Name         string        `json:"name"`
	VirtualHosts []VirtualHost `json:"virtual_hosts"`
}

func init() {
	snapshotCache = cache.NewSnapshotCache(false, cache.IDHash{}, nil)
}

func makeHTTPConnectionManager(routeName string) *anypb.Any {
    routerConfig := &router.Router{}
    routerConfigAny, err := anypb.New(routerConfig)
    if err != nil {
        panic(err)
    }

    routeConfig, exists := routes[routeName]
    if !exists {
        log.Printf("Warning: route config %s not found", routeName)
        routeConfig = makeRouteConfig(routeName, []VirtualHost{
            {
                Name:    "default",
                Domains: []string{"*"},
                Routes: []RouteEntry{
                    {
                        Match: RouteMatch{
                            Prefix: "/",
                        },
                        DirectResponse: &DirectResponse{
                            Status: 404,
                            Body:   "Route configuration not found",
                        },
                    },
                },
            },
        })
    }

    manager := &hcm.HttpConnectionManager{
        CodecType:  hcm.HttpConnectionManager_AUTO,
        StatPrefix: "ingress_http",
        RouteSpecifier: &hcm.HttpConnectionManager_RouteConfig{
            RouteConfig: routeConfig,
        },
        HttpFilters: []*hcm.HttpFilter{
            {
                Name: "envoy.filters.http.router",
                ConfigType: &hcm.HttpFilter_TypedConfig{
                    TypedConfig: routerConfigAny,
                },
            },
        },
    }

    any, err := anypb.New(manager)
    if err != nil {
        panic(err)
    }
    return any
}

func makeListener(listenerName, address string, port uint32, routeName string) *listener.Listener {
	return &listener.Listener{
		Name: listenerName,
		Address: &core.Address{
			Address: &core.Address_SocketAddress{
				SocketAddress: &core.SocketAddress{
					Protocol: core.SocketAddress_TCP,
					Address:  address,
					PortSpecifier: &core.SocketAddress_PortValue{
						PortValue: port,
					},
				},
			},
		},
		FilterChains: []*listener.FilterChain{{
			Filters: []*listener.Filter{{
				Name: "envoy.filters.network.http_connection_manager",
				ConfigType: &listener.Filter_TypedConfig{
					TypedConfig: makeHTTPConnectionManager(routeName),
				},
			}},
		}},
	}
}

func makeRouteConfig(routeName string, virtualHosts []VirtualHost) *route.RouteConfiguration {
	rc := &route.RouteConfiguration{
		Name: routeName,
	}

	for _, vh := range virtualHosts {
		virtualHost := &route.VirtualHost{
			Name:    vh.Name,
			Domains: vh.Domains,
		}

		// Add routes to virtual host
		for _, routeEntry := range vh.Routes {
			r := &route.Route{
				Match: &route.RouteMatch{
					PathSpecifier: &route.RouteMatch_Prefix{
						Prefix: routeEntry.Match.Prefix,
					},
				},
			}

			for _, header := range routeEntry.Match.Headers {
				r.Match.Headers = append(r.Match.Headers, &route.HeaderMatcher{
					Name: header.Name,
					HeaderMatchSpecifier: &route.HeaderMatcher_ExactMatch{
						ExactMatch: header.ExactMatch,
					},
				})
			}

			if routeEntry.DirectResponse != nil {
				r.Action = &route.Route_DirectResponse{
					DirectResponse: &route.DirectResponseAction{
						Status: uint32(routeEntry.DirectResponse.Status),
						Body: &core.DataSource{
							Specifier: &core.DataSource_InlineString{
								InlineString: routeEntry.DirectResponse.Body,
							},
						},
					},
				}
			} else if routeEntry.RouteAction != nil {
				r.Action = &route.Route_Route{
					Route: &route.RouteAction{
						ClusterSpecifier: &route.RouteAction_Cluster{
							Cluster: routeEntry.RouteAction.Cluster,
						},
						PrefixRewrite: routeEntry.RouteAction.PrefixRewrite,
						Timeout:       &durationpb.Duration{Seconds: 15},
					},
				}
			}

			virtualHost.Routes = append(virtualHost.Routes, r)
		}

		rc.VirtualHosts = append(rc.VirtualHosts, virtualHost)
	}

	return rc
}

func generateSnapshot() error {
	version++
	versionStr := fmt.Sprintf("v%d", version)

	var clusterResources []types.Resource
	var routeResources []types.Resource
	var listenerResources []types.Resource

	for _, c := range clusters {
		clusterResources = append(clusterResources, c)
	}

	for _, r := range routes {
		routeResources = append(routeResources, r)
	}

	for _, l := range listeners {
		listenerResources = append(listenerResources, l)
	}

	snapshot, err := cache.NewSnapshot(versionStr,
		map[resource.Type][]types.Resource{
			resource.ClusterType:  clusterResources,
			resource.RouteType:    routeResources,
			resource.ListenerType: listenerResources,
		},
	)
	if err != nil {
		return err
	}

	if err := snapshotCache.SetSnapshot(context.Background(), "envoy-node-id", snapshot); err != nil {
		return err
	}

	log.Printf("Snapshot updated to version %s with %d clusters, %d routes, %d listeners",
		versionStr, len(clusterResources), len(routeResources), len(listenerResources))
	return nil
}

func handleAddRoute(w http.ResponseWriter, r *http.Request) {
	configMutex.Lock()
	defer configMutex.Unlock()

	var data struct {
		Routes  []struct {
			Prefix          string           `json:"prefix"`
            Cluster         string           `json:"cluster,omitempty"`
            Headers         []Header         `json:"headers,omitempty"`       
            HeadersToAdd    []Header         `json:"headers_to_add,omitempty"` 
            Port            *int             `json:"port,omitempty"`
			WeightedClusters []WeightedCluster `json:"weighted_clusters,omitempty"`

			Address         string `json:"address,omitempty"`
			PrefixRewrite   string `json:"prefix_rewrite,omitempty"`
			ClusterType     string `json:"cluster_type,omitempty"`
			TLS             bool   `json:"tls,omitempty"`
			DNSLookupFamily string `json:"dns_lookup_family,omitempty"`
		} `json:"routes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Error parsing request: "+err.Error(), http.StatusBadRequest)
		return
	}

	for _, rt := range data.Routes {
		if rt.Cluster != "" {
			host := rt.Address
			if host == "" {
				host = rt.Cluster
			}
			port := uint32(80)
			if rt.Port != nil {
				port = uint32(*rt.Port)
			}

			clusters[rt.Cluster] = makeCluster(
				rt.Cluster,
				host,
				port,
				rt.ClusterType,
				rt.DNSLookupFamily,
				rt.TLS,
			)
		}
	}

	routes["local_routes"] = &route.RouteConfiguration{
        Name: "backend",
        VirtualHosts: []*route.VirtualHost{
            {
                Name:    "backend",
                Domains: []string{"*"},
                Cors: &route.CorsPolicy{
                    AllowOriginStringMatch: []*matcher.StringMatcher{
                        {
                            MatchPattern: &matcher.StringMatcher_Exact{
                                Exact: "*",
                            },
                        },
                    },
                    AllowMethods:  "GET, POST, OPTIONS",
                    AllowHeaders:  "X-Stack-Version, Content-Type",
                    ExposeHeaders: "X-Stack-Version",
                },
                Routes: []*route.Route{},
            },
        },
    }

	for _, rt := range data.Routes {
        if rt.Headers == nil {
            rt.Headers = []Header{}
        }
        if rt.HeadersToAdd == nil {
            rt.HeadersToAdd = []Header{}
        }
        
        if rt.WeightedClusters != nil && len(rt.WeightedClusters) > 0 {
            routes["local_routes"].VirtualHosts[0].Routes = append(
                routes["local_routes"].VirtualHosts[0].Routes,
                makeWeightedClustersRoute(
                    rt.Prefix,
                    rt.Headers,
                    rt.WeightedClusters,
                ),
            )
        } else if rt.Cluster != "" {
            routes["local_routes"].VirtualHosts[0].Routes = append(
                routes["local_routes"].VirtualHosts[0].Routes,
                makeRoute(
                    rt.Prefix,
                    rt.Cluster,
                    rt.Headers,
                    rt.HeadersToAdd,
					rt.PrefixRewrite,
					rt.Address,
                ),
            )
        } else {
            log.Printf("Warning: Route with prefix %s has neither cluster nor weighted_clusters specified", rt.Prefix)
        }
    }

	routes["local_routes"].VirtualHosts[0].Routes = append(
        routes["local_routes"].VirtualHosts[0].Routes,
        &route.Route{
            Match: &route.RouteMatch{
                PathSpecifier: &route.RouteMatch_Prefix{
                    Prefix: "/",
                },
            },
            Action: &route.Route_DirectResponse{
                DirectResponse: &route.DirectResponseAction{
                    Status: 404,
                    Body: &core.DataSource{
                        Specifier: &core.DataSource_InlineString{
                            InlineString: "Invalid API Route",
                        },
                    },
                },
            },
        },
    )

	listeners["local_listener"] = makeListener("local_listener", "0.0.0.0", 8080, "local_routes")

	if err := generateSnapshot(); err != nil {
		http.Error(w, "Error generating snapshot: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleListResources(w http.ResponseWriter, r *http.Request) {
	configMutex.Lock()
	defer configMutex.Unlock()

	clusterNames := make([]string, 0, len(clusters))
	routeNames := make([]string, 0, len(routes))
	listenerNames := make([]string, 0, len(listeners))

	for name := range clusters {
		clusterNames = append(clusterNames, name)
	}

	for name := range routes {
		routeNames = append(routeNames, name)
	}

	for name := range listeners {
		listenerNames = append(listenerNames, name)
	}

	response := map[string]interface{}{
		"clusters":  clusterNames,
		"routes":    routeNames,
		"listeners": listenerNames,
		"version":   version,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func runRESTServer() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/routes", handleAddRoute)
	mux.HandleFunc("/api/v1/resources", handleListResources)

	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "running",
			"gRPC":   "enabled",
			"REST":   "enabled",
		})
	})

	log.Println("Starting REST server on :9000")
	if err := http.ListenAndServe(":9000", mux); err != nil {
		log.Fatalf("Failed to start REST server: %v", err)
	}
}

func main() {
	log.Println("Starting Envoy xDS control plane")
	
	ctx := context.Background()
	srv := xds.NewServer(ctx, snapshotCache, nil)

	grpcServer := grpc.NewServer()
	
	discovery.RegisterAggregatedDiscoveryServiceServer(grpcServer, srv)

	lis, err := net.Listen("tcp", ":18000")
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}
	go func() {
		log.Println("Starting gRPC server on :18000")
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("Failed to start gRPC server: %v", err)
		}
	}()

	runRESTServer()
}