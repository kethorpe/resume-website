import { useState, type FormEvent } from "react";
import { sendContact } from "../api";

const MAX_MESSAGE = 2000;

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await sendContact({ name, email, message, website });
      setSentTo(email);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t send your message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="contact">
      <h2>Contact</h2>
      <p>Send a message about a role or project. It goes straight to my inbox.</p>

      {sentTo ? (
        <div className="status" role="status">
          <p>Message sent. I’ll reply to {sentTo}.</p>
          <button type="button" className="link" onClick={() => setSentTo(null)}>
            Send another message
          </button>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          {/* Hidden from people and screen readers. Bots that fill every field give themselves away. */}
          <div className="hp" aria-hidden="true">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          <label>
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" required />
          </label>
          <label>
            Your email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" required />
          </label>
          <label>
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              minLength={10}
              maxLength={MAX_MESSAGE}
              required
            />
          </label>
          <p className="hint counter">
            {message.length} / {MAX_MESSAGE}
          </p>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="actions">
            <button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
