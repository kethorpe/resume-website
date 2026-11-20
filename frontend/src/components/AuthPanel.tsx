import { useState, type FormEvent } from "react";
import { authConfigured, confirmSignUp, signIn, signUp, type User } from "../auth";

type Mode = "signin" | "signup" | "confirm";

export default function AuthPanel({ onSignedIn }: { onSignedIn: (u: User) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!authConfigured) {
    return (
      <p className="notice">
        Sign-in isn’t configured in this build. Set <code>VITE_COGNITO_USER_POOL_ID</code> and{" "}
        <code>VITE_COGNITO_CLIENT_ID</code>, then rebuild.
      </p>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, name);
        setMode("confirm");
      } else if (mode === "confirm") {
        await confirmSignUp(email, code.trim());
        onSignedIn(await signIn(email, password));
      } else {
        onSignedIn(await signIn(email, password));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>{mode === "signin" ? "Sign in to leave a recommendation" : mode === "signup" ? "Create an account" : "Confirm your email"}</h3>

      {mode === "confirm" ? (
        <>
          <p className="hint">We sent a 6-digit code to {email}.</p>
          <label>
            Confirmation code
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required />
          </label>
        </>
      ) : (
        <>
          {mode === "signup" && (
            <label>
              Your name
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 10 : undefined}
              required
            />
          </label>
          {mode === "signup" && <p className="hint">At least 10 characters with upper and lower case letters and a number.</p>}
        </>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="actions">
        <button type="submit" disabled={busy}>
          {busy ? "Working…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Confirm and sign in"}
        </button>
        {mode !== "confirm" && (
          <button type="button" className="link" onClick={() => { setError(""); setMode(mode === "signin" ? "signup" : "signin"); }}>
            {mode === "signin" ? "Create an account" : "I already have an account"}
          </button>
        )}
      </div>
    </form>
  );
}
