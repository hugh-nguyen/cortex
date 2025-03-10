resource "aws_lb" "eks_lb" {
  name               = "eks-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb_sg.id]
  subnets            = module.vpc.public_subnets
  enable_deletion_protection = false

  tags = {
    Name                              = "eks-lb"
    "kubernetes.io/ingress.class"     = "alb"
    "kubernetes.io/cluster/cluster"   = "owned"
  }
}

resource "aws_lb_target_group" "eks_tg" {
  name     = "eks-tg"
  port     = 30080
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id
  target_type = "instance"

  health_check {
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }

  tags = {
    "kubernetes.io/cluster/cluster" = "owned"
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

data "aws_lb" "eks_lb" {
  name = "eks-lb"  # Make sure this is the exact ALB name
}

# Fetch the existing Target Group
data "aws_lb_target_group" "eks_tg" {
  name = "eks-tg"  # Make sure this matches your existing target group
}

data "aws_instances" "eks_nodes" {
  filter {
    name   = "tag:eks:nodegroup-name"
    values = [aws_eks_node_group.main.node_group_name]
  }
}

resource "aws_lb_target_group_attachment" "eks_nodes" {
  count = length(data.aws_instances.eks_nodes.private_ips)

  target_group_arn = data.aws_lb_target_group.eks_tg.arn
  target_id        = data.aws_instances.eks_nodes.private_ips[count.index]
  port             = 80
}
