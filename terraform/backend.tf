terraform {
  backend "s3" {
    bucket         = "mapleharbour-tf-state"
    key            = "envoy-service-hub/terraform.tfstate"
    region         = "ap-southeast-2"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}
