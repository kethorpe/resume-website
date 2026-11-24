import { createHash, randomUUID } from "node:crypto";
import { Router } from "express";
import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { clientIp } from "./clientIp";
import { getDoc, tableFromEnv } from "./dynamo";
import { sendContactEmail } from "./mailer";
import { getRateLimiter } from "./ratelimit";

export type EmailStatus = "sent" | "skipped" | "failed";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  emailStatus: EmailStatus | "pending";
}

interface MessageStore {
  create(input: Pick<ContactMessage, "name" | "email" | "message">): Promise<ContactMessage>;
  setEmailStatus(id: string, status: EmailStatus): Promise<void>;
}

function memoryMessages(): MessageStore {
  const items = new Map<string, ContactMessage>();
  return {
    async create(input) {
      const item: ContactMessage = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), emailStatus: "pending" };
      items.set(item.id, item);
      return item;
    },
    async setEmailStatus(id, status) {
      const m = items.get(id);
      if (m) m.emailStatus = status;
    },
  };
}

function dynamoMessages(table: string): MessageStore {
  const doc = getDoc();
  return {
    async create(input) {
      const item: ContactMessage = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), emailStatus: "pending" };
      await doc.send(new PutCommand({ TableName: table, Item: item }));
      return item;
    },
    async setEmailStatus(id, status) {
      await doc.send(
        new UpdateCommand({
          TableName: table,
          Key: { id },
          UpdateExpression: "SET emailStatus = :s",
          ExpressionAttributeValues: { ":s": status },
        }),
      );
    },
  };
}

let messages: MessageStore | undefined;
function getMessages(): MessageStore {
  if (!messages) {
    const table = tableFromEnv("MESSAGES_TABLE");
    messages = table ? dynamoMessages(table) : memoryMessages();
  }
  return messages;
}

const intFromEnv = (name: string, fallback: number) => {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100, "Keep your name under 100 characters"),
  email: z.string().trim().max(254, "That email address is too long").email("Enter a valid email address"),
  message: z.string().trim().min(10, "Write at least 10 characters").max(2000, "Keep your message under 2,000 characters"),
  // Honeypot: hidden from people, so only bots fill it in.
  website: z.string().max(500).optional(),
});

export const contactRouter = Router();

contactRouter.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Check your details and try again" });
    return;
  }
  const { name, email, message, website } = parsed.data;

  // Pretend it worked so bots don't learn they were caught. Nothing is stored or sent.
  if (website) {
    res.status(201).json({ ok: true });
    return;
  }

  const limiter = getRateLimiter();

  // Per visitor: a few messages per hour. The IP is hashed so counters don't hold raw addresses.
  const ipHash = createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 32);
  const perIp = await limiter.hit(`contact:ip:${ipHash}`, 3600);
  if (perIp.count > intFromEnv("CONTACT_IP_LIMIT_PER_HOUR", 3)) {
    res.set("Retry-After", String(perIp.retryAfter));
    res.status(429).json({ error: "You’ve sent several messages recently. Try again in an hour." });
    return;
  }

  // Across everyone: a daily ceiling that also protects the SES sending quota.
  const global = await limiter.hit("contact:global", 86400);
  if (global.count > intFromEnv("CONTACT_GLOBAL_LIMIT_PER_DAY", 50)) {
    res.set("Retry-After", String(global.retryAfter));
    res.status(429).json({ error: "The contact form has reached its daily limit. Try again tomorrow." });
    return;
  }

  // Save first so a message is never lost, even if email delivery fails.
  const store = getMessages();
  const saved = await store.create({ name, email, message });

  let status: EmailStatus;
  try {
    status = await sendContactEmail({ name, email, message, receivedAt: saved.createdAt });
  } catch (err) {
    console.error("[contact] SES send failed for message", saved.id, err);
    status = "failed";
  }
  try {
    await store.setEmailStatus(saved.id, status);
  } catch (err) {
    console.error("[contact] Could not record email status for", saved.id, err);
  }

  // The visitor's message is safely stored either way.
  res.status(201).json({ ok: true });
});
