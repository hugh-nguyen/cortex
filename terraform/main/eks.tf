module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"

  name                 = "eks-vpc"
  cidr                 = "10.0.0.0/16"
  azs                  = ["ap-southeast-2a", "ap-southeast-2b"]
  private_subnets      = ["10.0.101.0/24", "10.0.102.0/24"]
  public_subnets       = ["10.0.1.0/24", "10.0.2.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
    "kubernetes.io/cluster/cluster" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/cluster" = "shared"
  }
}

resource "aws_eks_cluster" "main" {
  name     = "cluster"
  role_arn = aws_iam_role.cluster_role.arn

  vpc_config {
    subnet_ids  = module.vpc.private_subnets
  }
}

resource "aws_launch_template" "eks_node_template" {
  name_prefix   = "eks-node-template-"
  instance_type = "t3.micro"  # Keep using t3.micro as requested

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -o xtrace
    /etc/eks/bootstrap.sh ${aws_eks_cluster.main.name} --kubelet-extra-args '--max-pods=35'
    EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "EKS-Worker-Node"
    }
  }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "main-node-group"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = module.vpc.private_subnets

  scaling_config {
    desired_size = 3
    max_size     = 4
    min_size     = 1
  }

  launch_template {
    id      = aws_launch_template.eks_node_template.id
    version = "$Latest"
  }

  depends_on = [aws_iam_role_policy_attachment.node_policy]
}

resource "aws_iam_role" "node" {
  name = "eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "nodes_ecr" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "node_worker_policy" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "node_cni_policy" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "node_ecr_policy" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "node_policy" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role" "cluster_role" {
  name = "eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.cluster_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role_policy_attachment" "eks_service_policy" {
  role       = aws_iam_role.cluster_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
}

resource "aws_iam_policy" "aws_lb_controller_additional" {
  name        = "AWSLoadBalancerControllerAdditionalPermissions"
  description = "Additional permissions for AWS Load Balancer Controller"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = [
          "ec2:*",
          "elasticloadbalancing:*"
        ],
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = [
          "elasticloadbalancing:*"
        ],
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = [
          "shield:*"
        ],
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = [
          "wafv2:*",
          "waf-regional:*"
        ],
        Resource = "*"
      }
    ]
  })
}


resource "aws_iam_role_policy_attachment" "aws_lb_controller_extra_permissions" {
  role       = aws_iam_role.aws_lb_controller_role.name
  policy_arn = aws_iam_policy.aws_lb_controller_additional.arn
}

