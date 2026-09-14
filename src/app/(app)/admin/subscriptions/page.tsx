import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAllSubscriptions } from "@/lib/data";
import { dispatchAlertToSubscribers } from "../actions";
import { AlertTriangle, Send, Users, Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subscriptions — Madras Admin",
  description: "Manage zone alert subscriptions and dispatch alerts to subscribers.",
};

export default async function AdminSubscriptionsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }

  const subscriptions = await getAllSubscriptions();
  const byZone = new Map<string, typeof subscriptions>();
  for (const s of subscriptions) {
    const list = byZone.get(s.zoneId) ?? [];
    list.push(s);
    byZone.set(s.zoneId, list);
  }

  const zones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });

  const alerts = await prisma.alert.findMany({
    where: { resolvedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { zone: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Zones followed by citizens and staff. Use the alert dispatch form to notify subscribers when an alert is raised.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#1A73E8]" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">By zone</h2>
          </div>
          <span className="text-xs text-slate-400">{subscriptions.length} active subscriptions</span>
        </div>

        <div className="space-y-4">
          {zones.map((zone) => {
            const subs = byZone.get(zone.id) ?? [];
            return (
              <div key={zone.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Zone {zone.number} — {zone.name}</p>
                    <p className="text-xs text-slate-400">{subs.length} subscriber{subs.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
                {subs.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {subs.map((s) => (
                      <li key={s.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm text-slate-700">{s.subscriber}</p>
                          <p className="text-xs text-slate-400">{s.channel} {s.phone ? ` · ${s.phone}` : ""}</p>
                        </div>
                        <span className="text-xs text-slate-400">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(s.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No subscribers yet.</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-amber-600" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Dispatch alert to subscribers</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Send the selected alert to all active subscribers for its zone. Delivered messages use the configured provider (SMS/WhatsApp) or the email stub until credentials are set up.
        </p>

        <form
          action={async (formData) => {
            "use server";
            await dispatchAlertToSubscribers(formData);
          }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Alert</label>
            <select
              name="alertId"
              required
              className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              <option value="">Select an active alert</option>
              {alerts.length === 0 ? (
                <option value="" disabled>No active alerts to dispatch</option>
              ) : (
                alerts.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.level}] {a.zone.name} — {a.title}
                  </option>
                ))
              )
            }
          </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[#1A73E8] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1765CC]"
            >
              <Send size={15} />
              Dispatch to subscribers
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

