"use client";

import { useActionState, useState } from "react";
import { MessageCircle, Send, Smartphone } from "lucide-react";

type Channel = "sms" | "whatsapp";

interface DispatchableAlert {
  id: string;
  level: string;
  title: string;
  zoneName: string;
}

const CHANNEL_META: { key: Channel; label: string; icon: typeof Smartphone; placeholder: string }[] = [
  { key: "sms", label: "SMS", icon: Smartphone, placeholder: "+91 9XXXXXXXXX" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, placeholder: "+91 9XXXXXXXXX" },
];

export function AlertDispatch({ alerts }: { alerts: DispatchableAlert[] }) {
  const [channel, setChannel] = useState<Channel>("sms");
  const [recipient, setRecipient] = useState("");
  const [status, submit, pending] = useActionState<
    { ok: boolean; error?: string } | undefined,
    FormData
  >(async (_prev, formData) => {
    const mod = await import("@/app/(app)/admin/actions");
    return mod.deliverAlert(formData);
  }, undefined);

  // Clear the recipient field via a key-reset instead of setState-in-effect:
  // the form re-renders fresh after a successful action state change.
  const [lastClearedStatus, setLastClearedStatus] = useState<{ ok: boolean } | undefined>(undefined);
  if (status?.ok && lastClearedStatus !== status) {
    setLastClearedStatus(status);
    setRecipient("");
  }

  return (
    <section className="rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-[0_1px_2px_rgba(16,42,86,0.04)]">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#5F6368]">Send alert</h2>
      <p className="mt-1 text-xs text-[#80868B]">Dispatch an active alert to a phone number via SMS or WhatsApp.</p>

      {alerts.length === 0 ? (
        <p className="mt-3 text-sm text-[#647A99]">No active alerts to send.</p>
      ) : (
        <form action={submit} className="mt-3 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-[#5F6368]">Alert</span>
            <select name="alertId" required className="mt-1 block h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800">
              {alerts.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.level}] {a.zoneName} — {a.title}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            {CHANNEL_META.map((c) => {
              const Icon = c.icon;
              const active = channel === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setChannel(c.key)}
                  className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors ${
                    active ? "border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]" : "border-slate-300 text-[#5F6368] hover:bg-[#F8F9FA]"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {c.label}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="channel" value={channel} />

          <label className="block">
            <span className="text-xs font-semibold text-[#5F6368]">Recipient</span>
            <input
              name="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              placeholder={CHANNEL_META.find((c) => c.key === channel)?.placeholder}
              className="mt-1 block h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1A73E8] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#1765CC] disabled:opacity-60"
          >
            <Send size={16} aria-hidden="true" />
            {pending ? "Sending…" : `Send via ${channel.toUpperCase()}`}
          </button>

          {status && (
            <p className={`text-sm font-semibold ${status.ok ? "text-emerald-700" : "text-red-600"}`}>
              {status.ok ? "Sent successfully." : status.error ?? "Could not send."}
            </p>
          )}
        </form>
      )}
    </section>
  );
}