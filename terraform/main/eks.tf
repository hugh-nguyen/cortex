###############################################################################
# VPC Module
###############################################################################
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"

  name            = "eks-vpc"
  cidr            = "10.0.0.0/16"
  azs             = ["ap-southeast-2a", "ap-southeast-2b"]
  private_subnets = ["10.0.101.0/24", "10.0.102.0/24"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]

  # Disable NAT Gateway (we're routing to AWS services via VPC endpoints)
  enable_nat_gateway   = false

  enable_dns_hostnames = true

  public_subnet_tags = {
    "kubernetes.io/role/elb"       = "1"
    "kubernetes.io/cluster/cluster" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/cluster"   = "shared"
  }
}

###############################################################################
# Security Group for Interface Endpoints
###############################################################################
resource "aws_security_group" "vpc_endpoints" {
  name        = "vpc-endpoints-sg"
  description = "Allow HTTPS from VPC to interface endpoints"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "Allow HTTPS from within the VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    description = "All traffic out"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "vpc-endpoints-sg"
  }
}

###############################################################################
# Interface Endpoints for ECR (API + DKR) and STS
###############################################################################
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id             = module.vpc.vpc_id
  service_name       = "com.amazonaws.ap-southeast-2.ecr.api"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "ecr-api-endpoint"
  }
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id             = module.vpc.vpc_id
  service_name       = "com.amazonaws.ap-southeast-2.ecr.dkr"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "ecr-dkr-endpoint"
  }
}

resource "aws_vpc_endpoint" "sts" {
  vpc_id             = module.vpc.vpc_id
  service_name       = "com.amazonaws.ap-southeast-2.sts"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "sts-endpoint"
  }
}

###############################################################################
# Gateway Endpoint for S3
###############################################################################
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.ap-southeast-2.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = module.vpc.private_route_table_ids

  tags = {
    Name = "s3-gateway-endpoint"
  }
}

###############################################################################
# EKS Cluster (Upgraded to 1.32 with Private Endpoint Enabled)
###############################################################################
resource "aws_eks_cluster" "main" {
  name    = "cluster"
  version = "1.32"

  role_arn = aws_iam_role.cluster_role.arn

  vpc_config {
    subnet_ids              = module.vpc.private_subnets
    # Enable private endpoint so nodes in private subnets can connect
    endpoint_public_access  = false
    endpoint_private_access = true
  }
}

###############################################################################
# EKS Node Group
###############################################################################
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "main-node-group"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = module.vpc.private_subnets

  scaling_config {
    desired_size = 4
    max_size     = 6
    min_size     = 1
  }

  instance_types = ["t3.micro"]

  depends_on = [aws_iam_role_policy_attachment.node_policy]
}

###############################################################################
# Node IAM Role & Policies
###############################################################################
resource "aws_iam_role" "node" {
  name = "eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
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

###############################################################################
# EKS Cluster Role & Policies
###############################################################################
resource "aws_iam_role" "cluster_role" {
  name = "eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
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

###############################################################################
# Additional LB Controller Permissions
###############################################################################
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
