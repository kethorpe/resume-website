import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { optionalAuth, requireAuth, type AuthedRequest, type AuthUser } from "./auth";
import { contactRouter } from "./contact";
import { statusOf, store, type Status, type Testimonial } from "./db";

export const app = express();
app.use(express.json({ limit: "10kb" }));

const MAX_PENDING_PER_USER = 3;

const createSchema = z.object({
  message: z.string().trim().min(5, "Write at least 5 characters").max(500, "Keep it under 500 characters"),
  role: z.string().trim().max(80, "Keep the role under 80 characters").optional(),
});

const statusSchema = z.object({ status: z.enum(["pending", "approved"]) });

/** What the browser gets: no author IDs, just a flag for "this one is yours". */
function toPublic(t: Testimonial, user?: AuthUser) {
  const { authorId, ...rest } = t;
  return { ...rest, status: statusOf(t), mine: Boolean(user && user.id === authorId) };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/contact", contactRouter);

// Public, but the answer depends on who is asking:
//   visitors  -> approved only
//   authors   -> approved + their own pending
//   admins    -> everything
app.get("/api/testimonials", optionalAuth, async (req, res) => {
  const user = (req as Partial<AuthedRequest>).user;
  const visible = (await store.list()).filter(
    (t) => statusOf(t) === "approved" || user?.isAdmin || (user && t.authorId === user.id),
  );
  res.set("Cache-Control", "no-store");
  res.json({ items: visible.map((t) => toPublic(t, user)) });
});

// Signed-in users can post. Their recommendation waits for approval, except the admin's own.
app.post("/api/testimonials", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { user } = req as AuthedRequest;

  if (!user.isAdmin) {
    const pending = (await store.list()).filter((t) => t.authorId === user.id && statusOf(t) === "pending").length;
    if (pending >= MAX_PENDING_PER_USER) {
      res.status(429).json({
        error: `You already have ${MAX_PENDING_PER_USER} recommendations waiting for approval. Delete one or wait for a review.`,
      });
      return;
    }
  }

  const status: Status = user.isAdmin ? "approved" : "pending";
  const item = await store.create({
    message: parsed.data.message,
    role: parsed.data.role || undefined,
    authorId: user.id,
    authorName: user.name,
    status,
  });
  res.status(201).json(toPublic(item, user));
});

// Admin only: approve a recommendation, or move it back to pending.
app.patch("/api/testimonials/:id", requireAuth, async (req, res) => {
  const { user } = req as AuthedRequest;
  if (!user.isAdmin) {
    res.status(403).json({ error: "Only the site owner can approve recommendations" });
    return;
  }
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Status must be “pending” or “approved”" });
    return;
  }
  const updated = await store.update(req.params.id, { status: parsed.data.status });
  if (!updated) {
    res.status(404).json({ error: "That recommendation no longer exists" });
    return;
  }
  res.json(toPublic(updated, user));
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
