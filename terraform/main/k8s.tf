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

resource "kubernetes_config_map" "aws_auth" {
  metadata {
    name      = "aws-auth"
    namespace = "kube-system"
  }

  data = {
    mapRoles = yamlencode([
      {
        rolearn  = aws_iam_role.node.arn
        username = "system:node:{{EC2PrivateDNSName}}"
        groups   = ["system:bootstrappers", "system:nodes"]
      }
    ])
    
    mapUsers = yamlencode([
      {
        userarn  = "arn:aws:iam::495599745704:user/admin"
        username = "admin"
        groups   = ["system:masters"]
      },
      {
        userarn  = "arn:aws:iam::495599745704:root"
        username = "admin"
        groups   = ["system:masters"]
      }
    ])
  }

  depends_on = [aws_eks_cluster.main]
}