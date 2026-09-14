"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function resolveAlert(alertId: string) {
  await prisma.alert.update({
    where: { id: alertId },
    data: { resolvedAt: new Date() },
  });
  revalidatePath("/decisions");
}

export async function reopenAlert(alertId: string) {
  await prisma.alert.update({
    where: { id: alertId },
    data: { resolvedAt: null },
  });
  revalidatePath("/decisions");
}