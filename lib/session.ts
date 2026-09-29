import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { collections, type UserDoc } from "./db";

const secret = process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me";
const key = new TextEncoder().encode(secret);
const COOKIE = "gov_session";
const MAX_AGE = 60 * 60 * 8; // ثماني ساعات

export interface SessionPayload {
  uid: string;
  role: string;
  entityId: string;
  [key: string]: unknown;
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(key);
}

export async function decrypt(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(user: UserDoc) {
  const token = await encrypt({ uid: user.id, role: user.role, entityId: user.entityId });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** يقرأ الجلسة من الكعكة ثم يجلب المستخدم من قاعدة البيانات */
export async function currentUser(): Promise<UserDoc | null> {
  const store = await cookies();
  const payload = await decrypt(store.get(COOKIE)?.value);
  if (!payload) return null;
  const users = await collections.users();
  const user = await users.findOne({ id: payload.uid, active: true });
  return user ?? null;
}

/** يستخدم في مسارات API — يرمي استجابة 401 إذا لا جلسة */
export async function requireUser(): Promise<UserDoc> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("غير مصرّح");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "لا تملك صلاحية تنفيذ هذا الإجراء") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export const SESSION_COOKIE = COOKIE;
