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

# patch the aws-auth ConfigMap so your IAM user is a Kubernetes admin
resource "kubernetes_config_map" "aws_auth" {
  metadata {
    name      = "aws-auth"
    namespace = "kube-system"
  }

  data = {
    # this must include your node‑group role so you don't lose node access.
    # aws_iam_role.node is the IAM role you attached to your aws_eks_node_group.
    mapRoles = <<YAML
- rolearn: ${aws_iam_role.node.arn}
  username: system:node:{{EC2PrivateDNSName}}
  groups:
    - system:bootstrappers
    - system:nodes
YAML

    # add your IAM user here so you become a `system:masters` in the cluster
    mapUsers = <<YAML
- userarn: arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/admin
  username:   admin
  groups:
    - system:masters
YAML
  }

  # make sure the cluster exists before we apply this
  depends_on = [
    aws_eks_cluster.main
  ]
}