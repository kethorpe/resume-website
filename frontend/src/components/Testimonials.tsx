import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createTestimonial, deleteTestimonial, listTestimonials, type Testimonial } from "../api";
import { signOut, type User } from "../auth";
import AuthPanel from "./AuthPanel";

interface Props {
  user: User | null;
  onUserChange: (u: User | null) => void;
}

export default function Testimonials({ user, onUserChange }: Props) {
  const [items, setItems] = useState<Testimonial[] | null>(null);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listTestimonials());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t load recommendations");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await createTestimonial({ message, role: role || undefined });
      setMessage("");
      setRole("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save your recommendation");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      await deleteTestimonial(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t delete that recommendation");
    }
  }

  return (
    <section id="recommendations">
      <h2>Recommendations</h2>

      {items === null && <p className="hint">Loading…</p>}
      {items?.length === 0 && <p className="hint">No recommendations yet. Sign in below to leave the first one.</p>}

      <ul className="quotes">
        {items?.map((t) => (
          <li key={t.id}>
            <blockquote>{t.message}</blockquote>
            <p className="byline">
              {t.authorName}
              {t.role ? `, ${t.role}` : ""}
              <time dateTime={t.createdAt}> · {new Date(t.createdAt).toLocaleDateString()}</time>
              {user && (user.id === t.authorId || user.isAdmin) && (
                <button type="button" className="link danger" onClick={() => remove(t.id)}>
                  Delete
                </button>
              )}
            </p>
          </li>
        ))}
      </ul>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {user ? (
        <form className="form" onSubmit={submit}>
          <h3>Leave a recommendation</h3>
          <p className="hint">
            Signed in as {user.name}.{" "}
            <button
              type="button"
              className="link"
              onClick={() => {
                signOut();
                onUserChange(null);
              }}
            >
              Sign out
            </button>
          </p>
          <label>
            Your role or relationship (optional)
            <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="Former manager at Acme" />
          </label>
          <label>
            Recommendation
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} minLength={5} maxLength={500} required />
          </label>
          <div className="actions">
            <button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Post recommendation"}
            </button>
          </div>
        </form>
      ) : (
        <AuthPanel onSignedIn={onUserChange} />
      )}
    </section>
  );
}
