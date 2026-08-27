/**
 * @fileoverview Root Terraform stack for Pixizen AWS infrastructure (STUB).
 *
 * Phase-1 goals: S3 assets bucket, ECS cluster + task IAM, placeholder notes for VPC
 * and ElastiCache Redis. Resources are intentionally minimal but `terraform validate`-friendly.
 */

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # STUB: phase-1 — configure remote state (S3 + DynamoDB locking) before shared envs
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "pixizen"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# VPC (stub comments)
# -----------------------------------------------------------------------------
# STUB: phase-1 — replace with a real VPC module (public/private subnets, NAT, endpoints)
# Suggested layout:
#   - 2+ AZs
#   - private subnets for ECS tasks + ElastiCache
#   - public subnets for ALB / NAT
#   - VPC endpoints for S3 / ECR to cut NAT cost
#
# module "vpc" {
#   source = "./modules/vpc"
#   name   = "${var.project_name}-${var.environment}"
#   cidr   = var.vpc_cidr
# }

# -----------------------------------------------------------------------------
# S3 — assets / exports bucket
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "assets" {
  bucket = var.assets_bucket_name
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# -----------------------------------------------------------------------------
# ECS cluster
# -----------------------------------------------------------------------------
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# -----------------------------------------------------------------------------
# IAM — ECS task execution + task roles
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = "${var.project_name}-${var.environment}-ecs-exec"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name               = "${var.project_name}-${var.environment}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

data "aws_iam_policy_document" "ecs_task_s3" {
  statement {
    sid = "AssetsBucketAccess"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.assets.arn,
      "${aws_s3_bucket.assets.arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "ecs_task_s3" {
  name   = "${var.project_name}-${var.environment}-ecs-task-s3"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_s3.json
}

# -----------------------------------------------------------------------------
# ElastiCache Redis — parameter notes (resource commented until VPC exists)
# -----------------------------------------------------------------------------
# STUB: phase-1 — create redis subnet group in private subnets; use transit encryption + AUTH
#
# Suggested parameters:
#   - engine: redis 7.x
#   - node_type: cache.t4g.small (dev) / cache.r6g.large (prod)
#   - num_cache_clusters: 2+ for Multi-AZ
#   - parameter_group: maxmemory-policy=noeviction (BullMQ needs durable lists)
#   - transit_encryption_enabled = true
#   - at_rest_encryption_enabled = true
#   - auth_token from Secrets Manager
#
# resource "aws_elasticache_replication_group" "redis" {
#   replication_group_id = "${var.project_name}-${var.environment}"
#   description          = "Pixizen BullMQ Redis"
#   engine               = "redis"
#   engine_version       = "7.1"
#   node_type            = var.redis_node_type
#   num_cache_clusters   = 2
#   parameter_group_name = "default.redis7"
#   port                 = 6379
#   subnet_group_name    = aws_elasticache_subnet_group.redis.name
#   security_group_ids   = [aws_security_group.redis.id]
#   at_rest_encryption_enabled = true
#   transit_encryption_enabled = true
# }
