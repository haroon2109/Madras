import type { Metadata } from "next";
import SettingsClient from "@/components/settings/SettingsClient";
import { SettingsHero } from "@/components/settings/SettingsHero";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings — Madras",
  description: "Notification and application preferences.",
};

export default async function SettingsPage() {
  const session = await auth();
  const userEmail = session?.user?.email ?? "you@example.com";

  return (
    <div className="space-y-6">
      <SettingsHero />
      <SettingsClient userEmail={userEmail} />
    </div>
  );
}