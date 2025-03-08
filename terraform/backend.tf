terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.83.0"
    }
  }
  backend "s3" {
    bucket         = "mapleharbour-tf-state"
    key            = "envoy-service-hub/terraform.tfstate"
    region         = "ap-southeast-2"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}
