resource "aws_lb" "eks_lb" {
  name               = "eks-lb"
  internal           = false
  load_balancer_type = "network"
  security_groups    = [aws_security_group.lb_sg.id]
  subnets           = module.vpc.public_subnets

  enable_deletion_protection = false
}

resource "aws_lb_target_group" "eks_tg" {
  name     = "eks-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.eks_lb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.eks_tg.arn
  }
}
