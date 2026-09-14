"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateLatLng } from "@/lib/zones";
import { Role } from "@prisma/client";

export interface FormState {
  error?: string;
  success?: string;
}

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { ok: false, error: "Admin access required." };
  return { ok: true };
}

function parseFloatField(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

export async function createZone(_prev: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  try {
    const name = String(formData.get("name") ?? "").trim();
    const number = Number(String(formData.get("number") ?? ""));
    if (!name || !Number.isInteger(number) || number < 1) {
      return { error: "A zone name and a valid zone number are required." };
    }
    const latitude = Number(String(formData.get("latitude") ?? "").trim());
    const longitude = Number(String(formData.get("longitude") ?? "").trim());
    const coordError = validateLatLng(latitude, longitude);
    if (coordError) {
      return { error: `Invalid zone coordinates: ${coordError}` };
    }
    await prisma.zone.create({
      data: {
        number,
        name,
        latitude,
        longitude,
        watchThreshold: parseFloatField(formData.get("watchThreshold"), 15),
        warningThreshold: parseFloatField(formData.get("warningThreshold"), 30),
        alertThreshold: parseFloatField(formData.get("alertThreshold"), 60),
      },
    });
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: `Zone ${number} — ${name} created.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create zone." };
  }
}

export async function updateZone(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) return;

  const id = String(formData.get("id") ?? "");
  try {
    await prisma.zone.update({
      where: { id },
      data: {
        number: Number(String(formData.get("number") ?? "0")),
        name: String(formData.get("name") ?? "").trim(),
        latitude: parseFloatField(formData.get("latitude"), 0),
        longitude: parseFloatField(formData.get("longitude"), 0),
        watchThreshold: parseFloatField(formData.get("watchThreshold"), 15),
        warningThreshold: parseFloatField(formData.get("warningThreshold"), 30),
        alertThreshold: parseFloatField(formData.get("alertThreshold"), 60),
        isActive: formData.get("isActive") === "on",
      },
    });
    revalidatePath("/admin");
    revalidatePath("/");
  } catch (e) {
    console.error("updateZone failed:", e);
  }
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "VIEWER") as Role;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "A valid email is required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!["ADMIN", "ANALYST", "VIEWER"].includes(role)) return { error: "Invalid role." };

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { email, name: name || null, passwordHash, role } });
    revalidatePath("/admin");
    return { success: `User ${email} created (${role}).` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create user." };
  }
}

export async function updateUserRole(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) return;

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!["ADMIN", "ANALYST", "VIEWER"].includes(role)) return;

  try {
    await prisma.user.update({ where: { id }, data: { role } });
    revalidatePath("/admin");
  } catch (e) {
    console.error("updateUserRole failed:", e);
  }
}

export async function deleteUser(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) return;

  const session = await auth();
  const id = String(formData.get("id") ?? "");
  if (session?.user?.id === id) {
    console.error("Cannot delete your own account.");
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user?.role === "ADMIN") {
      const admins = await prisma.user.count({ where: { role: "ADMIN" } });
      if (admins <= 1) {
        console.error("Cannot delete the last admin account.");
        return;
      }
    }
    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin");
  } catch (e) {
    console.error("deleteUser failed:", e);
  }
}

/* ------------------------------------------------------------------ */
/* Feature 5 — dispatch an alert to a recipient via SMS / WhatsApp     */
/* ------------------------------------------------------------------ */

import { adapterFor, formatAlertMessage, type AlertChannel } from "@/lib/delivery";

export async function deliverAlert(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const alertId = String(formData.get("alertId") ?? "");
  const channel = String(formData.get("channel") ?? "sms") as AlertChannel;
  const recipient = String(formData.get("recipient") ?? "").trim();
  if (!alertId || !recipient) return { ok: false, error: "Alert and recipient are required." };
  if (channel !== "sms" && channel !== "whatsapp") return { ok: false, error: "Invalid channel." };

  const alert = await prisma.alert.findUnique({ where: { id: alertId }, include: { zone: true } });
  if (!alert) return { ok: false, error: "Alert not found." };

  // Avoid duplicate sends for the same alert + channel + recipient.
  const existing = await prisma.deliveryLog.findFirst({ where: { alertId, channel, recipient } });
  if (existing?.status === "sent" || existing?.status === "delivered") {
    return { ok: false, error: "Already sent to this recipient on this channel." };
  }

  const body = formatAlertMessage({ level: alert.level, zoneName: alert.zone.name, title: alert.title });
  const adapter = adapterFor(channel);

  const log = await prisma.deliveryLog.create({
    data: { alertId, channel, recipient, status: "queued" },
  });

  const result = await adapter.send(recipient, body);

  await prisma.deliveryLog.update({
    where: { id: log.id },
    data: {
      status: result.ok ? "sent" : "failed",
      providerMsgId: result.providerMsgId ?? null,
      error: result.error ?? null,
      sentAt: result.ok ? new Date() : null,
    },
  });

  revalidatePath("/admin");
  return result.ok ? { ok: true } : { ok: false, error: result.error ?? "Delivery failed." };
}

/* ------------------------------------------------------------------ */
/* Feature 12 — dispatch a newly raised alert to all zone subscribers  */
/* When a channel provider is configured (Twilio / WhatsApp), iterate   */
/* active subscriptions for the alert's zone and dispatch. Email stays  */
/* stubbed here — plug a transactional email provider into the adapter   */
/* layer if you want email dispatches later.                            */
/* ------------------------------------------------------------------ */

export async function dispatchAlertToSubscribers(formData: FormData): Promise<{ ok: boolean; dispatched: number; failed: number; error?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, dispatched: 0, failed: 0, error: guard.error };

  const alertId = String(formData.get("alertId") ?? "");
  if (!alertId) return { ok: false, dispatched: 0, failed: 0, error: "Alert id is required." };

  const alert = await prisma.alert.findUnique({ where: { id: alertId }, include: { zone: true } });
  if (!alert) return { ok: false, dispatched: 0, failed: 0, error: "Alert not found." };

  const subs = await prisma.zoneSubscription.findMany({
    where: { zoneId: alert.zoneId, active: true },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  let dispatched = 0;
  let failed = 0;

  for (const sub of subs) {
    const recipient = sub.channel === "email" ? (sub.user.email ?? "") : (sub.phone ?? "");
    if (!recipient) {
      failed++;
      continue;
    }

    // Avoid duplicate sends for the same alert + channel + recipient.
    const existing = await prisma.deliveryLog.findFirst({ where: { alertId, channel: sub.channel, recipient } });
    if (existing?.status === "sent" || existing?.status === "delivered") {
      continue;
    }

    const body = formatAlertMessage({ level: alert.level, zoneName: alert.zone.name, title: alert.title });
    const log = await prisma.deliveryLog.create({
      data: { alertId, channel: sub.channel, recipient, status: "queued" },
    });

    // Email is stubbed here (no email provider in scope). SMS/WhatsApp go
    // through the existing adapter stubs until creds are configured.
    if (sub.channel === "email") {
      await prisma.deliveryLog.update({
        where: { id: log.id },
        data: { status: "sent", providerMsgId: `stub-email-${Date.now()}`, sentAt: new Date() },
      });
      dispatched++;
      continue;
    }

    const adapter = adapterFor(sub.channel as AlertChannel);
    const result = await adapter.send(recipient, body);

    await prisma.deliveryLog.update({
      where: { id: log.id },
      data: {
        status: result.ok ? "sent" : "failed",
        providerMsgId: result.providerMsgId ?? null,
        error: result.error ?? null,
        sentAt: result.ok ? new Date() : null,
      },
    });

    if (result.ok) dispatched++;
    else failed++;
  }

  revalidatePath("/admin");
  return { ok: true, dispatched, failed, error: failed > 0 ? "Some dispatches failed." : undefined };
}
