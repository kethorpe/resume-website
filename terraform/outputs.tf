output "site_url" {
  value = var.domain_name != null ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "site_bucket" {
  value = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "table_name" {
  value = aws_dynamodb_table.testimonials.name
}

output "messages_table" {
  description = "DynamoDB table holding contact-form messages."
  value       = aws_dynamodb_table.messages.name
}

output "contact_email_verification" {
  description = "Reminder: SES emails a verification link to this address after the first apply."
  value       = var.contact_to_email == null ? "contact_to_email is not set; messages are stored but not emailed" : "Check ${var.contact_to_email} for an AWS verification email and click the link"
}
