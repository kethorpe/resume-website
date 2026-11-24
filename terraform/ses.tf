# Contact-form email via SES.
#
# Your own address is verified as an email identity (AWS emails you a link to click
# once). That is all SES needs while the account is in the sandbox, because the form
# only ever sends to you. If domain_name is set, the domain is also verified with
# DKIM so mail is sent from contact@<domain>, which lands in inboxes more reliably
# than mail "from" a gmail.com address sent through SES.

locals {
  contact_enabled = var.contact_to_email != null
  contact_domain  = local.contact_enabled && var.domain_name != null
  contact_from    = !local.contact_enabled ? "" : (local.contact_domain ? "contact@${var.domain_name}" : var.contact_to_email)
}

resource "aws_ses_email_identity" "owner" {
  count = local.contact_enabled ? 1 : 0
  email = var.contact_to_email
}

resource "aws_ses_domain_identity" "site" {
  count  = local.contact_domain ? 1 : 0
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "site" {
  count  = local.contact_domain ? 1 : 0
  domain = aws_ses_domain_identity.site[0].domain
}

resource "aws_route53_record" "ses_verification" {
  count   = local.contact_domain ? 1 : 0
  zone_id = data.aws_route53_zone.site[0].zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.site[0].verification_token]
}

resource "aws_route53_record" "ses_dkim" {
  count   = local.contact_domain ? 3 : 0
  zone_id = data.aws_route53_zone.site[0].zone_id
  name    = "${aws_ses_domain_dkim.site[0].dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.site[0].dkim_tokens[count.index]}.dkim.amazonses.com"]
}
