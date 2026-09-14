"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userSubscribesToZone } from "@/lib/data";

export interface SubscribeState {
  error?: string;
  success?: string;
}

export async function subscribeToZone(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sign in to subscribe to a zone." };
  }

  const zoneId = String(formData.get("zoneId") ?? "");
  if (!zoneId) return { error: "A zone is required." };

  const exists = await userSubscribesToZone(session.user.id, zoneId);
  if (exists) return { success: "You are already subscribed to this zone." };

  try {
    await prisma.zoneSubscription.create({
      data: { userId: session.user.id, zoneId, channel: "email" },
    });
    revalidatePath("/weather/subscribe");
    return { success: "Subscribed. You will receive alert updates for this zone." };
  } catch (e) {
    console.error("subscribeToZone failed:", e);
    return { error: "Could not subscribe. Please try again." };
  }
}

export async function unsubscribeFromZone(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sign in to manage subscriptions." };
  }

  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  if (!subscriptionId) return { error: "Subscription id is required." };

  try {
    await prisma.zoneSubscription.updateMany({
      where: { id: subscriptionId, userId: session.user.id },
      data: { active: false },
    });
    revalidatePath("/weather/subscribe");
    return { success: "Unsubscribed from this zone." };
  } catch (e) {
    console.error("unsubscribeFromZone failed:", e);
    return { error: "Could not unsubscribe. Please try again." };
  }
}
