variable "aws_region" {
  description = "Region for the API, database and user pool. (CloudFront is global.)"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Optional named AWS profile. Leave null to use the default credential chain."
  type        = string
  default     = null
}

variable "expected_account" {
  description = "If set, deploy refuses to run unless the caller is this AWS account."
  type        = string
  default     = null
}

variable "project_name" {
  description = "Prefix for resource names."
  type        = string
  default     = "resume-site"
}

variable "allow_self_signup" {
  description = "If false, only you can create users (via the AWS console or CLI)."
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Optional custom domain already registered in this account, for example tedthorpe.com. Leave null to use the CloudFront hostname."
  type        = string
  default     = null
}
