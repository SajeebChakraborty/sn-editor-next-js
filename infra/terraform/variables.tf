/**
 * @fileoverview Input variables for the Pixizen AWS Terraform stack.
 */

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project prefix used in resource names"
  type        = string
  default     = "pixizen"
}

variable "assets_bucket_name" {
  description = "Globally unique S3 bucket name for assets and exports"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR for the future VPC module (STUB — unused until VPC is enabled)"
  type        = string
  default     = "10.40.0.0/16"
}

variable "redis_node_type" {
  description = "ElastiCache node type (documented for when Redis module is enabled)"
  type        = string
  default     = "cache.t4g.small"
}
