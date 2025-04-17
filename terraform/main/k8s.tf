resource "kubernetes_service_account" "ecr_access_sa" {
  metadata {
    name      = "ecr-access-sa"
    namespace = "default"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.iam_assumable_role_with_oidc.iam_role_arn
    }
  }
  depends_on = [aws_eks_cluster.main]
}

# get your account ID for the ARN
data "aws_caller_identity" "current" {}

resource "kubectl_manifest" "aws_auth_patch" {
  manifest = {
    apiVersion = "v1"
    kind       = "ConfigMap"
    metadata = {
      name      = "aws-auth"
      namespace = "kube-system"
    }
    data = {
      # merge in all of your existing entries plus your user
      mapRoles = <<YAML
- rolearn: ${aws_iam_role.node.arn}
  username: system:node:{{EC2PrivateDNSName}}
  groups:
    - system:bootstrappers
    - system:nodes
# add any other mapped roles here…
YAML

      mapUsers = <<YAML
- userarn: arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/admin
  username: admin
  groups:
    - system:masters
# add any additional users here…
YAML
    }
  }

  depends_on = [
    aws_eks_cluster.main
  ]
}