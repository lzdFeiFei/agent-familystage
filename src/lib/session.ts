import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "secondme_session";
const OAUTH_STATE_COOKIE_NAME = "secondme_oauth_state";
const DEV_SESSION_SECRET = "secondme-dev-secret-change-in-production";

function getSecret() {
  return process.env.SECONDME_SESSION_SECRET || DEV_SESSION_SECRET;
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();
  const payload = `${userId}.${sign(userId)}`;
  cookieStore.set(SESSION_COOKIE_NAME, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUserId() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  const [userId, signature] = raw.split(".");
  if (!userId || !signature) return null;
  if (sign(userId) !== signature) return null;
  return userId;
}

export async function setOAuthState(state: string) {
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function consumeOAuthState() {
  const cookieStore = await cookies();
  const state = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value || null;
  cookieStore.delete(OAUTH_STATE_COOKIE_NAME);
  return state;
}

export function createOAuthState() {
  return crypto.randomBytes(20).toString("hex");
}
