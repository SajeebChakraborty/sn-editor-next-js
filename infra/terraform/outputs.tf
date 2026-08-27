/**
 * @fileoverview Outputs for the Pixizen AWS Terraform stack.
 */

output "assets_bucket_name" {
  description = "S3 bucket for user assets, documents, and exports"
  value       = aws_s3_bucket.assets.bucket
}

output "assets_bucket_arn" {
  description = "ARN of the assets S3 bucket"
  value       = aws_s3_bucket.assets.arn
}

output "ecs_cluster_name" {
  description = "ECS cluster name for worker services"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_task_execution_role_arn" {
  description = "IAM role ARN for ECS task execution (ECR pull, logs)"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "IAM role ARN assumed by worker tasks (S3 access)"
  value       = aws_iam_role.ecs_task.arn
}
