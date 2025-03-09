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
}

resource "aws_eks_cluster" "main" {
  name     = "cluster"
  role_arn = aws_iam_role.cluster_role.arn

  vpc_config {
    subnet_ids = module.vpc.private_subnets
  }

  depends_on = [aws_iam_role.cluster_role]
}

resource "aws_iam_openid_connect_provider" "eks_oidc_provider" {
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["<thumbprint>"]

  depends_on = [aws_eks_cluster.main]
}

resource "aws_iam_role" "cluster_role" {
  name = "eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
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

resource "aws_launch_template" "eks_nodes" {
  name_prefix   = "eks-nodes"
  image_id      = data.aws_ami.eks_ami.id
  instance_type = "t3.micro"

  metadata_options {
    http_tokens   = "optional"   # ✅ Ensure Instance Metadata is accessible
    http_endpoint = "enabled"
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "eks-node"
    }
  }
}

data "aws_ami" "eks_ami" {
  most_recent = true
  owners      = ["602401143452"]  # AWS EKS AMI owner ID

  filter {
    name   = "name"
    values = ["amazon-eks-node-*"]
  }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "main-node-group"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = module.vpc.private_subnets

  scaling_config {
    desired_size = 4
    max_size     = 5
    min_size     = 1
  }

  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = "$Latest"
  }

  depends_on = [aws_eks_cluster.main]
}

resource "aws_iam_role" "node" {
  name = "eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "node_policy" {
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

# ✅ Fix provider dependencies
provider "aws" {
  region = "ap-southeast-2"
}

provider "kubernetes" {
  host                   = aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", aws_eks_cluster.main.name]
  }

  depends_on = [aws_eks_cluster.main]
}

provider "helm" {
  kubernetes {
    host                   = aws_eks_cluster.main.endpoint
    token                  = data.aws_eks_cluster_auth.main.token
    cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", aws_eks_cluster.main.name]
    }
  }

  depends_on = [aws_eks_cluster.main]
}
