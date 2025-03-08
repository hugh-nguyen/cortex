resource "kubernetes_service_account" "ecr_access_sa" {
  metadata {
    name      = "ecr-access-sa"
    namespace = "default"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.iam_assumable_role_with_oidc.iam_role_arn
    }
  }
}