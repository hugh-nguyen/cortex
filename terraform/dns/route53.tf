resource "aws_route53_zone" "domain_zone" {
  name = "hn-cortex.click"
}

data "aws_lb" "ingress_alb" {
  name = "k8s-eksingressgroup-e31e0db899-1610594416" 
}

resource "aws_route53_record" "domain_alias" {
  zone_id = aws_route53_zone.my_domain_zone.zone_id
  name    = "hn-cortex.click"
  type    = "A"
  alias {
    name                   = data.aws_lb.ingress_alb.dns_name
    zone_id                = data.aws_lb.ingress_alb.zone_id
    evaluate_target_health = true
  }
}