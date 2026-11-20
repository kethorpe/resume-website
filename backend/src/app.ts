import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "./auth";
import { store } from "./db";

export const app = express();
app.use(express.json({ limit: "10kb" }));

const createSchema = z.object({
  message: z.string().trim().min(5, "Write at least 5 characters").max(500, "Keep it under 500 characters"),
  role: z.string().trim().max(80, "Keep the role under 80 characters").optional(),
});

// Public: anyone can read.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/testimonials", async (_req, res) => {
  res.json({ items: await store.list() });
});

// Protected: must be signed in to write.
app.post("/api/testimonials", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { user } = req as AuthedRequest;
  const item = await store.create({
    message: parsed.data.message,
    role: parsed.data.role || undefined,
    authorId: user.id,
    authorName: user.name,
  });
  res.status(201).json(item);
});

// Authors can delete their own entries; members of the Cognito "admin" group can delete any.
app.delete("/api/testimonials/:id", requireAuth, async (req, res) => {
  const { user } = req as AuthedRequest;
  const existing = await store.get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "That recommendation no longer exists" });
    return;
  }
  if (existing.authorId !== user.id && !user.isAdmin) {
    res.status(403).json({ error: "You can only delete your own recommendations" });
    return;
  }
  await store.remove(existing.id);
  res.status(204).end();
});

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? "Something went wrong on our end" : "Invalid request" });
});
