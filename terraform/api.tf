# ---- Lambda (runs the Express app) ----

data "archive_file" "api" {
  type        = "zip"
  source_file = "${path.module}/../backend/dist/lambda.js"
  output_path = "${path.module}/build/lambda.zip"
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api" {
  name               = "${var.project_name}-api"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "api_logs" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "api_db" {
  statement {
    sid       = "Recommendations"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Scan"]
    resources = [aws_dynamodb_table.testimonials.arn]
  }

  statement {
    sid       = "ContactMessages"
    actions   = ["dynamodb:PutItem", "dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.messages.arn]
  }

  statement {
    sid       = "ContactThrottling"
    actions   = ["dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.rate_limits.arn]
  }
}

resource "aws_iam_role_policy" "api_db" {
  name   = "dynamodb-access"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api_db.json
}

data "aws_iam_policy_document" "api_ses" {
  count = local.contact_enabled ? 1 : 0

  statement {
    actions   = ["ses:SendEmail"]
    resources = concat(aws_ses_email_identity.owner[*].arn, aws_ses_domain_identity.site[*].arn)
  }
}

resource "aws_iam_role_policy" "api_ses" {
  count  = local.contact_enabled ? 1 : 0
  name   = "ses-send"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api_ses[0].json
}

resource "aws_lambda_function" "api" {
  function_name    = "${var.project_name}-api"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs20.x"
  handler          = "lambda.handler"
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME           = aws_dynamodb_table.testimonials.name
      COGNITO_USER_POOL_ID = aws_cognito_user_pool.main.id
      COGNITO_CLIENT_ID    = aws_cognito_user_pool_client.web.id

      MESSAGES_TABLE               = aws_dynamodb_table.messages.name
      RATE_LIMIT_TABLE             = aws_dynamodb_table.rate_limits.name
      CONTACT_TO_EMAIL             = var.contact_to_email != null ? var.contact_to_email : ""
      CONTACT_FROM_EMAIL           = local.contact_from
      CONTACT_IP_LIMIT_PER_HOUR    = tostring(var.contact_ip_limit_per_hour)
      CONTACT_GLOBAL_LIMIT_PER_DAY = tostring(var.contact_global_limit_per_day)
    }
  }
}

# ---- API Gateway (HTTP API in front of the Lambda) ----

resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "api" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "ANY /api/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

# A more specific route than the catch-all above, so the contact form can have its own,
# much lower, limit. This is the outermost layer; per-IP and daily limits run in the app.
resource "aws_apigatewayv2_route" "contact" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /api/contact"
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  # Cheap protection against runaway traffic.
  default_route_settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }

  route_settings {
    route_key              = "POST /api/contact"
    throttling_burst_limit = 5
    throttling_rate_limit  = 2
  }

  depends_on = [aws_apigatewayv2_route.contact]
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
