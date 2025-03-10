data "aws_eks_cluster" "eks" {
  name = "cluster"  # Replace with your EKS cluster name
}

data "aws_security_group" "eks_cluster_sg" {
  id = data.aws_eks_cluster.eks.vpc_config[0].cluster_security_group_id
}

# Security Group for the Load Balancer
resource "aws_security_group" "lb_sg" {
  name        = "eks-lb-sg"
  description = "Allow inbound traffic to the Load Balancer"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP traffic"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "eks-lb-sg"
  }
}

resource "aws_security_group_rule" "allow_alb_to_eks_nodes" {
  type                     = "ingress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  security_group_id        = data.aws_security_group.eks_cluster_sg.id
  source_security_group_id = aws_security_group.lb_sg.id
  description              = "Allow ALB to communicate with EKS worker nodes"
}
