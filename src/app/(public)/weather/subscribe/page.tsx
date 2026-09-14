import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSubscriptionsForUser } from "@/lib/data";
import { getChennaiZones } from "@/lib/zones";
import { subscribeToZone } from "@/app/(app)/subscriptions/actions";
import PublicSubscribeForm from "./PublicSubscribeForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Follow zones — Madras",
  description: "Subscribe to rainfall and flood-alert updates for the Chennai zones you care about.",
};

export default async function PublicSubscribePage() {
  const session = await auth();
  const zones = getChennaiZones();
  const dbZones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const dbByNumber = new Map(dbZones.map((z) => [z.number, z]));

  const subscriptions = session?.user?.id
    ? await getSubscriptionsForUser(session.user.id)
    : [];

  const subscribedNumbers = new Set(subscriptions.map((s) => s.zoneNumber));

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/weather" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
              Back to weather
            </a>
          </div>
          <div className="flex items-center gap-2">
            {session ? (
              <span className="text-xs font-semibold text-slate-500">
                Signed in as {session.user.email}
              </span>
            ) : (
              <a
                href="/signup/citizen"
                className="rounded-full bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1765CC]"
              >
                Sign up
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-3xl p-6 sm:p-8 mb-8 text-white shadow-xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Follow your zones</h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-lg">
            Subscribe to rainfall and flood-alert updates for the zones you care about. We will notify you when a zone crosses its warning or alert threshold.
          </p>
        </div>

        {session ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900">Your subscriptions</h2>
                <span className="text-xs text-slate-400">{subscriptions.length} zone{subscriptions.length === 1 ? "" : "s"}</span>
              </div>
              {subscriptions.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {subscriptions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Zone {s.zoneNumber} — {s.zoneName}</p>
                        <p className="text-xs text-slate-400">{s.channel} · subscribed {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(s.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 py-3 text-center">No subscriptions yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-1">Subscribe to a zone</h2>
              <p className="text-sm text-slate-500 mb-4">
                Pick a zone to follow. You will be notified when alert conditions are reached for that zone.
              </p>
              <PublicSubscribeForm
                zones={zones.map((z) => ({ number: z.number, name: z.name, subscribed: subscribedNumbers.has(z.number) }))}
                subscribeAction={subscribeToZone}
                signedIn
              />
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1">Subscribe to a zone</h2>
            <p className="text-sm text-slate-500 mb-4">
              Sign in or create a citizen account to follow zones and receive alert updates.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Sign in
              </a>
              <a
                href="/signup/citizen"
                className="inline-flex items-center gap-2 rounded-full bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1765CC]"
              >
                Create citizen account
              </a>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Preview: zones you can follow</h3>
              <ul className="divide-y divide-slate-200">
                {zones.slice(0, 8).map((z) => {
                  const dbZone = dbByNumber.get(z.number);
                  return (
                    <li key={z.number} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Zone {z.number} — {z.name}</p>
                      </div>
                      <span className="text-xs text-slate-400">{dbZone ? "active" : "inactive"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-slate-400">
          <p>Subscriptions are stored securely and used only for Madras alert updates.</p>
        </div>
      </main>
    </div>
  );
}
