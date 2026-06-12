import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "hyundai_admin_session";

export type UserRole = "partner" | "admin";

export interface AuthUser {
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
}

export interface SessionPayload {
  username: string;
  role: UserRole;
  displayName: string;
}

const AUTH_USERS: AuthUser[] = [
  {
    username: "thehyundai",
    password: "buyback",
    role: "partner",
    displayName: "현대백화점 담당자",
  },
  {
    username: "relay",
    password: "seah",
    role: "admin",
    displayName: "Relay 담당자",
  },
];

export function authenticateUser(username: string, password: string) {
  const normalizedUsername = username.trim();
  const normalizedPassword = password.trim();

  return (
    AUTH_USERS.find(
      (user) =>
        user.username === normalizedUsername && user.password === normalizedPassword,
    ) ?? null
  );
}

export async function createSessionToken(payload: SessionPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(token)) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export function canManageSettlements(session: SessionPayload | null) {
  return session?.role === "admin";
}
