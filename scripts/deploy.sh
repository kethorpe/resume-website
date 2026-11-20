#!/usr/bin/env bash
# Builds everything and deploys it. Run from anywhere: ./scripts/deploy.sh
# Requires: node 20+, terraform, aws CLI, and AWS credentials already configured.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
tf_out() { terraform -chdir="$ROOT/terraform" output -raw "$1"; }

# Both Terraform and the AWS CLI must use the profile in terraform.tfvars.
# That file is gitignored. Without it, this script refuses to run, so a
# default work profile cannot be picked up by accident.
TFVARS="$ROOT/terraform/terraform.tfvars"
if [[ ! -f "$TFVARS" ]]; then
  echo "Refusing to deploy: create terraform/terraform.tfvars with aws_profile set to your personal profile." >&2
  exit 1
fi
PROFILE="$(awk -F'"' '/^[[:space:]]*aws_profile[[:space:]]*=/{print $2; exit}' "$TFVARS")"
EXPECTED="$(awk -F'"' '/^[[:space:]]*expected_account[[:space:]]*=/{print $2; exit}' "$TFVARS")"
if [[ -z "$PROFILE" ]]; then
  echo "Refusing to deploy: set aws_profile in terraform/terraform.tfvars." >&2
  exit 1
fi
export AWS_PROFILE="$PROFILE"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
ARN="$(aws sts get-caller-identity --query Arn --output text)"
echo "==> AWS profile: $AWS_PROFILE"
echo "==> Account:     $ACCOUNT"
echo "==> Identity:    $ARN"
if [[ -n "$EXPECTED" && "$ACCOUNT" != "$EXPECTED" ]]; then
  echo "Refusing to deploy: account $ACCOUNT does not match expected_account $EXPECTED." >&2
  exit 1
fi

echo "==> Building backend"
(cd "$ROOT/backend" && npm install && npm run build)

echo "==> Applying Terraform"
terraform -chdir="$ROOT/terraform" init -input=false
terraform -chdir="$ROOT/terraform" apply -input=false -auto-approve

echo "==> Building frontend"
(
  cd "$ROOT/frontend"
  npm install
  VITE_COGNITO_USER_POOL_ID="$(tf_out user_pool_id)" \
  VITE_COGNITO_CLIENT_ID="$(tf_out user_pool_client_id)" \
  npm run build
)

echo "==> Uploading site"
aws s3 sync "$ROOT/frontend/dist" "s3://$(tf_out site_bucket)" --delete
aws cloudfront create-invalidation --distribution-id "$(tf_out distribution_id)" --paths "/*" > /dev/null

echo
echo "Live at $(tf_out site_url)"
