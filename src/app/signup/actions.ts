"use server";

import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface SignupState {
  error?: string;
  success?: string;
}

/**
 * Public self-service account creation.
 *
 * Self-registered users always get the VIEWER role — elevated access is
 * granted afterwards by an ADMIN from the /admin user management table.
 */
export async function createUserAccount(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "A valid email address is required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "An account with this email already exists. Try signing in instead." };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, name: name || null, passwordHash, role: Role.VIEWER },
    });
    return { success: "Account created. You can sign in now." };
  } catch (e) {
    console.error("createUserAccount failed:", e);
    return { error: "Could not create the account. Please try again." };
  }
}
