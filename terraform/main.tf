provider "aws" {
  region = "ap-southeast-2"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.14.2"

  name = "eks-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["ap-southeast-2a", "ap-southeast-2b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = false
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "18.0.0"

  cluster_name    = "cheap-eks-cluster"
  cluster_version = "1.23"
  vpc_id          = module.vpc.vpc_id
  subnets         = module.vpc.private_subnets

  node_groups = {
    cheap_nodes = {
      desired_capacity = 1
      max_capacity     = 1
      min_capacity     = 1

      instance_type = "t2.micro"
    }
  }

  tags = {
    Environment = "cheap"
  }
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_name" {
  value = module.eks.cluster_id
}
