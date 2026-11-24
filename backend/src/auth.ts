import type { NextFunction, Request, RequestHandler, Response } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";

export interface AuthUser {
  id: string;
  name: string;
  isAdmin: boolean;
}

export type AuthedRequest = Request & { user: AuthUser };

function makeVerifier(userPoolId: string, clientId: string) {
  return CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "id" });
}

let verifier: ReturnType<typeof makeVerifier> | undefined;

export function getVerifier() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) return null;
  verifier ??= makeVerifier(userPoolId, clientId);
  return verifier;
}

type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "unconfigured" | "missing" | "invalid" };

async function authenticate(req: Request): Promise<AuthResult> {
  const v = getVerifier();
  if (!v) return { ok: false, reason: "unconfigured" };

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false, reason: "missing" };

  try {
    const payload = (await v.verify(token)) as unknown as Record<string, unknown>;
    const groups = Array.isArray(payload["cognito:groups"]) ? (payload["cognito:groups"] as string[]) : [];
    const email = typeof payload.email === "string" ? payload.email : "";
    const name = (typeof payload.name === "string" && payload.name) || email.split("@")[0] || "Anonymous";
    return { ok: true, user: { id: String(payload.sub), name, isAdmin: groups.includes("admin") } };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** Rejects the request unless it carries a valid Cognito ID token. */
export const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const result = await authenticate(req);
  if (result.ok) {
    (req as AuthedRequest).user = result.user;
    next();
    return;
  }
  if (result.reason === "unconfigured") {
    res.status(503).json({ error: "Authentication is not configured on the server" });
  } else if (result.reason === "missing") {
    res.status(401).json({ error: "Sign in to do this" });
  } else {
    res.status(401).json({ error: "Your session has expired. Sign in again." });
  }
};

/**
 * Attaches req.user when a valid token is present, and otherwise carries on as an
 * anonymous visitor. A bad or expired token never blocks a public page.
 */
export const optionalAuth: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  const result = await authenticate(req);
  if (result.ok) (req as AuthedRequest).user = result.user;
  next();
};
