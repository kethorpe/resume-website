import { getIdToken } from "./auth";

export type Status = "pending" | "approved";

export interface Testimonial {
  id: string;
  message: string;
  role?: string;
  authorName: string;
  createdAt: string;
  status: Status;
  /** True when the signed-in user wrote this one. */
  mine: boolean;
}

// none     = never send a token
// optional = send one if the visitor is signed in (the answer may differ per person)
// required = must be signed in
type AuthMode = "none" | "optional" | "required";

async function request<T>(path: string, init: RequestInit = {}, auth: AuthMode = "none"): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (auth !== "none") {
    const token = await getIdToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    else if (auth === "required") throw new Error("Sign in to do this");
  }
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    // API Gateway's own throttle answers with { message: "Too Many Requests" }.
    if (res.status === 429 && !body.error) throw new Error("Too many requests right now. Try again in a minute.");
    throw new Error(body.error ?? body.message ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const listTestimonials = () =>
  request<{ items: Testimonial[] }>("/api/testimonials", {}, "optional").then((r) => r.items);

export const createTestimonial = (input: { message: string; role?: string }) =>
  request<Testimonial>("/api/testimonials", { method: "POST", body: JSON.stringify(input) }, "required");

export const setTestimonialStatus = (id: string, status: Status) =>
  request<Testimonial>(
    `/api/testimonials/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ status }) },
    "required",
  );

export const deleteTestimonial = (id: string) =>
  request<void>(`/api/testimonials/${encodeURIComponent(id)}`, { method: "DELETE" }, "required");

export interface ContactInput {
  name: string;
  email: string;
  message: string;
  /** Honeypot. Always empty for real visitors. */
  website: string;
}

export const sendContact = (input: ContactInput) =>
  request<{ ok: true }>("/api/contact", { method: "POST", body: JSON.stringify(input) });
