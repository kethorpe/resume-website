import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export interface ContactEmail {
  name: string;
  email: string;
  message: string;
  receivedAt: string;
}

export type EmailResult = "sent" | "skipped";

let ses: SESv2Client | undefined;

/** Header values can't contain line breaks; strip them so a name can't inject headers. */
const oneLine = (s: string, max: number) => s.replace(/[\r\n]+/g, " ").slice(0, max);

export async function sendContactEmail(msg: ContactEmail): Promise<EmailResult> {
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!to || !from) {
    console.warn("[contact] Email not configured (CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL). Message was stored only.");
    return "skipped";
  }

  ses ??= new SESv2Client({});
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: `Resume site <${from}>`,
      Destination: { ToAddresses: [to] },
      // Hitting "reply" in your inbox answers the visitor, not your own address.
      ReplyToAddresses: [msg.email],
      Content: {
        Simple: {
          Subject: { Data: `New message from ${oneLine(msg.name, 80)}`, Charset: "UTF-8" },
          Body: {
            // Plain text only, so nothing a visitor types can render as HTML.
            Text: {
              Data: `From: ${oneLine(msg.name, 100)} <${msg.email}>\nReceived: ${msg.receivedAt}\n\n${msg.message}\n`,
              Charset: "UTF-8",
            },
          },
        },
      },
    }),
  );
  return "sent";
}
