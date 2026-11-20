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

function getVerifier() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) return null;
  verifier ??= makeVerifier(userPoolId, clientId);
  return verifier;
}

/** Rejects the request unless it carries a valid Cognito ID token. */
export const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const v = getVerifier();
  if (!v) {
    res.status(503).json({ error: "Authentication is not configured on the server" });
    return;
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "Sign in to do this" });
    return;
  }

  try {
    const payload = (await v.verify(token)) as unknown as Record<string, unknown>;
    const groups = Array.isArray(payload["cognito:groups"]) ? (payload["cognito:groups"] as string[]) : [];
    const email = typeof payload.email === "string" ? payload.email : "";
    const name =
      (typeof payload.name === "string" && payload.name) || email.split("@")[0] || "Anonymous";
    (req as AuthedRequest).user = {
      id: String(payload.sub),
      name,
      isAdmin: groups.includes("admin"),
    };
    next();
  } catch {
    res.status(401).json({ error: "Your session has expired. Sign in again." });
  }
};
