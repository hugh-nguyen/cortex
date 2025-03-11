terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.0" }
    helm = { source = "hashicorp/helm", version = "~> 2.0" }
  }
  backend "s3" {
    bucket         = "mapleharbour-dns-tf-state"
    key            = "terraform.tfstate"
    region         = "ap-southeast-2"
    encrypt        = true
    dynamodb_table = "dns-terraform-lock"
  }
}

provider "aws" {
  region = "ap-southeast-2"
}
