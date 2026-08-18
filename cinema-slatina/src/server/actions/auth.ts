"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  homeForRole,
  verifyPassword,
} from "@/lib/auth";
import type { Role } from "@/lib/constants";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Introdu numele de utilizator."),
  password: z.string().min(1, "Introdu parola."),
});

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }

  const user = await db.user.findUnique({
    where: { username: parsed.data.username.toLowerCase() },
  });

  // Mesaj identic pentru user inexistent și parolă greșită.
  if (!user || !user.isActive) {
    return { error: "Utilizator sau parolă incorecte." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Utilizator sau parolă incorecte." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role as Role,
  });

  redirect(homeForRole(user.role as Role));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
