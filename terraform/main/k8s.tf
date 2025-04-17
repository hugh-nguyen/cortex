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

data "aws_caller_identity" "current" {}

resource "kubectl_manifest" "aws_auth_patch" {
  yaml_body = <<-YAML
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: ${aws_iam_role.node.arn}
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
    # …any other existing role mappings…
  mapUsers: |
    - userarn: arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/admin
      username: admin
      groups:
        - system:masters
    # …any other users you want to map…
YAML

  depends_on = [
    aws_eks_cluster.main
  ]
}