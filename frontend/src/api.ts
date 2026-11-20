import { getIdToken } from "./auth";

export interface Testimonial {
  id: string;
  message: string;
  role?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

async function request<T>(path: string, init: RequestInit = {}, authed = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (authed) {
    const token = await getIdToken();
    if (!token) throw new Error("Sign in to do this");
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const listTestimonials = () =>
  request<{ items: Testimonial[] }>("/api/testimonials").then((r) => r.items);

export const createTestimonial = (input: { message: string; role?: string }) =>
  request<Testimonial>("/api/testimonials", { method: "POST", body: JSON.stringify(input) }, true);

export const deleteTestimonial = (id: string) =>
  request<void>(`/api/testimonials/${encodeURIComponent(id)}`, { method: "DELETE" }, true);
