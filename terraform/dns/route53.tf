data "aws_route53_zone" "hn_cortex_click" {
  name         = "hn-cortex.click"
  private_zone = false
}

data "aws_lb" "ingress_alb" {
  tags = {
    "elbv2.k8s.aws/cluster"    = "cluster"
    "ingress.k8s.aws/resource" = "LoadBalancer"
    "ingress.k8s.aws/stack"    = "eks-ingress-group"
  }
}

resource "aws_route53_record" "hn_cortex_click_alias" {
  zone_id = data.aws_route53_zone.hn_cortex_click.zone_id
  name    = "hn-cortex.click"
  type    = "A"

  alias {
    name                   = data.aws_lb.ingress_alb.dns_name
    zone_id                = data.aws_lb.ingress_alb.zone_id
    evaluate_target_health = true
  }
}