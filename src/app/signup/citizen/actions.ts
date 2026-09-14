"use server";

import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CitizenSignupState {
  error?: string;
  success?: string;
}

/** Create a lightweight citizen account. Citizens can subscribe to zones and
 * view their subscription/alert history, but cannot access staff surfaces. */
export async function createCitizenAccount(_prev: CitizenSignupState, formData: FormData): Promise<CitizenSignupState> {
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
      if (existing.role === Role.CITIZEN) {
        return { error: "A citizen account with this email already exists. Try signing in instead." };
      }
      return { error: "An account with this email already exists. Try signing in instead." };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, name: name || null, passwordHash, role: Role.CITIZEN },
    });
    return { success: "Citizen account created. You can sign in now and subscribe to zones." };
  } catch (e) {
    console.error("createCitizenAccount failed:", e);
    return { error: "Could not create the account. Please try again." };
  }
}
