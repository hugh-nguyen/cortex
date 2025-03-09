resource "kubernetes_service" "service_a" {
  metadata {
    name = "service-a"
    annotations = {
      "service.beta.kubernetes.io/aws-load-balancer-type"       = "nlb"
      "service.beta.kubernetes.io/aws-load-balancer-target-type" = "ip"
    }
  }

  spec {
    selector = {
      app = "service-a"
    }

    port {
      port        = 80
      target_port = 5000
      protocol    = "TCP"
    }

    type = "LoadBalancer"
  }
}
