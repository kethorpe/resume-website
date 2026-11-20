import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;

export const authConfigured = Boolean(userPoolId && clientId);

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

let pool: CognitoUserPool | undefined;
function getPool(): CognitoUserPool {
  if (!userPoolId || !clientId) {
    throw new Error("Sign-in isn't set up yet. Add the VITE_COGNITO_* values and rebuild.");
  }
  pool ??= new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId });
  return pool;
}

function userFromSession(session: CognitoUserSession): User {
  const p = session.getIdToken().decodePayload();
  const groups = Array.isArray(p["cognito:groups"]) ? (p["cognito:groups"] as string[]) : [];
  const email = String(p.email ?? "");
  return {
    id: String(p.sub),
    email,
    name: String(p.name ?? email.split("@")[0] ?? "You"),
    isAdmin: groups.includes("admin"),
  };
}

/** Returns the current valid session, refreshing it silently if needed. */
function getSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    if (!authConfigured) return resolve(null);
    const current = getPool().getCurrentUser();
    if (!current) return resolve(null);
    current.getSession((err: Error | null, session: CognitoUserSession | null) => {
      resolve(err || !session || !session.isValid() ? null : session);
    });
  });
}

export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session ? userFromSession(session) : null;
}

export async function getIdToken(): Promise<string | null> {
  const session = await getSession();
  return session ? session.getIdToken().getJwtToken() : null;
}

export function signUp(email: string, password: string, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const attrs = [new CognitoUserAttribute({ Name: "name", Value: name })];
    getPool().signUp(email, password, attrs, [], (err) => (err ? reject(err) : resolve()));
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.confirmRegistration(code, true, (err) => (err ? reject(err) : resolve()));
  });
}

export function signIn(email: string, password: string): Promise<User> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.authenticateUser(new AuthenticationDetails({ Username: email, Password: password }), {
      onSuccess: (session) => resolve(userFromSession(session)),
      onFailure: reject,
      newPasswordRequired: () => reject(new Error("This account needs a new password. Use “Forgot password” in the AWS console.")),
    });
  });
}

export function signOut(): void {
  if (authConfigured) getPool().getCurrentUser()?.signOut();
}
