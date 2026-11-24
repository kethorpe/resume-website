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
- **Recommendations need approval.** The "Recommendations" section is backed by DynamoDB.
  - Anyone can read approved recommendations. Visitors never see pending ones.
  - Signed-in users can post. A new recommendation is `pending` and visible only to its author (with a "Pending approval" badge) until an admin approves it. Admin posts publish immediately.
  - Admins (Cognito `admin` group) see a "Waiting for your approval" queue with Approve and Delete, and can Unpublish anything. Authors can delete their own.
  - Each user can have at most 3 pending recommendations at a time.
  - Entries created before approvals existed have no status and are treated as approved.
- **Contact form.** `POST /api/contact` is public. The message is saved to DynamoDB first, then emailed to you through SES with Reply-To set to the visitor, so replying goes to them. Spam protection is throttling, in layers:
  1. API Gateway limits that route to about 2 requests/second.
  2. Each visitor IP gets 3 messages per hour (DynamoDB counters that expire on their own).
  3. All visitors together get 50 messages per day, which also bounds SES usage.
  4. A hidden "website" field catches bots that fill in every input.

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

contact_to_email             = "you@example.com"  # where contact messages are emailed
# contact_ip_limit_per_hour    = 3
# contact_global_limit_per_day = 50
```

### Make yourself an admin
After signing up on the site: AWS Console → Cognito → your user pool → Groups → `admin` → Add user.

## Contact form setup

1. Set `contact_to_email` in `terraform/terraform.tfvars`.
2. Run `./scripts/deploy.sh` **from your machine**. The GitHub Action only ships code, so it can't create the new tables, SES identity, IAM permissions or Lambda settings. Deploy once locally, then push.
3. AWS emails a verification link to `contact_to_email`. Click it. SES stays in the sandbox, which is fine because the form only ever sends to you.
4. If `domain_name` is set, the domain is also verified with DKIM and mail is sent from `contact@your-domain`. DNS can take a few minutes to verify. Without a domain, mail is sent from your own address, which may land in spam the first time. Check there.
5. Send yourself a test message.

Messages are in the DynamoDB console: table `<project_name>-messages` → Explore items. `emailStatus` is `sent`, `failed` or `skipped`. A message is stored even if the email fails, so nothing is lost.

**Check the per-IP limit after deploying.** Send 4 messages from one browser: the 4th should be refused. Then send one from another network (a phone on cellular). It should go through. If it is also refused, visitor IPs are collapsing into one shared address; see `backend/src/clientIp.ts`.

Limits to know about: counters use fixed windows, so a determined sender could get up to double the limit across a window boundary. Anyone who finds the raw API Gateway URL can bypass CloudFront and spoof their IP, though the route limit and daily cap still apply. For stronger protection, add a CAPTCHA (for example Cloudflare Turnstile) or AWS WAF rate rules.

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
