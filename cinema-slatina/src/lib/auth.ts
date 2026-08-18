import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ROLES, type Role } from "@/lib/constants";

const COOKIE_NAME = "cinema_session";
const SESSION_DAYS = 7;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET lipsește sau este prea scurt (minim 32 de caractere). Setează-l în .env",
    );
  }
  return new TextEncoder().encode(value);
}

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.id || !payload.role) return null;
    return {
      id: String(payload.id),
      username: String(payload.username),
      fullName: String(payload.fullName),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

/** Sesiune verificata si impotriva bazei de date (cont dezactivat / sters). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, username: true, fullName: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role as Role,
  };
}

export async function requireUser(
  roles: Role[] = [ROLES.ADMIN, ROLES.CASHIER],
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/autentificare");
  if (!roles.includes(user.role)) {
    redirect(user.role === ROLES.ADMIN ? "/admin" : "/casierie");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireUser([ROLES.ADMIN]);
}

export function homeForRole(role: Role): string {
  return role === ROLES.ADMIN ? "/admin" : "/casierie";
}
