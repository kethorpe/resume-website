import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createTestimonial,
  deleteTestimonial,
  listTestimonials,
  setTestimonialStatus,
  type Status,
  type Testimonial,
} from "../api";
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
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listTestimonials());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t load recommendations");
      setItems([]);
    }
  }, []);

  // Reload when someone signs in or out: what the server returns depends on who is asking.
  useEffect(() => {
    void load();
  }, [load, user?.id]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const created = await createTestimonial({ message, role: role || undefined });
      setMessage("");
      setRole("");
      setNotice(
        created.status === "pending"
          ? "Thanks! Your recommendation is waiting for approval. Only you can see it until it’s approved."
          : "Posted.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save your recommendation");
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, run: () => Promise<unknown>, failure: string) {
    setError("");
    setNotice("");
    setActingId(id);
    try {
      await run();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : failure);
    } finally {
      setActingId(null);
    }
  }

  const changeStatus = (id: string, status: Status) =>
    act(id, () => setTestimonialStatus(id, status), "Couldn’t update that recommendation");
  const remove = (id: string) => act(id, () => deleteTestimonial(id), "Couldn’t delete that recommendation");

  const approved = items?.filter((t) => t.status === "approved") ?? [];
  // The server already limits this: admins get every pending item, everyone else only their own.
  const pending = items?.filter((t) => t.status === "pending") ?? [];

  function renderItem(t: Testimonial) {
    const canDelete = user && (t.mine || user.isAdmin);
    return (
      <li key={t.id}>
        <blockquote>{t.message}</blockquote>
        <p className="byline">
          {t.status === "pending" && <span className="badge">Pending approval</span>}
          {t.authorName}
          {t.role ? `, ${t.role}` : ""}
          <time dateTime={t.createdAt}> · {new Date(t.createdAt).toLocaleDateString()}</time>
        </p>
        {user && (canDelete || user.isAdmin) && (
          <div className="row-actions">
            {user.isAdmin && t.status === "pending" && (
              <button type="button" disabled={actingId === t.id} onClick={() => changeStatus(t.id, "approved")}>
                Approve
              </button>
            )}
            {user.isAdmin && t.status === "approved" && (
              <button type="button" className="link" disabled={actingId === t.id} onClick={() => changeStatus(t.id, "pending")}>
                Unpublish
              </button>
            )}
            {canDelete && (
              <button type="button" className="link danger" disabled={actingId === t.id} onClick={() => remove(t.id)}>
                Delete
              </button>
            )}
          </div>
        )}
      </li>
    );
  }

  return (
    <section id="recommendations">
      <h2>Recommendations</h2>

      {user && pending.length > 0 && (
        <>
          <h3 className="group-title">
            {user.isAdmin ? `Waiting for your approval (${pending.length})` : "Your recommendations awaiting approval"}
          </h3>
          {!user.isAdmin && <p className="hint">Only you can see these until they’re approved.</p>}
          <ul className="quotes pending">{pending.map(renderItem)}</ul>
        </>
      )}

      {items === null && <p className="hint">Loading…</p>}
      {items !== null && approved.length === 0 && (
        <p className="hint">
          {user ? "No recommendations are published yet." : "No recommendations yet. Sign in below to leave the first one."}
        </p>
      )}
      <ul className="quotes">{approved.map(renderItem)}</ul>

      {notice && (
        <p className="status" role="status">
          {notice}
        </p>
      )}
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
                setNotice("");
              }}
            >
              Sign out
            </button>
          </p>
          {!user.isAdmin && <p className="hint">New recommendations are reviewed before they appear on the page.</p>}
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
              {busy ? "Saving…" : "Submit for approval"}
            </button>
          </div>
        </form>
      ) : (
        <AuthPanel onSignedIn={onUserChange} />
      )}
    </section>
  );
}
