data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

resource "aws_eks_access_entry" "admin_user" {
  cluster_name      = aws_eks_cluster.main.name
  principal_arn     = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:user/admin"
  type              = "STANDARD"       # other option is "SYSTEM" for bootstrap entries
  user_name         = "admin"
  kubernetes_groups = ["system:masters"]
  depends_on        = [ aws_eks_cluster.main ]
}

resource "aws_eks_access_policy_association" "admin_user_policy" {
  cluster_name   = aws_eks_cluster.main.name
  principal_arn  = aws_eks_access_entry.admin_user.principal_arn
  policy_arn     = "arn:${data.aws_partition.current.partition}:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  depends_on     = [ aws_eks_access_entry.admin_user ]
}
