# Resume website

React + TypeScript frontend, Node.js (Express) API, deployed to AWS with Terraform.

```
frontend/    Vite + React + TS. Your resume content is in src/resumeData.ts
backend/     Express + TS. Runs locally with tsx, deploys as one Lambda (esbuild bundle)
terraform/   S3 + CloudFront, API Gateway + Lambda, Cognito, DynamoDB
scripts/     deploy.sh builds and ships everything
```

## How it works

- **One URL.** CloudFront serves the React build from a private S3 bucket and forwards `/api/*` to API Gateway → Lambda. Same origin means no CORS config.
- **Login.** Amazon Cognito (email + password, email verification). The browser signs in with SRP and gets a JWT.
- **Database behind login.** The "Recommendations" section is backed by DynamoDB.
  - `GET /api/testimonials` is public.
  - `POST` and `DELETE` require a valid Cognito ID token, which the API verifies on every request.
  - Authors can delete their own entries. Users in the Cognito `admin` group can delete any entry.

## Prerequisites

Node 20+, Terraform 1.5+, AWS CLI, and AWS credentials configured (`aws configure`, `AWS_PROFILE`, or env vars). To use a named profile, set `aws_profile` in `terraform/terraform.tfvars`.

## Deploy

```bash
./scripts/deploy.sh
```

It builds the backend, runs `terraform apply` (you confirm), builds the frontend with the Cognito IDs from Terraform's outputs, uploads to S3, and invalidates CloudFront. The site URL prints at the end. Re-run it any time you change code or content.

Optional `terraform/terraform.tfvars`:

```hcl
aws_region        = "us-east-1"
project_name      = "my-resume"
allow_self_signup = true   # false = only you can create accounts
```

### Make yourself an admin
After signing up on the site: AWS Console → Cognito → your user pool → Groups → `admin` → Add user.

## Local development

```bash
# 1. Deploy once so Cognito exists, then copy the IDs:
cd terraform && terraform output

# 2. Backend
cd backend && cp .env.example .env     # fill in COGNITO_* ; leave TABLE_NAME empty for an in-memory DB
npm install && npm run dev             # http://localhost:3001

# 3. Frontend (second terminal)
cd frontend && cp .env.example .env.local   # fill in VITE_COGNITO_*
npm install && npm run dev                  # http://localhost:5173 (proxies /api to :3001)
```

## Notes and next steps

- Cognito's built-in email sender is capped at about 50 emails/day. Fine for a resume site; use SES for more.
- State is local (`terraform.tfstate`). If you'll use this long-term, add an S3 backend block in `terraform/main.tf`.
- Custom domain: add an ACM certificate (must be in `us-east-1`), a Route 53 record, and `aliases` + `viewer_certificate` on the CloudFront distribution.
- `terraform destroy` removes everything. Empty the S3 bucket first if it complains.
