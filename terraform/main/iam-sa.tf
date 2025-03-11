module "iam_assumable_role_with_oidc" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version = "~> 5.0"

  create_role                   = true
  role_name                     = "eks-ecr-access-role"
  provider_url                  = aws_eks_cluster.main.identity[0].oidc[0].issuer
  oidc_fully_qualified_subjects = ["system:serviceaccount:default:ecr-access-sa"]
}

resource "aws_iam_role_policy_attachment" "ecr_access" {
  role       = module.iam_assumable_role_with_oidc.iam_role_name
  policy_arn = aws_iam_policy.ecr_policy.arn
}

resource "aws_iam_policy" "ecr_policy" {
  name        = "AmazonEKS_ECR_Policy"
  description = "Policy for EKS pods to pull from ECR"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ecr:*"]
      Resource = "*"
    }]
  })
}
