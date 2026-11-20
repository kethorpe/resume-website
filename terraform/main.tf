terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

# Credentials come from your normal AWS config (aws configure, AWS_PROFILE,
# or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY environment variables).
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

data "aws_caller_identity" "current" {}

# Stops an apply if terraform.tfvars names an account and the credentials
# resolve to a different one (for example a work profile).
resource "terraform_data" "account_guard" {
  lifecycle {
    precondition {
      condition     = var.expected_account == null || data.aws_caller_identity.current.account_id == var.expected_account
      error_message = "Refusing to apply: authenticated account is ${data.aws_caller_identity.current.account_id}, expected ${var.expected_account}."
    }
  }
}
